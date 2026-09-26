process.env.NODE_ENV = 'test';
process.env.EMAIL_USER_ID = process.env.EMAIL_USER_ID || 'test@example.com';
process.env.EMAIL_USER_PASSCODE = process.env.EMAIL_USER_PASSCODE || 'test-app-password';

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');

describe('Issue #221: Real Node Child Process Lifecycle & Background Rejections', () => {
  let serverProcess = null;
  const testPort = '59123';
  const baseUrl = `http://localhost:${testPort}`;

  before(async () => {
    await new Promise((resolve, reject) => {
      // Spawn test entry point that mounts test triggers without modifying src/app.js
      const testServerPath = path.join(__dirname, 'helpers', 'test-server.js');
      serverProcess = spawn('node', [testServerPath], {
        env: {
          ...process.env,
          PORT: testPort,
          NODE_ENV: 'test',
          EMAIL_USER_ID: 'test@example.com',
          EMAIL_USER_PASSCODE: 'test-pass',
          SHUTDOWN_DRAIN_TIMEOUT_MS: '2000',
        },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let started = false;
      serverProcess.stdout.on('data', (chunk) => {
        const text = chunk.toString();
        if (text.includes('Backend Server Started Successfully') && !started) {
          started = true;
          resolve();
        }
      });

      serverProcess.stderr.on('data', () => {});

      serverProcess.on('error', (err) => {
        if (!started) reject(err);
      });

      serverProcess.on('exit', (code) => {
        if (!started) reject(new Error(`Server process exited prematurely with code ${code}`));
      });
    });
  });

  after(async () => {
    if (serverProcess && !serverProcess.killed) {
      serverProcess.kill('SIGTERM');
      await new Promise((resolve) => {
        serverProcess.on('exit', resolve);
        setTimeout(resolve, 2000);
      });
    }
  });

  test('Server process remains alive when background unhandled rejection occurs', async () => {
    // 1. Initial health check
    const initialHealth = await fetch(`${baseUrl}/api/health`);
    assert.strictEqual(initialHealth.status, 200);

    // 2. Trigger background unhandled rejection via test-only endpoint
    const triggerRes = await fetch(`${baseUrl}/test/trigger-rejection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'background',
        message: 'Child process auxiliary worker failure',
      }),
    });
    const triggerData = await triggerRes.json();
    assert.strictEqual(triggerRes.status, 200);
    assert.strictEqual(triggerData.success, true);

    // 3. Give process event loop time to process the rejection
    await new Promise((r) => setTimeout(r, 150));

    // 4. Verify process is STILL ALIVE and has not crashed
    assert.strictEqual(serverProcess.killed, false);
    assert.strictEqual(serverProcess.exitCode, null);

    // 5. Verify server responds normally to new requests
    const postHealth = await fetch(`${baseUrl}/api/health`);
    assert.strictEqual(postHealth.status, 200);
    const postData = await postHealth.json();
    assert.strictEqual(postData.success, true);
  });

  test('Core unhandled rejection triggers graceful drain and orderly termination', async () => {
    // Trigger critical unhandled rejection
    const triggerRes = await fetch(`${baseUrl}/test/trigger-rejection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'core',
        message: 'Critical database connection pool corrupted',
      }),
    });
    const triggerData = await triggerRes.json();
    assert.strictEqual(triggerRes.status, 200);
    assert.strictEqual(triggerData.success, true);

    // Wait for process to drain and exit cleanly with code 1
    const exitCode = await new Promise((resolve) => {
      serverProcess.on('exit', (code) => resolve(code));
      setTimeout(() => resolve(serverProcess.exitCode), 4000);
    });

    assert.strictEqual(exitCode, 1);
  });
});

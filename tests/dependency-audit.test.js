const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const packageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')
);
const configSource = fs.readFileSync(
  path.join(__dirname, '..', 'src', 'config', 'index.js'),
  'utf8'
);

test('runtime dependencies stay limited to the active application stack', () => {
  const runtimeDependencies = packageJson.dependencies || {};
  const devDependencies = packageJson.devDependencies || {};

  const requiredRuntimeDependencies = [
    'express',
    'dotenv',
    'cors',
    '@prisma/client',
    'bcryptjs',
    'jsonwebtoken',
    'nodemailer',
    'swagger-jsdoc',
    'swagger-ui-express',
  ];

  for (const dependency of requiredRuntimeDependencies) {
    assert.ok(runtimeDependencies[dependency], `Missing runtime dependency: ${dependency}`);
  }

  assert.ok(devDependencies.prisma, 'Prisma CLI should remain in devDependencies');
  assert.ok(!runtimeDependencies['@types/node'], 'TypeScript node typings should not be promoted into runtime dependencies');
});

test('configuration keeps only the active environment variables for runtime setup', () => {
  const expectedEnvironmentKeys = [
    'NODE_ENV',
    'PORT',
    'DATABASE_URL',
    'JWT_SECRET',
    'JWT_EXPIRES_IN',
  ];

  for (const key of expectedEnvironmentKeys) {
    assert.match(
      configSource,
      new RegExp(`process\\.env\\.${key}|\\b${key}\\b`),
      `Expected configuration to reference ${key}`
    );
  }

  assert.doesNotMatch(configSource, /DB_URL|DATABASE_PRIVATE_URL/);
  assert.doesNotMatch(JSON.stringify(packageJson), /DB_URL|DATABASE_PRIVATE_URL/);
});

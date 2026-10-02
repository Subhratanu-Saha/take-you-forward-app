const { afterEach, test } = require('node:test');
const assert = require('node:assert/strict');

const environmentKeys = [
  'NODE_ENV',
  'DATABASE_URL',
  'DB_URL',
  'DATABASE_PRIVATE_URL',
  'JWT_SECRET',
];
const originalEnvironment = Object.fromEntries(
  environmentKeys.map((key) => [key, process.env[key]])
);

const loadProductionConfig = (environment) => {
  for (const key of environmentKeys) {
    delete process.env[key];
  }
  Object.assign(process.env, { NODE_ENV: 'production', ...environment });
  delete require.cache[require.resolve('../src/config')];
  return require('../src/config');
};

afterEach(() => {
  for (const key of environmentKeys) {
    if (originalEnvironment[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = originalEnvironment[key];
    }
  }
  delete require.cache[require.resolve('../src/config')];
});

test('production config accepts DB_URL as a database URL alias', () => {
  const config = loadProductionConfig({ DB_URL: 'postgresql://localhost/app', JWT_SECRET: 'test-secret' });

  assert.equal(config.dbUrl, 'postgresql://localhost/app');
  assert.equal(process.env.DATABASE_URL, 'postgresql://localhost/app');
  assert.equal(config.validateConfig(), true);
});

test('production config accepts DATABASE_PRIVATE_URL as a database URL alias', () => {
  const config = loadProductionConfig({
    DATABASE_PRIVATE_URL: 'postgresql://localhost/private-app',
    JWT_SECRET: 'test-secret',
  });

  assert.equal(config.dbUrl, 'postgresql://localhost/private-app');
  assert.equal(process.env.DATABASE_URL, 'postgresql://localhost/private-app');
  assert.equal(config.validateConfig(), true);
});

test('production validation reports the missing JWT secret and accepted database keys', () => {
  const config = loadProductionConfig({ DB_URL: 'postgresql://localhost/app' });

  assert.throws(config.validateConfig, (error) => {
    assert.match(error.message, /JWT_SECRET/);
    assert.equal(error.code, 'CONFIG_VALIDATION_FAILED');
    assert.deepEqual(error.missingVariables, ['JWT_SECRET']);
    assert.deepEqual(error.expectedVariables.databaseUrl, [
      'DATABASE_URL',
      'DB_URL',
      'DATABASE_PRIVATE_URL',
    ]);
    return true;
  });
});

test('development config defaults to postgresql connection string when no env is provided', () => {
  for (const key of environmentKeys) {
    delete process.env[key];
  }
  process.env.NODE_ENV = 'development';
  delete require.cache[require.resolve('../src/config')];
  const config = require('../src/config');

  assert.equal(config.dbUrl, 'postgresql://localhost:5432/take-you-forward');
  assert.equal(config.port, 5000);
});

test('development config resolves DATABASE_URL when provided', () => {
  for (const key of environmentKeys) {
    delete process.env[key];
  }
  process.env.NODE_ENV = 'development';
  process.env.DATABASE_URL = 'postgresql://custom:5432/devdb';
  delete require.cache[require.resolve('../src/config')];
  const config = require('../src/config');

  assert.equal(config.dbUrl, 'postgresql://custom:5432/devdb');
  assert.equal(process.env.DATABASE_URL, 'postgresql://custom:5432/devdb');
});

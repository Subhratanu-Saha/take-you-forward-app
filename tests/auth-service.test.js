process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'auth-test-secret';

const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const app = require('../src/app');
const config = require('../src/config');
const prisma = require('../src/utils/db');

const originalUser = {
  findUnique: prisma.user?.findUnique,
  create: prisma.user?.create,
};

const createAuthServer = () => new Promise((resolve) => {
  const server = app.listen(0, () => resolve(server));
});

const withStubbedStaffUsers = async (userMap, createHandler) => {
  const findUnique = async ({ where }) => {
    if (where?.email) {
      return userMap[where.email] || null;
    }
    if (where?.userid) {
      return Object.values(userMap).find((user) => user.userid === where.userid) || null;
    }
    return null;
  };

  prisma.user = {
    ...prisma.user,
    findUnique,
    create: createHandler || (async ({ data }) => ({
      userid: data.userid,
      email: data.email,
      password: data.password,
      role: data.role,
      isactive: data.isactive,
      firstname: data.firstname,
      lastname: data.lastname,
      createdat: new Date(),
    })),
  };
};

test('Successful login returns JWT with userId email role', async () => {
  const server = await createAuthServer();
  const userPassword = 'Password123!';
  const staffUser = {
    userid: 'USER-1001',
    email: 'admin@tayf.test',
    password: bcrypt.hashSync(userPassword, 10),
    role: { name: 'SUPER_ADMIN' },
    isactive: true,
    firstname: 'System',
    lastname: 'Admin',
  };

  await withStubbedStaffUsers({ [staffUser.email]: staffUser });

  const port = server.address().port;
  const response = await fetch(`http://localhost:${port}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: staffUser.email, password: userPassword }),
  });

  const payload = await response.json();
  assert.equal(response.status, 200, 'login should succeed');
  assert.ok(payload.data && payload.data.token, 'login should return a JWT token');
  const decoded = jwt.verify(payload.data.token, process.env.JWT_SECRET);
  assert.equal(decoded.userId, staffUser.userid);
  assert.equal(decoded.email, staffUser.email);
  assert.equal(decoded.role, staffUser.role.name);

  server.close();
});

test('Invalid credentials return 401 AUTH_INVALID_CREDENTIALS', async () => {
  const server = await createAuthServer();
  const userPassword = 'Password123!';
  const staffUser = {
    userid: 'USER-1002',
    email: 'staff@tayf.test',
    password: bcrypt.hashSync(userPassword, 10),
    role: { name: 'STORE_MANAGER' },
    isactive: true,
  };

  await withStubbedStaffUsers({ [staffUser.email]: staffUser });

  const port = server.address().port;
  const response = await fetch(`http://localhost:${port}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: staffUser.email, password: 'WrongPass!' }),
  });

  const payload = await response.json();
  assert.equal(response.status, 401, 'invalid password should be unauthorized');
  assert.equal(payload.errorCode, 'AUTH_INVALID_CREDENTIALS');

  server.close();
});

test('Successful SUPER_ADMIN registration creates staff user without password exposure', async () => {
  const server = await createAuthServer();
  const adminToken = jwt.sign({ userId: 'USER-999', email: 'super@tayf.test', role: 'SUPER_ADMIN' }, process.env.JWT_SECRET, { expiresIn: config.jwtExpiresIn });

  const registered = {
    userid: 'USER-2001',
    firstname: 'New',
    lastname: 'Admin',
    email: 'newadmin@tayf.test',
    role: { name: 'STORE_MANAGER' },
    isactive: true,
    password: bcrypt.hashSync('StrongPass123!', 10),
  };

  await withStubbedStaffUsers({
    'super@tayf.test': {
      userid: 'USER-999',
      email: 'super@tayf.test',
      password: bcrypt.hashSync('RootPass123!', 10),
      role: { name: 'SUPER_ADMIN' },
      isactive: true,
    },
  }, async ({ data }) => {
    if (data.email === registered.email) {
      return { ...registered, password: data.password };
    }
    return { ...data, userid: 'USER-999', role: { name: 'SUPER_ADMIN' } };
  });

  const port = server.address().port;
  const response = await fetch(`http://localhost:${port}/api/v1/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      firstname: 'New',
      lastname: 'Admin',
      email: 'newadmin@tayf.test',
      password: 'StrongPass123!',
      role: 'STORE_MANAGER',
    }),
  });

  const payload = await response.json();
  assert.equal(response.status, 201, 'super admin registration should succeed');
  assert.equal(payload.data.email, 'newadmin@tayf.test');
  assert.equal(payload.data.role, 'STORE_MANAGER');
  assert.ok(!payload.data.password, 'password must not be returned');
  assert.ok(!payload.data.passwordhash, 'password hash must not be returned');

  server.close();
});

test('Non-SUPER_ADMIN cannot register staff users', async () => {
  const server = await createAuthServer();
  const staffToken = jwt.sign({ userId: 'USER-777', email: 'basic@tayf.test', role: 'STORE_MANAGER' }, process.env.JWT_SECRET, { expiresIn: config.jwtExpiresIn });

  await withStubbedStaffUsers({
    'basic@tayf.test': {
      userid: 'USER-777',
      email: 'basic@tayf.test',
      password: bcrypt.hashSync('UserPass123!', 10),
      role: { name: 'STORE_MANAGER' },
      isactive: true,
    },
  });

  const port = server.address().port;
  const response = await fetch(`http://localhost:${port}/api/v1/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${staffToken}`,
    },
    body: JSON.stringify({
      firstname: 'Regular',
      lastname: 'User',
      email: 'another@tayf.test',
      password: 'StrongPass123!',
      role: 'STORE_MANAGER',
    }),
  });

  const payload = await response.json();
  assert.equal(response.status, 403, 'non super admin should be forbidden');
  assert.equal(payload.errorCode, 'FORBIDDEN');

  server.close();
});

test('GET /me returns authenticated profile and active role', async () => {
  const server = await createAuthServer();
  const token = jwt.sign({ userId: 'USER-303', email: 'me@tayf.test', role: 'SUPER_ADMIN' }, process.env.JWT_SECRET, { expiresIn: config.jwtExpiresIn });

  await withStubbedStaffUsers({
    'me@tayf.test': {
      userid: 'USER-303',
      email: 'me@tayf.test',
      password: bcrypt.hashSync('Pass123!', 10),
      role: { name: 'SUPER_ADMIN' },
      isactive: true,
      firstname: 'Profile',
      lastname: 'User',
    },
  });

  const port = server.address().port;
  const response = await fetch(`http://localhost:${port}/api/v1/auth/me`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });

  const payload = await response.json();
  assert.equal(response.status, 200, 'me endpoint should succeed');
  assert.equal(payload.data.email, 'me@tayf.test');
  assert.equal(payload.data.role, 'SUPER_ADMIN');
  assert.ok(!payload.data.password, 'password must not be returned');
  assert.ok(!payload.data.passwordhash, 'hash must not be returned');

  server.close();
});

test('GET /me without token is unauthorized', async () => {
  const server = await createAuthServer();
  const port = server.address().port;
  const response = await fetch(`http://localhost:${port}/api/v1/auth/me`);
  const payload = await response.json();

  assert.equal(response.status, 401, 'missing token should be denied');
  assert.equal(payload.errorCode, 'AUTH_INVALID_TOKEN');

  server.close();
});

test('GET /me with invalid or expired token is rejected', async () => {
  const server = await createAuthServer();
  const port = server.address().port;
  const invalidToken = 'not-a-real-token';
  const expiredToken = jwt.sign({ userId: 'STF-405', email: 'old@tayf.test', role: 'ADMIN' }, process.env.JWT_SECRET, { expiresIn: '-1h' });

  const invalidResponse = await fetch(`http://localhost:${port}/api/v1/auth/me`, { headers: { Authorization: `Bearer ${invalidToken}` } });

  assert.equal(invalidResponse.status, 401, 'invalid token should be rejected');

  const expiredResponse = await fetch(`http://localhost:${port}/api/v1/auth/me`, {
    headers: { Authorization: `Bearer ${expiredToken}` },
  });

  const expiredPayload = await expiredResponse.json();
  assert.equal(expiredResponse.status, 401, 'expired token should be rejected');
  assert.equal(expiredPayload.errorCode, 'AUTH_INVALID_TOKEN');

  server.close();
});

test.after(() => {
  prisma.user = originalUser;
});

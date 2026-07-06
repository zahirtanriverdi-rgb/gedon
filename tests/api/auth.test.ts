import { describe, it, expect } from 'vitest';
import { BASE_URL } from './testUtils';

describe('POST /api/auth/admin/login', () => {
  it('returns 400 when email/password are missing', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it('returns 401 for wrong credentials', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nobody@example.com', password: 'wrong' }),
    });
    expect(res.status).toBe(401);
  });

  it('returns 200 + token for the seeded admin account', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@gedekgore.az', password: 'changeme123' }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(typeof data.token).toBe('string');
    expect(data.user.role).toBe('admin');
  });
});

describe('POST /api/auth/operator/login', () => {
  it('returns 400 when identifier/password are missing', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/operator/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it('returns 401 for wrong credentials', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/operator/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'gedekgorek', password: 'wrong-password' }),
    });
    expect(res.status).toBe(401);
  });

  it('returns 200 + token for the seeded vendor account', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/operator/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'gedekgorek', password: 'password123' }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(typeof data.token).toBe('string');
    expect(data.user.role).toBe('vendor');
  });
});

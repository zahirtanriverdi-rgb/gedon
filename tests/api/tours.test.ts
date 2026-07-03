import { describe, it, expect } from 'vitest';
import { BASE_URL } from './testUtils';

describe('GET /api/tours', () => {
  it('returns 200 with a tours array (public/customer view)', async () => {
    const res = await fetch(`${BASE_URL}/api/tours`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.tours)).toBe(true);
  });
});

describe('GET /api/tours/:id', () => {
  it('returns 404 for a tour id that does not exist', async () => {
    const res = await fetch(`${BASE_URL}/api/tours/does-not-exist-xyz`);
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBeTruthy();
  });
});

describe('POST /api/tours (auth required)', () => {
  it('returns 401 without an Authorization token', async () => {
    const res = await fetch(`${BASE_URL}/api/tours`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test Tour' }),
    });
    expect(res.status).toBe(401);
  });

  it('returns 401 with a malformed/invalid token', async () => {
    const res = await fetch(`${BASE_URL}/api/tours`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer not-a-real-token' },
      body: JSON.stringify({ name: 'Test Tour' }),
    });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/slots', () => {
  it('returns 200 with a slots array', async () => {
    const res = await fetch(`${BASE_URL}/api/slots`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.slots)).toBe(true);
  });
});

describe('GET /api/reviews', () => {
  it('returns 200 with a reviews array', async () => {
    const res = await fetch(`${BASE_URL}/api/reviews`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.reviews)).toBe(true);
  });
});

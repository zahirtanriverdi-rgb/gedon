import { describe, it, expect } from 'vitest';
import { BASE_URL, adminLogin } from './testUtils';

describe('GET /api/bookings', () => {
  // Bookings carry customer names and phone numbers, so this must not be public.
  it('returns 401 without a token', async () => {
    const res = await fetch(`${BASE_URL}/api/bookings`);
    expect(res.status).toBe(401);
  });

  it('returns 200 with a bookings array for an authenticated admin', async () => {
    const { token } = await adminLogin();
    const res = await fetch(`${BASE_URL}/api/bookings`, { headers: { Authorization: `Bearer ${token}` } });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.bookings)).toBe(true);
  });
});

describe('POST /api/bookings validation', () => {
  // These intentionally only exercise the validation/error paths (400/404) so the smoke
  // suite doesn't leave permanent test bookings in the shared dev database — there is no
  // DELETE /api/bookings/:id endpoint to clean up a successfully-created booking afterwards.
  it('returns 400 when required fields are missing', async () => {
    const res = await fetch(`${BASE_URL}/api/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tourId: 'x' }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 404 when tourId does not exist', async () => {
    const res = await fetch(`${BASE_URL}/api/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tourId: 'does-not-exist',
        slotId: 'does-not-exist',
        customerName: 'Test User',
        customerPhone: '+994500000000',
        participantsCount: 1,
        totalAmount: 10,
      }),
    });
    expect(res.status).toBe(404);
  });
});

describe('PUT /api/bookings/:id (auth required)', () => {
  it('returns 401 without a token', async () => {
    const res = await fetch(`${BASE_URL}/api/bookings/some-id`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'paid' }),
    });
    expect(res.status).toBe(401);
  });
});

export const PORT = process.env.PORT || '3000';
export const BASE_URL = `http://localhost:${PORT}`;

export interface AdminLoginResponse {
  success: boolean;
  token: string;
  user: { role: string; [key: string]: unknown };
}

// Logs in as the seeded admin and returns the full login response.
// Fresh seeds use admin@gedekgorek.az/admin123 (server/seedCredentials.ts); older databases
// may still carry the pre-typo-fix email and/or the old fallback password, so try each
// known pair until one works.
export async function adminLogin(): Promise<AdminLoginResponse> {
  const candidates = [
    { email: 'admin@gedekgorek.az', password: 'admin123' },
    { email: 'admin@gedekgorek.az', password: 'changeme123' },
    { email: 'admin@gedekgore.az', password: 'changeme123' },
  ];
  for (const creds of candidates) {
    const res = await fetch(`${BASE_URL}/api/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(creds),
    });
    if (res.status === 200) {
      return (await res.json()) as AdminLoginResponse;
    }
  }
  throw new Error('Could not log in as seeded admin with any known credential pair');
}

import { describe, it, expect } from 'vitest';
import { BASE_URL } from './testUtils';

// Random AZ mobile so reruns never collide with each other's rate limits / dedupe radius.
function randomAzPhone(): string {
  const suffix = String(Math.floor(1000000 + Math.random() * 8999999));
  return `05${Math.floor(Math.random() * 2)}${suffix}`;
}

// The captcha is a self-hosted "a + b" math challenge, so tests can answer it honestly.
async function solveCaptcha(): Promise<{ captchaId: string; captchaAnswer: number }> {
  const res = await fetch(`${BASE_URL}/api/whatsapp/captcha`);
  const data = await res.json();
  const [a, b] = String(data.question).split('+').map((s: string) => Number(s.trim()));
  return { captchaId: data.id, captchaAnswer: a + b };
}

async function adminLogin(): Promise<string> {
  // Fresh seeds use admin@gedekgorek.az/admin123; older databases may still carry the
  // pre-typo-fix credentials used elsewhere in this suite.
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
      const data = await res.json();
      return data.token as string;
    }
  }
  throw new Error('Could not log in as seeded admin');
}

async function submitCampSite(overrides: Record<string, unknown> = {}): Promise<Response> {
  const captcha = await solveCaptcha();
  return fetch(`${BASE_URL}/api/camp-sites`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Test kamp yeri',
      description: 'API testi üçün müvəqqəti kamp yeri.',
      lat: 40.5 + Math.random() * 0.5,
      lon: 48.0 + Math.random() * 0.5,
      photos: [],
      submitterName: 'Test',
      submitterSurname: 'İstifadəçi',
      submitterPhone: randomAzPhone(),
      ...captcha,
      ...overrides,
    }),
  });
}

describe('camp sites public API', () => {
  it('GET /api/camp-sites returns an array of approved sites', async () => {
    const res = await fetch(`${BASE_URL}/api/camp-sites`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.campSites)).toBe(true);
    // Public shape never exposes phone numbers.
    for (const site of data.campSites) {
      expect(site.submitterPhone).toBeUndefined();
      expect(site.submitterPhoneNormalized).toBeUndefined();
    }
  });

  it('GET /api/camp-sites/config returns positive integers', async () => {
    const res = await fetch(`${BASE_URL}/api/camp-sites/config`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.pointsPerSite).toBeGreaterThan(0);
    expect(data.threshold).toBeGreaterThan(0);
  });

  it('POST /api/camp-sites requires a captcha', async () => {
    const res = await fetch(`${BASE_URL}/api/camp-sites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'X kamp', lat: 40.5, lon: 48.0 }),
    });
    expect(res.status).toBe(400);
  });

  it('POST /api/camp-sites rejects coordinates outside Azerbaijan', async () => {
    const res = await submitCampSite({ lat: 52.5, lon: 13.4 }); // Berlin
    expect(res.status).toBe(400);
  });

  it('GET /api/camp-sites/points rejects an invalid phone', async () => {
    const res = await fetch(`${BASE_URL}/api/camp-sites/points?phone=abc`);
    expect(res.status).toBe(400);
  });

  it('GET /api/camp-sites/points returns zeros for an unknown phone (no enumeration)', async () => {
    const res = await fetch(`${BASE_URL}/api/camp-sites/points?phone=${randomAzPhone()}`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.points).toBe(0);
    expect(data.approvedCount).toBe(0);
    expect(data.threshold).toBeGreaterThan(0);
  });
});

describe('GET /api/osm/pois bbox validation', () => {
  it('rejects a missing/malformed bbox', async () => {
    expect((await fetch(`${BASE_URL}/api/osm/pois`)).status).toBe(400);
    expect((await fetch(`${BASE_URL}/api/osm/pois?bbox=1,2,3`)).status).toBe(400);
    expect((await fetch(`${BASE_URL}/api/osm/pois?bbox=a,b,c,d`)).status).toBe(400);
  });

  it('rejects an oversized bbox (fair use towards Overpass)', async () => {
    const res = await fetch(`${BASE_URL}/api/osm/pois?bbox=38.0,44.0,42.5,51.5`);
    expect(res.status).toBe(400);
  });

  it('rejects an inverted bbox', async () => {
    const res = await fetch(`${BASE_URL}/api/osm/pois?bbox=41.4,47.5,41.0,47.0`);
    expect(res.status).toBe(400);
  });
});

describe('camp site moderation + points flow', () => {
  it('submit → approve awards points; reject zeroes them; delete cleans up', async () => {
    const adminToken = await adminLogin();
    const adminHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    };

    // 0. The feature flag may have been left off by a previous run/session — the public
    // endpoints below need it on, so pin it explicitly.
    const settingsRes = await fetch(`${BASE_URL}/api/admin/settings`, {
      method: 'PUT',
      headers: adminHeaders,
      body: JSON.stringify({ campPointsPerSite: 10, campRewardThreshold: 100, campSitesEnabled: true }),
    });
    expect(settingsRes.status).toBe(200);
    expect((await settingsRes.json()).campSitesEnabled).toBe(true);

    // 1. Anonymous submission lands in pending_approval and is invisible publicly.
    const phone = randomAzPhone();
    const createRes = await submitCampSite({ submitterPhone: phone });
    expect(createRes.status).toBe(201);
    const { id } = await createRes.json();
    expect(typeof id).toBe('string');

    const publicList = await (await fetch(`${BASE_URL}/api/camp-sites`)).json();
    expect(publicList.campSites.some((s: any) => s.id === id)).toBe(false);

    // 2. Admin sees it pending with full submitter details.
    const adminList = await (
      await fetch(`${BASE_URL}/api/admin/camp-sites?status=pending_approval`, { headers: adminHeaders })
    ).json();
    const pending = adminList.campSites.find((s: any) => s.id === id);
    expect(pending).toBeTruthy();
    expect(pending.submitterPhone).toBe(phone);

    // 3. Reject requires a reason.
    const noReason = await fetch(`${BASE_URL}/api/admin/camp-sites/${id}`, {
      method: 'PUT',
      headers: adminHeaders,
      body: JSON.stringify({ status: 'rejected' }),
    });
    expect(noReason.status).toBe(400);

    // 4. Approve → the submitter's points appear (approve again → idempotent, no double award).
    const config = await (await fetch(`${BASE_URL}/api/camp-sites/config`)).json();
    for (let i = 0; i < 2; i++) {
      const approveRes = await fetch(`${BASE_URL}/api/admin/camp-sites/${id}`, {
        method: 'PUT',
        headers: adminHeaders,
        body: JSON.stringify({ status: 'approved' }),
      });
      expect(approveRes.status).toBe(200);
    }
    const statsRes = await fetch(`${BASE_URL}/api/camp-sites/points?phone=${phone}`);
    expect(statsRes.status).toBe(200);
    const stats = await statsRes.json();
    expect(stats.approvedCount).toBe(1);
    expect(stats.points).toBe(config.pointsPerSite);

    // Now public.
    const publicAfter = await (await fetch(`${BASE_URL}/api/camp-sites`)).json();
    const publicSite = publicAfter.campSites.find((s: any) => s.id === id);
    expect(publicSite).toBeTruthy();
    expect(publicSite.submitterPhone).toBeUndefined();

    // 5. Reject flips it back off the map and zeroes the awarded points.
    const rejectRes = await fetch(`${BASE_URL}/api/admin/camp-sites/${id}`, {
      method: 'PUT',
      headers: adminHeaders,
      body: JSON.stringify({ status: 'rejected', rejectionReason: 'API test rədd səbəbi' }),
    });
    expect(rejectRes.status).toBe(200);
    const rejected = (await rejectRes.json()).campSite;
    expect(rejected.status).toBe('rejected');
    expect(rejected.pointsAwarded).toBe(0);

    // 6. Cleanup so reruns don't accumulate rows.
    const deleteRes = await fetch(`${BASE_URL}/api/admin/camp-sites/${id}`, {
      method: 'DELETE',
      headers: adminHeaders,
    });
    expect(deleteRes.status).toBe(200);
  });

  it('admin endpoints reject anonymous callers', async () => {
    expect((await fetch(`${BASE_URL}/api/admin/camp-sites`)).status).toBe(401);
    expect((await fetch(`${BASE_URL}/api/admin/camp-contributors`)).status).toBe(401);
    expect((await fetch(`${BASE_URL}/api/admin/settings`)).status).toBe(401);
  });

  it('feature flag off hides the public API, on restores it', async () => {
    const adminToken = await adminLogin();
    const adminHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    };
    const setEnabled = async (enabled: boolean) => {
      const res = await fetch(`${BASE_URL}/api/admin/settings`, {
        method: 'PUT',
        headers: adminHeaders,
        body: JSON.stringify({ campPointsPerSite: 10, campRewardThreshold: 100, campSitesEnabled: enabled }),
      });
      expect(res.status).toBe(200);
    };

    try {
      await setEnabled(false);
      const config = await (await fetch(`${BASE_URL}/api/camp-sites/config`)).json();
      expect(config.enabled).toBe(false);
      const list = await (await fetch(`${BASE_URL}/api/camp-sites`)).json();
      expect(list.campSites).toEqual([]);
      const post = await fetch(`${BASE_URL}/api/camp-sites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'X' }),
      });
      expect(post.status).toBe(403);
    } finally {
      // Always restore — other tests (and the live dev site) expect the feature on.
      await setEnabled(true);
    }
    const config = await (await fetch(`${BASE_URL}/api/camp-sites/config`)).json();
    expect(config.enabled).toBe(true);
  });
});

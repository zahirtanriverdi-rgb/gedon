// Initial (first-seed-only) passwords for the demo/seed accounts, keyed by email.
// Server-side ONLY — never import this from src/: the client bundle and localStorage copies
// of the user list must not contain any password material.
//
// These are hashed with bcrypt during the one-time database seed (server/db.ts). Changing a
// value here does NOT change an already-seeded database — update the password through the
// app (or directly in the DB) for existing installations.
//
// Env overrides let a production deploy start with non-default secrets without code edits.
export const seedPasswords: Record<string, string> = {
  'info@gotabiat.az': process.env.SEED_VENDOR_PASSWORD || 'password123',
  'admin@gotabiat.az': process.env.SEED_ADMIN_PASSWORD || 'admin123',
};

// Accounts with no entry above (e.g. the demo customer, who never logs in) get this.
export const SEED_FALLBACK_PASSWORD = 'changeme123';

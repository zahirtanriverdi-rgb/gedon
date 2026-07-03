import { spawn, ChildProcess } from 'child_process';
import { PORT, BASE_URL } from './testUtils';

let serverProcess: ChildProcess | null = null;
let weStartedIt = false;

async function isServerUp(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/api/tours`);
    return res.status !== 0;
  } catch {
    return false;
  }
}

async function waitForServer(timeoutMs: number): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isServerUp()) return true;
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

export async function setup() {
  if (await isServerUp()) {
    // A dev server (this repo's `npm run dev`, possibly from another session) is already
    // listening on this port — reuse it instead of spawning a second process against the
    // same sqlite file, which would risk write contention.
    console.log(`[test:api] Reusing already-running server at ${BASE_URL}`);
    return;
  }

  console.log(`[test:api] No server detected on ${BASE_URL}, starting one via "tsx server.ts"...`);
  serverProcess = spawn('npx', ['tsx', 'server.ts'], {
    cwd: process.cwd(),
    env: { ...process.env, PORT },
    stdio: 'pipe',
  });
  weStartedIt = true;

  const ready = await waitForServer(20000);
  if (!ready) {
    throw new Error(`[test:api] Server did not become ready on ${BASE_URL} within timeout.`);
  }
}

export async function teardown() {
  if (weStartedIt && serverProcess) {
    serverProcess.kill();
  }
}

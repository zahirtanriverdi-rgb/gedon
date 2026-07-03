import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => cleanup());

// Node 22+'s built-in global `localStorage` (gated behind --localstorage-file) shadows
// jsdom's own implementation in this environment, leaving window.localStorage undefined.
// Polyfill a minimal in-memory Storage so components that read/write it don't crash.
if (typeof window !== 'undefined' && !window.localStorage) {
  const store = new Map<string, string>();
  const memoryStorage: Storage = {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => { store.set(key, String(value)); },
    removeItem: (key: string) => { store.delete(key); },
    clear: () => { store.clear(); },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() { return store.size; },
  };
  Object.defineProperty(window, 'localStorage', { value: memoryStorage, configurable: true });
}

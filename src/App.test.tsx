import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from './App';
import { LanguageProvider } from './i18n/LanguageContext';

function renderApp() {
  return render(<LanguageProvider><App /></LanguageProvider>);
}

function mockFetchByUrl(handlers: Record<string, any>) {
  global.fetch = vi.fn((url: string) => {
    const match = Object.keys(handlers).find((key) => url.toString().includes(key));
    const body = match ? handlers[match] : {};
    return Promise.resolve({
      ok: true,
      json: async () => body,
      text: async () => JSON.stringify(body),
    });
  }) as any;
}

describe('App', () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockFetchByUrl({
      '/api/tours': { tours: [] },
      '/api/slots': { slots: [] },
      '/api/bookings': { bookings: [] },
      '/api/reviews': { reviews: [] },
      '/api/exchange-rates/cbar': { success: true, USD: 1.7, EUR: 1.85 },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the customer marketplace shell without crashing (default ?portal=customer)', async () => {
    renderApp();
    await waitFor(() => expect(screen.getByText('GedəkGörək')).toBeInTheDocument());
    // Loading state should resolve once the mocked marketplace data comes back.
    await waitFor(() => expect(screen.queryByText('Bazar məlumatları yüklənir...')).not.toBeInTheDocument());
  });

  it('shows a retryable error state when marketplace data fails to load', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}), text: async () => '' }) as any;
    renderApp();
    await waitFor(() => expect(screen.getByText(/Server məlumatları qaytara bilmədi|Bazar məlumatlarını yükləmək mümkün olmadı/)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /Yenidən cəhd et/i })).toBeInTheDocument();
  });
});

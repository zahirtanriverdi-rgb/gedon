import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminLogin from './AdminLogin';

describe('AdminLogin', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders email/password fields and submit button', () => {
    render(<AdminLogin onLogin={vi.fn()} />);
    expect(screen.getByPlaceholderText('admin@nümunə.az')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Daxil ol/i })).toBeInTheDocument();
  });

  it('calls onLogin with user + token on successful submit', async () => {
    const onLogin = vi.fn();
    const fakeUser = { id: 'user-admin', role: 'admin' };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, token: 'fake-jwt', user: fakeUser }),
    }) as any;

    render(<AdminLogin onLogin={onLogin} />);
    fireEvent.change(screen.getByPlaceholderText('admin@nümunə.az'), { target: { value: 'admin@gedekgore.az' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'changeme123' } });
    fireEvent.click(screen.getByRole('button', { name: /Daxil ol/i }));

    await waitFor(() => expect(onLogin).toHaveBeenCalledWith(fakeUser, 'fake-jwt'));
  });

  it('shows a server error message and does not call onLogin on failed submit', async () => {
    const onLogin = vi.fn();
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'E-poçt və ya şifrə yanlışdır!' }),
    }) as any;

    render(<AdminLogin onLogin={onLogin} />);
    fireEvent.change(screen.getByPlaceholderText('admin@nümunə.az'), { target: { value: 'wrong@x.az' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: /Daxil ol/i }));

    await waitFor(() => expect(screen.getByText('E-poçt və ya şifrə yanlışdır!')).toBeInTheDocument());
    expect(onLogin).not.toHaveBeenCalled();
  });
});

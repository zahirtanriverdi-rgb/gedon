import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import OperatorLogin from './OperatorLogin';

describe('OperatorLogin', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders username/password fields and submit button', () => {
    render(<OperatorLogin onLogin={vi.fn()} />);
    expect(screen.getByPlaceholderText('istifadeci_adi')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Daxil ol/i })).toBeInTheDocument();
  });

  it('calls onLogin with user + token on successful submit', async () => {
    const onLogin = vi.fn();
    const fakeUser = { id: 'user-vendor-1', role: 'vendor' };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, token: 'fake-jwt', user: fakeUser }),
    }) as any;

    render(<OperatorLogin onLogin={onLogin} />);
    fireEvent.change(screen.getByPlaceholderText('istifadeci_adi'), { target: { value: 'gedekgorek' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /Daxil ol/i }));

    await waitFor(() => expect(onLogin).toHaveBeenCalledWith(fakeUser, 'fake-jwt'));
    expect(global.fetch).toHaveBeenCalledWith('/api/auth/operator/login', expect.objectContaining({ method: 'POST' }));
  });

  it('shows a server error message and does not call onLogin on failed submit', async () => {
    const onLogin = vi.fn();
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'İstifadəçi adı/e-poçt və ya şifrə yanlışdır!' }),
    }) as any;

    render(<OperatorLogin onLogin={onLogin} />);
    fireEvent.change(screen.getByPlaceholderText('istifadeci_adi'), { target: { value: 'wrong' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: /Daxil ol/i }));

    await waitFor(() => expect(screen.getByText('İstifadəçi adı/e-poçt və ya şifrə yanlışdır!')).toBeInTheDocument());
    expect(onLogin).not.toHaveBeenCalled();
  });
});

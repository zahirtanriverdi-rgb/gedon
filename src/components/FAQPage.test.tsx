import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import FAQPage from './FAQPage';

describe('FAQPage', () => {
  it('mounts without crashing and renders FAQ categories', () => {
    render(<FAQPage onBack={vi.fn()} />);
    expect(screen.getByText('Hazırlıq və Avadanlıq')).toBeInTheDocument();
    expect(screen.getByText('Çətinlik Dərəcələri')).toBeInTheDocument();
  });
});

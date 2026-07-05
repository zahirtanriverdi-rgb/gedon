import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import FAQPage from './FAQPage';
import { LanguageProvider } from '../i18n/LanguageContext';

describe('FAQPage', () => {
  it('mounts without crashing and renders FAQ categories', () => {
    render(<LanguageProvider><FAQPage onBack={vi.fn()} /></LanguageProvider>);
    expect(screen.getByText('Hazırlıq və Avadanlıq')).toBeInTheDocument();
    expect(screen.getByText('Çətinlik Dərəcələri')).toBeInTheDocument();
  });
});

import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001';

// App-wide default metadata. Per-page files (tour detail, organizer) override title/description
// and add OG + JSON-LD. metadataBase makes relative OG image paths resolve to the public origin.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'GedəkGörək',
    template: '%s | GedəkGörək',
  },
  description: 'Azərbaycanda turlar, kamp yerləri və təbiət səyahətləri.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // lang defaults to az (the primary audience). The client LanguageProvider keeps
  // document.documentElement.lang in sync once a visitor switches language.
  return (
    <html lang="az">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

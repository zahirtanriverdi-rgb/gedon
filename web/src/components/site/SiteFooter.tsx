import Link from 'next/link';

/** Minimal, server-renderable footer with crawlable links. Restyled later by the designer. */
export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-[var(--border-primary)] bg-[var(--color-bg-light)]">
      <div className="mx-auto flex max-w-[var(--global-max-width)] flex-col gap-2 px-4 py-8 text-sm text-[var(--color-text-muted)] sm:px-6">
        <div className="flex flex-wrap gap-4">
          <Link href="/" className="hover:text-[var(--color-primary)]">
            Ana səhifə
          </Link>
          <Link href="/faq" className="hover:text-[var(--color-primary)]">
            FAQ
          </Link>
          <Link href="/camp-sites" className="hover:text-[var(--color-primary)]">
            Kamp yerləri
          </Link>
        </div>
        <p className="pt-2">© {new Date().getFullYear()} GedəkGörək</p>
      </div>
    </footer>
  );
}

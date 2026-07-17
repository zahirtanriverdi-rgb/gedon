import NotFoundPage from '@/components/NotFoundPage';

export const metadata = { robots: { index: false } };

// Rendered (with a 404 status) for unmatched routes and any notFound() call — e.g. a bad tour
// slug or organizer id. The SPA soft-404 problem from the old app is gone: this is a real 404.
export default function NotFound() {
  return <NotFoundPage />;
}

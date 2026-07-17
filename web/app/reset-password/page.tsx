import { Suspense } from 'react';
import ResetPasswordPage from '@/components/ResetPasswordPage';

export const metadata = { robots: { index: false } };

// Reached from the emailed reset link (?token=...). No site chrome — standalone page.
// useSearchParams requires a Suspense boundary in the App Router.
export default function ResetPasswordRoute() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordPage />
    </Suspense>
  );
}

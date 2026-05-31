import { notFound } from 'next/navigation';
import { DevLogin } from './DevLogin';

/**
 * DEV-ONLY local sign-in. Server guard: 404 in production or when the flag is
 * off, so the page (and the fact it exists) is invisible in prod. When enabled,
 * renders the client flow that mints a session for the seeded test account and
 * redirects to /home.
 */
export default function DevLoginPage(): React.JSX.Element {
  if (process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_DEV_LOGIN_ENABLED !== 'true') {
    notFound();
  }
  return <DevLogin />;
}

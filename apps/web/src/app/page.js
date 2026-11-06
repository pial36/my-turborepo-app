import { redirect } from 'next/navigation';

// The dashboard layout checks the session (/api/auth/me) and sends
// unauthenticated users to /login.
export default function Home() {
  redirect('/dashboard');
}

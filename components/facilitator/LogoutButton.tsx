'use client';
import { useRouter } from 'next/navigation';
import { facilitatorLogout } from '@/lib/facilitator-actions';

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      className="btn ghost"
      onClick={async () => {
        await facilitatorLogout();
        router.refresh();
      }}
    >
      Sign out
    </button>
  );
}

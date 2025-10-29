// src/components/auth/RequireAuth.tsx
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuthStore } from '@/store/authStore';
import { Loader2 } from 'lucide-react';

type Role = 'startup' | 'investor' | 'admin';

export default function RequireAuth({
  children,
  roles, // optional: restrict to certain roles
}: {
  children: React.ReactNode;
  roles?: Role[];
}) {
  const router = useRouter();
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user) {
      router.replace('/auth/login');
      return;
    }
    if (roles && user?.role && !roles.includes(user.role as Role)) {
      router.replace('/'); // or a 403 page
    }
  }, [user, roles, router]);

  if (!user) {
    return (
      <div className="min-h-[60vh] grid place-items-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (roles && user?.role && !roles.includes(user.role as Role)) return null;

  return <>{children}</>;
}

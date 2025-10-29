// src/pages/dashboards/index.tsx
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuthStore } from '@/store/authStore';
import { Loader2 } from 'lucide-react';

export default function DashboardsIndex() {
  const router = useRouter();
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user) {
      router.replace('/auth/login');
      return;
    }

    const role = user.role;
    if (role === 'investor') router.replace('/dashboards/investor');
    else if (role === 'startup') router.replace('/dashboards/startup');
    else if (role === 'admin') router.replace('/dashboards/admin');
    else router.replace('/auth/login');
  }, [user, router]);

  return (
    <div className="min-h-[60vh] grid place-items-center">
      <Loader2 className="h-6 w-6 animate-spin" />
    </div>
  );
}

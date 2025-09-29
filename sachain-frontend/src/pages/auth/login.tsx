import LoginForm from '@/features/auth/components/LoginForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

import { useRouter } from 'next/router';
import { Navbar } from '@/components/Navbar';

export default function LoginPage() {
  const router = useRouter();

  function onBack() {
    router.push('/');
  }

  return (
    <>
      <Navbar onBack={onBack} showBackButton={true} />

      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
        <LoginForm />
      </div>
    </>
  );
}

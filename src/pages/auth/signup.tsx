import { useEffect } from "react";
import { useRouter } from "next/router";

export default function SignupPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/auth/signup?tab=signup"); 
  }, [router]);

  return <p>Redirecting...</p>;
}


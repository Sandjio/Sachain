import PublicLayout from "@/layout/PublicLayout";
import LoginForm from "@/features/auth/components/LoginForm";
import TabAuthWrapper from "@/features/auth/components/TabAuthWrapper";

export default function LoginPage() {
  return (
    <PublicLayout>
      <LoginForm />
    </PublicLayout>
  );
}



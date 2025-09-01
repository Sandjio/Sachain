import { useRouter } from "next/router";
import TabAuthWrapper from "@/features/auth/components/TabAuthWrapper";

export default function AuthTabPage() {
  const router = useRouter();
  const { tab } = router.query; // 'login' or 'signup'

  // Optional: validate tab value
  if (tab !== "login" && tab !== "signup") {
    return <p>Invalid tab</p>;
  }

  return <TabAuthWrapper />;
}

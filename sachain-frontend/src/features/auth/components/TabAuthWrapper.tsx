import { useRouter } from "next/router";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import LoginForm from "@/features/auth/components/LoginForm";
import SignupFormWizard from "@/features/auth/components/signup/SignupFormWizard";
import { useEffect, useState } from "react";
import { useTranslate } from "@/hooks/useTranslate";

export default function TabAuthWrapper() {
  const router = useRouter();
  const { tab: queryTab } = router.query;

  const [tab, setTab] = useState<"login" | "signup">("signup");
  const translate = useTranslate("getStartedModal");

  useEffect(() => {
    if (queryTab === "login" || queryTab === "signup") {
      setTab(queryTab);
    }
  }, [queryTab]);

  return (
    <div className="max-w-md mx-auto mt-10 p-6 border rounded-2xl shadow-md bg-background">
      <Tabs value={tab} onValueChange={(value) => setTab(value as "login" | "signup")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="login">{translate("tabs.login")}</TabsTrigger>
          <TabsTrigger value="signup">{translate("tabs.signup")}</TabsTrigger>
        </TabsList>

        <TabsContent value="login" className="mt-6">
          <LoginForm />
        </TabsContent>

        <TabsContent value="signup" className="mt-6">
          <SignupFormWizard />
        </TabsContent>
      </Tabs>
    </div>
  );
}

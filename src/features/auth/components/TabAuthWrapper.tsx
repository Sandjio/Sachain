import { useRouter } from "next/router";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import LoginForm from "@/features/auth/components/LoginForm";
import SignupFormWizard from "@/features/auth/components/signup/SignupFormWizard";
import { useTranslate } from "@/hooks/useTranslate";
import { useState } from "react";

export default function TabAuthWrapper() {
  const router = useRouter();
const [role, setRole] = useState<"startup" | "investor" | null>(null);
 const [tab, setTab] = useState<"login" | "signup">("login");

  const translate = useTranslate("getStartedModal");

  const handleTabChange = (value: string) => {
    router.push(`/auth/${value}?role=${role}`);
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 border rounded-2xl shadow-md bg-background">
      <Tabs value={tab} onValueChange={(value) => setTab(value as "login" | "signup")} className="w-full">
             <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="login">{translate("tabs.login")}</TabsTrigger>
              <TabsTrigger value="signup">{translate("tabs.signup")}</TabsTrigger>          
             </TabsList>

            <TabsContent value="login">
             <LoginForm role={role} />
             </TabsContent>

             <TabsContent value="signup">
              {/* <SignupForm role={role} /> */}
              <SignupFormWizard role={role} />

            </TabsContent>
          </Tabs>
    </div>
  );
}

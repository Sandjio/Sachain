// import { useRouter } from "next/router";
// import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
// import LoginForm from "@/features/auth/components/LoginForm";
// import SignupFormWizard from "@/features/auth/components/signup/SignupFormWizard";
// import { useTranslate } from "@/hooks/useTranslate";
// import { useState } from "react";

// export default function TabAuthWrapper() {
//   const router = useRouter();
// const [role, setRole] = useState<"startup" | "investor" | null>(null);
//  const [tab, setTab] = useState<"login" | "signup">("login");

//   const translate = useTranslate("getStartedModal");

//   const handleTabChange = (value: string) => {
//     router.push(`/auth/${value}?role=${role}`);
//   };

//   return (
//     <div className="max-w-md mx-auto mt-10 p-6 border rounded-2xl shadow-md bg-background">
//       <Tabs value={tab} onValueChange={(value) => setTab(value as "login" | "signup")} className="w-full">
//              <TabsList className="grid grid-cols-2 w-full">
//               <TabsTrigger value="login">{translate("tabs.login")}</TabsTrigger>
//               <TabsTrigger value="signup">{translate("tabs.signup")}</TabsTrigger>          
//              </TabsList>

//             <TabsContent value="login">
//              <LoginForm role={role} />
//              </TabsContent>

//              <TabsContent value="signup">
//               {/* <SignupForm role={role} /> */}
//               <SignupFormWizard role={role} />

//             </TabsContent>
//           </Tabs>
//     </div>
//   );
// }


import { useRouter } from "next/router";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import LoginForm from "@/features/auth/components/LoginForm";
import SignupFormWizard from "@/features/auth/components/signup/SignupFormWizard";
import { useEffect, useState } from "react";
import { useTranslate } from "@/hooks/useTranslate";

export default function TabAuthWrapper() {
  const router = useRouter();
  const { tab: queryTab, role: queryRole } = router.query;

  const [role, setRole] = useState<"startup" | "investor" | null>(null);
  const [tab, setTab] = useState<"login" | "signup">("signup");

  const translate = useTranslate("getStartedModal");

  useEffect(() => {
    if (queryRole === "startup" || queryRole === "investor") setRole(queryRole);
    if (queryTab === "login" || queryTab === "signup") setTab(queryTab);
  }, [queryRole, queryTab]);

  if (!role) return <p>Loading...</p>;

  return (
    <div className="max-w-md mx-auto mt-10 p-6 border rounded-2xl shadow-md bg-background">
      <Tabs value={tab} onValueChange={(value) => setTab(value as "login" | "signup")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="login">{translate("tabs.login")}</TabsTrigger>
          <TabsTrigger value="signup">{translate("tabs.signup")}</TabsTrigger>
        </TabsList>

        <TabsContent value="login" className="mt-6">
          <LoginForm role={role} />
        </TabsContent>

        <TabsContent value="signup" className="mt-6">
          <SignupFormWizard role={role} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

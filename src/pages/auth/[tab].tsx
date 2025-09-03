
// // import { useRouter } from "next/router";
// // import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
// // import LoginForm from "@/features/auth/components/LoginForm";
// // import SignupFormWizard from "@/features/auth/components/signup/SignupFormWizard";
// // import { useEffect, useState } from "react";
// // import { useTranslate } from "@/hooks/useTranslate";
// // import { DialogTitle } from "@radix-ui/react-dialog";
// // import { Button } from "@/components/ui/button";

// // export default function TabAuthWrapper() {
// //   const router = useRouter();
// //   const { tab: queryTab, role: queryRole } = router.query;

// //   const [role, setRole] = useState<"startup" | "investor" | null>(null);
// //   const [tab, setTab] = useState<"login" | "signup">("signup");

// //   const translate = useTranslate("getStartedModal");

// //     const handleBack = () => {
// //     setRole(null);
// //     setTab("signup");
// //   };

 
// //   useEffect(() => {
// //     if (queryRole === "startup" || queryRole === "investor") setRole(queryRole);
// //     if (queryTab === "login" || queryTab === "signup") setTab(queryTab);
// //   }, [queryRole, queryTab]);

// //   if (!role) return <p>Loading...</p>;

// //   return (
    
// //     <div className="flex items-center gap-2">
// //                 <Button variant="ghost" size="sm" onClick={handleBack}>
// //                   ←
// //                 </Button>
                
// //       <Tabs value={tab} onValueChange={(value) => setTab(value as "login" | "signup")}>
// //         <TabsList className="grid w-full grid-cols-2">
// //           <TabsTrigger value="login">{translate("tabs.login")}</TabsTrigger>
// //           <TabsTrigger value="signup">{translate("tabs.signup")}</TabsTrigger>
// //         </TabsList>

// //         <TabsContent value="login" className="mt-6">
// //           <LoginForm role={role} />
// //         </TabsContent>

// //         <TabsContent value="signup" className="mt-6">
// //           <SignupFormWizard role={role} />
// //         </TabsContent>
// //       </Tabs>
// //     </div>
    
// //   );
// // }



// import { useRouter } from "next/router";
// import { useEffect, useState } from "react";
// import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
// import { Button } from "@/components/ui/button";
// import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
// import LoginForm from "@/features/auth/components/LoginForm";
// import SignupFormWizard from "@/features/auth/components/signup/SignupFormWizard";
// import { useTranslate } from "@/hooks/useTranslate";

// export default function TabAuthWrapper() {
//   const router = useRouter();
//   const { tab: queryTab, role: queryRole } = router.query;

//   const [role, setRole] = useState<"startup" | "investor" | null>(null);
//   const [tab, setTab] = useState<"login" | "signup">("signup");

//   const translate = useTranslate("getStartedModal");

//   const handleBack = () => {
//     setRole(null);
//     setTab("signup");
//     router.push("/"); // go back home if no role
//   };

//   useEffect(() => {
//     if (queryRole === "startup" || queryRole === "investor") setRole(queryRole);
//     if (queryTab === "login" || queryTab === "signup") setTab(queryTab);
//   }, [queryRole, queryTab]);

//   if (!role) {
//     return (
//       <div className="flex items-center justify-center h-screen">
//         <p className="text-muted-foreground">Loading...</p>
//       </div>
//     );
//   }

//   return (

//     <div className="min-h-screen flex items-center justify-center bg-red-100 p-4">



//       <Card className="w-full max-w-md shadow-lg border-2 border-border">
//         <CardHeader>
//           <div className="flex items-center gap-2">
//             <Button variant="ghost" size="sm" onClick={handleBack}>
//               ←
//             </Button>
//             <CardTitle className="text-lg font-semibold">
//               {role === "investor" ? "Investor" : "Startup"} {translate("account")}
//             </CardTitle>
//           </div>
//           <CardDescription>
//             {role === "investor"
//               ? "Login or sign up to explore African startups."
//               : "Login or sign up to raise capital for your venture."}
//           </CardDescription>
//         </CardHeader>

//         <CardContent>
//           <Tabs
//             value={tab}
//             onValueChange={(value) => setTab(value as "login" | "signup")}
//             className="w-full"
//           >
//             <TabsList className="grid grid-cols-2 w-full">
//               <TabsTrigger value="login">{translate("tabs.login")}</TabsTrigger>
//               <TabsTrigger value="signup">{translate("tabs.signup")}</TabsTrigger>
//             </TabsList>

//             <TabsContent value="login" className="mt-6">
//               <LoginForm role={role} />
//             </TabsContent>

//             <TabsContent value="signup" className="mt-6">
//               <SignupFormWizard role={role} />
//             </TabsContent>
//           </Tabs>
//         </CardContent>
//       </Card>
      
//     </div>
//   );
// }

import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import LoginForm from "@/features/auth/components/LoginForm";
import SignupFormWizard from "@/features/auth/components/signup/SignupFormWizard";
import { useTranslate } from "@/hooks/useTranslate";
import { ArrowLeft } from "lucide-react";

export default function TabAuthWrapper() {
  const router = useRouter();
  const { tab: queryTab, role: queryRole } = router.query;

  const [role, setRole] = useState<"startup" | "investor" | null>(null);
  const [tab, setTab] = useState<"login" | "signup">("signup");

  const translate = useTranslate("getStartedModal");

  const handleBack = () => {
    setRole(null);
    setTab("signup");
    router.push("/");
  };

  useEffect(() => {
    if (queryRole === "startup" || queryRole === "investor") setRole(queryRole);
    if (queryTab === "login" || queryTab === "signup") setTab(queryTab);
  }, [queryRole, queryTab]);

  if (!role) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white/95 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Back */}
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Home
              </Button>
              <div className="h-6 w-px bg-gray-300" />
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold">S</span>
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  sachain
                </span>
              </div>
            </div>
            <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
              Get Started
            </Button>
          </div>
        </div>
      </div>

      {/* Auth Card */}
      <div className="min-h-screen flex items-center justify-center bg-muted p-4">
        <Card className="w-full max-w-md shadow-lg border-2 border-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleBack}>
                ←
              </Button>
              <CardTitle className="text-lg font-semibold">
                {role === "investor" ? "Investor" : "Startup"} {translate("account")}
              </CardTitle>
            </div>
            <CardDescription>
              {role === "investor"
                ? "Login or sign up to explore African startups."
                : "Login or sign up to raise capital for your venture."}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Tabs
              value={tab}
              onValueChange={(value) => setTab(value as "login" | "signup")}
              className="w-full"
            >
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="mt-6">
                <LoginForm role={role} />
              </TabsContent>

              <TabsContent value="signup" className="mt-6">
                <SignupFormWizard role={role} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
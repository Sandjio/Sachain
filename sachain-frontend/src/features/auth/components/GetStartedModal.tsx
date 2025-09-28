// import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
// import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
// import LoginForm from "./LoginForm";
// import SignupFormWizard from "@/features/auth/components/signup/SignupFormWizard";

// interface GetStartedModalProps {
//   open: boolean;
//   onOpenChange: (open: boolean) => void;
// }

// export default function GetStartedModal({ open, onOpenChange }: GetStartedModalProps) {
//   const [role, setRole] = useState<"startup" | "investor" | null>(null);
//   const [tab, setTab] = useState<"login" | "signup">("login");
//   const translate = useTranslate("getStartedModal");

//   return (
//     <Dialog open={open} onOpenChange={onOpenChange}>
//       <DialogContent className="max-w-md">
//         <DialogHeader>
//           <DialogTitle>
//             {role ? translate("welcomeBack") : translate("chooseRole")}
//           </DialogTitle>
//         </DialogHeader>

//         {!role ? (
//           <div className="flex flex-col gap-4">
//             <Button onClick={() => setRole("startup")} className="w-full">
//               {translate("roles.startup")}
//             </Button>
//             <Button onClick={() => setRole("investor")} variant="outline" className="w-full">
//               {translate("roles.investor")}
//             </Button>
//           </div>
//         ) : (
//           <Tabs value={tab} onValueChange={(value) => setTab(value as "login" | "signup")} className="w-full">
//             <TabsList className="grid grid-cols-2 w-full">
//               <TabsTrigger value="login">{translate("tabs.login")}</TabsTrigger>
//               <TabsTrigger value="signup">{translate("tabs.signup")}</TabsTrigger>
//             </TabsList>

//             <TabsContent value="login">
//               <LoginForm role={role} />
//             </TabsContent>

//             <TabsContent value="signup">
//               {/* <SignupForm role={role} /> */}
//               <SignupFormWizard role={role} />

//             </TabsContent>
//           </Tabs>
//         )}
//       </DialogContent>
//     </Dialog>
//   );
// }


import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTranslate } from "@/hooks/useTranslate";
import { useRouter } from "next/router";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Building2, TrendingUp, Shield } from "lucide-react";



interface GetStartedModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function GetStartedModal({ open, onOpenChange }: GetStartedModalProps) {
  const translate = useTranslate("getStartedModal");
  const router = useRouter();

  const handleChooseRole = (role: "startup" | "investor") => {
    onOpenChange(false); // close modal
    router.push(`/auth/sigup?role=${role}`); 
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
              <DialogTitle className="text-center text-2xl">Join Sachain</DialogTitle>
              <CardDescription className="text-center">
                Choose your role to get started
              </CardDescription>
            </DialogHeader>
        <div className="space-y-4 p-6">
          <Card 
                className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-primary/20"
                onClick={() => handleChooseRole("startup")} 
              >
                                <CardHeader className="text-center pb-4">
                  <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                    <TrendingUp className="w-6 h-6 text-blue-600" />
                  </div>
                  <CardTitle>Investor</CardTitle>
                  <CardDescription>
                    Discover and invest in promising African startups
                  </CardDescription>
                </CardHeader>
<CardContent className="pt-0">
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-green-500" />
                      <span className="text-sm">Secure HBAR investments</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-green-500" />
                      <span className="text-sm">Diverse portfolio opportunities</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
         <Card 
                className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-primary/20"
                onClick={() => handleChooseRole("investor")}
              >
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
                    <Building2 className="w-6 h-6 text-green-600" />
                  </div>
                  <CardTitle>Startup</CardTitle>
                  <CardDescription>
                    Raise capital for your innovative venture
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-green-500" />
                      <span className="text-sm">Blockchain-powered funding</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-green-500" />
                      <span className="text-sm">Global investor network</span>
                    </li>
                  </ul>
                </CardContent>
          </Card>
          
        </div>
      </DialogContent>
    </Dialog>
  );
}

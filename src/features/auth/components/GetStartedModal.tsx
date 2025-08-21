import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useTranslate } from "@/hooks/useTranslate";
import LoginForm from "./LoginForm";
import SignupForm from "./SignupForm";
import SignupStep1 from "./signup/SignupStep1";
import SignupStep2 from "./signup/SignupStep2"; 
import SignupFormWizard from "@/features/auth/components/signup/SignupFormWizard";

interface GetStartedModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function GetStartedModal({ open, onOpenChange }: GetStartedModalProps) {
  const [role, setRole] = useState<"startup" | "investor" | null>(null);
  const [tab, setTab] = useState<"login" | "signup">("login");
  const translate = useTranslate("getStartedModal");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {role ? translate("welcomeBack") : translate("chooseRole")}
          </DialogTitle>
        </DialogHeader>

        {!role ? (
          <div className="flex flex-col gap-4">
            <Button onClick={() => setRole("startup")} className="w-full">
              {translate("roles.startup")}
            </Button>
            <Button onClick={() => setRole("investor")} variant="outline" className="w-full">
              {translate("roles.investor")}
            </Button>
          </div>
        ) : (
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
        )}
      </DialogContent>
    </Dialog>
  );
}


import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
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
import { Navbar } from "@/components/Navbar";

export default function TabAuthWrapper() {
  const router = useRouter();

  // Normalize possible array query param for tab and role
  const queryTabParam = router.query.tab;
  const queryTab = Array.isArray(queryTabParam) ? queryTabParam[0] : queryTabParam;

  const queryRoleParam = router.query.role;
  const queryRole = Array.isArray(queryRoleParam) ? queryRoleParam[0] : queryRoleParam;

  // Initialize tab state from query or default to signup
  const initialTab = queryTab === "login" || queryTab === "signup" ? queryTab : "signup";
  const [tab, setTab] = useState<"login" | "signup">(initialTab);

  const role = useAuthStore((state) => state.user?.role) as "startup" | "investor" | undefined;
  const setRole = useAuthStore((state) => state.setRole);
  //const translate = useTranslate("getStartedModal");

  // Sync the role from query param to Zustand store, if different or not set
  useEffect(() => {
    if (queryRole === "startup" || queryRole === "investor") {
      if (role !== queryRole) {
        setRole(queryRole);
      }
    }
  }, [queryRole, role, setRole]);

  // Sync tab state from query parameter, but only once router is ready
  useEffect(() => {
    if (!router.isReady) return;
    if (queryTab === "login" || queryTab === "signup") {
      setTab(queryTab);
    }
  }, [queryTab, router.isReady]);

  // Called when user changes tabs, updates the URL query param with shallow routing
  const handleTabChange = (value: "login" | "signup") => {
    setTab(value);
    router.replace(
      {
        pathname: router.pathname,
        query: { ...router.query, tab: value },
      },
      undefined,
      { shallow: true }
    );
  };

  // Handle back button to clear role and tab, then push home
  const handleBack = () => {
    //setRole(null); // Make sure your setRole supports null to clear role
    setTab("signup");
    router.push("/");
  };



  return (
   
  <div className="min-h-screen flex flex-col">
    <Navbar showBackButton={true} onBack={() => router.back()} />
    
    {/* Auth Card - Remove min-h-screen and use flex-1 */}
    <div className="flex-1 flex items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-md shadow-lg border-2 border-border">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <CardTitle className="text-lg font-semibold">
              {role === "investor" ? "Investor" : "Startup"} Account
            </CardTitle>
          </div>
          <CardDescription className="text-sm">
            {role === "investor"
              ? "Login or sign up to explore African startups."
              : "Login or sign up to raise capital for your venture."}
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-0">
          <Tabs
            value={tab}
            onValueChange={(value) => handleTabChange(value as "login" | "signup")}
            className="w-full"
          >
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-4">
              <LoginForm />
            </TabsContent>

            <TabsContent value="signup" className="mt-4">
              <SignupFormWizard />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  </div>
);
}

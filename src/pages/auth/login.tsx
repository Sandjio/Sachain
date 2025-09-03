import PublicLayout from "@/layout/PublicLayout";
import LoginForm from "@/features/auth/components/LoginForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

import { useRouter } from "next/router";

export default function LoginPage() {
  const router = useRouter();

  function onBack() {
    router.push("/");
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
        <div className="bg-white/95 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Back */}
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onBack}
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
             <Button 
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              
            >
              Get Started
            </Button>
          </div>
        </div>
      
            </div>

        <LoginForm />
      </div>
    </>
  );
}

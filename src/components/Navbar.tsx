// src/components/Navbar.tsx
import { Button } from "./ui/button";
import { Search, Menu, X } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/router";
import GetStartedModal from "@/features/auth/components/GetStartedModal"; // adjust path if needed


export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const router = useRouter();
  const [showGetStarted, setShowGetStarted] = useState(false);


  return (
    <>
    <nav className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-200 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center space-x-2 cursor-pointer" onClick={() => router.push("/")}>
            <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">S</span>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              sachain
            </span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <a href="#" className="text-gray-700 hover:text-purple-600 transition-colors">How it Works</a>
            <a href="#" className="text-gray-700 hover:text-purple-600 transition-colors">Projects</a>
            <a href="#" className="text-gray-700 hover:text-purple-600 transition-colors">Investors</a>
            <a href="#" className="text-gray-700 hover:text-purple-600 transition-colors">About</a>
          </div>

          {/* Search and CTA */}
          <div className="hidden md:flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search projects..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
              />
            </div>
            {/* Login → straight to login page */}
            <Button
              variant="outline"
              className="border-purple-600 text-purple-600 hover:bg-purple-50"
              onClick={() => router.push("/auth/login")}
            >
              Login
            </Button>
            {/* Get Started → role selection modal */}
            <Button
  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
  onClick={() => setShowGetStarted(true)}
>
  Get Started
</Button>

          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-700 hover:text-purple-600"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200">
            <div className="flex flex-col space-y-4">
              <a href="#" className="text-gray-700 hover:text-purple-600 transition-colors">How it Works</a>
              <a href="#" className="text-gray-700 hover:text-purple-600 transition-colors">Projects</a>
              <a href="#" className="text-gray-700 hover:text-purple-600 transition-colors">Investors</a>
              <a href="#" className="text-gray-700 hover:text-purple-600 transition-colors">About</a>
              <div className="pt-4 border-t border-gray-200">
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search projects..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                  />
                </div>
                <div className="flex flex-col space-y-2">
                  <Button
                    variant="outline"
                    className="border-purple-600 text-purple-600 hover:bg-purple-50"
                    onClick={() => router.push("/auth/login")}
                  >
                    Login
                  </Button>
                 <Button
  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
  onClick={() => setShowGetStarted(true)}
>
  Get Started
</Button>

                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
    <GetStartedModal open={showGetStarted} onOpenChange={setShowGetStarted} />  
    </>
  );
}

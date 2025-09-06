
import { useState, ReactNode } from "react";
import { Sidebar } from "./dashboard/Sidebar";
import { Header } from "./dashboard/Header";
import { MainContent } from "./dashboard/MainContent";
import { MobileMenu } from "./dashboard/MobileMenu";
import { useAuthStore } from "@/store/authStore";

interface DashboardLayoutProps {
  children: ReactNode;
  activeItem?: string;
  onItemChange?: (item: string) => void;
  pageTitle?: string;
  pageSubtitle?: string;
  pageActions?: ReactNode;
}

export function DashboardLayout({
  children,
  activeItem = "dashboard",
  onItemChange,
  pageTitle,
  pageSubtitle,
  pageActions,
}: DashboardLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const sidebarRole = useAuthStore((state) => state.user?.role);

  if (!sidebarRole) {
    return <p>Loading...</p>;
  }

  const handleMobileMenuToggle = () => {
    console.log("Mobile menu toggle clicked", !isMobileMenuOpen);
    setIsMobileMenuOpen((prev) => !prev);
  };

  const handleMobileMenuClose = () => {
    console.log("Mobile menu close called");
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Desktop Sidebar - Hidden on mobile */}
      <div className="hidden lg:flex">
        <Sidebar activeItem={activeItem} onItemChange={onItemChange} />
      </div>

      {/* Mobile Menu */}
      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={handleMobileMenuClose}
        activeItem={activeItem}
        onItemChange={onItemChange}
      />

      {/* Main Layout Column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Sticky Header */}
        <div className="sticky top-0 z-40">
          <Header onMobileMenuToggle={handleMobileMenuToggle} />
        </div>

        {/* Scrollable Content */}
        <MainContent
          title={pageTitle}
          subtitle={pageSubtitle}
          actions={pageActions}
        >
          {children}
        </MainContent>
      </div>
    </div>
  );
}

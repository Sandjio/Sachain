

import { useState } from "react";
import { DashboardLayout } from "@/layout/DashboardLayout";
import RequireAuth from "@/components/auth/RequireAuth";
import {ProjectList }from "@/features/project/components/ProjectList";
import {InvestorDashboard} from "./InvestorDashboard";
import InvestorProjectsPage from "./project/index";


export default function InvestorDashboardPage() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "project-management" | "portfolio">("dashboard");

  const pageTitleMap = {
    dashboard: "Dashboard",
    "project-management": "Project Management",
    portfolio: "Portfolio",
  };

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <InvestorDashboard />; 
      case "project-management":
        return <InvestorProjectsPage />;
      case "portfolio":
        return <ProjectList />; // to be implemented or replace with what you want
      default:
        return <InvestorProjectsPage />;
    }
  };

  return (
    <RequireAuth roles={["investor", "admin"]}> 
      <DashboardLayout
        activeItem={activeTab}
        onItemChange={setActiveTab}
        pageTitle={pageTitleMap[activeTab]}
      >
        {renderContent()}
      </DashboardLayout>
    </RequireAuth>
  );
}

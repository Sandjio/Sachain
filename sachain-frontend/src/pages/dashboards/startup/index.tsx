
import { useState } from "react";
import { DashboardLayout } from "@/layout/DashboardLayout";
import StartupDashboardHome from "./StartupHome";
import { WalletManagement } from "@/features/wallet/components/walletManagement";
import { ProfilPage } from "@/features/profil/ProfilPage";
import ProjectPage from "./projects/index";
import { MultiStepProjectForm } from "@/features/project/form/MultiStepProjectForm";
import RequireAuth from "@/components/auth/RequireAuth";

export default function StartupDashboard() {
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "projects" | "wallet" | "profile" | "create-project"
  >("dashboard");

  const pageTitleMap = {
    dashboard: "Startup Dashboard",
    projects: "My Projects",
    wallet: "Wallet Management",
    profile: "Profile",
    "create-project": "Create New Project",
  };

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <StartupDashboardHome />;
      case "projects":
        return (
          <ProjectPage
            onCreateProject={() => setActiveTab("create-project")}
          />
        );
      case "create-project":
        return <MultiStepProjectForm onCancel={() => setActiveTab("projects")} />;
      case "wallet":
        return <WalletManagement />;
      case "profile":
        return <ProfilPage />;
      default:
        return <StartupDashboardHome />;
    }
  };

  return (
    <RequireAuth roles={["startup", "admin"]}>
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

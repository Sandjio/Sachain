import {
  LayoutDashboard,
  BarChart3,
  Users,
  Settings,
  FileText,
  CreditCard,
  PieChart,
  Calendar,
  MessageCircle,
} from "lucide-react";

export interface NavItem {
  id: string;
  label: string;
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  badge?: string;
}

export const navConfig: Record<string, NavItem[]> = {
  admin: [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "users", label: "Utilisateurs", icon: Users },
    { id: "reports", label: "Rapports", icon: FileText },
  ],
  investor: [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "portfolio", label: "Portfolio", icon: PieChart },
  ],
  startup: [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "projects", label: "Projets", icon: PieChart },
    { id: "transactions", label: "Transactions", icon: CreditCard },
  ],
};

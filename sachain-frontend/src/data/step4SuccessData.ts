// src/data/step4SuccessData.ts
import { TrendingUp, Building2 } from "lucide-react";

export interface RoleConfig {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  description: string;
  features: string[];
}

export interface RoleConfigMap {
  investor: RoleConfig;
  startup: RoleConfig;
}

export const defaultRoleConfig: RoleConfigMap = {
  investor: {
    icon: TrendingUp,
    title: "Welcome to Sachain!",
    subtitle: "Your investor account has been created successfully",
    description:
      "You can now browse and invest in promising African startups using HBAR tokens on the Hedera network.",
    features: [
      "Browse verified startup projects",
      "Secure investments with blockchain technology",
      "Track your portfolio performance",
      "Connect with the African startup ecosystem",
    ],
  },
  startup: {
    icon: Building2,
    title: "Welcome to Sachain!",
    subtitle: "Your startup account has been created successfully",
    description:
      "You can now list your venture and raise capital from global investors using the Hedera blockchain.",
    features: [
      "Create compelling project listings",
      "Access to global investor network",
      "Secure fundraising with smart contracts",
      "Real-time funding progress tracking",
    ],
  },
};
import { TrendingUp, Users, DollarSign, Building, Globe, Lightbulb } from "lucide-react";


export interface StatItem {
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  label: string;
  description: string;
  color: string;
  bgColor: string;
}



export const DefaultStats: StatItem[] = [
  {
    icon: Building,
    value: "500K+",
    label: "African Startups",
    description: "Seeking funding opportunities",
    color: "text-blue-600",
    bgColor: "bg-blue-100"
  },
  {
    icon: DollarSign,
    value: "$2.3B",
    label: "Funding Gap",
    description: "Unmet capital needs in Africa",
    color: "text-green-600",
    bgColor: "bg-green-100"
  },
  {
    icon: Users,
    value: "200M+",
    label: "Potential Investors",
    description: "African diaspora worldwide",
    color: "text-purple-600",
    bgColor: "bg-purple-100"
  },
  {
    icon: TrendingUp,
    value: "25%",
    label: "Annual Growth",
    description: "African startup ecosystem",
    color: "text-orange-600",
    bgColor: "bg-orange-100"
  },
  {
    icon: Globe,
    value: "54",
    label: "African Countries",
    description: "Ready for digital investment",
    color: "text-indigo-600",
    bgColor: "bg-indigo-100"
  },
  {
    icon: Lightbulb,
    value: "1M+",
    label: "Ideas Waiting",
    description: "For funding and support",
    color: "text-yellow-600",
    bgColor: "bg-yellow-100"
  }
];
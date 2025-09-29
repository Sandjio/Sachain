
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Settings, LogOut } from "lucide-react";
import { navConfig, type NavItem } from "./navConfig";
import { useAuthStore } from "@/store/authStore";
import { useSignOut } from "@/features/auth/hook/useSignOut";
import Image from "next/image";


interface SidebarProps {
  activeItem?: string;
  onItemChange?: (item: string) => void;
}

export function Sidebar({
  activeItem = "dashboard",
  onItemChange,
}: SidebarProps) {
  const role = useAuthStore((state) => state.user?.role);
  const { signOut, loading, error } = useSignOut();

  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  if (!role) {
    return <p>Loading...</p>; // or redirect to role selection
  }

  const navItems: NavItem[] = navConfig[role] || [];

  return (
    <div className=" relative flex flex-col bg-[#123962] text-white h-full w-full lg:w-64 ">
      {/* Logo/Brand */}

       {/* <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/images/biglogo.png')", maxWidth: '100%', maxHeight: '50%' }}
        aria-hidden="true"
      /> */}

      <div className="p-6 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <div>
            <Image
              src="/images/logo1.png"
              alt="Sachain logo"
              width={95}
              height={49}
              className="h-8 lg:h-10"
            />
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 overflow-y-auto">
        <div className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onItemChange?.(item.id)}
                onMouseEnter={() => setHoveredItem(item.id)}
                onMouseLeave={() => setHoveredItem(null)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-200
                  ${
                    activeItem === item.id
                      ? "bg-[#90A5FB] text-white shadow-lg"
                      : "text-white/80 hover:bg-white/10 hover:text-white"
                  }
                  ${hoveredItem === item.id ? "translate-x-1" : ""}
                `}
              >
                <Icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                <span className="font-medium">{item.label}</span>
                {item.badge && (
                  <span className="ml-auto bg-white/20 text-xs px-2 py-0.5 rounded-full select-none">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-white/10 space-y-2 shrink-0">
        <Button
          variant="ghost"
          onClick={() => onItemChange?.("settings")}
          className="w-full justify-start text-white/80 hover:text-white hover:bg-white/10"
        >
          <Settings className="h-4 w-4 mr-3" />
          Paramètres
        </Button>

        <Button
          onClick={signOut}
          variant="ghost"
          className="w-full justify-start text-white/80 hover:text-white hover:bg-white/10"
        >
          <LogOut className="h-4 w-4 mr-3" />
          Déconnexion
        </Button>
      </div>
    </div>
  );
}

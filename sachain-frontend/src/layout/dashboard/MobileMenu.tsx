import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { Sidebar } from "./Sidebar";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  activeItem?: string;
  onItemChange?: (item: string) => void;
}

export function MobileMenu({
  isOpen,
  onClose,
  activeItem,
  onItemChange,
}: MobileMenuProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleItemChange = (item: string) => {
    onItemChange?.(item);
    onClose();
  };

  if (!isVisible) return null;

  return (
    <div className="lg:hidden fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />

      {/* Mobile Sidebar */}
      <div
        className={`absolute left-0 top-0 h-full transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="relative">
          {/* Close Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="absolute top-4 right-4 z-10 text-white hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </Button>

          {/* Sidebar Content */}
          <Sidebar
            activeItem={activeItem}
            onItemChange={handleItemChange}
          />
        </div>
      </div>
    </div>
  );
}

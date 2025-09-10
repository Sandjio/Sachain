
import { ReactNode } from "react";
import { useAuthStore } from "@/store/authStore";

interface MainContentProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
}

function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function MainContent({ children, title, subtitle, actions }: MainContentProps) {
  const user = useAuthStore((state) => state.user);
  const role = user?.role;
  const userName = user?.givenName || user?.familyName || "";

  return (
    <main className="flex-1 overflow-y-auto bg-gray-50">
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Page Header */}
        {(title || subtitle || actions) && (
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                {title && (
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                    Welcome, {userName}
                  </h1>
                )}
                {subtitle && <p className="mt-1 text-sm text-gray-600">{subtitle}</p>}
              </div>
              {actions && <div className="flex items-center gap-3">{actions}</div>}
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="space-y-6">{children}</div>
      </div>
    </main>
  );
}

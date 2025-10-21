import { ReactNode } from 'react';
import { useAuthStore } from '@/store/authStore';

interface MainContentProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
}

function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function MainContent({
  children,
  title,
  subtitle,
  actions,
}: MainContentProps) {
  const user = useAuthStore((state) => state.user);
  const role = user?.role;
  const userName = user?.givenName || user?.familyName || '';

  return (
    <main className="flex-1 overflow-auto bg-gray-50 p-4 sm:p-6 lg:p-8 min-w-0">
      <div className="p-4 sm:p-6 lg:p-8 bg-muted/50 rounded-lg shadow-sm space-y-6">
        {/* Page Header */}
        {(title || subtitle || actions) && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              {title && (
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 bg-gradient-to-r from-primary via-accent to-blue-200  text-muted px-4 py-2 rounded-lg">
                  Welcome, {userName}
                </h1>
              )}
              {subtitle && (
                <p className="mt-1 text-sm text-gray-600">{subtitle}</p>
              )}
            </div>
            {actions && (
              <div className="flex items-center gap-3">{actions}</div>
            )}
          </div>
        )}

        {/* Main Content */}
        <div className="space-y-6">{children}</div>
      </div>
    </main>
  );
}

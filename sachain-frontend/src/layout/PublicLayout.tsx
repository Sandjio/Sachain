// src/layout/PublicLayout.tsx
import { ReactNode } from "react";
//import Header from "@/components/Header";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-text">
      {/* Skip link for accessibility */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-primary text-primary-foreground px-3 py-2 rounded"
      >
        Skip to content
      </a>

      {/* Header */}
      {/* <Header /> */}

      {/* Main content */}
      <main id="main" className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t bg-background py-6 text-center text-sm text-muted">
        © {new Date().getFullYear()} SACHain. All rights reserved.
      </footer>
    </div>
  );
}

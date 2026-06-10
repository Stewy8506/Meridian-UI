"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/auth-store";
import { LoginPage } from "./login-page";
import { Loader2 } from "lucide-react";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { checkAuthStatus, isAuthenticated, isLoading, initialized } = useAuthStore();

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  if (isLoading || !initialized) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black font-sans">
        <Loader2 className="w-10 h-10 text-foreground animate-spin mb-4" />
        <p className="text-muted-foreground text-sm tracking-wide animate-pulse">
          Initializing Workspace...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return <>{children}</>;
}

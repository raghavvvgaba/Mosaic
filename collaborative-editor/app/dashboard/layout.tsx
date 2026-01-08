'use client';

import { NavigationProvider } from "@/contexts/NavigationContext";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { SWRConfig } from "swr";
import { swrConfig } from "@/lib/swr/config";

export default function AppRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <SWRConfig value={swrConfig}>
        <WorkspaceProvider>
          <NavigationProvider>
            <AppLayout>{children}</AppLayout>
          </NavigationProvider>
        </WorkspaceProvider>
      </SWRConfig>
    </AuthGuard>
  );
}
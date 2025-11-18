import { NavigationProvider } from "@/contexts/NavigationContext";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { AuthGuard } from "@/components/auth/AuthGuard";

export default function AppRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <WorkspaceProvider>
        <NavigationProvider>
          <AppLayout>{children}</AppLayout>
        </NavigationProvider>
      </WorkspaceProvider>
    </AuthGuard>
  );
}
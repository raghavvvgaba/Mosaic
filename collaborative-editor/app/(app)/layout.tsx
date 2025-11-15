import { NavigationProvider } from "@/contexts/NavigationContext";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import { GuestLimitProvider } from "@/contexts/GuestLimitContext";
import { AppLayout } from "@/components/layout/AppLayout";

export default function AppRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WorkspaceProvider>
      <NavigationProvider>
        <GuestLimitProvider>
          <AppLayout>{children}</AppLayout>
        </GuestLimitProvider>
      </NavigationProvider>
    </WorkspaceProvider>
  );
}
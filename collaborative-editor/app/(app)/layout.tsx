import { NavigationProvider } from "@/contexts/NavigationContext";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import { AppLayout } from "@/components/layout/AppLayout";

export default function AppRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WorkspaceProvider>
      <NavigationProvider>
        <AppLayout>{children}</AppLayout>
      </NavigationProvider>
    </WorkspaceProvider>
  );
}
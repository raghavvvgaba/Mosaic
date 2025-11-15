import { AuthProvider } from "@/contexts/AuthContext";
import { AuthLayout } from "@/components/layout/AuthLayout";

export default function AuthRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <AuthLayout>{children}</AuthLayout>
    </AuthProvider>
  );
}
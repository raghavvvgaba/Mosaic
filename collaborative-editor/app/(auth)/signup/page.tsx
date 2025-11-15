'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, User, ArrowLeft, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuthContext } from '@/contexts/AuthContext';
import { hasGuestData, migrateGuestData } from '@/lib/migration/guest-migration';

export default function SignupPage() {
  const router = useRouter();
  const { signUp } = useAuthContext();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationSuccess, setMigrationSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const hasGuest = await hasGuestData();

      // Create account
      const user = await signUp(email, password, name);

      // If user had guest data, migrate it
      if (hasGuest) {
        setIsMigrating(true);
        const result = await migrateGuestData(user.id);
        setMigrationSuccess(true);
        setIsMigrating(false);

        // Show success message briefly before redirecting
        setTimeout(() => {
          router.push('/');
        }, 2000);
      } else {
        // Redirect immediately if no guest data
        router.push('/');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create account');
      setIsLoading(false);
      setIsMigrating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back to home */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to app
        </Link>

        <Card className="shadow-lg border">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <User className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">Create Account</CardTitle>
            <CardDescription>
              Sign up to create unlimited documents and workspaces
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-0">
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {isMigrating && (
              <Alert className="mb-4 bg-blue-50 border-blue-200">
                <AlertDescription className="flex items-center gap-2">
                  <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />
                  Migrating your local documents...
                </AlertDescription>
              </Alert>
            )}

            {migrationSuccess && (
              <Alert className="mb-4 bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Account created! Your local documents have been migrated successfully.
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10"
                    required
                    disabled={isLoading || isMigrating}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                    disabled={isLoading || isMigrating}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                    minLength={8}
                    disabled={isLoading || isMigrating}
                  />
                </div>
                <p className="text-xs text-slate-500">
                  Password must be at least 8 characters
                </p>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || isMigrating || migrationSuccess}
              >
                {isLoading ? 'Creating account...' :
                 isMigrating ? 'Migrating...' :
                 migrationSuccess ? 'Success!' :
                 'Create Account'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link
                  href="/login"
                  className="text-primary hover:underline font-medium"
                >
                  Sign in
                </Link>
              </p>
            </div>

            {/* Benefits list */}
            <div className="mt-6 pt-6 border-t">
              <h3 className="font-medium text-sm text-foreground mb-3">
                With an account you get:
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 bg-primary rounded-full" />
                  Realtime Collaboration
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 bg-primary rounded-full" />
                  Shared Workspaces
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 bg-primary rounded-full" />
                  Cloud sync across devices
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 bg-primary rounded-full" />
                  AI-Powered Enchancements
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
'use client';

import { useState, useEffect } from 'react';
import { X, Mail, Lock, User, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthContext } from '@/contexts/AuthContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { hasGuestData, migrateGuestData } from '@/lib/migration/guest-migration';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'signin' | 'signup';
}

export function AuthModal({ isOpen, onClose, initialMode = 'signin' }: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { signUp, signIn, isAuthenticated, user } = useAuthContext();
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<{ success: boolean; docs: number; workspaces: number } | null>(null);

  // Reset form when modal opens or mode changes
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setEmail('');
      setPassword('');
      setName('');
      setError('');
      setIsMigrating(false);
      setMigrationResult(null);
    }
  }, [isOpen, initialMode]);

  // Handle migration after successful authentication
  useEffect(() => {
    if (isAuthenticated && user && isOpen && !isMigrating) {
      handleMigration();
    }
  }, [isAuthenticated, user, isOpen, isMigrating]);

  const handleMigration = async () => {
    const hasGuestDataLocal = await hasGuestData();
    if (!hasGuestDataLocal) {
      onClose();
      return;
    }

    setIsMigrating(true);
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }
      const result = await migrateGuestData(user.id);
      setMigrationResult({
        success: result.success,
        docs: result.documentsMigrated,
        workspaces: result.workspacesMigrated
      });

      // Close modal after a short delay to show success
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Migration failed:', error);
      setError('Migration failed but you can continue using the app');
    } finally {
      setIsMigrating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (mode === 'signin') {
        await signIn(email, password);
      } else {
        await signUp(email, password, name);
      }
      // Success will be handled by the useEffect above
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = () => {
    setMode(mode === 'signin' ? 'signup' : 'signin');
    setError('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg shadow-lg w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">
            {mode === 'signin' ? 'Sign In' : 'Sign Up'}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {mode === 'signup' && (
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="pl-10"
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="pl-10"
              />
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {migrationResult && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Migration complete! {migrationResult.docs} documents and {migrationResult.workspaces} workspaces synced to your account.
              </AlertDescription>
            </Alert>
          )}

          {isMigrating ? (
            <div className="w-full text-center py-4">
              <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />
              Syncing your documents...
            </div>
          ) : (
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {mode === 'signin' ? 'Signing In...' : 'Creating Account...'}
                </>
              ) : (
                mode === 'signin' ? 'Sign In' : 'Create Account'
              )}
            </Button>
          )}
        </form>

        <div className="p-6 border-t bg-muted/50">
          <p className="text-center text-sm text-muted-foreground">
            {mode === 'signin' ? "Don't have an account?" : "Already have an account?"}
            <button
              type="button"
              onClick={switchMode}
              className="ml-1 text-primary hover:underline font-medium"
            >
              {mode === 'signin' ? 'Sign Up' : 'Sign In'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
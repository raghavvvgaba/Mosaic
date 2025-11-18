'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, User, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuthContext } from '@/contexts/AuthContext';

function checkPasswordStrength(password: string) {
  // Empty password
  if (!password || password.length === 0) {
    return {
      score: 0,
      label: '',
      color: '',
      message: ''
    };
  }

  let score = 0;
  const feedback: string[] = [];

  // Length checks
  if (password.length >= 8) {
    score += 1;
  } else {
    feedback.push('at least 8 characters');
  }

  if (password.length >= 12) {
    score += 1;
  }

  // Character variety checks
  if (/[a-z]/.test(password)) {
    score += 0.5;
  } else {
    feedback.push('lowercase letters');
  }

  if (/[A-Z]/.test(password)) {
    score += 0.5;
  } else {
    feedback.push('uppercase letters');
  }

  if (/[0-9]/.test(password)) {
    score += 0.5;
  } else {
    feedback.push('numbers');
  }

  if (/[^a-zA-Z0-9]/.test(password)) {
    score += 0.5;
  } else {
    feedback.push('special characters');
  }

  // Cap the score at 4
  score = Math.min(score, 4);

  // Determine strength level
  if (score < 1.5) {
    return {
      score: 0,
      label: 'Weak',
      color: 'bg-red-500',
      message: password.length < 8
        ? 'Password must be at least 8 characters'
        : `Consider adding: ${feedback.slice(0, 2).join(', ')}`
    };
  } else if (score < 2.5) {
    return {
      score: 1,
      label: 'Fair',
      color: 'bg-orange-500',
      message: feedback.length > 0
        ? `Consider adding: ${feedback.slice(0, 2).join(', ')}`
        : 'Getting stronger'
    };
  } else if (score < 3.5) {
    return {
      score: 2,
      label: 'Good',
      color: 'bg-yellow-500',
      message: 'Good password strength'
    };
  } else if (score < 4) {
    return {
      score: 3,
      label: 'Strong',
      color: 'bg-green-500',
      message: 'Strong password'
    };
  } else {
    return {
      score: 4,
      label: 'Very Strong',
      color: 'bg-green-600',
      message: 'Excellent password strength'
    };
  }
}

function PasswordStrength({ password }: { password: string }) {
  // Don't show anything if password is empty
  if (!password) {
    return null;
  }

  const strength = checkPasswordStrength(password);

  // Don't show if there's no strength score (empty password)
  if (strength.score === 0 && strength.label === '') {
    return null;
  }

  return (
    <div className="mt-2 space-y-2">
      {/* Strength bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 flex gap-1">
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                index <= strength.score
                  ? strength.color
                  : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
        <span className="text-xs font-medium text-gray-600 min-w-[60px]">
          {strength.label}
        </span>
      </div>

      {/* Strength message */}
      {strength.message && (
        <p className="text-xs text-gray-600">
          {strength.message}
        </p>
      )}
    </div>
  );
}

export default function SignupPage() {
  const router = useRouter();
  const { signUp } = useAuthContext();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Create account - migration will be handled by useAuth hook
      await signUp(email, password, name);

      // Redirect to dashboard - migration happens automatically in background
      router.push('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create account');
      setIsLoading(false);
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
                    disabled={isLoading}
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
                    disabled={isLoading}
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
                    disabled={isLoading}
                  />
                </div>
                <PasswordStrength password={password} />
                <p className="text-xs text-slate-500">
                  Password must be at least 8 characters
                </p>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? 'Creating account...' : 'Create Account'}
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
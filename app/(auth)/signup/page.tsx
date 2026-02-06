'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, User, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuthContext } from '@/contexts/AuthContext';

function checkPasswordStrength(password: string) {
  if (!password || password.length === 0) {
    return {
      score: 0,
      label: '',
      color: '',
      message: '',
    };
  }

  let score = 0;
  const feedback: string[] = [];

  if (password.length >= 8) {
    score += 1;
  } else {
    feedback.push('at least 8 characters');
  }

  if (password.length >= 12) {
    score += 1;
  }

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

  score = Math.min(score, 4);

  if (score < 1.5) {
    return {
      score: 0,
      label: 'Weak',
      color: 'bg-red-500',
      message:
        password.length < 8
          ? 'Password must be at least 8 characters'
          : `Consider adding: ${feedback.slice(0, 2).join(', ')}`,
    };
  }

  if (score < 2.5) {
    return {
      score: 1,
      label: 'Fair',
      color: 'bg-orange-500',
      message:
        feedback.length > 0
          ? `Consider adding: ${feedback.slice(0, 2).join(', ')}`
          : 'Getting stronger',
    };
  }

  if (score < 3.5) {
    return {
      score: 2,
      label: 'Good',
      color: 'bg-yellow-500',
      message: 'Good password strength',
    };
  }

  if (score < 4) {
    return {
      score: 3,
      label: 'Strong',
      color: 'bg-green-500',
      message: 'Strong password',
    };
  }

  return {
    score: 4,
    label: 'Very Strong',
    color: 'bg-green-600',
    message: 'Excellent password strength',
  };
}

function PasswordStrength({ password }: { password: string }) {
  if (!password) {
    return null;
  }

  const strength = checkPasswordStrength(password);

  if (strength.score === 0 && strength.label === '') {
    return null;
  }

  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex-1 flex gap-1">
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                index <= strength.score ? strength.color : 'bg-muted'
              }`}
            />
          ))}
        </div>
        <span className="text-xs font-medium text-muted-foreground min-w-[60px]">{strength.label}</span>
      </div>

      {strength.message && <p className="text-xs text-muted-foreground">{strength.message}</p>}
    </div>
  );
}

export default function SignupPage() {
  const router = useRouter();
  const { signUp, signInWithGoogle } = useAuthContext();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await signUp(name, email, password);
      router.push('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create account');
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setIsGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to continue with Google');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4 overflow-hidden">
      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors bg-muted/50 backdrop-blur-md border border-border shadow-sm px-4 py-2 rounded-xl"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Mosaic
        </Link>

        <Card className="bg-card border border-border rounded-2xl shadow-xl">
          <CardHeader className="text-center pb-6">
            <div className="mx-auto w-16 h-16 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center mb-6">
              <User className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-3xl font-bold tracking-tight">Create Account</CardTitle>
            <CardDescription className="text-base mt-2">Join Mosaic to start building your ideas</CardDescription>
          </CardHeader>

          <CardContent className="pt-0 space-y-6">
            {error && (
              <Alert variant="destructive" className="bg-muted/50 rounded-lg border border-transparent border-0">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type="button"
              variant="outline"
              className="w-full h-11 text-base font-medium"
              onClick={handleGoogleSignIn}
              disabled={isLoading || isGoogleLoading}
            >
              {isGoogleLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Redirecting to Google...
                </>
              ) : (
                <>
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="mr-2 h-4 w-4">
                    <path d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.26-2.08 3.56-5.14 3.56-8.65Z" fill="#4285F4" />
                    <path d="M12 24c3.24 0 5.95-1.07 7.93-2.91l-3.87-3A7.14 7.14 0 0 1 12 19.35a7.2 7.2 0 0 1-6.76-4.97H1.24v3.1A12 12 0 0 0 12 24Z" fill="#34A853" />
                    <path d="M5.24 14.38A7.2 7.2 0 0 1 4.84 12c0-.83.14-1.63.4-2.38v-3.1H1.24A12 12 0 0 0 0 12c0 1.94.46 3.77 1.24 5.38l4-3Z" fill="#FBBC05" />
                    <path d="M12 4.65c1.76 0 3.34.6 4.58 1.77l3.43-3.43A11.5 11.5 0 0 0 12 0 12 12 0 0 0 1.24 6.52l4 3.1A7.2 7.2 0 0 1 12 4.65Z" fill="#EA4335" />
                  </svg>
                  Continue with Google
                </>
              )}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/60" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">or continue with email</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">Name</Label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-12 h-11"
                    required
                    disabled={isLoading || isGoogleLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-12 h-11"
                    required
                    disabled={isLoading || isGoogleLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-12 h-11"
                    required
                    minLength={8}
                    disabled={isLoading || isGoogleLoading}
                  />
                </div>
                <PasswordStrength password={password} />
                <p className="text-xs text-muted-foreground">Password must be at least 8 characters</p>
              </div>

              <Button type="submit" className="w-full h-11 text-base font-medium" disabled={isLoading || isGoogleLoading}>
                {isLoading ? 'Creating account...' : 'Create Account'}
              </Button>
            </form>

            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link href="/login" className="text-primary hover:underline font-medium">
                  Sign in
                </Link>
              </p>
            </div>

            <div className="pt-6 border-t border-border/30">
              <ul className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                <li className="flex items-center gap-2">
                  <div className="h-1 w-1 bg-primary rounded-full" />
                  Realtime Sync
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-1 w-1 bg-primary rounded-full" />
                  Shared Spaces
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-1 w-1 bg-primary rounded-full" />
                  Cloud Backup
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-1 w-1 bg-primary rounded-full" />
                  AI Assistant
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

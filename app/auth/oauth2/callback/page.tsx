'use client';

import { useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { AuthService } from '@/lib/appwrite/auth';

export default function OAuth2CallbackPage() {
  const hasHandledCallback = useRef(false);

  useEffect(() => {
    if (hasHandledCallback.current) {
      return;
    }
    hasHandledCallback.current = true;

    const params = new URLSearchParams(window.location.search);
    const userId = params.get('userId');
    const secret = params.get('secret');
    const providerError = params.get('error');

    if (providerError || !userId || !secret) {
      window.location.replace('/login?error=google_oauth_failed');
      return;
    }

    const completeOAuth = async () => {
      try {
        await AuthService.completeOAuthSession(userId, secret);
        // Force a fresh app boot so AuthContext re-evaluates session state.
        window.location.replace('/dashboard');
      } catch (error) {
        console.error('Failed to complete OAuth session:', error);
        window.location.replace('/login?error=google_oauth_failed');
      }
    };

    void completeOAuth();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Completing sign-in...
      </div>
    </div>
  );
}

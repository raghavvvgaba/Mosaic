'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowRight, Pen } from 'lucide-react';
import Link from 'next/link';
import { useAuthContext } from '@/contexts/AuthContext';

export function Hero() {
  const { user, loading } = useAuthContext();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleGoToDashboard = () => {
    router.push('/dashboard');
  };

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center pt-20 pb-32 overflow-hidden">
      {/* Dynamic Background Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-primary/20 rounded-full blur-[120px] opacity-30 animate-pulse" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[100px] opacity-20" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 flex flex-col items-center text-center">
        
        {/* Animated Badge */}
        <div 
          className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-8 transition-all duration-700 transform ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}
        >
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
          <span className="text-xs font-medium text-white">v2.0 is now live</span>
        </div>

        {/* Main Heading with Gradient Text */}
        <h1 
          className={`text-5xl sm:text-7xl lg:text-8xl font-bold tracking-tighter mb-8 max-w-5xl transition-all duration-700 delay-100 transform ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}
        >
          Create your <br className="hidden sm:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-white to-white/50">
            Mosaic of ideas.
          </span>
        </h1>

        {/* Subheading */}
        <p 
          className={`text-xl text-muted-foreground mb-12 max-w-2xl leading-relaxed transition-all duration-700 delay-200 transform ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}
        >
          Mosaic is the all-in-one workspace that blends <span className="text-foreground font-semibold">AI assistance</span> with real-time collaboration. Designed for teams who move fast.
        </p>

        {/* CTA Buttons */}
        <div 
          className={`flex flex-col sm:flex-row gap-4 w-full sm:w-auto transition-all duration-700 delay-300 transform ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}
        >
          {loading ? (
            <div className="h-12 w-32 bg-white/5 animate-pulse rounded-lg" />
          ) : user ? (
            <Button
              size="lg"
              className="group relative overflow-hidden bg-primary hover:bg-primary/90 text-primary-foreground px-8 h-12 rounded-full transition-all hover:scale-105 hover:shadow-[0_0_40px_-10px_theme(colors.primary/30%)]"
              onClick={handleGoToDashboard}
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              <span className="relative flex items-center gap-2">
                Open Dashboard <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </Button>
          ) : (
            <>
              <Link href="/signup">
                <Button
                  size="lg"
                  className="group relative overflow-hidden bg-white text-black hover:bg-white/90 px-8 h-12 rounded-full transition-all hover:scale-105 hover:shadow-[0_0_40px_-10px_rgba(255,255,255,0.5)] font-semibold"
                >
                  <span className="relative flex items-center gap-2">
                    Start writing free <Pen className="w-4 h-4 text-amber-500 fill-amber-500" />
                  </span>
                </Button>
              </Link>

              <Link href="/login">
                <Button
                  variant="outline"
                  size="lg"
                  className="px-8 h-12 rounded-full border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 text-white backdrop-blur-sm transition-all"
                >
                  Sign In
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
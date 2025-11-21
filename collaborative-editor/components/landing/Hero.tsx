'use client';

import { useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowRight, Edit3, Users, Zap, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useAuthContext } from '@/contexts/AuthContext';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

export function Hero() {
  const { user, loading } = useAuthContext();
  const router = useRouter();

  const containerRef = useRef<HTMLDivElement>(null);
  const heroTextRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    // Background parallax/floating effect
    gsap.to(bgRef.current, {
      y: -50,
      duration: 10,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut'
    });

    // Initial load animation
    tl.from(heroTextRef.current?.children || [], {
      y: 100,
      opacity: 0,
      stagger: 0.2,
      duration: 1.2,
      delay: 0.5
    })
      .from(ctaRef.current, {
        y: 50,
        opacity: 0,
        duration: 1
      }, '-=0.8')
      .from(featuresRef.current?.children || [], {
        y: 50,
        opacity: 0,
        stagger: 0.1,
        duration: 1
      }, '-=0.8');

  }, { scope: containerRef });

  const handleGoToDashboard = () => {
    router.push('/dashboard');
  };

  return (
    <section ref={containerRef} className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Dynamic Background */}
      <div ref={bgRef} className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-[128px] mix-blend-multiply animate-blob" />
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-[128px] mix-blend-multiply animate-blob animation-delay-2000" />
        <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-pink-500/20 rounded-full blur-[128px] mix-blend-multiply animate-blob animation-delay-4000" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-5xl mx-auto">

          {/* Hero Text Content */}
          <div ref={heroTextRef} className="flex flex-col items-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-secondary/50 backdrop-blur-sm border border-border/50 px-4 py-1.5 rounded-full text-sm font-medium mb-8 text-secondary-foreground">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              v2.0 is now available
              <ChevronRight className="w-3 h-3 ml-1 opacity-50" />
            </div>

            {/* Main Heading */}
            <h1 className="text-5xl sm:text-7xl lg:text-8xl font-bold tracking-tight mb-8 bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/70">
              Think clearly. <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600">
                Create together.
              </span>
            </h1>

            {/* Subheading */}
            <p className="text-xl sm:text-2xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed font-light">
              The minimal, block-based editor that helps you organize your thoughts and collaborate in real-time. No distractions, just flow.
            </p>
          </div>

          {/* CTA Buttons */}
          <div ref={ctaRef} className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-24">
            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                Loading...
              </div>
            ) : user ? (
              <Button
                size="lg"
                className="h-14 px-8 text-lg rounded-full bg-foreground text-background hover:bg-foreground/90 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
                onClick={handleGoToDashboard}
              >
                Go to Dashboard
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            ) : (
              <>
                <Link href="/signup">
                  <Button
                    size="lg"
                    className="h-14 px-8 text-lg rounded-full bg-foreground text-background hover:bg-foreground/90 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
                  >
                    Start Writing Free
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>

                <Link href="/login">
                  <Button
                    variant="outline"
                    size="lg"
                    className="h-14 px-8 text-lg rounded-full border-2 hover:bg-secondary/50 transition-all duration-300 backdrop-blur-sm"
                  >
                    Sign In
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Feature Highlights (Floating Cards) */}
          <div ref={featuresRef} className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { icon: Edit3, title: "Rich Editor", desc: "Block-based editing with markdown support" },
              { icon: Users, title: "Real-time Sync", desc: "Collaborate with your team instantly" },
              { icon: Zap, title: "Lightning Fast", desc: "Local-first architecture for zero latency" }
            ].map((feature, i) => (
              <div
                key={i}
                className="group p-6 rounded-2xl bg-background/40 backdrop-blur-md border border-border/50 hover:bg-background/60 transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <feature.icon className="w-6 h-6 text-foreground/80" />
                </div>
                <h3 className="font-semibold mb-2 text-lg">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
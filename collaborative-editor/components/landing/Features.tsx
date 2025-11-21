'use client';

import { useRef } from 'react';
import {
  Layout,
  Share2,
  Smartphone,
  Lock,
  Cloud,
  Search,
  History
} from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function Features() {
  const containerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    // Header Animation
    gsap.from(headerRef.current, {
      scrollTrigger: {
        trigger: headerRef.current,
        start: 'top 80%',
        toggleActions: 'play none none reverse'
      },
      y: 50,
      opacity: 0,
      duration: 1,
      ease: 'power3.out'
    });

    // Grid Items Animation
    const items = gridRef.current?.children;
    if (items) {
      Array.from(items).forEach((item, i) => {
        gsap.from(item, {
          scrollTrigger: {
            trigger: item,
            start: 'top 85%',
            toggleActions: 'play none none reverse'
          },
          y: 50,
          opacity: 0,
          duration: 0.8,
          delay: i * 0.1,
          ease: 'power2.out'
        });
      });
    }
  }, { scope: containerRef });

  const features = [
    {
      title: "Block-Based Editing",
      desc: "Drag, drop, and reorganize your thoughts with our intuitive block editor.",
      icon: Layout,
      className: "md:col-span-2 bg-blue-500/5 border-blue-500/20"
    },
    {
      title: "Real-Time Sync",
      desc: "Collaborate instantly with your team.",
      icon: Share2,
      className: "md:col-span-1 bg-purple-500/5 border-purple-500/20"
    },
    {
      title: "Offline First",
      desc: "Keep working even when you lose connection.",
      icon: Cloud,
      className: "md:col-span-1 bg-pink-500/5 border-pink-500/20"
    },
    {
      title: "Mobile Ready",
      desc: "Seamless experience across all your devices.",
      icon: Smartphone,
      className: "md:col-span-2 bg-orange-500/5 border-orange-500/20"
    },
    {
      title: "Secure by Design",
      desc: "End-to-end encryption for your private notes.",
      icon: Lock,
      className: "md:col-span-1 bg-green-500/5 border-green-500/20"
    },
    {
      title: "Instant Search",
      desc: "Find anything in milliseconds.",
      icon: Search,
      className: "md:col-span-1 bg-teal-500/5 border-teal-500/20"
    },
    {
      title: "Version History",
      desc: "Never lose a great idea. Go back in time.",
      icon: History,
      className: "md:col-span-1 bg-indigo-500/5 border-indigo-500/20"
    }
  ];

  return (
    <section ref={containerRef} id="features" className="py-32 relative overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">

        {/* Section Header */}
        <div ref={headerRef} className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6">
            Everything you need to <br />
            <span className="text-primary">do your best work.</span>
          </h2>
          <p className="text-xl text-muted-foreground">
            Powerful features wrapped in a beautiful, distraction-free interface.
          </p>
        </div>

        {/* Bento Grid */}
        <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {features.map((feature, i) => (
            <div
              key={i}
              className={`group relative p-8 rounded-3xl border backdrop-blur-sm hover:bg-background/80 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 overflow-hidden ${feature.className}`}
            >
              <div className="relative z-10 h-full flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-background/80 flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform duration-300">
                    <feature.icon className="w-6 h-6 text-foreground" />
                  </div>
                  <h3 className="text-2xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.desc}
                  </p>
                </div>

                {/* Decorative gradient blob */}
                <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500" />
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
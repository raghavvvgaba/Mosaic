'use client';

import { Cpu, Layout, FolderKanban, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthContext } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export function Features() {
  const { user } = useAuthContext();
  const router = useRouter();

  const handleCTAClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (user) {
      router.push('/dashboard');
    } else {
      router.push('/signup');
    }
  };

  const features = [
    {
      title: "Workspace Management",
      description: "Organize your thoughts and projects with dedicated workspaces. Seamlessly switch between different contexts while keeping your notes and documents perfectly separated.",
      icon: FolderKanban,
      className: "md:col-span-2",
      gradient: "from-blue-500/20 to-purple-500/20"
    },
    {
      title: "AI-Powered",
      description: "Draft, summarize, and edit faster with integrated AI assistance.",
      icon: Cpu,
      className: "md:col-span-1",
      gradient: "from-amber-500/20 to-orange-500/20"
    },
    {
      title: "Block Editor",
      description: "A notion-style block editor that just works. Drag, drop, and organize your content freely.",
      icon: Layout,
      className: "md:col-span-1",
      gradient: "from-green-500/20 to-emerald-500/20"
    },
    {
      title: "Universal Access",
      description: "Work from anywhere. Our mobile-first approach ensures that your notes are always at your fingertips, whether you're on your phone, tablet, or desktop.",
      icon: Globe,
      className: "md:col-span-2",
      gradient: "from-indigo-500/20 to-violet-500/20"
    }
  ];

  return (
    <section className="relative py-24 sm:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="max-w-2xl mx-auto text-center mb-20">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-6">
            Everything you need to <br />
            <span className="text-primary">ship faster.</span>
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            We&apos;ve obsessed over every pixel so you don&apos;t have to. Powerful features wrapped in a beautiful, distraction-free interface.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-fr">
          {features.map((feature, index) => (
            <div
              key={index}
              className={cn(
                "group relative overflow-hidden rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl p-8 transition-all duration-500 hover:bg-black/60 hover:border-white/20 hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/10",
                feature.className
              )}
            >
              {/* Hover Gradient Background */}
              <div 
                className={cn(
                  "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 bg-gradient-to-br",
                  feature.gradient
                )} 
              />
              
               <div className="relative z-10 h-full flex flex-col justify-start transition-transform duration-500 group-hover:translate-y-[-2px]">
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 mb-6 group-hover:scale-110 group-hover:bg-primary/20 group-hover:border-primary/30 transition-all duration-500 group-hover:rotate-3">
                  <feature.icon className="w-6 h-6 text-white group-hover:text-primary transition-colors" />
                </div>
                <h3 className="text-xl font-bold text-primary mb-3 group-hover:text-white transition-colors">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed group-hover:text-white/90 transition-colors duration-300">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-32 text-center">
          <div className="relative inline-flex group">
            <div className="absolute transition-all duration-1000 opacity-70 -inset-px bg-gradient-to-r from-[#44BCFF] via-[#FF44EC] to-[#FF675E] rounded-xl blur-lg group-hover:opacity-100 group-hover:-inset-1 group-hover:duration-200 animate-tilt"></div>
            <button
              onClick={handleCTAClick}
              className="relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-black transition-all duration-200 bg-white hover:bg-white/90 rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white cursor-pointer"
            >
              Get Started Now
            </button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">No credit card required</p>
        </div>
      </div>
    </section>
  );
}

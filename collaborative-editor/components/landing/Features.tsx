'use client';

import { FileText, Users, Lock, Zap, Smartphone, Cloud } from 'lucide-react';

export function Features() {
  const features = [
    {
      icon: FileText,
      title: "Document Editor",
      description: "Powerful block-based editor with rich formatting, tables, and markdown support."
    },
    {
      icon: Users,
      title: "Real-time Collaboration",
      description: "Work together seamlessly with live cursors, comments, and instant updates."
    },
    {
      icon: Cloud,
      title: "Cloud Storage",
      description: "All your documents securely stored in the cloud with automatic backups."
    },
    {
      icon: Lock,
      title: "Secure & Private",
      description: "Enterprise-grade security with end-to-end encryption and privacy controls."
    },
    {
      icon: Smartphone,
      title: "Mobile Ready",
      description: "Access and edit your documents from any device with our responsive design."
    },
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Optimized performance with instant loading and smooth real-time updates."
    }
  ];

  return (
    <section className="relative py-24">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-20">
          <h2 className="text-4xl sm:text-5xl font-bold mb-6 tracking-tight">
            Everything You Need to Create Amazing Documents
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Built for modern teams who value simplicity, speed, and collaboration.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-white/10 backdrop-blur-md p-8 rounded-2xl border border-white/20 group hover:bg-white/15 transition-all"
            >
              <div className="bg-white/20 backdrop-blur-md w-14 h-14 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform border border-white/30">
                <feature.icon className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-4">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Call to Action */}
        <div className="text-center mt-20">
          <div className="bg-white/10 backdrop-blur-md p-10 max-w-3xl mx-auto rounded-2xl border border-white/20">
            <h3 className="text-3xl font-bold mb-6">Ready to get started?</h3>
            <p className="text-muted-foreground mb-8 text-lg leading-relaxed">
              Join thousands of teams who are already using our platform to create amazing content together.
            </p>
            <a
              href="/signup"
              className="inline-flex items-center gap-3 bg-primary text-primary-foreground px-8 py-4 rounded-xl font-semibold hover:bg-primary/90 transition-all hover:shadow-xl text-lg"
            >
              Start Free Today
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
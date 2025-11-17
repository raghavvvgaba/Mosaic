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
    <section className="py-24 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Everything You Need to Create Amazing Documents
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Built for modern teams who value simplicity, speed, and collaboration.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-background rounded-xl p-8 shadow-sm border hover:shadow-md transition-shadow duration-200"
            >
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-6">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Call to Action */}
        <div className="text-center mt-16">
          <div className="bg-primary/5 rounded-xl p-8 max-w-2xl mx-auto border border-primary/10">
            <h3 className="text-2xl font-semibold mb-4">Ready to get started?</h3>
            <p className="text-muted-foreground mb-6">
              Join thousands of teams who are already using our platform to create amazing content together.
            </p>
            <a
              href="/signup"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              Start Free Today
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
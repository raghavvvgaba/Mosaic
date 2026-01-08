'use client';

import { Check, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export function Pricing() {
  const plans = [
    {
      name: "Free",
      description: "Perfect for individuals and small projects",
      price: "$0",
      period: "forever",
      features: [
        "Up to 10 documents",
        "Basic formatting options",
        "Real-time collaboration",
        "Mobile access",
        "Cloud storage"
      ],
      excluded: [
        "Advanced formatting",
        "Document templates",
        "Priority support",
        "Version history",
        "Team workspaces"
      ],
      cta: "Get Started Free",
      ctaLink: "/signup",
      popular: false
    },
    {
      name: "Pro",
      description: "For professionals and growing teams",
      price: "$12",
      period: "per month",
      features: [
        "Unlimited documents",
        "Advanced formatting",
        "Document templates",
        "Real-time collaboration",
        "Version history",
        "Priority support",
        "Mobile access",
        "Cloud storage",
        "Export to PDF/Word",
        "Custom themes"
      ],
      excluded: [
        "Advanced team features",
        "SSO authentication",
        "Dedicated support"
      ],
      cta: "Start Free Trial",
      ctaLink: "/signup",
      popular: true
    },
    {
      name: "Team",
      description: "For organizations and large teams",
      price: "$29",
      period: "per user/month",
      features: [
        "Everything in Pro",
        "Team workspaces",
        "Advanced team permissions",
        "SSO authentication",
        "Dedicated account manager",
        "Custom integrations",
        "Advanced analytics",
        "API access",
        "Custom training",
        "SLA guarantee"
      ],
      excluded: [],
      cta: "Contact Sales",
      ctaLink: "#contact",
      popular: false
    }
  ];

  return (
    <section className="py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-20">
          <h2 className="text-4xl sm:text-5xl font-bold mb-6 tracking-tight">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Choose the perfect plan for your needs. Start free and scale as you grow.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative neu-card-hover p-8 ${
                plan.popular ? 'ring-2 ring-primary/50 scale-105' : ''
              }`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="glass flex items-center gap-2 text-primary px-4 py-2 rounded-xl text-sm font-semibold">
                    <Star className="w-4 h-4 fill-current" />
                    Most Popular
                  </div>
                </div>
              )}

              {/* Plan Name & Description */}
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold mb-3">{plan.name}</h3>
                <p className="text-muted-foreground">{plan.description}</p>
              </div>

              {/* Price */}
              <div className="text-center mb-8">
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-5xl font-bold">{plan.price}</span>
                  {plan.period && (
                    <span className="text-muted-foreground text-lg">{plan.period}</span>
                  )}
                </div>
              </div>

              {/* Features */}
              <div className="space-y-4 mb-8">
                {plan.features.map((feature, featureIndex) => (
                  <div key={featureIndex} className="flex items-center gap-3">
                    <div className="glass w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}

                {plan.excluded.map((feature, featureIndex) => (
                  <div key={featureIndex} className="flex items-center gap-3 opacity-40">
                    <div className="w-6 h-6 border border-border/50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <div className="w-3 h-0.5 bg-border" />
                    </div>
                    <span className="text-sm text-muted-foreground">{feature}</span>
                  </div>
                ))}
              </div>

              {/* CTA Button */}
              <Link href={plan.ctaLink}>
                <Button
                  className={`w-full h-12 text-base font-semibold ${
                    plan.popular
                      ? ''
                      : 'glass'
                  }`}
                  variant={plan.popular ? 'default' : 'ghost'}
                >
                  {plan.cta}
                </Button>
              </Link>
            </div>
          ))}
        </div>

        {/* Additional Info */}
        <div className="text-center mt-20">
          <p className="text-muted-foreground mb-6 text-lg">
            All plans include our core features with no hidden fees
          </p>
          <div className="flex flex-col sm:flex-row gap-8 justify-center text-sm text-muted-foreground">
            <div className="flex items-center gap-3 glass px-4 py-2 rounded-xl">
              <Check className="w-5 h-5 text-primary" />
              <span>No credit card required for free plan</span>
            </div>
            <div className="flex items-center gap-3 glass px-4 py-2 rounded-xl">
              <Check className="w-5 h-5 text-primary" />
              <span>Cancel anytime</span>
            </div>
            <div className="flex items-center gap-3 glass px-4 py-2 rounded-xl">
              <Check className="w-5 h-5 text-primary" />
              <span>30-day money-back guarantee</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
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
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Choose the perfect plan for your needs. Start free and scale as you grow.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative bg-background rounded-xl border ${
                plan.popular
                  ? 'border-primary shadow-lg scale-105'
                  : 'border-border shadow-sm'
              } hover:shadow-lg transition-all duration-200`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="flex items-center gap-1 bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium">
                    <Star className="w-4 h-4 fill-current" />
                    Most Popular
                  </div>
                </div>
              )}

              <div className="p-8">
                {/* Plan Name & Description */}
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <p className="text-muted-foreground">{plan.description}</p>
                </div>

                {/* Price */}
                <div className="text-center mb-8">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    {plan.period && (
                      <span className="text-muted-foreground">{plan.period}</span>
                    )}
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-3 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-center gap-3">
                      <div className="w-5 h-5 bg-green-500/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 text-green-600" />
                      </div>
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}

                  {plan.excluded.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-center gap-3 opacity-50">
                      <div className="w-5 h-5 border border-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                        <div className="w-3 h-0.5 bg-gray-400" />
                      </div>
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* CTA Button */}
                <Link href={plan.ctaLink}>
                  <Button
                    className={`w-full ${
                      plan.popular
                        ? 'bg-primary hover:bg-primary/90'
                        : 'bg-background hover:bg-muted border'
                    }`}
                    variant={plan.popular ? 'default' : 'outline'}
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Additional Info */}
        <div className="text-center mt-16">
          <p className="text-muted-foreground mb-4">
            All plans include our core features with no hidden fees
          </p>
          <div className="flex flex-col sm:flex-row gap-8 justify-center text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-600" />
              <span>No credit card required for free plan</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-600" />
              <span>Cancel anytime</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-600" />
              <span>30-day money-back guarantee</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
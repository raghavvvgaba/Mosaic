'use client';

import { Hero } from '@/components/landing/Hero';
import { Features } from '@/components/landing/Features';
import { Footer } from '@/components/landing/Footer';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0d141c] to-[#101a24]">
      <Hero />
      <Features />
      <Footer />
    </div>
  );
}
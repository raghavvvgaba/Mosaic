'use client';

import { Hero } from '@/components/landing/Hero';
import { Features } from '@/components/landing/Features';
import { Footer } from '@/components/landing/Footer';

export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-transparent">
      {/* Background Video */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="fixed inset-0 w-full h-full object-cover -z-10"
        style={{
          objectPosition: 'center',
        }}
      >
        <source src="/Hero_video.mp4" type="video/mp4" />
      </video>

      {/* Dark overlay for readability */}
      <div className="fixed inset-0 bg-black/40 -z-10" />

      <Hero />
      <Features />
      <Footer />
    </div>
  );
}
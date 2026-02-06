'use client';

import Link from 'next/link';
import { FileText, Github, Twitter, Linkedin } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative z-10 border-t border-white/10 bg-black/20 backdrop-blur-md">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-16 md:py-20">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 lg:gap-16">
            {/* Brand */}
            <div className="col-span-1 md:col-span-2">
              <Link href="/" className="inline-flex items-center gap-2 mb-6 group">
                <div className="w-10 h-10 bg-primary/20 border border-primary/20 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <span className="text-xl font-bold tracking-tight text-white">Mosaic</span>
              </Link>
              <p className="text-muted-foreground mb-8 max-w-sm leading-relaxed">
                The modern collaborative document editor that brings teams together to create amazing content. Built for speed, designed for focus.
              </p>
              <div className="flex items-center gap-4">
                <a
                  href="https://github.com"
                  className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all duration-300 hover:scale-110"
                  aria-label="GitHub"
                >
                  <Github className="w-5 h-5" />
                </a>
                <a
                  href="https://twitter.com"
                  className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all duration-300 hover:scale-110"
                  aria-label="Twitter"
                >
                  <Twitter className="w-5 h-5" />
                </a>
                <a
                  href="https://linkedin.com"
                  className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all duration-300 hover:scale-110"
                  aria-label="LinkedIn"
                >
                  <Linkedin className="w-5 h-5" />
                </a>
              </div>
            </div>

            {/* Product */}
            <div>
              <h3 className="font-semibold text-white mb-6 tracking-wide">Product</h3>
              <ul className="space-y-4">
                {['Features', 'Pricing', 'Templates', 'Changelog'].map((item) => (
                  <li key={item}>
                    <Link 
                      href={`/${item.toLowerCase()}`} 
                      className="text-muted-foreground hover:text-white transition-colors duration-200"
                    >
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h3 className="font-semibold text-white mb-6 tracking-wide">Company</h3>
              <ul className="space-y-4">
                {['About', 'Blog', 'Careers', 'Contact'].map((item) => (
                  <li key={item}>
                    <Link 
                      href={`/${item.toLowerCase()}`} 
                      className="text-muted-foreground hover:text-white transition-colors duration-200"
                    >
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="border-t border-white/10 pt-8 mt-12 md:mt-16">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              <p className="text-muted-foreground text-sm">
                © {currentYear} Mosaic Inc. All rights reserved.
              </p>
              <div className="flex flex-wrap justify-center gap-8 text-sm">
                <Link href="/privacy" className="text-muted-foreground hover:text-white transition-colors">
                  Privacy Policy
                </Link>
                <Link href="/terms" className="text-muted-foreground hover:text-white transition-colors">
                  Terms of Service
                </Link>
                <Link href="/security" className="text-muted-foreground hover:text-white transition-colors">
                  Security
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
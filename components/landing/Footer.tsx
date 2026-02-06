'use client';

import Link from 'next/link';
import { FileText, Github, Twitter, Linkedin } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative z-10 border-t border-white/10 bg-black/20 backdrop-blur-md">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-12">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            {/* Brand */}
            <div className="flex flex-col items-center md:items-start">
              <Link href="/" className="inline-flex items-center gap-2 mb-4 group">
                <div className="w-8 h-8 bg-primary/20 border border-primary/20 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                  <FileText className="w-4 h-4 text-primary" />
                </div>
                <span className="text-lg font-bold tracking-tight text-white">Mosaic</span>
              </Link>
              <p className="text-muted-foreground text-sm max-w-xs text-center md:text-left">
                The modern collaborative document editor built for speed and focus.
              </p>
            </div>

            {/* Socials & Copyright */}
            <div className="flex flex-col items-center md:items-end gap-6">
              <div className="flex items-center gap-5">
                <a 
                  href="https://github.com/raghavvvgaba" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/40 hover:text-white transition-colors" 
                  aria-label="GitHub"
                >
                  <Github className="w-5 h-5" />
                </a>
                <a 
                  href="https://x.com/raghavvvgaba" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/40 hover:text-white transition-colors" 
                  aria-label="Twitter"
                >
                  <Twitter className="w-5 h-5" />
                </a>
                <a 
                  href="https://www.linkedin.com/in/raghavvvgaba" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/40 hover:text-white transition-colors" 
                  aria-label="LinkedIn"
                >
                  <Linkedin className="w-5 h-5" />
                </a>
              </div>
              
              <div className="flex flex-wrap justify-center gap-6 text-xs text-muted-foreground">
                <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
                <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
                <span>© {currentYear} Mosaic Inc.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

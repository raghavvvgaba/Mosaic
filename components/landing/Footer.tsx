'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Github, Twitter, Linkedin, AlertTriangle } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  const handleReportBug = () => {
    // Functionality will be defined later
    alert('Bug report feature coming soon!');
  };

  return (
    <footer className="relative z-10 border-t border-white/10 bg-black/20 backdrop-blur-md">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-12">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            {/* Brand */}
            <div className="flex flex-col items-center md:items-start">
              <Link href="/" className="inline-flex items-center gap-2 mb-4 group">
                <div className="w-8 h-8 rounded-lg overflow-hidden ring-1 ring-primary/30 bg-black/20 group-hover:scale-105 transition-transform duration-300">
                  <Image src="/MosaicLogo.png" alt="Mosaic logo" width={32} height={32} className="h-full w-full object-cover" />
                </div>
                <span className="text-lg font-bold tracking-tight text-white">Mosaic</span>
              </Link>
            </div>

            {/* Socials & Copyright */}
            <div className="flex flex-col items-center md:items-end gap-6">
              <div className="flex flex-wrap items-center justify-center md:justify-end gap-5">
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
                <button
                  onClick={handleReportBug}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-red-500/30 bg-red-500/5 hover:bg-red-500/15 hover:border-red-500/50 transition-all duration-300 group text-xs"
                >
                  <AlertTriangle className="w-4 h-4 text-red-500/60 group-hover:text-red-500 transition-colors" />
                  <span className="text-red-500/60 group-hover:text-red-500 transition-colors">Report Bug</span>
                </button>
              </div>
              
              <div className="flex flex-wrap justify-center gap-6 text-xs text-muted-foreground">
                <span>© {currentYear} Mosaic Inc.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-background border-t border-border flex items-center justify-around z-40 pb-safe">
      <Link 
        href="/dashboard" 
        className={cn(
          "flex flex-col items-center justify-center gap-1 h-full w-full active:bg-accent/10 transition-colors",
          pathname === '/dashboard' ? "text-primary" : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Home className={cn("w-6 h-6", pathname === '/dashboard' && "fill-current")} />
        <span className="text-[10px] font-medium">Home</span>
      </Link>
      
      <Link 
        href="/dashboard/favorites"
        className={cn(
          "flex flex-col items-center justify-center gap-1 h-full w-full active:bg-accent/10 transition-colors",
          pathname === '/dashboard/favorites' ? "text-primary" : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Star className={cn("w-6 h-6", pathname === '/dashboard/favorites' && "fill-current")} />
        <span className="text-[10px] font-medium">Favorites</span>
      </Link>
    </div>
  );
}

'use client';

import { usePathname } from 'next/navigation';
import { FileText, Clock, Trash2, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTabs } from '@/contexts/TabsContext';

interface SidebarNavProps {
  allCount: number;
  recentCount: number;
  favoritesCount: number;
  trashCount: number;
}

export function SidebarNav({ allCount, recentCount, favoritesCount, trashCount }: SidebarNavProps) {
  const { openPage } = useTabs();
  const pathname = usePathname();

  const navItems = [
    {
      label: 'Home',
      icon: FileText,
      iconName: 'home',
      path: '/',
      count: allCount,
      isActive: pathname === '/' || pathname.startsWith('/documents/')
    },
    {
      label: 'Recent',
      icon: Clock,
      iconName: 'recent',
      path: '/recent',
      count: recentCount,
      isActive: pathname === '/recent'
    },
    {
      label: 'Favorites',
      icon: Star,
      iconName: 'favorites',
      path: '/favorites',
      count: favoritesCount,
      isActive: pathname === '/favorites'
    },
    {
      label: 'Trash',
      icon: Trash2,
      iconName: 'trash',
      path: '/trash',
      count: trashCount,
      isActive: pathname === '/trash'
    },
  ];

  return (
    <nav className="p-2 border-b">
      <div className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Button
              key={item.path}
              variant={item.isActive ? 'secondary' : 'ghost'}
              className="w-full justify-start"
              size="sm"
              onClick={() => openPage(item.path, item.label, item.iconName)}
            >
              <Icon className="w-4 h-4 mr-2" />
              <span className="flex-1 text-left">{item.label}</span>
              <span className="text-xs text-muted-foreground">{item.count}</span>
            </Button>
          );
        })}
      </div>
    </nav>
  );
}

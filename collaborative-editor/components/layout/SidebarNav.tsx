'use client';

import { usePathname } from 'next/navigation';
import { FileText, Clock, Trash2, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigation } from '@/contexts/NavigationContext';

interface SidebarNavProps {
  allCount: number;
  recentCount: number;
  favoritesCount: number;
  trashCount: number;
}

export function SidebarNav({ allCount, recentCount, favoritesCount, trashCount }: SidebarNavProps) {
  const { openPage } = useNavigation();
  const pathname = usePathname();

  const navItems = [
    {
      label: 'Home',
      icon: FileText,
      iconName: 'home',
      path: '/dashboard',
      count: allCount,
      isActive: pathname === '/dashboard' || pathname.startsWith('/dashboard/documents/')
    },
    {
      label: 'Recent',
      icon: Clock,
      iconName: 'recent',
      path: '/dashboard/recent',
      count: recentCount,
      isActive: pathname === '/dashboard/recent'
    },
    {
      label: 'Favorites',
      icon: Star,
      iconName: 'favorites',
      path: '/dashboard/favorites',
      count: favoritesCount,
      isActive: pathname === '/dashboard/favorites'
    },
    {
      label: 'Trash',
      icon: Trash2,
      iconName: 'trash',
      path: '/dashboard/trash',
      count: trashCount,
      isActive: pathname === '/dashboard/trash'
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
              onClick={() => openPage(item.path, item.label)}
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

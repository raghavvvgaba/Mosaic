'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { CheckSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { SearchBar } from '@/components/sidebar/SearchBar'; // Reusing existing search for now
import { cn } from '@/lib/utils';
import { useNavigation } from '@/contexts/NavigationContext';

interface DashboardTopBarProps {
  selectionMode: boolean;
  onToggleSelectionMode: () => void;
  selectedCount: number;
  onSelectAll?: () => void;
  showSelectAll?: boolean;
}

export function DashboardTopBar({ 
  selectionMode, 
  onToggleSelectionMode,
  selectedCount,
  onSelectAll,
  showSelectAll
}: DashboardTopBarProps) {
  const pathname = usePathname();
  const { openDocument } = useNavigation();

  // Desktop Tabs
  const tabs = [
    { name: 'Home', href: '/dashboard' },
    { name: 'Favorites', href: '/dashboard/favorites' },
  ];

  return (
    <div className="sticky top-0 z-30 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
      <div className="container mx-auto h-16 flex items-center gap-4 px-4 pl-14 md:pl-4">
        
        {/* Left Section: Tabs (Desktop Only) */}
        <div className="hidden md:flex items-center gap-6 mr-auto">
           {tabs.map(tab => {
             const isActive = pathname === tab.href;
             return (
               <Link 
                 key={tab.href} 
                 href={tab.href}
                 className={cn(
                   "text-sm font-medium transition-colors hover:text-primary relative py-5 whitespace-nowrap",
                   isActive ? "text-foreground" : "text-muted-foreground"
                 )}
               >
                 {tab.name}
                 {isActive && (
                   <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
                 )}
               </Link>
             );
           })}
        </div>

        {/* Right Section: Search + Actions */}
        <div className="flex flex-1 items-center justify-end gap-4 min-w-0">
           {/* Search Bar */}
           <div className="flex-1 md:flex-none md:w-64 lg:w-80 max-w-md">
              <SearchBar 
                onResultClick={(doc) => openDocument(doc.id, doc.title)} 
              />
           </div>

           {/* Actions */}
           <div className="flex items-center gap-2 flex-shrink-0">
              {/* Selection Mode Toggle */}
              <div className="flex items-center gap-2">
                {selectionMode && showSelectAll && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={onSelectAll}
                    className="hidden sm:flex"
                  >
                    Select All
                  </Button>
                )}
                
                <Button
                  variant={selectionMode ? "secondary" : "outline"}
                  size="sm"
                  onClick={onToggleSelectionMode}
                  className={cn(
                    "gap-2 min-w-[80px]",
                    selectionMode && "bg-primary/10 text-primary hover:bg-primary/20 border-primary/20"
                  )}
                >
                  {selectionMode ? (
                    <>
                      <CheckSquare className="w-4 h-4" />
                      <span>Done {selectedCount > 0 ? `(${selectedCount})` : ''}</span>
                    </>
                  ) : (
                    "Select"
                  )}
                </Button>
              </div>

              <div className="w-px h-6 bg-border mx-1" />

              {/* Theme Toggle */}
              <ThemeToggle />
           </div>
        </div>

      </div>
    </div>
  );
}

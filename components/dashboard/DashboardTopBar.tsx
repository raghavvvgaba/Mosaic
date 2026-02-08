'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { CheckSquare, Plus, Loader2, Home, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { SearchBar } from '@/components/sidebar/SearchBar'; // Reusing existing search for now
import { cn } from '@/lib/utils';
import { useNavigation } from '@/contexts/NavigationContext';
import { useDocumentMutations } from '@/hooks/swr';
import { useWorkspace } from '@/contexts/WorkspaceContext';

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
  const { createDocument, isCreating } = useDocumentMutations();
  const { activeWorkspaceId } = useWorkspace();

  const handleCreateDocument = async () => {
    try {
      const newDoc = await createDocument('Untitled', activeWorkspaceId ?? undefined);
      if (newDoc) {
        openDocument(newDoc.id, newDoc.title);
      }
    } catch (error) {
      console.error('Failed to create document:', error);
      alert('Failed to create document');
    }
  };

  // Desktop Tabs
  const tabs = [
    { name: 'Home', href: '/dashboard', icon: Home },
    { name: 'Favorites', href: '/dashboard/favorites', icon: Star },
  ];

  return (
    <div className="sticky top-0 z-30 w-full bg-background/50 backdrop-blur-sm supports-[backdrop-filter]:bg-background/30">
      <div className="w-full h-16 flex items-center gap-4 px-4 pl-14 md:pl-8">
        
        {/* Left Section: Tabs (Desktop Only) */}
        <div className="hidden md:flex items-center bg-muted/30 p-1 rounded-full border border-border/40 flex-shrink-0">
           {tabs.map(tab => {
             const isActive = pathname === tab.href;
             const Icon = tab.icon;
             return (
               <Link 
                 key={tab.href} 
                 href={tab.href}
                 className={cn(
                   "flex items-center gap-2 px-3 py-1.5 lg:px-4 rounded-full transition-all duration-300 ease-in-out whitespace-nowrap",
                   isActive 
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
                 )}
               >
                 <Icon className={cn("w-4 h-4 transition-transform duration-300", isActive && "fill-current scale-110")} />
                 <span className={cn(
                   "text-sm font-medium transition-all duration-300 overflow-hidden hidden xl:block",
                   isActive && "lg:block"
                 )}>
                   {tab.name}
                 </span>
               </Link>
             );
           })}
        </div>

        {/* Right Section: Search + Actions */}
        <div className="flex flex-1 items-center justify-end gap-2 md:gap-3 min-w-0 ml-2 md:ml-4">
           {/* Search Bar Section */}
           <div className="flex-1 md:flex-none md:w-36 lg:w-64 xl:w-80 max-w-md">
              <div className="rounded-full border border-border bg-muted/30 px-1 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/30 transition-all">
                <SearchBar 
                  onResultClick={(doc) => openDocument(doc.id, doc.title)} 
                />
              </div>
           </div>

           {/* Actions */}
           <div className="flex items-center gap-2 flex-shrink-0">
              {/* New Document Button */}
              <Button
                onClick={handleCreateDocument}
                disabled={isCreating}
                size="sm"
                className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground hidden sm:flex px-2 lg:px-3"
              >
                {isCreating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                <span className="hidden lg:inline">New</span>
              </Button>

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
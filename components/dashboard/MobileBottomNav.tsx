'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Star, Plus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDocumentMutations } from '@/hooks/swr';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useNavigation } from '@/contexts/NavigationContext';

export function MobileBottomNav() {
  const pathname = usePathname();
  const { createDocument, isCreating } = useDocumentMutations();
  const { activeWorkspaceId } = useWorkspace();
  const { openDocument } = useNavigation();

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

      <button
        onClick={handleCreateDocument}
        disabled={isCreating}
        className="flex flex-col items-center justify-center gap-1 h-full w-full active:bg-accent/10 transition-colors text-primary"
      >
        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-lg active:scale-95 transition-transform">
          {isCreating ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <Plus className="w-6 h-6" />
          )}
        </div>
      </button>
      
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

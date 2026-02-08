'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { 
  Menu, 
  X, 
  Settings, 
  Trash2, 
  HelpCircle, 
  ChevronLeft, 
  ChevronRight,
  Plus,
  Check,
  Home,
  Settings2,
  LogOut,
  FileText,
  Loader2,
  type LucideIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuthContext } from '@/contexts/AuthContext';
import { useDocumentMutations } from '@/hooks/swr';
import { useNavigation } from '@/contexts/NavigationContext';
import { UserAvatar } from '@/components/auth/UserAvatar';
import { cn, getInitials, getWorkspaceColor } from '@/lib/utils';
import { WorkspaceSwitcher, WorkspaceManagerDialog } from './WorkspaceSwitcher';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SidebarProps {
  onShowShortcuts: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function Sidebar({ 
  onShowShortcuts, 
  isCollapsed, 
  onToggleCollapse 
}: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { activeWorkspace, workspaces, setActiveWorkspace } = useWorkspace();
  const { user, signOut } = useAuthContext();
  const { createDocument, isCreating } = useDocumentMutations();
  const { openDocument } = useNavigation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isWorkspaceManagerOpen, setIsWorkspaceManagerOpen] = useState(false);

  const handleCreateDocument = async () => {
    try {
      const newDoc = await createDocument('Untitled', activeWorkspace?.id ?? undefined);
      if (newDoc) {
        openDocument(newDoc.id, newDoc.title);
      }
    } catch (error) {
      console.error('Failed to create document:', error);
    }
  };

  const SidebarItem = ({ 
    icon: Icon, 
    label, 
    onClick, 
    isActive = false,
    shortcut
  }: { 
    icon: LucideIcon, 
    label: string, 
    onClick: () => void, 
    isActive?: boolean,
    shortcut?: string
  }) => (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            className={cn(
              "w-full h-9 mb-1 transition-all duration-200 ease-in-out",
              isCollapsed ? "justify-center px-0" : "justify-start px-2",
              isActive 
                ? "bg-sidebar-accent text-primary font-medium shadow-sm" 
                : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
            )}
            onClick={onClick}
          >
            <Icon className={cn("h-4 w-4 shrink-0", isCollapsed ? "mr-0" : "mr-2.5")} />
            {!isCollapsed && <span className="flex-1 text-left truncate text-sm">{label}</span>}
          </Button>
        </TooltipTrigger>
        {isCollapsed && (
          <TooltipContent side="right" className="flex items-center gap-2">
            {label}
            {shortcut && <span className="text-xs text-muted-foreground bg-muted px-1 rounded">{shortcut}</span>}
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );

  return (
    <>
      {/* Mobile toggle button */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden fixed top-4 left-3 z-[60] bg-background/80 backdrop-blur-md border border-border shadow-sm rounded-full h-8 w-8"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
      >
        {isMobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
      </Button>

      {/* Overlay for mobile */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          "fixed md:relative z-50 h-screen bg-background md:bg-transparent transition-all duration-300 ease-in-out flex flex-col",
          isMobileOpen ? "translate-x-0 w-72 shadow-2xl" : "-translate-x-full md:translate-x-0",
          !isMobileOpen && (isCollapsed ? "md:w-[60px]" : "md:w-64")
        )}
      >
        {/* Top: Collapse Button (Desktop) */}
        <div className={cn(
            "hidden md:flex items-center h-12",
            isCollapsed ? "justify-center" : "justify-end px-3"
        )}>
           <Button 
             variant="ghost" 
             size="icon" 
             onClick={onToggleCollapse} 
             className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-sidebar-accent rounded-md"
           >
             {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
           </Button>
        </div>

        {/* Mobile Header */}
        <div className="md:hidden flex items-center h-14 px-4 gap-2">
          <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
            <FileText className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg tracking-tight text-sidebar-foreground">Mosaic</span>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-6">
          
          {/* Workspaces Section */}
          {isCollapsed ? (
             <div className="px-2 flex justify-center">
                <WorkspaceSwitcher collapsed={true} />
             </div>
          ) : (
            <div className="space-y-2">
               <div className="px-2">
                                  <div className="px-3 pb-2 flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.1em]">
                                      All Workspaces
                                    </span>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-5 w-5 text-muted-foreground/50 hover:text-primary transition-colors"
                                      onClick={() => setIsWorkspaceManagerOpen(true)}
                                    >
                                      <Plus className="h-3 w-3" />
                                    </Button>
                                  </div>
                                  <div className="space-y-0.5">
                                    {workspaces.map(w => (
                                      <Button
                                        key={w.id}
                                        variant="ghost"
                                        className={cn(
                                          "w-full justify-start h-9 px-2 text-sm font-medium transition-all group rounded-lg",
                                          activeWorkspace?.id === w.id 
                                             ? "bg-sidebar-accent text-primary shadow-sm" 
                                             : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50"
                                        )}
                                        onClick={() => setActiveWorkspace(w.id)}
                                      >
                                        <div className={cn(
                                          "w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold mr-2.5 transition-all shadow-sm group-hover:shadow-none",
                                          getWorkspaceColor(w.id)
                                        )}>
                                          {getInitials(w.name)}
                                        </div>
                                        <span className="truncate flex-1 text-left">{w.name}</span>
                                        {activeWorkspace?.id === w.id && (
                                          <div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center ml-2">
                                            <Check className="h-2.5 w-2.5 text-primary" />
                                          </div>
                                        )}
                                      </Button>
                                    ))}
                                    
                                    <Button
                                      variant="ghost"
                                      className="w-full justify-start h-9 px-2 mt-1 text-xs text-muted-foreground/70 hover:text-foreground hover:bg-sidebar-accent/50 group rounded-lg transition-colors"
                                      onClick={() => setIsWorkspaceManagerOpen(true)}
                                    >
                                      <div className="w-6 h-6 rounded-md border border-dashed border-muted-foreground/20 flex items-center justify-center mr-2.5 group-hover:border-primary/50 group-hover:text-primary transition-colors">
                                        <Settings2 className="h-3 w-3" />
                                      </div>
                                      <span className="font-medium">Manage Workspaces</span>
                                    </Button>
                                  </div>               </div>
            </div>
          )}

          {/* Navigation Links */}
          <div className="px-3">
             {!isCollapsed && (
               <div className="px-2 pb-2 text-[11px] font-medium text-muted-foreground/70 uppercase tracking-wider">
                 Mosaic
               </div>
             )}
            <div className="space-y-0.5">
              <SidebarItem 
                icon={Home} 
                label="Home" 
                onClick={() => router.push('/dashboard')}
                isActive={pathname === '/dashboard'}
              />
              <SidebarItem 
                icon={Trash2} 
                label="Trash" 
                onClick={() => router.push('/dashboard/trash')}
                isActive={pathname === '/dashboard/trash'}
              />
              <SidebarItem 
                icon={Settings} 
                label="Settings" 
                onClick={() => router.push('/dashboard/settings')}
                isActive={pathname === '/dashboard/settings'}
              />
            </div>
          </div>

        </div>

        {/* Bottom */}
        <div className="p-3 space-y-1">
          <div className={cn("flex mb-1", isCollapsed ? "justify-center" : "justify-start px-2")}>
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground transition-all"
                    onClick={onShowShortcuts}
                  >
                    <HelpCircle className="h-4 w-4 shrink-0" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  Keyboard Shortcuts
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          <div className={cn(
            "flex items-center gap-3 px-2 py-2 rounded-lg transition-colors group",
            isCollapsed ? "justify-center px-0" : "justify-start"
          )}>
            <UserAvatar className="h-8 w-8 shrink-0" />
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {user?.name || 'User'}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.email}
                </p>
              </div>
            )}
            {!isCollapsed && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                onClick={signOut}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

      </aside>

      <WorkspaceManagerDialog 
        open={isWorkspaceManagerOpen} 
        onOpenChange={setIsWorkspaceManagerOpen} 
      />
    </>
  );
}

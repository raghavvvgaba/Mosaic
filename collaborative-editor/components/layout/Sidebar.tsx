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
  Briefcase,
  Home,
  Settings2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuthContext } from '@/contexts/AuthContext';
import { cn, getInitials, getWorkspaceColor } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { WorkspaceSwitcher, WorkspaceManagerDialog } from './WorkspaceSwitcher';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SidebarProps {
  onSearchOpen: () => void;
  onShowShortcuts: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function Sidebar({ 
  onSearchOpen, 
  onShowShortcuts, 
  isCollapsed, 
  onToggleCollapse 
}: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuthContext();
  const { activeWorkspace, workspaces, setActiveWorkspace } = useWorkspace();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isWorkspaceManagerOpen, setIsWorkspaceManagerOpen] = useState(false);

  const SidebarItem = ({ 
    icon: Icon, 
    label, 
    onClick, 
    isActive = false,
    shortcut
  }: { 
    icon: any, 
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
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm" 
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
          "fixed md:relative z-50 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out flex flex-col shadow-[1px_0_0_0_rgba(0,0,0,0.02)]",
          isMobileOpen ? "translate-x-0 w-72 shadow-2xl" : "-translate-x-full md:translate-x-0",
          !isMobileOpen && (isCollapsed ? "md:w-[60px]" : "md:w-64")
        )}
      >
        {/* Top: Collapse Button (Desktop) */}
        <div className={cn(
            "hidden md:flex items-center h-12 border-b border-sidebar-border/50",
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
        <div className="md:hidden flex items-center h-14 px-4 border-b border-sidebar-border">
          <span className="font-semibold text-lg tracking-tight">Menu</span>
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
                                             ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm" 
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
                 Menu
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
        <div className="p-3 border-t border-sidebar-border bg-sidebar/50 backdrop-blur-sm">
          <SidebarItem 
            icon={HelpCircle} 
            label="Shortcuts" 
            onClick={onShowShortcuts}
            shortcut="?"
          />
        </div>

      </aside>

      <WorkspaceManagerDialog 
        open={isWorkspaceManagerOpen} 
        onOpenChange={setIsWorkspaceManagerOpen} 
      />
    </>
  );
}
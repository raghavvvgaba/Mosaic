'use client';

import { User, LogIn, Settings, HelpCircle } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthContext } from '@/contexts/AuthContext';
import { UserAvatar } from '@/components/auth/UserAvatar';
import { useState } from 'react';
import { AuthModal } from '@/components/auth/AuthModal';

interface SidebarFooterProps {
  onShowShortcuts: () => void;
}

export function SidebarFooter({ onShowShortcuts }: SidebarFooterProps) {
  const { user, loading } = useAuthContext();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const handleAuthClick = () => {
    setIsAuthModalOpen(true);
  };

  return (
    <>
      <div className="p-4 border-t flex items-center justify-between gap-2">
        <div className="text-xs text-muted-foreground truncate flex-1">
          CollabEditor
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onShowShortcuts}
            className="h-8 w-8 p-0"
            title="Keyboard shortcuts"
          >
            <HelpCircle className="h-4 w-4" />
          </Button>
          <ThemeToggle />

          {loading ? (
            <div className="h-8 w-8 flex items-center justify-center">
              <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : user ? (
            <UserAvatar />
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 rounded-full p-0">
                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-4 w-4" />
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">Guest User</span>
                    <span className="text-xs text-muted-foreground">Local-first notes</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleAuthClick}>
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign In / Sign Up
                </DropdownMenuItem>
                <DropdownMenuItem disabled>
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </>
  );
}

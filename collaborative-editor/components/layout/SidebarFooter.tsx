'use client';

import { User, LogIn, Settings, HelpCircle } from 'lucide-react';
import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { useAuthContext } from '@/contexts/AuthContext';
import { UserAvatar } from '@/components/auth/UserAvatar';
import { useGuestLimit } from '@/contexts/GuestLimitContext';
import { GuestLimitModal } from '@/components/guest/GuestLimitModal';

interface SidebarFooterProps {
  onShowShortcuts: () => void;
}

export function SidebarFooter({ onShowShortcuts }: SidebarFooterProps) {
  const { user, loading } = useAuthContext();
  const {
    isGuestLimitModalOpen,
    limitType,
    setIsGuestLimitModalOpen,
    handleGuestLimitSignUp
  } = useGuestLimit();

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
            <div className="flex flex-col gap-1">
              <Link href="/login">
                <Button variant="ghost" size="sm" className="h-7 w-full justify-start px-2" title="Sign In">
                  <LogIn className="w-3 h-3 mr-2" />
                  <span className="text-xs">Sign In</span>
                </Button>
              </Link>
              <Link href="/signup">
                <Button variant="default" size="sm" className="h-7 w-full justify-start px-2" title="Sign Up">
                  <User className="w-3 h-3 mr-2" />
                  <span className="text-xs">Sign Up</span>
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>

        <GuestLimitModal
          isOpen={isGuestLimitModalOpen}
          onClose={() => setIsGuestLimitModalOpen(false)}
          onSignUp={handleGuestLimitSignUp}
          limitType={limitType}
        />
      </>
    );
}

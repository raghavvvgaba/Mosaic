'use client';

import { FileText, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface GuestLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignUp: () => void;
  limitType: 'document' | 'workspace';
}

export function GuestLimitModal({
  isOpen,
  onClose,
  onSignUp,
  limitType
}: GuestLimitModalProps) {
  const isDocumentLimit = limitType === 'document';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[440px] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-orange-100 rounded-lg flex-shrink-0">
              {isDocumentLimit ? (
                <FileText className="h-5 w-5 text-orange-600" />
              ) : (
                <FolderOpen className="h-5 w-5 text-orange-600" />
              )}
            </div>
            <DialogTitle className="text-lg font-semibold text-gray-100 leading-tight">
              Guest Limit Reached
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="px-6 pb-6">
          <DialogDescription className="text-base text-gray-300 leading-relaxed">
            You&apos;ve reached the guest limit of{' '}
            <span className="font-semibold text-gray-900">
              {isDocumentLimit ? '10 documents' : '2 workspaces'}
            </span>
            .
          </DialogDescription>

          <div className="mt-5 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800 leading-relaxed">
              Sign up to create unlimited {isDocumentLimit ? 'documents' : 'workspaces'} and unlock all features!
            </p>
          </div>

          <div className="flex gap-3 mt-6">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 h-11 text-base font-medium"
            >
              Maybe Later
            </Button>
            <Button
              onClick={onSignUp}
              className="flex-1 h-11 text-base font-medium"
            >
              Sign Up
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
'use client';

import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ExportDialog } from './ExportDialog';
import { useState } from 'react';
import type { Document } from '@/lib/db/types';

interface ExportButtonProps {
  document: Document;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showText?: boolean;
}

export function ExportButton({ 
  document, 
  variant = 'outline', 
  size = 'sm',
  showText = false 
}: ExportButtonProps) {
  const [showExportDialog, setShowExportDialog] = useState(false);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setShowExportDialog(true)}
        className="flex items-center gap-2"
        data-export-button
      >
        <Download className="w-4 h-4" />
        {showText && <span>Export</span>}
      </Button>

      <ExportDialog
        document={document}
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
      />
    </>
  );
}

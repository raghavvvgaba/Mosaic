'use client';

import { useState } from 'react';
import { Download, FileText, File } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { exportDocumentAsMarkdown } from '@/lib/export/markdown';
import { exportDocumentAsPDF } from '@/lib/export/pdf';
import type { Document } from '@/lib/db/types';

interface ExportDialogProps {
  document: Document;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExportDialog({ document, open, onOpenChange }: ExportDialogProps) {
  const [format, setFormat] = useState<'markdown' | 'pdf'>('markdown');
  const [filename, setFilename] = useState(document.title || 'Untitled');
  const [isExporting, setIsExporting] = useState(false);

  const getFileExtension = () => {
    return format === 'markdown' ? '.md' : '.pdf';
  };

  const getFullFilename = () => {
    const cleanFilename = filename.replace(/[^a-zA-Z0-9\s-_]/g, '').trim() || 'Untitled';
    return `${cleanFilename}${getFileExtension()}`;
  };

  const handleExport = async () => {
    if (isExporting) return;

    setIsExporting(true);
    
    try {
      if (format === 'markdown') {
        await exportDocumentAsMarkdown(document.id);
      } else if (format === 'pdf') {
        await exportDocumentAsPDF(document.id);
      }
      
      // Close dialog after successful export
      onOpenChange(false);
    } catch (error) {
      console.error('Export failed:', error);
      // You could show a toast notification here
      alert(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleFilenameChange = (value: string) => {
    // Remove file extension if user types it
    const cleanValue = value.replace(/\.(md|pdf)$/i, '');
    setFilename(cleanValue);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Export Document
          </DialogTitle>
          <DialogDescription>
            Choose a format and filename for your export
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Format Selection */}
          <div className="space-y-3">
            <Label>Format</Label>
            <RadioGroup value={format} onValueChange={(value: 'markdown' | 'pdf') => setFormat(value)}>
              <div className="flex items-center space-x-3 rounded-lg border p-3 cursor-pointer hover:bg-accent">
                <RadioGroupItem value="markdown" id="markdown" />
                <Label htmlFor="markdown" className="flex items-center gap-3 cursor-pointer flex-1">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <div className="flex-1">
                    <div className="font-medium">Markdown</div>
                    <div className="text-sm text-muted-foreground">
                      Best for code, documentation, and version control
                    </div>
                  </div>
                </Label>
              </div>
              
              <div className="flex items-center space-x-3 rounded-lg border p-3 cursor-pointer hover:bg-accent">
                <RadioGroupItem value="pdf" id="pdf" />
                <Label htmlFor="pdf" className="flex items-center gap-3 cursor-pointer flex-1">
                  <File className="w-5 h-5 text-red-600" />
                  <div className="flex-1">
                    <div className="font-medium">PDF</div>
                    <div className="text-sm text-muted-foreground">
                      Best for sharing, printing, and presentations
                    </div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Filename Input */}
          <div className="space-y-2">
            <Label htmlFor="filename">Filename</Label>
            <div className="flex items-center gap-2">
              <Input
                id="filename"
                value={filename}
                onChange={(e) => handleFilenameChange(e.target.value)}
                placeholder="Enter filename"
                className="flex-1"
              />
              <div className="text-sm text-muted-foreground min-w-fit">
                {getFileExtension()}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              File will be saved as: <code>{getFullFilename()}</code>
            </p>
          </div>

          {/* Format-specific info */}
          <div className="rounded-lg bg-muted p-3">
            <h4 className="font-medium text-sm mb-2">Export Details:</h4>
            {format === 'markdown' ? (
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Preserves all text formatting</li>
                <li>• Includes images as base64 data</li>
                <li>• Compatible with GitHub, GitLab, etc.</li>
                <li>• Can be edited in any text editor</li>
              </ul>
            ) : (
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Professional document layout</li>
                <li>• Includes page numbers and headers</li>
                <li>• Optimized for printing</li>
                <li>• Works on all devices</li>
              </ul>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isExporting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting || !filename.trim()}
            className="min-w-[100px]"
          >
            {isExporting ? (
              <>
                <div className="w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Export
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

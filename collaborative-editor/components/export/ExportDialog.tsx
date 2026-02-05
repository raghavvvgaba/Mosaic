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
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="bg-background/80 backdrop-blur-md border border-border shadow-sm w-10 h-10 rounded-xl flex items-center justify-center">
              <Download className="w-5 h-5 text-primary" />
            </div>
            Export Document
          </DialogTitle>
          <DialogDescription className="text-base">
            Choose a format and filename for your export
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Format Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Format</Label>
            <RadioGroup value={format} onValueChange={(value: 'markdown' | 'pdf') => setFormat(value)}>
              <div className="flex items-center space-x-3 bg-card border border-border rounded-xl shadow-sm transition-all p-4 cursor-pointer hover:transform hover:-translate-y-1 transition-all rounded-xl">
                <RadioGroupItem value="markdown" id="markdown" />
                <Label htmlFor="markdown" className="flex items-center gap-3 cursor-pointer flex-1">
                  <div className="bg-background/80 backdrop-blur-md border border-border shadow-sm w-10 h-10 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold">Markdown</div>
                    <div className="text-sm text-muted-foreground">
                      Best for code, documentation, and version control
                    </div>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-3 bg-card border border-border rounded-xl shadow-sm transition-all p-4 cursor-pointer hover:transform hover:-translate-y-1 transition-all rounded-xl">
                <RadioGroupItem value="pdf" id="pdf" />
                <Label htmlFor="pdf" className="flex items-center gap-3 cursor-pointer flex-1">
                  <div className="bg-background/80 backdrop-blur-md border border-border shadow-sm w-10 h-10 rounded-lg flex items-center justify-center">
                    <File className="w-5 h-5 text-red-500" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold">PDF</div>
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
            <Label htmlFor="filename" className="text-sm font-medium">Filename</Label>
            <div className="flex items-center gap-3">
              <Input
                id="filename"
                value={filename}
                onChange={(e) => handleFilenameChange(e.target.value)}
                placeholder="Enter filename"
                className="flex-1 h-11"
              />
              <div className="text-sm text-muted-foreground min-w-fit bg-muted/60 px-3 py-2 rounded-lg font-mono">
                {getFileExtension()}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              File will be saved as: <code className="bg-muted/60 px-2 py-0.5 rounded">{getFullFilename()}</code>
            </p>
          </div>

          {/* Format-specific info */}
          <div className="neu-inset p-4 rounded-xl">
            <h4 className="font-semibold text-sm mb-3">Export Details:</h4>
            {format === 'markdown' ? (
              <ul className="text-xs text-muted-foreground space-y-2">
                <li>• Preserves all text formatting</li>
                <li>• Includes images as base64 data</li>
                <li>• Compatible with GitHub, GitLab, etc.</li>
                <li>• Can be edited in any text editor</li>
              </ul>
            ) : (
              <ul className="text-xs text-muted-foreground space-y-2">
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
            variant="glass"
            onClick={() => onOpenChange(false)}
            disabled={isExporting}
            className="h-10"
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting || !filename.trim()}
            className="min-w-[120px] h-10"
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

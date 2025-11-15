'use client';

import React, { useState, useEffect } from 'react';
import { getDocument } from '@/lib/db/documents';
import { conflictResolver, Conflict, ResolvedConflict } from '@/lib/sync/conflict-resolver';
import { syncService } from '@/lib/sync/sync-service';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  GitMerge,
  User,
  Cloud,
  Laptop
} from 'lucide-react';

interface ConflictResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  conflicts: Conflict[];
  onResolved?: () => void;
}

export function ConflictResolutionModal({
  isOpen,
  onClose,
  documentId,
  conflicts,
  onResolved
}: ConflictResolutionModalProps) {
  const [document, setDocument] = useState<any>(null);
  const [resolutions, setResolutions] = useState<ResolvedConflict[]>([]);
  const [isResolving, setIsResolving] = useState(false);
  const [activeTab, setActiveTab] = useState('conflicts');

  useEffect(() => {
    if (isOpen && documentId) {
      loadDocument();
    }
  }, [isOpen, documentId]);

  const loadDocument = async () => {
    try {
      const doc = await getDocument(documentId);
      setDocument(doc);
    } catch (error) {
      console.error('Failed to load document:', error);
    }
  };

  const handleResolutionChange = (conflictId: string, resolution: 'local' | 'remote' | 'merge') => {
    setResolutions(prev => {
      const existing = prev.find(r => r.id === conflictId);
      if (existing) {
        return prev.map(r =>
          r.id === conflictId
            ? { ...r, resolution }
            : r
        );
      } else {
        return [...prev, { id: conflictId, field: '', resolution }];
      }
    });
  };

  const handleAutoResolve = async () => {
    try {
      setIsResolving(true);
      const result = await conflictResolver.autoResolveConflicts(documentId, conflicts);

      if (result.remaining.length === 0) {
        // All conflicts resolved
        handleClose();
        onResolved?.();
      } else {
        // Some conflicts still need manual resolution
        // Auto-resolved conflicts are marked as resolved
        setResolutions(result.resolved.map(conflict => ({
          id: conflict.id,
          field: conflict.field,
          resolution: conflict.resolution || 'local'
        })));
      }
    } catch (error) {
      console.error('Auto-resolve failed:', error);
    } finally {
      setIsResolving(false);
    }
  };

  const handleResolveManually = async () => {
    try {
      setIsResolving(true);
      await conflictResolver.resolveConflicts(documentId, conflicts, resolutions);

      // Trigger sync after resolution
      await syncService.syncDocument(documentId);

      handleClose();
      onResolved?.();
    } catch (error) {
      console.error('Manual resolution failed:', error);
    } finally {
      setIsResolving(false);
    }
  };

  const handleClose = () => {
    setResolutions([]);
    setIsResolving(false);
    setActiveTab('conflicts');
    onClose();
  };

  const getConflictIcon = (conflict: Conflict) => {
    switch (conflict.field) {
      case 'title':
        return <FileText className="h-4 w-4" />;
      case 'content':
        return <FileText className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return 'empty';
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'string') {
      if (value.length > 200) return value.substring(0, 200) + '...';
      return value;
    }
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value).substring(0, 200) + '...';
      } catch {
        return 'object';
      }
    }
    return String(value);
  };

  const formatTime = (date: Date): string => {
    return new Date(date).toLocaleString();
  };

  const getFieldDisplayName = (field: string): string => {
    const displayNames: Record<string, string> = {
      title: 'Title',
      content: 'Content',
      font: 'Font',
      icon: 'Icon',
      coverImage: 'Cover Image',
      isFavorite: 'Favorite Status'
    };
    return displayNames[field] || field;
  };

  const allConflictsResolved = conflicts.every(conflict =>
    resolutions.some(resolution => resolution.id === conflict.id)
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Sync Conflicts Detected
          </DialogTitle>
          <DialogDescription>
            Document "{document?.title || 'Untitled'}" has conflicts that need to be resolved.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col h-[60vh]">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="conflicts">
                Conflicts ({conflicts.length})
              </TabsTrigger>
              <TabsTrigger value="preview">
                Preview
              </TabsTrigger>
            </TabsList>

            <TabsContent value="conflicts" className="flex-1 overflow-y-auto mt-4">
              <div className="space-y-4">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    This document was modified both locally and remotely. Please resolve each conflict below.
                  </AlertDescription>
                </Alert>

                {/* Auto-resolve button */}
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-600">
                    {allConflictsResolved
                      ? 'All conflicts have been resolved'
                      : `${resolutions.length}/${conflicts.length} conflicts resolved`}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAutoResolve}
                    disabled={isResolving}
                  >
                    {isResolving ? (
                      <>
                        <div className="animate-spin h-3 w-3 border-2 border-gray-600 border-t-transparent rounded-full mr-2" />
                        Auto-resolving...
                      </>
                    ) : (
                      'Auto-resolve Simple Conflicts'
                    )}
                  </Button>
                </div>

                {/* Conflict items */}
                {conflicts.map((conflict) => {
                  const resolution = resolutions.find(r => r.id === conflict.id);
                  return (
                    <div key={conflict.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        {getConflictIcon(conflict)}
                        <h3 className="font-semibold">
                          {getFieldDisplayName(conflict.field)}
                        </h3>
                        {resolution && (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-800">
                            {resolution.resolution}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        {/* Local version */}
                        <div className={`border rounded p-3 ${resolution?.resolution === 'local' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                          <div className="flex items-center gap-2 mb-2">
                            <Laptop className="h-4 w-4 text-gray-500" />
                            <span className="font-medium text-sm">Local</span>
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs border border-gray-300 text-gray-600">
                              {formatTime(conflict.localTimestamp)}
                            </span>
                          </div>
                          <div className="text-sm">
                            {conflict.field === 'content' ? (
                              <pre className="whitespace-pre-wrap font-mono text-xs">
                                {formatValue(conflict.localValue)}
                              </pre>
                            ) : (
                              <p>{formatValue(conflict.localValue)}</p>
                            )}
                          </div>
                        </div>

                        {/* Remote version */}
                        <div className={`border rounded p-3 ${resolution?.resolution === 'remote' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                          <div className="flex items-center gap-2 mb-2">
                            <Cloud className="h-4 w-4 text-gray-500" />
                            <span className="font-medium text-sm">Remote</span>
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs border border-gray-300 text-gray-600">
                              {formatTime(conflict.remoteTimestamp)}
                            </span>
                          </div>
                          <div className="text-sm">
                            {conflict.field === 'content' ? (
                              <pre className="whitespace-pre-wrap font-mono text-xs">
                                {formatValue(conflict.remoteValue)}
                              </pre>
                            ) : (
                              <p>{formatValue(conflict.remoteValue)}</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Resolution options */}
                      <div className="flex gap-2">
                        <Button
                          variant={resolution?.resolution === 'local' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleResolutionChange(conflict.id, 'local')}
                        >
                          Use Local
                        </Button>
                        <Button
                          variant={resolution?.resolution === 'remote' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleResolutionChange(conflict.id, 'remote')}
                        >
                          Use Remote
                        </Button>
                        {conflict.field === 'isFavorite' && (
                          <Button
                            variant={resolution?.resolution === 'merge' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handleResolutionChange(conflict.id, 'merge')}
                          >
                            Merge
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="preview" className="flex-1 overflow-y-auto mt-4">
              <div className="space-y-4">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Preview shows how the document will look after applying your resolutions.
                  </AlertDescription>
                </Alert>

                {document && (
                  <div className="space-y-4">
                    {conflicts.map((conflict) => {
                      const resolution = resolutions.find(r => r.id === conflict.id);
                      const resolvedValue = resolution?.resolution === 'local'
                        ? conflict.localValue
                        : resolution?.resolution === 'remote'
                        ? conflict.remoteValue
                        : conflict.localValue; // Default to local for now

                      return (
                        <div key={conflict.id} className="border rounded p-3">
                          <h4 className="font-medium mb-2">
                            {getFieldDisplayName(conflict.field)}
                          </h4>
                          <div className="text-sm text-gray-600">
                            {formatValue(resolvedValue)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {/* Actions */}
          <div className="flex justify-between items-center pt-4 border-t mt-4">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              onClick={handleResolveManually}
              disabled={!allConflictsResolved || isResolving}
            >
              {isResolving ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                  Resolving...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Apply Resolutions
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
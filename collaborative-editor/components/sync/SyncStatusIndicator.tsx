'use client';

import React, { useState, useEffect } from 'react';
import { syncStatusManager, DetailedSyncStatus, SyncStatusLevel } from '@/lib/sync/sync-status-manager';
import { backgroundSyncWorker } from '@/lib/sync/background-sync-worker';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Cloud,
  CloudOff,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  Wifi,
  WifiOff,
  X
} from 'lucide-react';

interface SyncStatusIndicatorProps {
  className?: string;
  showText?: boolean;
  compact?: boolean;
}

export function SyncStatusIndicator({
  className = '',
  showText = true,
  compact = false
}: SyncStatusIndicatorProps) {
  const [status, setStatus] = useState<DetailedSyncStatus | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // Subscribe to sync status changes
    const unsubscribe = syncStatusManager.subscribe((newStatus) => {
      setStatus(newStatus);
    });

    return unsubscribe;
  }, []);

  if (!status) {
    return null;
  }

  const getIcon = () => {
    switch (status.status) {
      case 'synced':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'syncing':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'offline':
        return <WifiOff className="h-4 w-4 text-gray-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Cloud className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = () => {
    switch (status.status) {
      case 'synced':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'syncing':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'offline':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'pending':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const handleForceSync = async () => {
    try {
      await backgroundSyncWorker.forceSyncNow();
    } catch (error) {
      console.error('Force sync failed:', error);
    }
  };

  const handleDismissError = () => {
    syncStatusManager.clearErrors();
  };

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`inline-flex items-center gap-1 ${className}`}>
              {getIcon()}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{status.message}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${getStatusColor()} transition-colors`}>
        {getIcon()}

        {showText && (
          <span className="text-sm font-medium">
            {status.status === 'synced' ? 'Synced' :
             status.status === 'syncing' ? 'Syncing...' :
             status.status === 'offline' ? 'Offline' :
             status.status === 'error' ? 'Sync Error' :
             'Pending'}
          </span>
        )}

        {status.status === 'error' && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-red-100"
            onClick={handleForceSync}
            title="Retry sync"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        )}

        {status.status === 'error' && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-red-100"
            onClick={handleDismissError}
            title="Dismiss error"
          >
            <X className="h-3 w-3" />
          </Button>
        )}

        {(status.pendingUploads > 0 || status.pendingDownloads > 0) && (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
            {status.pendingUploads + status.pendingDownloads}
          </span>
        )}
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-white border rounded-lg shadow-lg p-4 z-50">
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Sync Status</h3>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setIsExpanded(false)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>

            {/* Status details */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className="font-medium">{status.message}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">Connection:</span>
                <span className="font-medium flex items-center gap-1">
                  {status.isOnline ? (
                    <><Wifi className="h-3 w-3" /> Online</>
                  ) : (
                    <><WifiOff className="h-3 w-3" /> Offline</>
                  )}
                </span>
              </div>

              {status.lastSuccessfulSync && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Last sync:</span>
                  <span className="font-medium">
                    {status.lastSuccessfulSync.toLocaleTimeString()}
                  </span>
                </div>
              )}

              {status.pendingUploads > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Pending uploads:</span>
                  <span className="font-medium">{status.pendingUploads}</span>
                </div>
              )}

              {status.pendingDownloads > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Pending downloads:</span>
                  <span className="font-medium">{status.pendingDownloads}</span>
                </div>
              )}

              {status.failedOperations > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Failed operations:</span>
                  <span className="font-medium text-red-600">{status.failedOperations}</span>
                </div>
              )}

              {status.conflictsCount > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Conflicts:</span>
                  <span className="font-medium text-red-600">{status.conflictsCount}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={handleForceSync}
                disabled={status.syncInProgress}
                className="flex-1"
              >
                {status.syncInProgress ? (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Sync Now
                  </>
                )}
              </Button>

              {status.status === 'error' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDismissError}
                >
                  Dismiss
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Click to expand */}
      <Button
        variant="ghost"
        size="sm"
        className="h-full w-full absolute inset-0"
        onClick={() => setIsExpanded(!isExpanded)}
      />
    </div>
  );
}
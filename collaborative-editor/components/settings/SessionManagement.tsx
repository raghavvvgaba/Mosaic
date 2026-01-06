'use client';

import { useEffect, useState } from 'react';
import { AuthService } from '@/lib/appwrite/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Smartphone,
  Monitor,
  Globe,
  MapPin,
  Trash2,
  RefreshCw,
  LogOut,
  AlertCircle,
} from 'lucide-react';
import { Models } from 'appwrite';

interface SessionWithDevice extends Models.Session {
  deviceInfo?: {
    type: string;
    browser: string;
    os: string;
    location: string;
  };
}

export function SessionManagement() {
  const [sessions, setSessions] = useState<SessionWithDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRevoking, setIsRevoking] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchSessions = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await AuthService.getSessions();
      const sessionsWithDeviceInfo = response.sessions.map((session) => ({
        ...session,
        deviceInfo: getDeviceInfo(session),
      }));
      setSessions(sessionsWithDeviceInfo);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load active sessions';
      setErrorMessage(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRevokeSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to revoke this session? This device will be signed out.')) {
      return;
    }

    setIsRevoking(sessionId);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await AuthService.deleteSession(sessionId);
      setSuccessMessage('Session revoked successfully');

      // If we revoked the current session, redirect to home
      const isCurrentSession = sessions.find(s => s.$id === sessionId)?.current;
      if (isCurrentSession) {
        setTimeout(() => {
          window.location.href = '/';
        }, 1000);
      } else {
        // Refresh the session list
        await fetchSessions();
      }
    } catch (error) {
      console.error('Failed to revoke session:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to revoke session';
      setErrorMessage(errorMessage);
    } finally {
      setIsRevoking(null);
    }
  };

  const getDeviceInfo = (session: Models.Session) => {
    const { clientName, clientVersion, osName, osVersion, deviceName, deviceModel, countryName, ip } = session;

    // Determine device type
    let deviceType = 'Desktop';
    if (deviceModel?.toLowerCase().includes('mobile') || deviceName?.toLowerCase().includes('iphone')) {
      deviceType = 'Mobile';
    } else if (deviceName?.toLowerCase().includes('ipad') || deviceName?.toLowerCase().includes('tablet')) {
      deviceType = 'Tablet';
    }

    // Browser info
    const browser = clientName && clientVersion
      ? `${clientName} ${clientVersion}`
      : 'Unknown Browser';

    // OS info
    const os = osName && osVersion
      ? `${osName} ${osVersion}`
      : 'Unknown OS';

    // Location
    const location = countryName
      ? `${countryName} (${ip || 'Unknown IP'})`
      : ip || 'Unknown Location';

    return {
      type: deviceType,
      browser,
      os,
      location,
    };
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType.toLowerCase()) {
      case 'mobile':
        return <Smartphone className="h-5 w-5" />;
      case 'tablet':
        return <Monitor className="h-5 w-5" />;
      default:
        return <Monitor className="h-5 w-5" />;
    }
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = diffInMs / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMins = Math.floor(diffInMs / (1000 * 60));
      return diffInMins <= 1 ? 'Just now' : `${diffInMins} minutes ago`;
    } else if (diffInHours < 24) {
      const hours = Math.floor(diffInHours);
      return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
    } else if (diffInHours < 24 * 7) {
      const days = Math.floor(diffInHours / 24);
      return days === 1 ? '1 day ago' : `${days} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div className="space-y-6">
      {/* Success/Error Messages */}
      {successMessage && (
        <Alert variant="default" className="border-green-500 text-green-700">
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}
      {errorMessage && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {/* Active Sessions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Active Sessions
              </CardTitle>
              <CardDescription>
                Manage your active sessions across devices ({sessions.length} active)
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchSessions}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading sessions...
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No active sessions found
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <SessionCard
                  key={session.$id}
                  session={session}
                  onRevoke={() => handleRevokeSession(session.$id)}
                  isRevoking={isRevoking === session.$id}
                  getDeviceIcon={getDeviceIcon}
                  formatDate={formatDate}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sign Out All Devices */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LogOut className="h-5 w-5" />
            Global Sign Out
          </CardTitle>
          <CardDescription>
            Sign out from all devices immediately, including this one
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={async () => {
              if (!confirm('Are you sure you want to sign out from all devices?')) {
                return;
              }
              try {
                await AuthService.signOutAll();
                window.location.href = '/';
              } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Failed to sign out from all devices';
                setErrorMessage(errorMessage);
              }
            }}
            variant="destructive"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out From All Devices
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

interface SessionCardProps {
  session: SessionWithDevice;
  onRevoke: () => void;
  isRevoking: boolean;
  getDeviceIcon: (deviceType: string) => React.ReactNode;
  formatDate: (timestamp: string) => string;
}

function SessionCard({
  session,
  onRevoke,
  isRevoking,
  getDeviceIcon,
  formatDate,
}: SessionCardProps) {
  const { deviceInfo } = session;

  if (!deviceInfo) {
    return null;
  }

  return (
    <div className="flex items-start justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
      <div className="flex items-start gap-3 flex-1">
        <div className="mt-1 text-muted-foreground">
          {getDeviceIcon(deviceInfo.type)}
        </div>
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{deviceInfo.type}</span>
            {session.current && (
              <Badge variant="outline" className="text-xs">
                Current
              </Badge>
            )}
          </div>
          <div className="text-sm text-muted-foreground space-y-0.5">
            <div className="flex items-center gap-2">
              <Monitor className="h-3 w-3" />
              <span>{deviceInfo.browser}</span>
            </div>
            <div className="flex items-center gap-2">
              <Smartphone className="h-3 w-3" />
              <span>{deviceInfo.os}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-3 w-3" />
              <span>{deviceInfo.location}</span>
            </div>
            <div className="flex items-center gap-2">
              <Globe className="h-3 w-3" />
              <span>Last active: {formatDate(session.$createdAt)}</span>
            </div>
          </div>
        </div>
      </div>
      {!session.current && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRevoke}
          disabled={isRevoking}
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

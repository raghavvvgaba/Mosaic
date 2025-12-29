'use client';

import { useAuthContext } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Key,
  Mail,
  Shield,
  Smartphone,
  LogOut,
  Check,
  X,
  Info,
} from 'lucide-react';
import { useState } from 'react';

export function AccountSettings() {
  const { user, signOut } = useAuthContext();
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [loginAlerts, setLoginAlerts] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Form states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    setIsLoading(true);
    try {
      // TODO: Implement password change via Appwrite
      console.log('Password change requested');
      setShowPasswordForm(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Failed to change password:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangeEmail = async () => {
    setIsLoading(true);
    try {
      // TODO: Implement email change via Appwrite
      console.log('Email change requested:', newEmail);
      setShowEmailForm(false);
      setNewEmail('');
    } catch (error) {
      console.error('Failed to change email:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOutAll = async () => {
    if (!confirm('Are you sure you want to sign out from all devices?')) {
      return;
    }
    try {
      // TODO: Implement sign out from all devices via Appwrite
      console.log('Sign out from all devices requested');
      await signOut();
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  };

  if (!user) return null;

  // TODO: Add emailVerification to User type
  const isEmailVerified = false;

  return (
    <div className="space-y-6">
      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Change Password
          </CardTitle>
          <CardDescription>Update your password to keep your account secure</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!showPasswordForm ? (
            <Button onClick={() => setShowPasswordForm(true)} variant="outline">
              Change Password
            </Button>
          ) : (
            <div className="space-y-4 max-w-md">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleChangePassword} disabled={isLoading}>
                  {isLoading ? 'Updating...' : 'Update Password'}
                </Button>
                <Button
                  onClick={() => {
                    setShowPasswordForm(false);
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                  variant="ghost"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Update Email */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Address
          </CardTitle>
          <CardDescription>Update your email address and verification status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-sm">{user.email}</span>
            {isEmailVerified ? (
              <Badge variant="outline" className="text-green-500 border-green-500/50">
                <Check className="h-3 w-3 mr-1" />
                Verified
              </Badge>
            ) : (
              <Badge variant="outline" className="text-yellow-500 border-yellow-500/50">
                <X className="h-3 w-3 mr-1" />
                Not Verified
              </Badge>
            )}
          </div>

          {!showEmailForm ? (
            <div className="flex gap-2">
              <Button onClick={() => setShowEmailForm(true)} variant="outline">
                Update Email
              </Button>
              {!isEmailVerified && (
                <Button variant="outline">
                  Resend Verification
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4 max-w-md">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  You will need to verify your new email address before the change takes effect.
                </AlertDescription>
              </Alert>
              <div className="space-y-2">
                <Label htmlFor="new-email">New Email Address</Label>
                <Input
                  id="new-email"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="new@email.com"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleChangeEmail} disabled={isLoading || !newEmail}>
                  {isLoading ? 'Sending...' : 'Send Verification'}
                </Button>
                <Button
                  onClick={() => {
                    setShowEmailForm(false);
                    setNewEmail('');
                  }}
                  variant="ghost"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Login Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Alerts
          </CardTitle>
          <CardDescription>Manage notifications about account activity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="login-alerts">Login Alerts</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Receive email notifications when someone logs into your account
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="login-alerts"
                checked={loginAlerts}
                onCheckedChange={(checked) => setLoginAlerts(checked as boolean)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Sessions - Coming Soon */}
      <Card className="relative overflow-hidden">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Active Sessions
              </CardTitle>
              <CardDescription>View and manage your active sessions across devices</CardDescription>
            </div>
            <Badge variant="secondary">Coming Soon</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 opacity-50">
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div>
              <div className="font-medium">Current Session</div>
              <div className="text-sm text-muted-foreground">
                {new Date().toLocaleDateString()} • Active now
              </div>
            </div>
            <Badge variant="outline">Current</Badge>
          </div>

          <Button
            variant="destructive"
            className="w-full"
            disabled
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out From All Devices
          </Button>
        </CardContent>
      </Card>

      {/* Revoke Sessions - Coming Soon */}
      <Card className="relative overflow-hidden">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Revoke Specific Sessions</CardTitle>
              <CardDescription>Select specific sessions to revoke</CardDescription>
            </div>
            <Badge variant="secondary">Coming Soon</Badge>
          </div>
        </CardHeader>
        <CardContent className="opacity-50">
          <p className="text-sm text-muted-foreground">
            This feature will allow you to view all active sessions and selectively revoke access from specific devices or locations.
          </p>
        </CardContent>
      </Card>

      {/* Sign Out All Devices - Available Now */}
      <Card>
        <CardHeader>
          <CardTitle>Global Sign Out</CardTitle>
          <CardDescription>Sign out from all devices immediately</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleSignOutAll} variant="destructive">
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out From All Devices
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

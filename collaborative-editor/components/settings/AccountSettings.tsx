'use client';

import { useAuthContext } from '@/contexts/AuthContext';
import { AuthService } from '@/lib/appwrite/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Key,
  Mail,
  Smartphone,
  LogOut,
  Check,
  X,
  Info,
} from 'lucide-react';
import { useState } from 'react';

export function AccountSettings() {
  const { user, signOut, sendEmailVerification } = useAuthContext();
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }
    if (!currentPassword || !newPassword) {
      setErrorMessage('Please fill in all fields');
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);
    try {
      await AuthService.updatePassword(newPassword, currentPassword);
      setSuccessMessage('Password updated successfully');
      setShowPasswordForm(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Failed to change password:', error);
      setErrorMessage(error.message || 'Failed to change password. Please check your current password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangeEmail = async () => {
    if (!newEmail || !currentPassword) {
      setErrorMessage('Please enter new email and current password');
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);
    try {
      await AuthService.updateEmail(newEmail, currentPassword);
      setSuccessMessage('Verification email sent to your new address. Please verify to complete the change.');
      setShowEmailForm(false);
      setNewEmail('');
      setCurrentPassword('');
    } catch (error: any) {
      console.error('Failed to change email:', error);
      setErrorMessage(error.message || 'Failed to update email. Please check your current password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setErrorMessage(null);
    setIsLoading(true);
    try {
      await sendEmailVerification();
      setSuccessMessage('Verification email sent. Please check your inbox.');
    } catch (error: any) {
      console.error('Failed to send verification email:', error);
      setErrorMessage(error.message || 'Failed to send verification email.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOutAll = async () => {
    if (!confirm('Are you sure you want to sign out from all devices?')) {
      return;
    }
    try {
      await AuthService.signOutAll();
      // After signing out from all devices, redirect to home
      window.location.href = '/';
    } catch (error: any) {
      console.error('Failed to sign out:', error);
      setErrorMessage(error.message || 'Failed to sign out from all devices.');
    }
  };

  if (!user) return null;

  const isEmailVerified = user.emailVerification || false;

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
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

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
                <Button
                  variant="outline"
                  onClick={handleResendVerification}
                  disabled={isLoading}
                >
                  {isLoading ? 'Sending...' : 'Resend Verification'}
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
              <div className="space-y-2">
                <Label htmlFor="current-password-email">Current Password</Label>
                <Input
                  id="current-password-email"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter your current password"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleChangeEmail} disabled={isLoading || !newEmail || !currentPassword}>
                  {isLoading ? 'Sending...' : 'Send Verification'}
                </Button>
                <Button
                  onClick={() => {
                    setShowEmailForm(false);
                    setNewEmail('');
                    setCurrentPassword('');
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

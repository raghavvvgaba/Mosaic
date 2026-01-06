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
  Check,
  X,
  Info,
} from 'lucide-react';
import { useState } from 'react';
import { SessionManagement } from './SessionManagement';

export function AccountSettings() {
  const { user, sendEmailVerification } = useAuthContext();
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
    } catch (error) {
      console.error('Failed to change password:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to change password. Please check your current password.';
      setErrorMessage(errorMessage);
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
    } catch (error) {
      console.error('Failed to change email:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update email. Please check your current password.';
      setErrorMessage(errorMessage);
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
    } catch (error) {
      console.error('Failed to send verification email:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to send verification email.';
      setErrorMessage(errorMessage);
    } finally {
      setIsLoading(false);
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

      {/* Session Management */}
      <SessionManagement />
    </div>
  );
}

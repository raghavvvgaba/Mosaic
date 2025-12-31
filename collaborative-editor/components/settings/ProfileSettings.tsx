'use client';

import { useAuthContext } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Camera, Download, Mail, Calendar, Loader2, Trash2, User } from 'lucide-react';
import { useState, useRef } from 'react';
import { StorageService } from '@/lib/appwrite/storage';

export function ProfileSettings() {
  const { user, updateProfile, updateAvatar } = useAuthContext();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [isAvatarDialogOpen, setIsAvatarDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSaveName = async () => {
    if (!name.trim()) return;
    setIsLoading(true);
    try {
      await updateProfile(name);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update name:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarClick = () => {
    setIsAvatarDialogOpen(true);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarError(null);

    // Validate file
    const validationError = StorageService.validateAvatarFile(file);
    if (validationError) {
      setAvatarError(validationError);
      return;
    }

    setIsUploadingAvatar(true);
    try {
      await updateAvatar(file);
      setIsAvatarDialogOpen(false); // Close dialog after successful upload
    } catch (error: any) {
      console.error('Failed to upload avatar:', error);
      setAvatarError(error.message || 'Failed to upload avatar');
    } finally {
      setIsUploadingAvatar(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveAvatar = async () => {
    // TODO: Implement avatar removal
    console.log('Remove avatar - to be implemented');
    setIsAvatarDialogOpen(false);
  };

  const handleExportData = () => {
    if (!user) return;
    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      preferences: user.preferences,
    };

    const dataStr = JSON.stringify(userData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `user-data-${user.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      {/* Hidden file input for avatar upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Avatar Dialog */}
      <Dialog open={isAvatarDialogOpen} onOpenChange={setIsAvatarDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Profile Photo</DialogTitle>
            <DialogDescription>
              Update your profile picture or remove it.
            </DialogDescription>
          </DialogHeader>

          {/* Large Avatar Preview */}
          <div className="flex justify-center py-6">
            <div className="relative">
              <div className="w-48 h-48 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border-4 border-border shadow-lg">
                {isUploadingAvatar ? (
                  <div className="flex items-center justify-center">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  </div>
                ) : user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="h-24 w-24 text-muted-foreground" />
                )}
              </div>
            </div>
          </div>

          {avatarError && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg text-center">
              {avatarError}
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAvatar}
              className="w-full sm:w-auto"
            >
              {isUploadingAvatar ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Camera className="h-4 w-4 mr-2" />
                  Change Photo
                </>
              )}
            </Button>
            {user.avatar && (
              <Button
                variant="destructive"
                onClick={handleRemoveAvatar}
                disabled={isUploadingAvatar}
                className="w-full sm:w-auto"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Remove Photo
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>Manage your personal information and avatar</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar Section */}
          <div className="flex items-start gap-6">
            <button
              onClick={handleAvatarClick}
              className="relative group shrink-0"
              disabled={isUploadingAvatar}
            >
              <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border-2 border-primary/20 transition-opacity group-hover:opacity-80">
                {isUploadingAvatar ? (
                  <div className="flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-3xl font-bold text-primary">
                    {user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </span>
                )}
              </div>
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 rounded-full">
                <Camera className="h-6 w-6 text-white" />
              </div>
            </button>

            {avatarError && (
              <div className="flex-1">
                <p className="text-sm text-destructive">{avatarError}</p>
              </div>
            )}

            <div className="flex-1 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Display Name</Label>
                <div className="flex gap-2">
                  {isEditing ? (
                    <>
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="max-w-sm"
                      />
                      <Button
                        onClick={handleSaveName}
                        disabled={isLoading || !name.trim()}
                        size="sm"
                      >
                        {isLoading ? 'Saving...' : 'Save'}
                      </Button>
                      <Button
                        onClick={() => {
                          setIsEditing(false);
                          setName(user.name);
                        }}
                        variant="outline"
                        size="sm"
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="text-lg font-medium">{user.name}</div>
                      <Button onClick={() => setIsEditing(true)} variant="ghost" size="sm">
                        Edit
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Email Address</Label>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>{user.email}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Member Since</Label>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(user.createdAt)}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Collaboration Metrics - Coming Soon */}
      <Card className="relative overflow-hidden">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Collaboration Metrics</CardTitle>
              <CardDescription>Track your collaboration activity and statistics</CardDescription>
            </div>
            <Badge variant="secondary">Coming Soon</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 opacity-50">
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold">-</div>
              <div className="text-sm text-muted-foreground">Documents Created</div>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold">-</div>
              <div className="text-sm text-muted-foreground">Collaborations</div>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold">-</div>
              <div className="text-sm text-muted-foreground">Active Sessions</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export Data */}
      <Card>
        <CardHeader>
          <CardTitle>Export Your Data</CardTitle>
          <CardDescription>Download a copy of your account data</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleExportData} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export User Data
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

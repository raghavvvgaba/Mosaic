'use client';

import { useAuthContext } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Sun, Moon, Monitor, Minus, Plus } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';
type Font = 'sans' | 'serif' | 'mono';

const FONT_STYLES = {
  sans: 'font-sans',
  serif: 'font-serif',
  mono: 'font-mono',
};

export function AppearanceSettings() {
  const { user, updatePreferences } = useAuthContext();
  const { theme, setTheme } = useTheme();
  const [selectedFont, setSelectedFont] = useState<Font>('sans');
  const [isSaving, setIsSaving] = useState(false);
  const [previewText] = useState('The quick brown fox jumps over the lazy dog.');

  // Initialize font from user preferences
  useEffect(() => {
    if (user?.preferences) {
      if (user.preferences.font) {
        setSelectedFont(user.preferences.font as Font);
      }
    }
  }, [user]);

  const handleThemeChange = async (newTheme: Theme) => {
    setTheme(newTheme);
    try {
      await updatePreferences({ theme: newTheme });
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  };

  const handleFontChange = async (font: Font) => {
    setSelectedFont(font);
    setIsSaving(true);
    try {
      await updatePreferences({ font });
    } catch (error) {
      console.error('Failed to save font preference:', error);
      // Revert on error
      setSelectedFont(user?.preferences?.font as Font || 'sans');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Theme Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Theme</CardTitle>
          <CardDescription>Choose how the application looks to you</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={theme}
            onValueChange={(value) => handleThemeChange(value as Theme)}
            className="grid grid-cols-3 gap-4"
          >
            <div>
              <RadioGroupItem value="light" id="light" className="peer sr-only" />
              <Label
                htmlFor="light"
                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
              >
                <Sun className="mb-2 h-5 w-5" />
                <span className="text-sm font-medium">Light</span>
              </Label>
            </div>
            <div>
              <RadioGroupItem value="dark" id="dark" className="peer sr-only" />
              <Label
                htmlFor="dark"
                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
              >
                <Moon className="mb-2 h-5 w-5" />
                <span className="text-sm font-medium">Dark</span>
              </Label>
            </div>
            <div>
              <RadioGroupItem value="system" id="system" className="peer sr-only" />
              <Label
                htmlFor="system"
                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
              >
                <Monitor className="mb-2 h-5 w-5" />
                <span className="text-sm font-medium">System</span>
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Font Family */}
      <Card>
        <CardHeader>
          <CardTitle>Font Family</CardTitle>
          <CardDescription>Choose the font style for the application</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={selectedFont}
            onValueChange={(value) => handleFontChange(value as Font)}
            className="grid grid-cols-3 gap-4"
          >
            <div>
              <RadioGroupItem value="sans" id="sans" className="peer sr-only" />
              <Label
                htmlFor="sans"
                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
              >
                <span className="mb-2 text-lg font-sans">Aa</span>
                <span className="text-sm font-medium">Sans Serif</span>
              </Label>
            </div>
            <div>
              <RadioGroupItem value="serif" id="serif" className="peer sr-only" />
              <Label
                htmlFor="serif"
                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
              >
                <span className="mb-2 text-lg font-serif">Aa</span>
                <span className="text-sm font-medium">Serif</span>
              </Label>
            </div>
            <div>
              <RadioGroupItem value="mono" id="mono" className="peer sr-only" />
              <Label
                htmlFor="mono"
                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
              >
                <span className="mb-2 text-lg font-mono">Aa</span>
                <span className="text-sm font-medium">Monospace</span>
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
          <CardDescription>See how your choices look in action</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`p-4 rounded-lg border border-border/50 bg-muted/30 ${FONT_STYLES[selectedFont]}`}
          >
            <p className="text-lg leading-relaxed">{previewText}</p>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

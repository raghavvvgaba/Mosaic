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
  const [fontSize, setFontSize] = useState(16);
  const [isSaving, setIsSaving] = useState(false);
  const [previewText, setPreviewText] = useState('The quick brown fox jumps over the lazy dog.');

  // Initialize font and fontSize from user preferences
  useEffect(() => {
    if (user?.preferences) {
      if (user.preferences.font) {
        setSelectedFont(user.preferences.font as Font);
      }
      if (user.preferences.fontSize) {
        setFontSize(user.preferences.fontSize);
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

  const handleFontSizeChange = async (delta: number) => {
    const newSize = Math.min(Math.max(fontSize + delta, 12), 20);
    setFontSize(newSize);
    setIsSaving(true);
    try {
      await updatePreferences({ fontSize: newSize });
    } catch (error) {
      console.error('Failed to save font size preference:', error);
      // Revert on error
      setFontSize(user?.preferences?.fontSize || 16);
    } finally {
      setIsSaving(false);
    }
  };

  const getPreviewStyle = () => {
    return {
      fontSize: `${fontSize}px`,
      lineHeight: '1.6',
    };
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

      {/* Font Size */}
      <Card>
        <CardHeader>
          <CardTitle>Font Size</CardTitle>
          <CardDescription>Adjust the base font size for better readability</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleFontSizeChange(-1)}
              disabled={fontSize <= 12 || isSaving}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <div className="flex-1 text-center">
              <span className="text-2xl font-bold">{fontSize}px</span>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleFontSizeChange(1)}
              disabled={fontSize >= 20 || isSaving}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Preview */}
          <div className="mt-6">
            <Label className="text-sm text-muted-foreground">Preview</Label>
            <div
              className={`mt-2 p-4 rounded-lg border border-border/50 bg-muted/30 ${FONT_STYLES[selectedFont]}`}
              style={getPreviewStyle()}
            >
              <p>{previewText}</p>
              <p className="mt-2 text-muted-foreground">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

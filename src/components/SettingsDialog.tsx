// [[SECONDARY_MIND_DESKTOP]]/src/components/SettingsDialog.tsx
// Purpose: Settings dialog with theme toggle and other application preferences.
// Architecture: Modal dialog component that provides access to application settings.
// Dependencies: UI components, app store for theme management.

import { useAppStore } from '../store/appStore';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Separator } from './ui/separator';
import { Moon, Sun, Monitor } from 'lucide-react';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { theme, toggleTheme } = useAppStore();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Theme Settings */}
          <div>
            <h3 className="text-sm font-medium mb-3">Appearance</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {theme === 'light' ? (
                    <Sun className="h-4 w-4 text-yellow-500" />
                  ) : (
                    <Moon className="h-4 w-4 text-blue-500" />
                  )}
                  <span className="text-sm">
                    Theme: {theme === 'light' ? 'Light' : 'Dark'}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleTheme}
                  className="h-8 px-3"
                >
                  {theme === 'light' ? (
                    <>
                      <Moon className="h-3 w-3 mr-1" />
                      Dark
                    </>
                  ) : (
                    <>
                      <Sun className="h-3 w-3 mr-1" />
                      Light
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Switch between light and dark appearance
              </p>
            </div>
          </div>

          <Separator />

          {/* Future settings sections can be added here */}
          <div>
            <h3 className="text-sm font-medium mb-3">About</h3>
            <p className="text-xs text-muted-foreground">
              Secondary Mind - AI-powered development workspace
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Integration: Used by ProjectWorkspace settings button to provide theme toggle functionality.
// Notes: Designed to be extensible for additional settings in the future.
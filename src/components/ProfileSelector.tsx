// Profile selector component with minimal UI footprint
import { useState } from 'react';
import { useAppStore } from '../store/appStore';
import { DevelopmentProfile } from '../api';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { LoadingSpinner } from './ui/loading-spinner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { ProfileCreationDialog } from './ProfileCreationDialog';
import {
  FolderOpen,
  Plus,
  Download,
  Trash2,
  X,
  Clock,
  FileText
} from 'lucide-react';

export function ProfileSelector() {
  const {
    currentProject,
    developmentProfiles,
    activeProfile,
    isProfilesLoading,
    useProfile,
    clearActiveProfile,
    deleteProfile,
    exportProfile,
  } = useAppStore();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [selectedExportProfile, setSelectedExportProfile] = useState<DevelopmentProfile | null>(null);
  const [exportFormat, setExportFormat] = useState<'json' | 'yaml' | 'xml'>('json');
  const [isExporting, setIsExporting] = useState(false);

  const handleUseProfile = async (profileId: string) => {
    try {
      await useProfile(profileId);
    } catch (error) {
      console.error('Failed to use profile:', error);
    }
  };



  const handleExportProfile = async () => {
    if (!selectedExportProfile) return;

    setIsExporting(true);
    try {
      const exportedContent = await exportProfile(selectedExportProfile.id, exportFormat);

      // Copy to clipboard
      await navigator.clipboard.writeText(exportedContent);

      // Show success feedback (you might want to add a toast here)
      console.log('Profile exported to clipboard');

      setIsExportModalOpen(false);
      setSelectedExportProfile(null);
    } catch (error) {
      console.error('Failed to export profile:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteProfile = async (profileId: string, event: React.MouseEvent) => {
    event.stopPropagation();

    if (!confirm('Are you sure you want to delete this profile?')) return;

    try {
      await deleteProfile(profileId);
    } catch (error) {
      console.error('Failed to delete profile:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${Math.floor(diffHours)}h ago`;
    if (diffDays < 7) return `${Math.floor(diffDays)}d ago`;
    return date.toLocaleDateString();
  };

  if (!currentProject) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      {/* Active Profile Indicator */}
      {activeProfile && (
        <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
          <FolderOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-medium text-blue-900 dark:text-blue-100">{activeProfile.name}</span>
          <Badge variant="secondary" className="text-xs">
            {activeProfile.files.length} files
          </Badge>
          <Button
            size="sm"
            variant="ghost"
            onClick={clearActiveProfile}
            className="h-5 w-5 p-0 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Profile Selector Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" disabled={isProfilesLoading}>
            {isProfilesLoading ? (
              <LoadingSpinner size="sm" />
            ) : (
              <FolderOpen className="h-4 w-4" />
            )}
            <span className="ml-2">Profiles</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <DropdownMenuLabel className="flex items-center justify-between">
            Development Profiles
            <Badge variant="secondary" className="text-xs">
              {developmentProfiles.length}
            </Badge>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          {developmentProfiles.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <FolderOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No profiles yet</p>
              <p className="text-xs">Create one to get started</p>
            </div>
          ) : (
            developmentProfiles.map((profile) => (
              <DropdownMenuItem
                key={profile.id}
                className="flex flex-col items-start p-3 cursor-pointer"
                onClick={() => handleUseProfile(profile.id)}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="font-medium text-sm">{profile.name}</span>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedExportProfile(profile);
                        setIsExportModalOpen(true);
                      }}
                      className="h-6 w-6 p-0"
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => handleDeleteProfile(profile.id, e)}
                      className="h-6 w-6 p-0 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {profile.description && (
                  <p className="text-xs text-muted-foreground mb-2">{profile.description}</p>
                )}

                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <FileText className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{profile.files.length}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{formatDate(profile.last_used)}</span>
                    </div>
                  </div>

                  {profile.tags.length > 0 && (
                    <div className="flex gap-1">
                      {profile.tags.slice(0, 2).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs px-1 py-0">
                          {tag}
                        </Badge>
                      ))}
                      {profile.tags.length > 2 && (
                        <Badge variant="outline" className="text-xs px-1 py-0">
                          +{profile.tags.length - 2}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </DropdownMenuItem>
            ))
          )}

          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Profile
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Profile Creation Dialog */}
      <ProfileCreationDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
      />

      {/* Export Profile Modal */}
      <Dialog open={isExportModalOpen} onOpenChange={setIsExportModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Export Profile</DialogTitle>
            <DialogDescription>
              Export "{selectedExportProfile?.name}" with all file contents to clipboard.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Export Format</label>
              <div className="flex gap-2 mt-2">
                {(['json', 'yaml', 'xml'] as const).map((format) => (
                  <Button
                    key={format}
                    size="sm"
                    variant={exportFormat === format ? 'default' : 'outline'}
                    onClick={() => setExportFormat(format)}
                  >
                    {format.toUpperCase()}
                  </Button>
                ))}
              </div>
            </div>

            {selectedExportProfile && (
              <div className="p-3 bg-muted rounded-md">
                <div className="text-sm font-medium mb-1">{selectedExportProfile.name}</div>
                <div className="text-xs text-muted-foreground mb-2">
                  {selectedExportProfile.files.length} files • {selectedExportProfile.tags.join(', ')}
                </div>
                <div className="text-xs text-muted-foreground">
                  Files will be included with their current content
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setIsExportModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleExportProfile}
              disabled={isExporting}
            >
              {isExporting ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span className="ml-2">Exporting...</span>
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Copy to Clipboard
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
// [[SECONDARY_MIND_DESKTOP]]/src/components/ProjectDashboard.tsx
// Purpose: Enhanced project dashboard with improved UX and cleaner layout for better user experience.
// Architecture: Redesigned dashboard with better visual hierarchy, simplified information display, and more intuitive interactions.
// Dependencies: Enhanced app store, project configuration types, improved UI components with better spacing and organization.

import React, { useState, useEffect } from 'react';
import { open } from '@tauri-apps/api/dialog';
import { useAppStore } from '../store/appStore';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { 
  FolderOpen, 
  GitBranch, 
  Code, 
  Zap, 
  Clock,
  FileText,
  Star,
  MoreHorizontal,
  Trash2,
  Calendar,
  Plus,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { isDevelopmentMode, ProjectConfig } from '../api';

export function ProjectDashboard() {
  const { 
    loadProject, 
    recentProjects, 
    loadRecentProjects, 
    removeProjectFromRecent,
    isLoading 
  } = useAppStore();
  
  const [dragOver, setDragOver] = useState(false);
  const [removingProject, setRemovingProject] = useState<string | null>(null);

  useEffect(() => {
    loadRecentProjects();
  }, [loadRecentProjects]);

  const handleSelectProject = async () => {
    try {
      if (isDevelopmentMode()) {
        await loadProject('/mock/project/path');
        return;
      }

      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select Project Directory',
      });

      if (selected && typeof selected === 'string') {
        await loadProject(selected);
      }
    } catch (error) {
      console.error('Failed to select project:', error);
    }
  };

  const handleProjectClick = async (project: ProjectConfig) => {
    await loadProject(project.path);
  };

  const handleRemoveProject = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    setRemovingProject(projectId);
    try {
      await removeProjectFromRecent(projectId);
    } catch (error) {
      console.error('Failed to remove project:', error);
    } finally {
      setRemovingProject(null);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    if (isDevelopmentMode()) {
      await loadProject('/mock/dropped/project');
      return;
    }

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const file = files[0];
      console.log('Dropped file:', file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffDays < 1) return 'Today';
    if (diffDays < 2) return 'Yesterday';
    if (diffDays < 7) return `${Math.floor(diffDays)} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  const hasRecentProjects = recentProjects && recentProjects.projects.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="p-3 bg-blue-600 rounded-xl">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900">Secondary Mind</h1>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            AI-powered codebase analysis and development guidance.
            Understand your code better, faster.
          </p>
          {isDevelopmentMode() && (
            <div className="mt-6 inline-flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
              <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-blue-800 text-sm font-medium">Development Mode</span>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Primary Action */}
          <div className="lg:col-span-2">
            <Card 
              className={`h-full transition-all duration-300 border-2 ${
                dragOver 
                  ? 'border-blue-500 bg-blue-50 shadow-lg scale-[1.02]' 
                  : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <CardContent className="flex flex-col items-center justify-center h-full p-8 text-center space-y-6">
                <div className="p-4 bg-blue-100 rounded-full">
                  <FolderOpen className="h-12 w-12 text-blue-600" />
                </div>
                
                <div className="space-y-3">
                  <h2 className="text-2xl font-semibold text-gray-900">
                    {dragOver ? 'Drop to Analyze' : 'Analyze Project'}
                  </h2>
                  <p className="text-gray-600 max-w-sm">
                    Select a project directory to begin AI-powered analysis and get intelligent insights about your codebase.
                  </p>
                </div>

                <Button 
                  onClick={handleSelectProject}
                  disabled={isLoading}
                  size="lg"
                  className="w-full max-w-xs h-12 text-base font-medium"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Plus className="h-5 w-5 mr-2" />
                      Select Project
                    </>
                  )}
                </Button>

                {!dragOver && (
                  <p className="text-sm text-gray-500">
                    or drag & drop a project folder here
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Projects */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-gray-900">
                {hasRecentProjects ? 'Recent Projects' : 'Get Started'}
              </h2>
              {hasRecentProjects && (
                <Button variant="outline" size="sm" onClick={loadRecentProjects}>
                  <Clock className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              )}
            </div>

            {hasRecentProjects ? (
              <div className="space-y-4">
                {recentProjects.projects.slice(0, 4).map((project) => (
                  <Card 
                    key={project.id}
                    className="cursor-pointer transition-all duration-200 hover:shadow-md hover:border-blue-300 group"
                    onClick={() => handleProjectClick(project)}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-gray-100 rounded-lg">
                              <FolderOpen className="h-5 w-5 text-gray-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="font-semibold text-gray-900 truncate text-lg">
                                {project.name}
                              </h3>
                              <p className="text-sm text-gray-500 truncate" title={project.path}>
                                {project.path}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-6 text-sm text-gray-600 mb-3">
                            <div className="flex items-center gap-1">
                              <Code className="h-4 w-4" />
                              <span>{project.symbol_count} symbols</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <FileText className="h-4 w-4" />
                              <span>{project.notes_count} notes</span>
                            </div>
                            {project.git_branch && (
                              <div className="flex items-center gap-1">
                                <GitBranch className="h-4 w-4" />
                                <span className="truncate max-w-20">{project.git_branch}</span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatRelativeTime(project.last_accessed)}
                            </span>
                            
                            {project.git_status && (
                              <Badge 
                                variant={project.git_status.includes('Up-to-date') ? 'default' : 'secondary'}
                                className="text-xs"
                              >
                                {project.git_status.length > 25 
                                  ? `${project.git_status.substring(0, 25)}...`
                                  : project.git_status}
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 ml-4">
                          <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => handleRemoveProject(e, project.id)}
                            disabled={removingProject === project.id}
                            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            {removingProject === project.id ? (
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {recentProjects.projects.length > 4 && (
                  <div className="text-center pt-4">
                    <p className="text-sm text-gray-500">
                      +{recentProjects.projects.length - 4} more projects
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FeatureCard
                  icon={<Code className="h-6 w-6" />}
                  title="Smart Analysis"
                  description="Automatically parse and understand your codebase structure with AI assistance."
                  color="blue"
                />
                <FeatureCard
                  icon={<GitBranch className="h-6 w-6" />}
                  title="Git Integration"
                  description="Track repository status and understand your development workflow."
                  color="green"
                />
                <FeatureCard
                  icon={<Zap className="h-6 w-6" />}
                  title="AI Guidance"
                  description="Get intelligent suggestions and answers about your code."
                  color="yellow"
                />
                <FeatureCard
                  icon={<FileText className="h-6 w-6" />}
                  title="Project Notes"
                  description="Keep organized notes and documentation for each project."
                  color="purple"
                />
              </div>
            )}
          </div>
        </div>

        {/* Quick Tips */}
        {!hasRecentProjects && (
          <div className="mt-16 text-center">
            <div className="max-w-2xl mx-auto">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Ready to get started?
              </h3>
              <p className="text-gray-600 mb-8">
                Secondary Mind works best with TypeScript, JavaScript, React, and Node.js projects.
                Simply select your project directory and let AI analyze your codebase.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Badge variant="secondary" className="px-3 py-1">TypeScript</Badge>
                <Badge variant="secondary" className="px-3 py-1">JavaScript</Badge>
                <Badge variant="secondary" className="px-3 py-1">React</Badge>
                <Badge variant="secondary" className="px-3 py-1">Node.js</Badge>
                <Badge variant="secondary" className="px-3 py-1">Next.js</Badge>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: 'blue' | 'green' | 'yellow' | 'purple';
}

function FeatureCard({ icon, title, description, color }: FeatureCardProps) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    purple: 'bg-purple-100 text-purple-600',
  };

  return (
    <Card className="h-full hover:shadow-md transition-all duration-200">
      <CardContent className="p-6">
        <div className={`inline-flex p-3 rounded-lg mb-4 ${colorClasses[color]}`}>
          {icon}
        </div>
        <h4 className="font-semibold text-gray-900 mb-2">{title}</h4>
        <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
      </CardContent>
    </Card>
  );
}

// Integration: Enhanced dashboard that provides an intuitive and clean user experience for project selection and management.
// Notes: Improved visual hierarchy, better spacing, more prominent call-to-action, and simplified project information display.
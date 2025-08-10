import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { ProjectConfig, RecentProjects, AnalysisResult } from '../api';
import { useAppStore } from '../store/appStore';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { 
  FolderOpen, 
  Search, 
  Star, 
  Clock, 
  GitBranch, 
  AlertCircle, 
  CheckCircle, 
  Activity, 
  Settings, 
  Download, 
  Upload, 
  Trash2,
  Filter,
  BarChart3,
  FileText,
  Code,
  Bug,
  Zap,
  TrendingUp,
  Calendar,
  Users,
  Tag
} from 'lucide-react';

interface ProjectHealth {
  status: 'healthy' | 'warning' | 'error';
  analysisComplete: boolean;
  errorCount: number;
  warningCount: number;
  symbolCount: number;
  lastAnalyzed: number;
}

interface ProjectStats {
  totalSymbols: number;
  fileCount: number;
  languageBreakdown: { [language: string]: number };
  recentActivity: {
    commits: number;
    filesChanged: number;
    lastCommit: string;
  };
}

interface EnhancedProjectDashboardProps {
  recentProjects: RecentProjects | null;
  currentProject: AnalysisResult | null;
  onProjectSelect: (projectPath: string) => void;
  onProjectRemove: (projectId: string) => void;
  onProjectImport?: (config: ProjectConfig) => void;
  onProjectExport?: (projectId: string) => void;
  onSettingsOpen?: (projectId: string) => void;
}

export function EnhancedProjectDashboard({
  recentProjects,
  currentProject,
  onProjectSelect,
  onProjectRemove,
  onProjectImport,
  onProjectExport,
  onSettingsOpen
}: EnhancedProjectDashboardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'lastAccessed' | 'symbolCount' | 'created'>('lastAccessed');
  const [filterBy, setFilterBy] = useState<'all' | 'favorites' | 'recent' | 'active'>('all');
  const [showStats, setShowStats] = useState(true);
  const [favoriteProjects, setFavoriteProjects] = useState<Set<string>>(new Set());
  const [projectHealth, setProjectHealth] = useState<Map<string, ProjectHealth>>(new Map());
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importData, setImportData] = useState('');

  // Load favorites from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('favorite-projects');
    if (saved) {
      try {
        setFavoriteProjects(new Set(JSON.parse(saved)));
      } catch (e) {
        console.error('Failed to load favorite projects:', e);
      }
    }
  }, []);

  // Save favorites to localStorage
  const saveFavorites = useCallback(() => {
    localStorage.setItem('favorite-projects', JSON.stringify(Array.from(favoriteProjects)));
  }, [favoriteProjects]);

  useEffect(() => {
    saveFavorites();
  }, [saveFavorites]);

  // Mock project health calculation
  const calculateProjectHealth = useCallback((project: ProjectConfig): ProjectHealth => {
    const now = Date.now();
    const lastAccessed = new Date(project.last_accessed).getTime();
    const daysSinceAccess = (now - lastAccessed) / (1000 * 60 * 60 * 24);
    
    let status: ProjectHealth['status'] = 'healthy';
    let errorCount = 0;
    let warningCount = 0;

    // Mock some health indicators
    if (daysSinceAccess > 30) {
      warningCount++;
      status = 'warning';
    }
    
    if (project.symbol_count === 0) {
      errorCount++;
      status = 'error';
    }

    if (project.git_status?.includes('behind')) {
      warningCount++;
      if (status !== 'error') status = 'warning';
    }

    return {
      status,
      analysisComplete: project.symbol_count > 0,
      errorCount,
      warningCount,
      symbolCount: project.symbol_count,
      lastAnalyzed: lastAccessed
    };
  }, []);

  // Update project health when projects change
  useEffect(() => {
    if (recentProjects?.projects) {
      const healthMap = new Map();
      recentProjects.projects.forEach(project => {
        healthMap.set(project.id, calculateProjectHealth(project));
      });
      setProjectHealth(healthMap);
    }
  }, [recentProjects, calculateProjectHealth]);

  // Filter and sort projects
  const filteredAndSortedProjects = useMemo(() => {
    if (!recentProjects?.projects) return [];

    let filtered = recentProjects.projects.filter(project => {
      const matchesSearch = !searchTerm || 
        project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.path.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesFilter = 
        filterBy === 'all' ||
        (filterBy === 'favorites' && favoriteProjects.has(project.id)) ||
        (filterBy === 'recent' && new Date(project.last_accessed).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000) ||
        (filterBy === 'active' && project.symbol_count > 0);

      return matchesSearch && matchesFilter;
    });

    // Sort projects
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'lastAccessed':
          return new Date(b.last_accessed).getTime() - new Date(a.last_accessed).getTime();
        case 'symbolCount':
          return b.symbol_count - a.symbol_count;
        case 'created':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        default:
          return 0;
      }
    });

    return filtered;
  }, [recentProjects, searchTerm, sortBy, filterBy, favoriteProjects]);

  // Calculate overall stats
  const overallStats = useMemo(() => {
    if (!recentProjects?.projects) return null;

    const totalProjects = recentProjects.projects.length;
    const totalSymbols = recentProjects.projects.reduce((sum, p) => sum + p.symbol_count, 0);
    const healthyProjects = Array.from(projectHealth.values()).filter(h => h.status === 'healthy').length;
    const activeProjects = recentProjects.projects.filter(p => 
      new Date(p.last_accessed).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000
    ).length;

    return {
      totalProjects,
      totalSymbols,
      healthyProjects,
      activeProjects,
      favoriteCount: favoriteProjects.size
    };
  }, [recentProjects, projectHealth, favoriteProjects]);

  // Toggle favorite
  const toggleFavorite = useCallback((projectId: string) => {
    setFavoriteProjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
      } else {
        newSet.add(projectId);
      }
      return newSet;
    });
  }, []);

  // Handle project import
  const handleImport = useCallback(() => {
    try {
      const config = JSON.parse(importData);
      onProjectImport?.(config);
      setImportData('');
      setShowImportDialog(false);
    } catch (e) {
      alert('Invalid project configuration JSON');
    }
  }, [importData, onProjectImport]);

  // Get health indicator
  const getHealthIndicator = (health: ProjectHealth) => {
    switch (health.status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  // Format time ago
  const formatTimeAgo = (timestamp: string) => {
    const now = Date.now();
    const time = new Date(timestamp).getTime();
    const diff = now - time;
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  return (
    <div className="space-y-6">
      {/* Overall Statistics */}
      {showStats && overallStats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-blue-500" />
                <div>
                  <div className="text-2xl font-bold">{overallStats.totalProjects}</div>
                  <div className="text-xs text-gray-500">Projects</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Code className="h-4 w-4 text-purple-500" />
                <div>
                  <div className="text-2xl font-bold">{overallStats.totalSymbols.toLocaleString()}</div>
                  <div className="text-xs text-gray-500">Symbols</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <div>
                  <div className="text-2xl font-bold">{overallStats.healthyProjects}</div>
                  <div className="text-xs text-gray-500">Healthy</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-orange-500" />
                <div>
                  <div className="text-2xl font-bold">{overallStats.activeProjects}</div>
                  <div className="text-xs text-gray-500">Active</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-500" />
                <div>
                  <div className="text-2xl font-bold">{overallStats.favoriteCount}</div>
                  <div className="text-xs text-gray-500">Favorites</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 space-y-2 sm:space-y-0 sm:space-x-2 sm:flex sm:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="px-3 py-2 border rounded-md text-sm"
            >
              <option value="lastAccessed">Last Accessed</option>
              <option value="name">Name</option>
              <option value="symbolCount">Symbol Count</option>
              <option value="created">Created</option>
            </select>
            
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value as typeof filterBy)}
              className="px-3 py-2 border rounded-md text-sm"
            >
              <option value="all">All Projects</option>
              <option value="favorites">Favorites</option>
              <option value="recent">Recent</option>
              <option value="active">Active</option>
            </select>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowStats(!showStats)}
          >
            <BarChart3 className="h-4 w-4" />
            {showStats ? 'Hide' : 'Show'} Stats
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowImportDialog(true)}
          >
            <Upload className="h-4 w-4" />
            Import
          </Button>
        </div>
      </div>

      {/* Project List */}
      <div className="grid gap-4">
        {filteredAndSortedProjects.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <FolderOpen className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium mb-2">No projects found</h3>
              <p className="text-gray-500 mb-4">
                {searchTerm ? 'Try adjusting your search term or filters' : 'Start by opening a project folder'}
              </p>
              <Button onClick={() => onProjectSelect('')}>
                <FolderOpen className="h-4 w-4 mr-2" />
                Open Project
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredAndSortedProjects.map(project => {
            const health = projectHealth.get(project.id);
            const isFavorite = favoriteProjects.has(project.id);
            const isCurrentProject = currentProject?.project_path === project.path;
            
            return (
              <Card 
                key={project.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  isCurrentProject ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                }`}
                onClick={() => onProjectSelect(project.path)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium text-lg truncate">{project.name}</h3>
                        {health && getHealthIndicator(health)}
                        {isFavorite && <Star className="h-4 w-4 text-yellow-500 fill-current" />}
                        {isCurrentProject && <Badge variant="default" className="text-xs">Current</Badge>}
                      </div>
                      
                      <p className="text-sm text-gray-600 truncate mb-3" title={project.path}>
                        {project.path}
                      </p>
                      
                      <div className="flex flex-wrap gap-2 mb-3">
                        <Badge variant="secondary" className="text-xs">
                          <Code className="h-3 w-3 mr-1" />
                          {project.symbol_count.toLocaleString()} symbols
                        </Badge>
                        
                        <Badge variant="secondary" className="text-xs">
                          <FileText className="h-3 w-3 mr-1" />
                          {project.notes_count} notes
                        </Badge>
                        
                        {project.git_branch && (
                          <Badge variant="secondary" className="text-xs">
                            <GitBranch className="h-3 w-3 mr-1" />
                            {project.git_branch}
                          </Badge>
                        )}
                        
                        {project.settings.custom_tags.map(tag => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            <Tag className="h-3 w-3 mr-1" />
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTimeAgo(project.last_accessed)}
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Created {new Date(project.created_at).toLocaleDateString()}
                        </div>
                        
                        {health && health.errorCount > 0 && (
                          <div className="flex items-center gap-1 text-red-500">
                            <Bug className="h-3 w-3" />
                            {health.errorCount} errors
                          </div>
                        )}
                        
                        {health && health.warningCount > 0 && (
                          <div className="flex items-center gap-1 text-yellow-500">
                            <AlertCircle className="h-3 w-3" />
                            {health.warningCount} warnings
                          </div>
                        )}
                      </div>
                      
                      {project.git_status && (
                        <div className="mt-2 text-xs text-gray-600">
                          {project.git_status}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col gap-1 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(project.id);
                        }}
                        className="h-8 w-8 p-0"
                      >
                        <Star className={`h-4 w-4 ${isFavorite ? 'text-yellow-500 fill-current' : 'text-gray-400'}`} />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSettingsOpen?.(project.id);
                        }}
                        className="h-8 w-8 p-0"
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onProjectExport?.(project.id);
                        }}
                        className="h-8 w-8 p-0"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onProjectRemove(project.id);
                        }}
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Import Dialog */}
      {showImportDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Import Project Configuration
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowImportDialog(false)}
                >
                  ×
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Project Configuration JSON
                </label>
                <textarea
                  value={importData}
                  onChange={(e) => setImportData(e.target.value)}
                  placeholder="Paste project configuration JSON here..."
                  className="w-full h-32 px-3 py-2 border rounded-md text-sm"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowImportDialog(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={!importData.trim()}
                  className="flex-1"
                >
                  Import
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
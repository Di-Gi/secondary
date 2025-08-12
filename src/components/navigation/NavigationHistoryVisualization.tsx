// Navigation History Visualization Component
// Purpose: Visual representation of navigation history with thumbnails and context information
// Architecture: React component with hover interactions and prioritization logic

import React, { useState, useMemo, useCallback } from 'react';
import { 
  NavigationHistory, 
  NavigationHistoryEntry, 
  HistorySession,
  NavigationLocation 
} from '../../types/navigation';
import { useAppStore } from '../../store/appStore';
import { analyzeNavigationHistory, groupEntriesByTime } from '../../lib/navigationHistoryUtils';

interface NavigationHistoryVisualizationProps {
  history: NavigationHistory;
  onLocationSelect?: (location: NavigationLocation) => void;
  onSessionSelect?: (session: HistorySession) => void;
  maxVisibleEntries?: number;
  showThumbnails?: boolean;
  showSessions?: boolean;
  className?: string;
}

interface HistoryEntryThumbnail {
  entry: NavigationHistoryEntry;
  priority: number;
  isVisible: boolean;
  contextInfo: string;
}

export const NavigationHistoryVisualization: React.FC<NavigationHistoryVisualizationProps> = ({
  history,
  onLocationSelect,
  onSessionSelect,
  maxVisibleEntries = 20,
  showThumbnails = true,
  showSessions = true,
  className = ''
}) => {
  const [hoveredEntry, setHoveredEntry] = useState<NavigationHistoryEntry | null>(null);
  const [selectedView, setSelectedView] = useState<'timeline' | 'sessions' | 'insights'>('timeline');
  
  // Generate thumbnails and prioritize entries
  const thumbnails = useMemo(() => {
    return generateHistoryThumbnails(history, maxVisibleEntries);
  }, [history, maxVisibleEntries]);

  // Limit entries for display
  const displayEntries = useMemo(() => {
    return history.entries.slice(-maxVisibleEntries);
  }, [history.entries, maxVisibleEntries]);

  // Analyze history for insights
  const insights = useMemo(() => {
    return analyzeNavigationHistory(history);
  }, [history]);

  // Group entries by time for timeline view
  const timeGroups = useMemo(() => {
    return groupEntriesByTime(displayEntries, {
      groupingInterval: 30 * 60 * 1000, // 30 minutes
      maxGroupSize: 5,
      prioritizeRecent: true
    });
  }, [displayEntries]);

  const handleEntryClick = useCallback((entry: NavigationHistoryEntry) => {
    onLocationSelect?.(entry.location);
  }, [onLocationSelect]);

  const handleSessionClick = useCallback((session: HistorySession) => {
    onSessionSelect?.(session);
  }, [onSessionSelect]);

  const renderTimelineView = () => (
    <div className="history-timeline">
      <div className="timeline-header">
        <h3>Navigation Timeline</h3>
        <div className="timeline-stats">
          <span>{displayEntries.length} locations</span>
          <span>{insights.uniqueFiles} files</span>
        </div>
      </div>
      
      <div className="timeline-content">
        {timeGroups.map((group, groupIndex) => (
          <div key={groupIndex} className="timeline-group">
            <div className="timeline-group-header">
              <span className="timeline-time">
                {formatTimeGroup(group)}
              </span>
              <span className="timeline-count">{group.length} items</span>
            </div>
            
            <div className="timeline-entries">
              {group.map((entry) => (
                <HistoryEntryThumbnail
                  key={entry.id}
                  entry={entry}
                  showThumbnail={showThumbnails}
                  isHovered={hoveredEntry?.id === entry.id}
                  onClick={() => handleEntryClick(entry)}
                  onHover={setHoveredEntry}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderSessionsView = () => (
    <div className="history-sessions">
      <div className="sessions-header">
        <h3>Navigation Sessions</h3>
        <div className="sessions-stats">
          <span>{history.sessions.length} sessions</span>
          <span>Avg: {Math.round(insights.averageSessionDuration / 60000)}min</span>
        </div>
      </div>
      
      <div className="sessions-content">
        {history.sessions.map((session) => (
          <SessionThumbnail
            key={session.id}
            session={session}
            onClick={() => handleSessionClick(session)}
          />
        ))}
      </div>
    </div>
  );

  const renderInsightsView = () => (
    <div className="history-insights">
      <div className="insights-header">
        <h3>Navigation Insights</h3>
      </div>
      
      <div className="insights-content">
        <div className="insights-section">
          <h4>Most Visited Files</h4>
          <div className="insights-list">
            {insights.mostVisitedFiles.slice(0, 5).map((file, index) => (
              <div key={index} className="insight-item">
                <span className="file-name">{getFileName(file.filePath)}</span>
                <span className="visit-count">{file.count} visits</span>
              </div>
            ))}
          </div>
        </div>

        <div className="insights-section">
          <h4>Most Used Symbols</h4>
          <div className="insights-list">
            {insights.mostUsedSymbols.slice(0, 5).map((symbol, index) => (
              <div key={index} className="insight-item">
                <span className="symbol-name">{symbol.symbol}</span>
                <span className="usage-count">{symbol.count} uses</span>
              </div>
            ))}
          </div>
        </div>

        <div className="insights-section">
          <h4>Navigation Patterns</h4>
          <div className="insights-list">
            {insights.navigationPatterns.slice(0, 3).map((pattern, index) => (
              <div key={index} className="insight-item">
                <span className="pattern-name">{pattern.pattern}</span>
                <span className="pattern-frequency">{pattern.frequency}x</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`navigation-history-visualization ${className}`}>
      <div className="history-nav">
        <button 
          className={selectedView === 'timeline' ? 'active' : ''}
          onClick={() => setSelectedView('timeline')}
        >
          Timeline
        </button>
        {showSessions && (
          <button 
            className={selectedView === 'sessions' ? 'active' : ''}
            onClick={() => setSelectedView('sessions')}
          >
            Sessions
          </button>
        )}
        <button 
          className={selectedView === 'insights' ? 'active' : ''}
          onClick={() => setSelectedView('insights')}
        >
          Insights
        </button>
      </div>

      <div className="history-content">
        {selectedView === 'timeline' && renderTimelineView()}
        {selectedView === 'sessions' && renderSessionsView()}
        {selectedView === 'insights' && renderInsightsView()}
      </div>

      {hoveredEntry && (
        <HistoryEntryTooltip 
          entry={hoveredEntry}
          onClose={() => setHoveredEntry(null)}
        />
      )}
    </div>
  );
};

// History Entry Thumbnail Component
interface HistoryEntryThumbnailProps {
  entry: NavigationHistoryEntry;
  showThumbnail: boolean;
  isHovered: boolean;
  onClick: () => void;
  onHover: (entry: NavigationHistoryEntry | null) => void;
}

const HistoryEntryThumbnail: React.FC<HistoryEntryThumbnailProps> = ({
  entry,
  showThumbnail,
  isHovered,
  onClick,
  onHover
}) => {
  const fileName = getFileName(entry.location.filePath);
  const fileExtension = getFileExtension(entry.location.filePath);
  const symbolInfo = entry.location.symbol 
    ? `${entry.location.symbol.identifier} (${entry.location.symbol.kind})`
    : null;

  return (
    <div 
      className={`history-entry-thumbnail ${isHovered ? 'hovered' : ''}`}
      onClick={onClick}
      onMouseEnter={() => onHover(entry)}
      onMouseLeave={() => onHover(null)}
    >
      {showThumbnail && (
        <div className="entry-thumbnail">
          <div className={`file-icon ${fileExtension}`}>
            {getFileIcon(fileExtension)}
          </div>
        </div>
      )}
      
      <div className="entry-info">
        <div className="entry-title">{fileName}</div>
        {symbolInfo && (
          <div className="entry-symbol">{symbolInfo}</div>
        )}
        <div className="entry-meta">
          <span className="entry-time">
            {formatTime(entry.location.timestamp)}
          </span>
          <span className="entry-action">{entry.action}</span>
        </div>
      </div>

      <div className="entry-priority">
        <div 
          className="priority-indicator"
          style={{ opacity: entry.metadata.confidence }}
        />
      </div>
    </div>
  );
};

// Session Thumbnail Component
interface SessionThumbnailProps {
  session: HistorySession;
  onClick: () => void;
}

const SessionThumbnail: React.FC<SessionThumbnailProps> = ({
  session,
  onClick
}) => {
  const duration = session.endTime 
    ? new Date(session.endTime).getTime() - new Date(session.startTime).getTime()
    : 0;
  
  const uniqueFiles = new Set(session.entries.map(e => e.location.filePath)).size;

  return (
    <div className="session-thumbnail" onClick={onClick}>
      <div className="session-header">
        <h4 className="session-name">{session.name}</h4>
        <span className="session-status">
          {session.isActive ? 'Active' : 'Completed'}
        </span>
      </div>
      
      <div className="session-stats">
        <span>{session.entries.length} locations</span>
        <span>{uniqueFiles} files</span>
        <span>{Math.round(duration / 60000)}min</span>
      </div>
      
      <div className="session-preview">
        {session.entries.slice(0, 3).map((entry, index) => (
          <div key={index} className="session-entry-preview">
            {getFileName(entry.location.filePath)}
          </div>
        ))}
        {session.entries.length > 3 && (
          <div className="session-more">
            +{session.entries.length - 3} more
          </div>
        )}
      </div>
    </div>
  );
};

// History Entry Tooltip Component
interface HistoryEntryTooltipProps {
  entry: NavigationHistoryEntry;
  onClose: () => void;
}

const HistoryEntryTooltip: React.FC<HistoryEntryTooltipProps> = ({
  entry,
  onClose
}) => {
  return (
    <div className="history-entry-tooltip">
      <div className="tooltip-header">
        <h4>{getFileName(entry.location.filePath)}</h4>
        <button className="tooltip-close" onClick={onClose}>×</button>
      </div>
      
      <div className="tooltip-content">
        <div className="tooltip-section">
          <strong>Location:</strong>
          <div>Line {entry.location.position.line}, Column {entry.location.position.column}</div>
        </div>
        
        {entry.location.symbol && (
          <div className="tooltip-section">
            <strong>Symbol:</strong>
            <div>{entry.location.symbol.identifier} ({entry.location.symbol.kind})</div>
          </div>
        )}
        
        <div className="tooltip-section">
          <strong>Action:</strong>
          <div>{entry.action} via {entry.metadata.trigger}</div>
        </div>
        
        <div className="tooltip-section">
          <strong>Time:</strong>
          <div>{formatFullTime(entry.location.timestamp)}</div>
        </div>
        
        {entry.metadata.tags.length > 0 && (
          <div className="tooltip-section">
            <strong>Tags:</strong>
            <div className="tooltip-tags">
              {entry.metadata.tags.map((tag, index) => (
                <span key={index} className="tooltip-tag">{tag}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Utility Functions
function generateHistoryThumbnails(
  history: NavigationHistory, 
  maxEntries: number
): HistoryEntryThumbnail[] {
  const entries = history.entries.slice(-maxEntries);
  
  return entries.map((entry, index) => ({
    entry,
    priority: calculateEntryPriority(entry, index, entries.length),
    isVisible: true,
    contextInfo: generateContextInfo(entry)
  }));
}

function calculateEntryPriority(
  entry: NavigationHistoryEntry, 
  index: number, 
  totalEntries: number
): number {
  let priority = 0;
  
  // Recent entries get higher priority
  const recencyScore = index / totalEntries;
  priority += recencyScore * 0.4;
  
  // Bookmarked locations get higher priority
  if (entry.location.metadata.isBookmarked) {
    priority += 0.3;
  }
  
  // Frequently visited locations get higher priority
  const visitScore = Math.min(entry.location.metadata.visitCount / 10, 1);
  priority += visitScore * 0.2;
  
  // Confidence score
  priority += entry.metadata.confidence * 0.1;
  
  return Math.min(priority, 1);
}

function generateContextInfo(entry: NavigationHistoryEntry): string {
  const parts = [];
  
  if (entry.location.symbol) {
    parts.push(`Symbol: ${entry.location.symbol.identifier}`);
  }
  
  if (entry.metadata.tags.length > 0) {
    parts.push(`Tags: ${entry.metadata.tags.join(', ')}`);
  }
  
  parts.push(`Action: ${entry.action}`);
  
  return parts.join(' | ');
}

function formatTimeGroup(group: NavigationHistoryEntry[]): string {
  if (group.length === 0) return '';
  
  const firstEntry = group[0];
  const date = new Date(firstEntry.location.timestamp);
  
  return date.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
}

function formatTime(timestamp: Date | string): string {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  return date.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
}

function formatFullTime(timestamp: Date | string): string {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  return date.toLocaleString();
}

function getFileName(filePath: string): string {
  return filePath.split('/').pop() || filePath;
}

function getFileExtension(filePath: string): string {
  const fileName = getFileName(filePath);
  const parts = fileName.split('.');
  return parts.length > 1 ? parts.pop()! : '';
}

function getFileIcon(extension: string): string {
  const iconMap: Record<string, string> = {
    'ts': '📘',
    'tsx': '⚛️',
    'js': '📜',
    'jsx': '⚛️',
    'py': '🐍',
    'java': '☕',
    'cpp': '⚙️',
    'c': '⚙️',
    'rs': '🦀',
    'go': '🐹',
    'php': '🐘',
    'rb': '💎',
    'swift': '🦉',
    'kt': '🎯',
    'dart': '🎯',
    'html': '🌐',
    'css': '🎨',
    'scss': '🎨',
    'json': '📋',
    'xml': '📄',
    'md': '📝',
    'txt': '📄'
  };
  
  return iconMap[extension.toLowerCase()] || '📄';
}

export default NavigationHistoryVisualization;
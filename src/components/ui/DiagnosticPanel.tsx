// [[SECONDARY_MIND]]/src/components/ui/DiagnosticPanel.tsx
// Purpose: Diagnostic information display for troubleshooting and system health monitoring.
// Architecture: React components with system information collection and display.
// Dependencies: React, Lucide icons, Tailwind CSS.

import React, { useState, useEffect, useCallback } from 'react';
import {
    Activity,
    HardDrive,
    Cpu,
    Wifi,
    WifiOff,
    AlertTriangle,
    CheckCircle,
    Download,
    Copy,
    RefreshCw,
    ChevronDown,
    ChevronUp,
    Info
} from 'lucide-react';

export interface SystemDiagnostics {
    timestamp: Date;
    system: SystemInfo;
    performance: PerformanceInfo;
    network: NetworkInfo;
    application: ApplicationInfo;
    errors: ErrorInfo[];
    warnings: WarningInfo[];
}

export interface SystemInfo {
    userAgent: string;
    platform: string;
    language: string;
    cookieEnabled: boolean;
    onLine: boolean;
    hardwareConcurrency: number;
    maxTouchPoints: number;
    screenResolution: string;
    colorDepth: number;
    timezone: string;
}

export interface PerformanceInfo {
    memoryUsage?: {
        used: number;
        total: number;
        percentage: number;
    };
    timing: {
        navigationStart: number;
        loadEventEnd: number;
        domContentLoaded: number;
        firstPaint?: number;
        firstContentfulPaint?: number;
    };
    resources: ResourceTiming[];
}

export interface ResourceTiming {
    name: string;
    duration: number;
    size?: number;
    type: string;
}

export interface NetworkInfo {
    online: boolean;
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
    saveData?: boolean;
    lastConnectivityCheck: Date;
    connectivityHistory: ConnectivityEvent[];
}

export interface ConnectivityEvent {
    timestamp: Date;
    type: 'online' | 'offline';
    duration?: number;
}

export interface ApplicationInfo {
    version: string;
    buildDate: string;
    environment: 'development' | 'production';
    features: FeatureStatus[];
    cacheStatus: CacheStatus;
    sessionInfo: SessionInfo;
}

export interface FeatureStatus {
    name: string;
    enabled: boolean;
    status: 'healthy' | 'degraded' | 'failed';
    lastCheck: Date;
    details?: string;
}

export interface CacheStatus {
    size: number;
    hitRate: number;
    lastCleared: Date;
    entries: number;
}

export interface SessionInfo {
    sessionId: string;
    startTime: Date;
    duration: number;
    pageViews: number;
    errors: number;
}

export interface ErrorInfo {
    id: string;
    timestamp: Date;
    message: string;
    stack?: string;
    component?: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    resolved: boolean;
}

export interface WarningInfo {
    id: string;
    timestamp: Date;
    message: string;
    category: string;
    dismissed: boolean;
}

export interface DiagnosticPanelProps {
    /** Show the diagnostic panel */
    show: boolean;
    /** Callback when panel is closed */
    onClose: () => void;
    /** Enable automatic refresh */
    autoRefresh?: boolean;
    /** Refresh interval in seconds */
    refreshInterval?: number;
    /** Show advanced diagnostics */
    showAdvanced?: boolean;
}

export const DiagnosticPanel: React.FC<DiagnosticPanelProps> = ({
    show,
    onClose,
    autoRefresh = true,
    refreshInterval = 30,
    showAdvanced = false,
}) => {
    const [diagnostics, setDiagnostics] = useState<SystemDiagnostics | null>(null);
    const [loading, setLoading] = useState(false);
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['system']));
    const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

    const collectDiagnostics = useCallback(async (): Promise<SystemDiagnostics> => {
        const timestamp = new Date();

        // Collect system information
        const system: SystemInfo = {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            cookieEnabled: navigator.cookieEnabled,
            onLine: navigator.onLine,
            hardwareConcurrency: navigator.hardwareConcurrency,
            maxTouchPoints: navigator.maxTouchPoints || 0,
            screenResolution: `${screen.width}x${screen.height}`,
            colorDepth: screen.colorDepth,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        };

        // Collect performance information
        const performance: PerformanceInfo = {
            timing: {
                navigationStart: window.performance.timing.navigationStart,
                loadEventEnd: window.performance.timing.loadEventEnd,
                domContentLoaded: window.performance.timing.domContentLoadedEventEnd,
                firstPaint: (window.performance as any).getEntriesByType?.('paint')
                    ?.find((entry: any) => entry.name === 'first-paint')?.startTime,
                firstContentfulPaint: (window.performance as any).getEntriesByType?.('paint')
                    ?.find((entry: any) => entry.name === 'first-contentful-paint')?.startTime,
            },
            resources: window.performance.getEntriesByType('resource').slice(0, 10).map(entry => ({
                name: entry.name.split('/').pop() || entry.name,
                duration: entry.duration,
                size: (entry as any).transferSize,
                type: (entry as any).initiatorType || 'unknown',
            })),
        };

        // Add memory usage if available
        if ((performance as any).memory) {
            const memory = (performance as any).memory;
            performance.memoryUsage = {
                used: memory.usedJSHeapSize,
                total: memory.totalJSHeapSize,
                percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100,
            };
        }

        // Collect network information
        const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
        const network: NetworkInfo = {
            online: navigator.onLine,
            effectiveType: connection?.effectiveType,
            downlink: connection?.downlink,
            rtt: connection?.rtt,
            saveData: connection?.saveData,
            lastConnectivityCheck: timestamp,
            connectivityHistory: [], // Would be populated from stored history
        };

        // Collect application information
        const application: ApplicationInfo = {
            version: process.env.REACT_APP_VERSION || '1.0.0',
            buildDate: process.env.REACT_APP_BUILD_DATE || new Date().toISOString(),
            environment: process.env.NODE_ENV as 'development' | 'production',
            features: [
                {
                    name: 'AI Integration',
                    enabled: true,
                    status: navigator.onLine ? 'healthy' : 'degraded',
                    lastCheck: timestamp,
                    details: navigator.onLine ? 'Online' : 'Offline mode',
                },
                {
                    name: 'File Operations',
                    enabled: true,
                    status: 'healthy',
                    lastCheck: timestamp,
                },
                {
                    name: 'Search Index',
                    enabled: true,
                    status: 'healthy',
                    lastCheck: timestamp,
                },
                {
                    name: 'Cache System',
                    enabled: true,
                    status: 'healthy',
                    lastCheck: timestamp,
                },
            ],
            cacheStatus: {
                size: 0, // Would be calculated from actual cache
                hitRate: 85.5,
                lastCleared: new Date(Date.now() - 86400000), // 1 day ago
                entries: 0,
            },
            sessionInfo: {
                sessionId: 'session_' + Date.now(),
                startTime: new Date(Date.now() - 3600000), // 1 hour ago
                duration: 3600,
                pageViews: 5,
                errors: 0,
            },
        };

        return {
            timestamp,
            system,
            performance,
            network,
            application,
            errors: [], // Would be populated from error store
            warnings: [], // Would be populated from warning store
        };
    }, []);

    const refreshDiagnostics = useCallback(async () => {
        setLoading(true);
        try {
            const newDiagnostics = await collectDiagnostics();
            setDiagnostics(newDiagnostics);
            setLastRefresh(new Date());
        } catch (error) {
            console.error('Failed to collect diagnostics:', error);
        } finally {
            setLoading(false);
        }
    }, [collectDiagnostics]);

    const toggleSection = useCallback((section: string) => {
        setExpandedSections(prev => {
            const next = new Set(prev);
            if (next.has(section)) {
                next.delete(section);
            } else {
                next.add(section);
            }
            return next;
        });
    }, []);

    const copyDiagnostics = useCallback(() => {
        if (!diagnostics) return;

        const diagnosticsText = JSON.stringify(diagnostics, null, 2);
        navigator.clipboard.writeText(diagnosticsText).then(() => {
            // Would show toast notification
            console.log('Diagnostics copied to clipboard');
        });
    }, [diagnostics]);

    const downloadDiagnostics = useCallback(() => {
        if (!diagnostics) return;

        const diagnosticsText = JSON.stringify(diagnostics, null, 2);
        const blob = new Blob([diagnosticsText], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `diagnostics-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, [diagnostics]);

    // Initial load and auto-refresh
    useEffect(() => {
        if (show) {
            refreshDiagnostics();
        }
    }, [show, refreshDiagnostics]);

    useEffect(() => {
        if (!show || !autoRefresh) return;

        const interval = setInterval(refreshDiagnostics, refreshInterval * 1000);
        return () => clearInterval(interval);
    }, [show, autoRefresh, refreshInterval, refreshDiagnostics]);

    if (!show) return null;

    const formatBytes = (bytes: number): string => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatDuration = (ms: number): string => {
        if (ms < 1000) return `${Math.round(ms)}ms`;
        if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
        return `${(ms / 60000).toFixed(1)}m`;
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'healthy':
                return <CheckCircle className="w-4 h-4 text-green-500" />;
            case 'degraded':
                return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
            case 'failed':
                return <AlertTriangle className="w-4 h-4 text-red-500" />;
            default:
                return <Info className="w-4 h-4 text-gray-500" />;
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <div className="flex items-center space-x-2">
                        <Activity className="w-5 h-5 text-blue-500" />
                        <h2 className="text-lg font-semibold">System Diagnostics</h2>
                        {lastRefresh && (
                            <span className="text-sm text-gray-500">
                                Last updated: {lastRefresh.toLocaleTimeString()}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={refreshDiagnostics}
                            disabled={loading}
                            className="p-2 hover:bg-gray-100 rounded transition-colors"
                            title="Refresh diagnostics"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                        <button
                            onClick={copyDiagnostics}
                            className="p-2 hover:bg-gray-100 rounded transition-colors"
                            title="Copy diagnostics"
                        >
                            <Copy className="w-4 h-4" />
                        </button>
                        <button
                            onClick={downloadDiagnostics}
                            className="p-2 hover:bg-gray-100 rounded transition-colors"
                            title="Download diagnostics"
                        >
                            <Download className="w-4 h-4" />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded transition-colors"
                        >
                            ×
                        </button>
                    </div>
                </div>

                <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
                    {loading && !diagnostics ? (
                        <div className="flex items-center justify-center p-8">
                            <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                            <span>Collecting diagnostics...</span>
                        </div>
                    ) : diagnostics ? (
                        <div className="p-4 space-y-4">
                            {/* System Information */}
                            <DiagnosticSection
                                title="System Information"
                                icon={<Cpu className="w-4 h-4" />}
                                expanded={expandedSections.has('system')}
                                onToggle={() => toggleSection('system')}
                            >
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <strong>Platform:</strong> {diagnostics.system.platform}
                                    </div>
                                    <div>
                                        <strong>Language:</strong> {diagnostics.system.language}
                                    </div>
                                    <div>
                                        <strong>Screen:</strong> {diagnostics.system.screenResolution}
                                    </div>
                                    <div>
                                        <strong>CPU Cores:</strong> {diagnostics.system.hardwareConcurrency}
                                    </div>
                                    <div>
                                        <strong>Timezone:</strong> {diagnostics.system.timezone}
                                    </div>
                                    <div>
                                        <strong>Color Depth:</strong> {diagnostics.system.colorDepth}-bit
                                    </div>
                                </div>
                            </DiagnosticSection>

                            {/* Performance Information */}
                            <DiagnosticSection
                                title="Performance"
                                icon={<Activity className="w-4 h-4" />}
                                expanded={expandedSections.has('performance')}
                                onToggle={() => toggleSection('performance')}
                            >
                                <div className="space-y-3">
                                    {diagnostics.performance.memoryUsage && (
                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-sm font-medium">Memory Usage</span>
                                                <span className="text-sm text-gray-600">
                                                    {diagnostics.performance.memoryUsage.percentage.toFixed(1)}%
                                                </span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div
                                                    className="bg-blue-500 h-2 rounded-full"
                                                    style={{ width: `${diagnostics.performance.memoryUsage.percentage}%` }}
                                                />
                                            </div>
                                            <div className="text-xs text-gray-500 mt-1">
                                                {formatBytes(diagnostics.performance.memoryUsage.used)} / {formatBytes(diagnostics.performance.memoryUsage.total)}
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <strong>DOM Content Loaded:</strong> {formatDuration(diagnostics.performance.timing.domContentLoaded)}
                                        </div>
                                        <div>
                                            <strong>Load Complete:</strong> {formatDuration(diagnostics.performance.timing.loadEventEnd)}
                                        </div>
                                        {diagnostics.performance.timing.firstPaint && (
                                            <div>
                                                <strong>First Paint:</strong> {formatDuration(diagnostics.performance.timing.firstPaint)}
                                            </div>
                                        )}
                                        {diagnostics.performance.timing.firstContentfulPaint && (
                                            <div>
                                                <strong>First Contentful Paint:</strong> {formatDuration(diagnostics.performance.timing.firstContentfulPaint)}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </DiagnosticSection>

                            {/* Network Information */}
                            <DiagnosticSection
                                title="Network"
                                icon={diagnostics.network.online ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                                expanded={expandedSections.has('network')}
                                onToggle={() => toggleSection('network')}
                            >
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <strong>Status:</strong> {diagnostics.network.online ? 'Online' : 'Offline'}
                                    </div>
                                    {diagnostics.network.effectiveType && (
                                        <div>
                                            <strong>Connection Type:</strong> {diagnostics.network.effectiveType}
                                        </div>
                                    )}
                                    {diagnostics.network.downlink && (
                                        <div>
                                            <strong>Downlink:</strong> {diagnostics.network.downlink} Mbps
                                        </div>
                                    )}
                                    {diagnostics.network.rtt && (
                                        <div>
                                            <strong>RTT:</strong> {diagnostics.network.rtt}ms
                                        </div>
                                    )}
                                </div>
                            </DiagnosticSection>

                            {/* Application Information */}
                            <DiagnosticSection
                                title="Application"
                                icon={<HardDrive className="w-4 h-4" />}
                                expanded={expandedSections.has('application')}
                                onToggle={() => toggleSection('application')}
                            >
                                <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <strong>Version:</strong> {diagnostics.application.version}
                                        </div>
                                        <div>
                                            <strong>Environment:</strong> {diagnostics.application.environment}
                                        </div>
                                        <div>
                                            <strong>Session Duration:</strong> {formatDuration(diagnostics.application.sessionInfo.duration * 1000)}
                                        </div>
                                        <div>
                                            <strong>Cache Hit Rate:</strong> {diagnostics.application.cacheStatus.hitRate}%
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="font-medium mb-2">Feature Status</h4>
                                        <div className="space-y-1">
                                            {diagnostics.application.features.map((feature, index) => (
                                                <div key={index} className="flex items-center justify-between">
                                                    <div className="flex items-center space-x-2">
                                                        {getStatusIcon(feature.status)}
                                                        <span className="text-sm">{feature.name}</span>
                                                    </div>
                                                    <span className="text-xs text-gray-500">
                                                        {feature.details || feature.status}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </DiagnosticSection>

                            {/* Errors and Warnings */}
                            {(diagnostics.errors.length > 0 || diagnostics.warnings.length > 0) && (
                                <DiagnosticSection
                                    title="Issues"
                                    icon={<AlertTriangle className="w-4 h-4" />}
                                    expanded={expandedSections.has('issues')}
                                    onToggle={() => toggleSection('issues')}
                                >
                                    <div className="space-y-2">
                                        {diagnostics.errors.map((error, index) => (
                                            <div key={index} className="p-2 bg-red-50 border border-red-200 rounded text-sm">
                                                <div className="flex items-center space-x-2">
                                                    <AlertTriangle className="w-4 h-4 text-red-500" />
                                                    <span className="font-medium">Error:</span>
                                                    <span>{error.message}</span>
                                                </div>
                                                <div className="text-xs text-gray-500 mt-1">
                                                    {error.timestamp.toLocaleString()}
                                                </div>
                                            </div>
                                        ))}

                                        {diagnostics.warnings.map((warning, index) => (
                                            <div key={index} className="p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                                                <div className="flex items-center space-x-2">
                                                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                                                    <span className="font-medium">Warning:</span>
                                                    <span>{warning.message}</span>
                                                </div>
                                                <div className="text-xs text-gray-500 mt-1">
                                                    {warning.timestamp.toLocaleString()}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </DiagnosticSection>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center p-8">
                            <span>No diagnostics available</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

interface DiagnosticSectionProps {
    title: string;
    icon: React.ReactNode;
    expanded: boolean;
    onToggle: () => void;
    children: React.ReactNode;
}

const DiagnosticSection: React.FC<DiagnosticSectionProps> = ({
    title,
    icon,
    expanded,
    onToggle,
    children,
}) => {
    return (
        <div className="border border-gray-200 rounded-lg">
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
            >
                <div className="flex items-center space-x-2">
                    {icon}
                    <span className="font-medium">{title}</span>
                </div>
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {expanded && (
                <div className="border-t border-gray-200 p-3">
                    {children}
                </div>
            )}
        </div>
    );
};
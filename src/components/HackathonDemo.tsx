import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { useUIStore } from '../store/uiStore';
import {
  Sparkles,
  Code,
  GitBranch,
  Download,
  ExternalLink,
  Github,
  Award,
  Play,
  FileText,
  Bot,
  Database,
  Cpu,
  Monitor,
  ArrowRight,
  CheckCircle,
  Star,
  Users,
  Clock,
  TrendingUp,
  ArrowLeft,
  Home
} from 'lucide-react';

const features = [
  {
    icon: <Code className="h-8 w-8" />,
    title: "AI-Powered Code Analysis",
    description: "Advanced AST parsing using SWC for TypeScript, JavaScript, and Rust. Automatically extracts functions, classes, interfaces, and dependencies with intelligent semantic understanding.",
    details: "• Real-time symbol extraction • Dependency graph analysis • Smart code navigation • Context-aware suggestions",
    color: "blue"
  },
  {
    icon: <Database className="h-8 w-8" />,
    title: "Smart Profile System",
    description: "Context management system that captures project state, preferences, and development patterns. Export profiles in JSON, YAML, or XML formats for team collaboration.",
    details: "• Automatic context collection • Team-shareable profiles • Multi-format export • Version-controlled settings",
    color: "green"
  },
  {
    icon: <Bot className="h-8 w-8" />,
    title: "Integrated AI Chat",
    description: "Context-aware AI assistant with deep understanding of your codebase. Get intelligent answers about code structure, patterns, and implementation suggestions.",
    details: "• Codebase-aware responses • Implementation guidance • Code explanation • Best practice recommendations",
    color: "purple"
  },
  {
    icon: <GitBranch className="h-8 w-8" />,
    title: "Git Integration",
    description: "Deep Git integration using libgit2 for real-time repository status, branch tracking, and commit history analysis with workspace-aware change detection.",
    details: "• Real-time status updates • Branch visualization • Change tracking • Commit history analysis",
    color: "orange"
  },
  {
    icon: <Cpu className="h-8 w-8" />,
    title: "High Performance",
    description: "Native performance through Rust backend with optimized parsing, memory management, and async operations. React frontend ensures smooth user experience.",
    details: "• Rust-powered backend • Optimized memory usage • Async operations • 60fps UI interactions",
    color: "red"
  },
  {
    icon: <Monitor className="h-8 w-8" />,
    title: "Cross-Platform",
    description: "Single codebase deployed across Windows, macOS, and Linux using Tauri. Native OS integration with consistent user experience across platforms.",
    details: "• Windows, macOS, Linux • Native file dialogs • OS integration • Consistent UX",
    color: "indigo"
  }
];

const stats = [
  { icon: <Clock className="h-6 w-6" />, value: "85%", label: "Faster Analysis" },
  { icon: <Users className="h-6 w-6" />, value: "1000+", label: "Symbols Parsed" },
  { icon: <TrendingUp className="h-6 w-6" />, value: "Real-time", label: "Code Insights" },
  { icon: <Star className="h-6 w-6" />, value: "AI-Powered", label: "Intelligence" }
];

const techStack = [
  "Rust", "Tauri", "React 18", "TypeScript", "SWC Parser", "Git2", "Zustand", "Tailwind CSS", "Radix UI"
];

export function HackathonDemo() {
  const [animatedFeature, setAnimatedFeature] = useState(0);
  const [terminalStep, setTerminalStep] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const { setCurrentView } = useUIStore();

  const terminalSteps = [
    "// Analyzing React project...",
    "✓ Found 247 TypeScript symbols",
    "✓ Parsed 18 React components",
    "✓ Detected 12 custom hooks",
    "⚡ AI context generated",
    "🧠 Ready for intelligent assistance"
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimatedFeature((prev) => (prev + 1) % features.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const terminalInterval = setInterval(() => {
      if (!isTyping) {
        setIsTyping(true);
        setTimeout(() => {
          setTerminalStep((prev) => (prev + 1) % terminalSteps.length);
          setIsTyping(false);
        }, 800);
      }
    }, 2000);
    return () => clearInterval(terminalInterval);
  }, [isTyping, terminalSteps.length]);

  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'bg-blue-500/10 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
      green: 'bg-green-500/10 text-green-600 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
      purple: 'bg-purple-500/10 text-purple-600 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800',
      orange: 'bg-orange-500/10 text-orange-600 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800',
      red: 'bg-red-500/10 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
      indigo: 'bg-indigo-500/10 text-indigo-600 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800'
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Navigation Header */}
        <div className="flex items-center justify-between mb-8">
          <Button
            variant="outline"
            onClick={() => setCurrentView('dashboard')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>

          <Button
            variant="ghost"
            onClick={() => setCurrentView('dashboard')}
            className="flex items-center gap-2"
          >
            <Home className="h-4 w-4" />
            Home
          </Button>
        </div>
        {/* Hero Section */}
        <div className="text-center mb-20">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="p-4 bg-primary rounded-2xl">
              <Sparkles className="h-12 w-12 text-primary-foreground" />
            </div>
            <h1 className="text-6xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              Secondary Mind
            </h1>
          </div>

          <div className="flex items-center justify-center gap-2 mb-6">
            <Badge variant="secondary" className="px-4 py-2 text-lg font-semibold">
              <Award className="h-5 w-5 mr-2" />
              Hackathon Submission
            </Badge>
          </div>

          <p className="text-2xl text-muted-foreground max-w-4xl mx-auto leading-relaxed mb-8">
            Revolutionary AI-powered codebase analysis and development guidance tool.
            Understand your code better, develop faster, and build smarter.
          </p>

          <div className="flex flex-wrap justify-center gap-4 mb-12">
            <Button
              size="lg"
              className="h-14 px-8 text-lg font-semibold"
              onClick={() => setShowPreview(true)}
            >
              <Play className="h-6 w-6 mr-3" />
              Try Live Demo
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-14 px-8 text-lg font-semibold"
              onClick={() => window.open('https://github.com/Di-Gi/secondary/releases', '_blank')}
            >
              <Download className="h-6 w-6 mr-3" />
              Download App
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-14 px-8 text-lg font-semibold"
              onClick={() => window.open('https://github.com/Di-Gi/secondary/tree/kiro', '_blank')}
            >
              <Github className="h-6 w-6 mr-3" />
              View Source
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="flex items-center justify-center mb-2 text-primary">
                  {stat.icon}
                </div>
                <div className="text-3xl font-bold text-foreground">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Features Grid */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-foreground mb-4">Powerful Features</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Built for developers who want to understand and navigate their codebases with AI assistance
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card
                key={index}
                className={`h-full transition-all duration-500 hover:shadow-lg border-2 ${
                  animatedFeature === index
                    ? 'border-primary shadow-lg scale-105'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <CardHeader>
                  <div className={`inline-flex p-4 rounded-xl mb-4 border ${getColorClasses(feature.color)}`}>
                    {feature.icon}
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <CardDescription className="text-base leading-relaxed">
                    {feature.description}
                  </CardDescription>
                  <div className="text-sm text-muted-foreground leading-relaxed">
                    {feature.details}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Live Demo Section */}
        <div className="mb-20">
          <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-purple-500/5">
            <CardContent className="p-12">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div>
                  <h3 className="text-3xl font-bold text-foreground mb-6">
                    Experience Secondary Mind
                  </h3>
                  <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                    Try our interactive demo with a sample TypeScript project. See how Secondary Mind
                    analyzes code structure, provides AI insights, and helps you understand complex codebases instantly.
                  </p>

                  <div className="space-y-4 mb-8">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className="text-foreground">Real-time symbol parsing</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className="text-foreground">AI-powered code insights</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className="text-foreground">Interactive workspace</span>
                    </div>
                  </div>

                  <Button
                    size="lg"
                    className="h-12 px-8 text-lg"
                    onClick={() => setCurrentView('dashboard')}
                  >
                    <Play className="h-5 w-5 mr-3" />
                    Open Full Application
                    <ArrowRight className="h-5 w-5 ml-3" />
                  </Button>
                </div>

                <div className="relative">
                  <div className="bg-background/50 backdrop-blur border border-border rounded-xl p-6 shadow-xl">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="ml-4 text-sm text-muted-foreground">Secondary Mind Demo</span>
                    </div>

                    <div className="space-y-3 text-sm font-mono h-32">
                      {terminalSteps.slice(0, terminalStep + 1).map((step, index) => (
                        <div
                          key={index}
                          className={`transition-all duration-500 ${
                            index === 0 ? 'text-blue-400' :
                            index < 4 ? 'text-green-400' :
                            index === 4 ? 'text-yellow-400' :
                            'text-purple-400'
                          } ${index === terminalStep && isTyping ? 'opacity-50' : 'opacity-100'}`}
                        >
                          {step}
                          {index === terminalStep && isTyping && (
                            <span className="animate-pulse">|</span>
                          )}
                        </div>
                      ))}
                      {terminalStep < terminalSteps.length - 1 && (
                        <div className="text-gray-600 animate-pulse">|</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Technology Stack */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-foreground mb-4">Built with Modern Tech</h2>
            <p className="text-xl text-muted-foreground">
              Cutting-edge technologies for performance, reliability, and developer experience
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-4">
            {techStack.map((tech, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="px-4 py-2 text-base font-medium hover:bg-primary hover:text-primary-foreground transition-colors cursor-default"
              >
                {tech}
              </Badge>
            ))}
          </div>
        </div>

        {/* Hackathon Links */}
        <div className="mb-20">
          <Card className="border-2 border-primary bg-primary/5">
            <CardContent className="p-12">
              <div className="text-center mb-8">
                <h2 className="text-4xl font-bold text-foreground mb-4">Hackathon Submission</h2>
                <p className="text-xl text-muted-foreground">
                  Explore our project, contribute to development, or download the application
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-2 border-border hover:border-primary/50 hover:shadow-md transition-all">
                  <CardContent className="p-6 text-center">
                    <Github className="h-12 w-12 text-foreground mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-3">Source Code</h3>
                    <p className="text-muted-foreground mb-6">
                      View the complete source code, contribute, and follow development
                    </p>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => window.open('https://github.com/Di-Gi/secondary/tree/kiro', '_blank')}
                    >
                      <Github className="h-4 w-4 mr-2" />
                      GitHub Repository
                      <ExternalLink className="h-4 w-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-2 border-border hover:border-primary/50 hover:shadow-md transition-all">
                  <CardContent className="p-6 text-center">
                    <Award className="h-12 w-12 text-foreground mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-3">Hackathon Submission</h3>
                    <p className="text-muted-foreground mb-6">
                      Detailed project documentation, architecture overview, and technical implementation details
                    </p>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => window.open('https://github.com/Di-Gi/secondary/blob/kiro/README.md', '_blank')}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      View Documentation
                      <ExternalLink className="h-4 w-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-2 border-border hover:border-primary/50 hover:shadow-md transition-all">
                  <CardContent className="p-6 text-center">
                    <Download className="h-12 w-12 text-foreground mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-3">Download App</h3>
                    <p className="text-muted-foreground mb-6">
                      Get the latest version for Windows, macOS, or Linux
                    </p>
                    <Button
                      className="w-full"
                      onClick={() => window.open('https://github.com/Di-Gi/secondary/releases', '_blank')}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Now
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center border-t border-border pt-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Sparkles className="h-6 w-6 text-primary" />
            <span className="text-lg font-semibold text-foreground">Secondary Mind</span>
          </div>
          <p className="text-muted-foreground">
            AI-powered codebase analysis for smarter development workflows
          </p>
        </div>

        {/* Preview Modal */}
        {showPreview && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-background border border-border rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between p-6 border-b border-border">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-6 w-6 text-primary" />
                  <h3 className="text-xl font-semibold">Secondary Mind Preview</h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPreview(false)}
                  className="h-8 w-8 p-0"
                >
                  ✕
                </Button>
              </div>

              <div className="p-6 space-y-6">
                <div className="text-center space-y-4">
                  <div className="text-lg text-muted-foreground">
                    This preview shows the core interface of Secondary Mind
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <Code className="h-6 w-6 text-blue-500 mx-auto mb-2" />
                      <div className="font-medium">Symbol Explorer</div>
                      <div className="text-xs text-muted-foreground">Browse your codebase structure</div>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <Bot className="h-6 w-6 text-purple-500 mx-auto mb-2" />
                      <div className="font-medium">AI Chat</div>
                      <div className="text-xs text-muted-foreground">Get intelligent code insights</div>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <GitBranch className="h-6 w-6 text-green-500 mx-auto mb-2" />
                      <div className="font-medium">Git Integration</div>
                      <div className="text-xs text-muted-foreground">Track repository status</div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button onClick={() => setCurrentView('dashboard')} className="flex-1 sm:flex-initial">
                    <Play className="h-4 w-4 mr-2" />
                    Open Full Application
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => window.open('https://github.com/Di-Gi/secondary/tree/kiro', '_blank')}
                    className="flex-1 sm:flex-initial"
                  >
                    <Github className="h-4 w-4 mr-2" />
                    View Source Code
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
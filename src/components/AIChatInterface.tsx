// AI chat component with integrated profile context management
import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import { api } from '../api';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { LoadingSpinner } from './ui/loading-spinner';
import { ProfileSelector } from './ProfileSelector';
import {
  Send,
  Bot,
  User,
  FolderOpen,
  Sparkles,
  AlertCircle,
  Copy,
  Check
} from 'lucide-react';
import { cn } from '../lib/utils';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  profileContext?: {
    profileName: string;
    fileCount: number;
  };
  symbolContext?: {
    identifier: string;
    kind: string;
    path: string;
    line: number;
  };
}

interface AIChatInterfaceProps {
  selectedSymbol?: import('../api').Symbol | null;
}

export function AIChatInterface({ selectedSymbol }: AIChatInterfaceProps) {
  const {
    currentProject,
    activeProfile,
    synthesizeGuidance
  } = useAppStore();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const buildContextualQuery = async (userQuery: string): Promise<string> => {
    let contextualQuery = userQuery;
    let hasContext = false;

    // Add selected symbol context
    if (selectedSymbol) {
      hasContext = true;
      const { cleanPath } = await import('../utils/pathUtils');
      const cleanedPath = cleanPath(selectedSymbol.location.path);
      
      contextualQuery = `Context: I'm currently looking at the symbol "${selectedSymbol.identifier}" (${selectedSymbol.kind}) located at ${cleanedPath}:${selectedSymbol.location.line}.\n\n`;
      
      // Try to get the file content for the selected symbol
      try {
        const content = await api.readFileContent(selectedSymbol.location.path);
        contextualQuery += `--- ${cleanedPath} ---\n${content}\n\n`;
      } catch (error) {
        contextualQuery += `// Error reading file: ${error}\n\n`;
      }
    }

    // Add profile context if available
    if (activeProfile) {
      hasContext = true;
      try {
        // Get file contents for active profile
        const fileContents = await Promise.all(
          activeProfile.files.map(async (filePath) => {
            try {
              const content = await api.readFileContent(filePath);
              return { path: filePath, content };
            } catch (error) {
              return { path: filePath, content: `// Error reading file: ${error}` };
            }
          })
        );

        if (selectedSymbol) {
          contextualQuery += `Additionally, I'm working with the "${activeProfile.name}" profile which includes the following files:\n\n`;
        } else {
          contextualQuery = `Context: I'm working with the "${activeProfile.name}" profile which includes the following files:\n\n`;
        }

        fileContents.forEach(({ path, content }) => {
          contextualQuery += `--- ${path} ---\n${content}\n\n`;
        });
      } catch (error) {
        console.error('Failed to build profile context:', error);
      }
    }

    if (hasContext) {
      contextualQuery += `User Query: ${userQuery}\n\n`;
      contextualQuery += `Please provide guidance based on the provided code context.`;
    }

    return contextualQuery;
  };

  const handleSendMessage = async () => {
    if (!input.trim() || !currentProject || isLoading) return;

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}_user`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
      profileContext: activeProfile ? {
        profileName: activeProfile.name,
        fileCount: activeProfile.files.length
      } : undefined,
      symbolContext: selectedSymbol ? {
        identifier: selectedSymbol.identifier,
        kind: selectedSymbol.kind,
        path: selectedSymbol.location.path,
        line: selectedSymbol.location.line
      } : undefined,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Build contextual query if profile is active
      const contextualQuery = await buildContextualQuery(userMessage.content);

      // Get AI response
      const response = await synthesizeGuidance(contextualQuery);

      const assistantMessage: ChatMessage = {
        id: `msg_${Date.now()}_assistant`,
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: `msg_${Date.now()}_error`,
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const copyToClipboard = async (content: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!currentProject) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <div className="text-center">
          <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <h3 className="font-medium mb-2">No Project Selected</h3>
          <p className="text-sm">Select a project to start chatting with AI</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header with Profile Selector */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-foreground">AI Assistant</h2>
          <ProfileSelector />
        </div>

        <div className="space-y-2">
          {selectedSymbol && (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-2 rounded-md">
              <Sparkles className="h-4 w-4" />
              <span>Focused on symbol: <code className="font-mono">{selectedSymbol.identifier}</code></span>
              <Badge variant="secondary" className="text-xs">
                {selectedSymbol.kind}
              </Badge>
            </div>
          )}
          
          {activeProfile && (
            <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-50 px-3 py-2 rounded-md">
              <Sparkles className="h-4 w-4" />
              <span>Context-aware mode with "{activeProfile.name}" profile</span>
              <Badge variant="secondary" className="text-xs">
                {activeProfile.files.length} files
              </Badge>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-muted-foreground mt-8">
            <Bot className="h-16 w-16 mx-auto mb-4 opacity-30" />
            <h3 className="font-medium mb-2">Start a conversation</h3>
            <p className="text-sm mb-4">Ask questions about your code, get suggestions, or request explanations.</p>
            {activeProfile && (
              <div className="inline-flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-md">
                <FolderOpen className="h-4 w-4" />
                <span>Ready with "{activeProfile.name}" context</span>
              </div>
            )}
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-3",
                message.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              <div
                className={cn(
                  "flex gap-3 max-w-[80%]",
                  message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                )}
              >
                <div className={cn(
                  "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                )}>
                  {message.role === 'user' ? (
                    <User className="h-4 w-4" />
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                </div>

                <div className={cn(
                  "rounded-lg px-4 py-3 min-w-0",
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/50 text-foreground'
                )}>
                  {/* Context indicators for user messages */}
                  {message.role === 'user' && (message.symbolContext || message.profileContext) && (
                    <div className="space-y-1 mb-2">
                      {message.symbolContext && (
                        <div className="flex items-center gap-2 text-primary-foreground/80 text-xs">
                          <Sparkles className="h-3 w-3" />
                          <span>Symbol: {message.symbolContext.identifier} ({message.symbolContext.kind})</span>
                        </div>
                      )}
                      {message.profileContext && (
                        <div className="flex items-center gap-2 text-primary-foreground/80 text-xs">
                          <FolderOpen className="h-3 w-3" />
                          <span>Profile: {message.profileContext.profileName} ({message.profileContext.fileCount} files)</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="whitespace-pre-wrap text-sm break-words overflow-wrap-anywhere">
                    {message.content}
                  </div>

                  <div className={cn(
                    "flex items-center justify-between mt-2 text-xs",
                    message.role === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                  )}>
                    <span>{formatTimestamp(message.timestamp)}</span>

                    {message.role === 'assistant' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(message.content, message.id)}
                        className="h-6 w-6 p-0 hover:bg-muted"
                      >
                        {copiedMessageId === message.id ? (
                          <Check className="h-3 w-3 text-green-600" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center">
              <Bot className="h-4 w-4" />
            </div>
            <div className="bg-muted/50 rounded-lg px-4 py-3">
              <div className="flex items-center gap-2">
                <LoadingSpinner size="sm" />
                <span className="text-sm text-muted-foreground">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                selectedSymbol
                  ? `Ask about ${selectedSymbol.identifier}...`
                  : activeProfile
                  ? `Ask about your ${activeProfile.name} files...`
                  : "Ask a question about your code..."
              }
              className="resize-none min-h-[44px] max-h-32 pr-12"
              rows={1}
            />

            {!activeProfile && (
              <div className="absolute bottom-2 right-12 text-xs text-muted-foreground">
                <AlertCircle className="h-3 w-3 inline mr-1" />
                No profile active
              </div>
            )}
          </div>

          <Button
            onClick={handleSendMessage}
            disabled={!input.trim() || isLoading}
            size="sm"
            className="self-end"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
          <span>Press Enter to send, Shift+Enter for new line</span>
          {activeProfile && (
            <span className="text-blue-600">
              Context: {activeProfile.files.length} files loaded
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
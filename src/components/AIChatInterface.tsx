// [[SECONDARY_MIND_DESKTOP]]/src/components/AIChatInterface.tsx
// Purpose: Chat interface for AI-powered development guidance with real-time conversation.
// Architecture: Manages chat state, message history, and real-time communication with AI synthesis core.
// Dependencies: React hooks, app store for AI communication, UI components for chat display.

import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import { api } from '../api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Send, Bot, User, Loader2, Zap } from 'lucide-react';

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  contextUsed?: string[]; // Symbols that were used for context
}

export function AIChatInterface() {
  const { synthesizeGuidance, currentProject } = useAppStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [collectingContext, setCollectingContext] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Extract symbol mentions from user input
  const extractSymbolMentions = (text: string): string[] => {
    if (!currentProject) return [];
    
    const mentions: string[] = [];
    const words = text.split(/\s+/);
    
    for (const word of words) {
      // Clean the word of punctuation
      const cleanWord = word.replace(/[^\w]/g, '');
      
      // Check if this word matches any symbol identifier
      const matchingSymbol = currentProject.symbols.find(
        symbol => symbol.identifier.toLowerCase() === cleanWord.toLowerCase()
      );
      
      if (matchingSymbol && !mentions.includes(matchingSymbol.identifier)) {
        mentions.push(matchingSymbol.identifier);
      }
    }
    
    return mentions;
  };

  // Enhance query with context for mentioned symbols
  const enhanceQueryWithContext = async (query: string): Promise<{ enhancedQuery: string; contextSymbols: string[] }> => {
    const mentionedSymbols = extractSymbolMentions(query);
    
    if (mentionedSymbols.length === 0) {
      return { enhancedQuery: query, contextSymbols: [] };
    }

    setCollectingContext(true);
    
    try {
      let contextualQuery = query + '\n\n--- CODEBASE CONTEXT ---\n';
      
      for (const symbolId of mentionedSymbols) {
        try {
          const context = await api.collectSymbolContext(symbolId);
          
          contextualQuery += `\n## Context for ${symbolId}:\n`;
          contextualQuery += `Type: ${context.primary_symbol.kind}\n`;
          contextualQuery += `Location: ${context.primary_symbol.location.path}:${context.primary_symbol.location.line}\n`;
          
          if (context.used_by.length > 0) {
            contextualQuery += `\nUsed by:\n`;
            context.used_by.slice(0, 3).forEach(file => {
              contextualQuery += `- ${file.path.split('/').pop()}: ${file.preview.split('\n')[0]}\n`;
            });
          }
          
          if (context.dependencies.length > 0) {
            contextualQuery += `\nDependencies:\n`;
            context.dependencies.slice(0, 3).forEach(file => {
              contextualQuery += `- ${file.path.split('/').pop()}: ${file.preview.split('\n')[0]}\n`;
            });
          }
          
          contextualQuery += '\n';
        } catch (error) {
          console.warn(`Failed to collect context for ${symbolId}:`, error);
        }
      }
      
      return { enhancedQuery: contextualQuery, contextSymbols: mentionedSymbols };
    } finally {
      setCollectingContext(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading || collectingContext) return;

    const originalQuery = inputValue.trim();
    setInputValue('');
    setIsLoading(true);

    try {
      // Enhance query with context if symbols are mentioned
      const { enhancedQuery, contextSymbols } = await enhanceQueryWithContext(originalQuery);
      
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'user',
        content: originalQuery,
        timestamp: new Date(),
        contextUsed: contextSymbols,
      };

      setMessages(prev => [...prev, userMessage]);

      const response = await synthesizeGuidance(enhancedQuery);
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: response,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: `Sorry, I encountered an error: ${error}`,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatMessageContent = (content: string) => {
    // Simple code block detection and formatting
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const parts = content.split(codeBlockRegex);
    
    return parts.map((part, index) => {
      if (index % 3 === 2) {
        // This is code content
        return (
          <pre key={index} className="bg-gray-900 text-gray-100 p-3 rounded-md text-sm overflow-x-auto my-2">
            <code>{part}</code>
          </pre>
        );
      } else if (index % 3 === 1) {
        // This is the language identifier, skip it
        return null;
      } else {
        // This is regular text
        return part.split('\n').map((line, lineIndex) => (
          <React.Fragment key={`${index}-${lineIndex}`}>
            {line}
            {lineIndex < part.split('\n').length - 1 && <br />}
          </React.Fragment>
        ));
      }
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Welcome Message */}
      {messages.length === 0 && (
        <div className="p-4">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Bot className="h-6 w-6 text-blue-600 mt-1" />
                <div>
                  <h3 className="font-medium text-blue-900 mb-2">AI Development Assistant</h3>
                  <p className="text-blue-800 text-sm mb-3">
                    I'm here to help you understand and improve your codebase. Ask me about:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">Code refactoring</Badge>
                    <Badge variant="secondary">Architecture patterns</Badge>
                    <Badge variant="secondary">Bug analysis</Badge>
                    <Badge variant="secondary">Best practices</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            {message.type === 'assistant' && (
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Bot className="h-4 w-4 text-blue-600" />
              </div>
            )}
            
            <Card className={`max-w-[80%] ${message.type === 'user' ? 'bg-blue-600 text-white' : 'bg-white'}`}>
              <CardContent className="p-3">
                <div className={`text-sm ${message.type === 'user' ? 'text-white' : 'text-gray-900'}`}>
                  {formatMessageContent(message.content)}
                </div>
                
                {/* Show context indicators for user messages */}
                {message.type === 'user' && message.contextUsed && message.contextUsed.length > 0 && (
                  <div className="mt-2 flex items-center gap-1 flex-wrap">
                    <Zap className="h-3 w-3 text-blue-200" />
                    <span className="text-xs text-blue-200">Context:</span>
                    {message.contextUsed.map((symbol) => (
                      <Badge key={symbol} variant="secondary" className="text-xs bg-blue-500 text-white border-blue-400">
                        {symbol}
                      </Badge>
                    ))}
                  </div>
                )}
                
                <div className={`text-xs mt-2 ${message.type === 'user' ? 'text-blue-100' : 'text-gray-500'}`}>
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </CardContent>
            </Card>

            {message.type === 'user' && (
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="h-4 w-4 text-gray-600" />
              </div>
            )}
          </div>
        ))}

        {/* Loading indicator */}
        {(isLoading || collectingContext) && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Bot className="h-4 w-4 text-blue-600" />
            </div>
            <Card className="bg-white">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  {collectingContext ? (
                    <>
                      <Zap className="h-4 w-4 animate-pulse text-blue-600" />
                      <span className="text-sm text-gray-600">Collecting context...</span>
                    </>
                  ) : (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-gray-600">Thinking...</span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about your codebase..."
            disabled={isLoading || collectingContext}
            className="flex-1"
          />
          <Button 
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading || collectingContext}
            size="sm"
          >
            {collectingContext ? (
              <Zap className="h-4 w-4 animate-pulse" />
            ) : isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Integration: Used by ProjectWorkspace to provide AI guidance functionality with real-time chat interface.
// Notes: Includes message formatting, code syntax highlighting, and proper loading states for good UX.
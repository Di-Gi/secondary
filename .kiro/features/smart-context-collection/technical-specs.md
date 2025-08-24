# Phase 1 Technical Specifications: Smart Context Collection MVP

## Implementation Overview

### Goal
Create a working Smart Context Collection system that immediately improves AI interactions by automatically gathering relevant code context when users click symbols or ask AI questions.

### Success Criteria
- Context collection completes in <500ms for typical symbols
- AI responses show measurable improvement in relevance
- Users can see and understand collected context before it's sent to AI
- System integrates seamlessly with existing Symbol Explorer and AI Chat

## Detailed Component Specifications

### 1. Backend: Context Collection Engine

#### Core Service Architecture
```rust
// src/context/mod.rs
pub mod collector;
pub mod analyzer;
pub mod cache;
pub mod types;

use crate::symbol::Symbol;
use std::path::PathBuf;

#[derive(Debug, Clone)]
pub struct ContextService {
    symbol_analyzer: Arc<SymbolAnalyzer>,
    file_reader: Arc<FileReader>,
    cache: Arc<Mutex<ContextCache>>,
}

impl ContextService {
    pub async fn collect_for_symbol(&self, symbol: &Symbol) -> Result<ContextPackage> {
        // 1. Check cache first
        if let Some(cached) = self.cache.lock().await.get(&symbol.id) {
            return Ok(cached);
        }
        
        // 2. Collect fresh context
        let context = self.collect_fresh_context(symbol).await?;
        
        // 3. Cache result
        self.cache.lock().await.insert(symbol.id.clone(), context.clone());
        
        Ok(context)
    }
    
    pub async fn collect_for_ai_query(&self, query: &str, current_file: Option<&PathBuf>) -> Result<ContextPackage> {
        // 1. Parse query to identify mentioned symbols/concepts
        let mentioned_symbols = self.extract_symbols_from_query(query, current_file).await?;
        
        // 2. Collect context for each identified symbol
        let mut contexts = Vec::new();
        for symbol in mentioned_symbols {
            if let Ok(ctx) = self.collect_for_symbol(&symbol).await {
                contexts.push(ctx);
            }
        }
        
        // 3. Merge and prioritize contexts
        Ok(self.merge_contexts(contexts, query))
    }
}
```

#### Context Package Structure
```rust
// src/context/types.rs
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContextPackage {
    pub id: String,
    pub primary_symbol: Option<Symbol>,
    pub collected_at: SystemTime,
    pub items: Vec<ContextItem>,
    pub total_relevance: f32,
    pub collection_time_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContextItem {
    pub id: String,
    pub content: ContextContent,
    pub context_type: ContextType,
    pub relevance_score: f32,
    pub source_file: PathBuf,
    pub line_range: Option<(usize, usize)>,
    pub relationship: RelationshipType,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ContextContent {
    Code {
        content: String,
        language: String,
        symbols: Vec<Symbol>,
    },
    Configuration {
        key: String,
        value: String,
        file_type: ConfigType,
    },
    Documentation {
        content: String,
        doc_type: DocType,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ContextType {
    DirectDependency,    // Files this symbol imports
    DirectUsage,         // Files that use this symbol
    TypeDefinition,      // Type/interface definitions
    Configuration,       // Config files that affect this symbol
    TestFile,           // Tests for this symbol
    RelatedPattern,     // Similar implementations
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum RelationshipType {
    Imports,
    ImportedBy,
    Extends,
    Implements,
    Uses,
    UsedBy,
    Tests,
    Configures,
    Similar,
}
```

#### Context Collectors
```rust
// src/context/collector.rs
#[async_trait]
pub trait ContextCollector: Send + Sync {
    async fn collect(&self, symbol: &Symbol) -> Result<Vec<ContextItem>>;
    fn priority(&self) -> u8;
    fn context_type(&self) -> ContextType;
}

pub struct DependencyCollector {
    symbol_analyzer: Arc<SymbolAnalyzer>,
    file_reader: Arc<FileReader>,
}

#[async_trait]
impl ContextCollector for DependencyCollector {
    async fn collect(&self, symbol: &Symbol) -> Result<Vec<ContextItem>> {
        let mut items = Vec::new();
        
        // Find all imports for this symbol
        let imports = self.symbol_analyzer.find_imports(symbol).await?;
        for import in imports {
            if let Ok(content) = self.file_reader.read_file(&import.file).await {
                items.push(ContextItem {
                    id: format!("dep_{}", import.file.display()),
                    content: ContextContent::Code {
                        content: self.extract_relevant_section(&content, &import.symbol),
                        language: self.detect_language(&import.file),
                        symbols: vec![import.symbol.clone()],
                    },
                    context_type: ContextType::DirectDependency,
                    relevance_score: 0.9, // High relevance for direct dependencies
                    source_file: import.file,
                    line_range: import.line_range,
                    relationship: RelationshipType::Imports,
                });
            }
        }
        
        Ok(items)
    }
    
    fn priority(&self) -> u8 { 10 } // Highest priority
    fn context_type(&self) -> ContextType { ContextType::DirectDependency }
}

pub struct UsageCollector {
    symbol_analyzer: Arc<SymbolAnalyzer>,
    file_reader: Arc<FileReader>,
}

#[async_trait]
impl ContextCollector for UsageCollector {
    async fn collect(&self, symbol: &Symbol) -> Result<Vec<ContextItem>> {
        let mut items = Vec::new();
        
        // Find all usages of this symbol
        let usages = self.symbol_analyzer.find_all_references(symbol).await?;
        
        // Limit to most relevant usages (max 5)
        let top_usages = self.prioritize_usages(usages);
        
        for usage in top_usages.into_iter().take(5) {
            if let Ok(content) = self.file_reader.read_file(&usage.file).await {
                items.push(ContextItem {
                    id: format!("usage_{}", usage.file.display()),
                    content: ContextContent::Code {
                        content: self.extract_usage_context(&content, &usage),
                        language: self.detect_language(&usage.file),
                        symbols: vec![symbol.clone()],
                    },
                    context_type: ContextType::DirectUsage,
                    relevance_score: usage.relevance,
                    source_file: usage.file,
                    line_range: Some((usage.line, usage.line + 3)),
                    relationship: RelationshipType::UsedBy,
                });
            }
        }
        
        Ok(items)
    }
    
    fn priority(&self) -> u8 { 9 }
    fn context_type(&self) -> ContextType { ContextType::DirectUsage }
}

pub struct ConfigurationCollector {
    file_reader: Arc<FileReader>,
}

#[async_trait]
impl ContextCollector for ConfigurationCollector {
    async fn collect(&self, symbol: &Symbol) -> Result<Vec<ContextItem>> {
        let mut items = Vec::new();
        
        // Look for configuration files that might affect this symbol
        let config_files = self.find_relevant_config_files(symbol).await?;
        
        for config_file in config_files {
            if let Ok(content) = self.file_reader.read_file(&config_file).await {
                // Extract relevant configuration sections
                let relevant_configs = self.extract_relevant_config(&content, symbol);
                
                for config in relevant_configs {
                    items.push(ContextItem {
                        id: format!("config_{}_{}", config_file.display(), config.key),
                        content: ContextContent::Configuration {
                            key: config.key,
                            value: config.value,
                            file_type: self.detect_config_type(&config_file),
                        },
                        context_type: ContextType::Configuration,
                        relevance_score: config.relevance,
                        source_file: config_file.clone(),
                        line_range: config.line_range,
                        relationship: RelationshipType::Configures,
                    });
                }
            }
        }
        
        Ok(items)
    }
    
    fn priority(&self) -> u8 { 7 }
    fn context_type(&self) -> ContextType { ContextType::Configuration }
}
```

#### Context Cache
```rust
// src/context/cache.rs
use lru::LruCache;
use std::num::NonZeroUsize;

pub struct ContextCache {
    symbol_contexts: LruCache<String, ContextPackage>,
    file_contents: LruCache<PathBuf, String>,
    analysis_results: LruCache<String, Vec<Symbol>>,
}

impl ContextCache {
    pub fn new() -> Self {
        Self {
            symbol_contexts: LruCache::new(NonZeroUsize::new(100).unwrap()),
            file_contents: LruCache::new(NonZeroUsize::new(50).unwrap()),
            analysis_results: LruCache::new(NonZeroUsize::new(200).unwrap()),
        }
    }
    
    pub fn get(&mut self, symbol_id: &str) -> Option<ContextPackage> {
        self.symbol_contexts.get(symbol_id).cloned()
    }
    
    pub fn insert(&mut self, symbol_id: String, context: ContextPackage) {
        self.symbol_contexts.put(symbol_id, context);
    }
    
    pub fn invalidate_file(&mut self, file_path: &PathBuf) {
        // Remove any cached contexts that depend on this file
        self.symbol_contexts.clear(); // Simple approach for MVP
        self.file_contents.pop(file_path);
    }
}
```

### 2. Frontend: UI Integration

#### Enhanced Symbol Explorer
```typescript
// src/components/SymbolExplorer/EnhancedSymbolExplorer.tsx
import React, { useState, useCallback } from 'react';
import { Symbol, ContextPackage } from '../../types';
import { contextService } from '../../services/contextService';

interface EnhancedSymbolExplorerProps {
    symbols: Symbol[];
    onSymbolSelect: (symbol: Symbol) => void;
}

export const EnhancedSymbolExplorer: React.FC<EnhancedSymbolExplorerProps> = ({
    symbols,
    onSymbolSelect
}) => {
    const [selectedSymbol, setSelectedSymbol] = useState<Symbol | null>(null);
    const [contextPackage, setContextPackage] = useState<ContextPackage | null>(null);
    const [isLoadingContext, setIsLoadingContext] = useState(false);

    const handleSymbolClick = useCallback(async (symbol: Symbol) => {
        setSelectedSymbol(symbol);
        setIsLoadingContext(true);
        
        try {
            const context = await contextService.collectForSymbol(symbol);
            setContextPackage(context);
        } catch (error) {
            console.error('Failed to collect context:', error);
        } finally {
            setIsLoadingContext(false);
        }
        
        onSymbolSelect(symbol);
    }, [onSymbolSelect]);

    return (
        <div className="enhanced-symbol-explorer">
            <div className="symbol-list">
                {symbols.map(symbol => (
                    <SymbolItem
                        key={symbol.id}
                        symbol={symbol}
                        isSelected={selectedSymbol?.id === symbol.id}
                        onClick={() => handleSymbolClick(symbol)}
                        hasContext={contextPackage?.primary_symbol?.id === symbol.id}
                    />
                ))}
            </div>
            
            {selectedSymbol && (
                <div className="symbol-details">
                    <SymbolDetails symbol={selectedSymbol} />
                    
                    {isLoadingContext && (
                        <div className="context-loading">
                            <span>Collecting context...</span>
                        </div>
                    )}
                    
                    {contextPackage && !isLoadingContext && (
                        <ContextPreview 
                            contextPackage={contextPackage}
                            onSendToAI={() => sendContextToAI(contextPackage)}
                        />
                    )}
                </div>
            )}
        </div>
    );
};

const SymbolItem: React.FC<{
    symbol: Symbol;
    isSelected: boolean;
    onClick: () => void;
    hasContext: boolean;
}> = ({ symbol, isSelected, onClick, hasContext }) => (
    <div 
        className={`symbol-item ${isSelected ? 'selected' : ''}`}
        onClick={onClick}
    >
        <div className="symbol-info">
            <span className="symbol-name">{symbol.name}</span>
            <span className="symbol-type">{symbol.type}</span>
        </div>
        {hasContext && (
            <div className="context-indicator" title="Context available">
                <ContextIcon />
            </div>
        )}
    </div>
);
```

#### Context Preview Component
```typescript
// src/components/Context/ContextPreview.tsx
import React, { useState } from 'react';
import { ContextPackage, ContextItem } from '../../types';

interface ContextPreviewProps {
    contextPackage: ContextPackage;
    onSendToAI: () => void;
}

export const ContextPreview: React.FC<ContextPreviewProps> = ({
    contextPackage,
    onSendToAI
}) => {
    const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

    const toggleItem = (itemId: string) => {
        const newExpanded = new Set(expandedItems);
        if (newExpanded.has(itemId)) {
            newExpanded.delete(itemId);
        } else {
            newExpanded.add(itemId);
        }
        setExpandedItems(newExpanded);
    };

    const groupedItems = groupItemsByType(contextPackage.items);

    return (
        <div className="context-preview">
            <div className="context-header">
                <h3>Collected Context</h3>
                <div className="context-stats">
                    <span>{contextPackage.items.length} items</span>
                    <span>Relevance: {(contextPackage.total_relevance * 100).toFixed(0)}%</span>
                    <span>{contextPackage.collection_time_ms}ms</span>
                </div>
            </div>

            <div className="context-groups">
                {Object.entries(groupedItems).map(([type, items]) => (
                    <ContextGroup
                        key={type}
                        type={type}
                        items={items}
                        expandedItems={expandedItems}
                        onToggleItem={toggleItem}
                    />
                ))}
            </div>

            <div className="context-actions">
                <button 
                    className="send-to-ai-btn"
                    onClick={onSendToAI}
                >
                    Send to AI Chat
                </button>
                <button className="copy-context-btn">
                    Copy Context
                </button>
            </div>
        </div>
    );
};

const ContextGroup: React.FC<{
    type: string;
    items: ContextItem[];
    expandedItems: Set<string>;
    onToggleItem: (id: string) => void;
}> = ({ type, items, expandedItems, onToggleItem }) => (
    <div className="context-group">
        <div className="group-header">
            <h4>{formatContextType(type)}</h4>
            <span className="item-count">{items.length}</span>
        </div>
        
        <div className="group-items">
            {items.map(item => (
                <ContextItemView
                    key={item.id}
                    item={item}
                    isExpanded={expandedItems.has(item.id)}
                    onToggle={() => onToggleItem(item.id)}
                />
            ))}
        </div>
    </div>
);
```

#### AI Chat Integration
```typescript
// src/components/AIChat/EnhancedAIChat.tsx
import React, { useState, useCallback } from 'react';
import { contextService } from '../../services/contextService';

export const EnhancedAIChat: React.FC = () => {
    const [query, setQuery] = useState('');
    const [contextPackage, setContextPackage] = useState<ContextPackage | null>(null);
    const [isCollectingContext, setIsCollectingContext] = useState(false);
    const [autoCollectContext, setAutoCollectContext] = useState(true);

    const handleQueryChange = useCallback(async (newQuery: string) => {
        setQuery(newQuery);
        
        if (autoCollectContext && newQuery.length > 10) {
            setIsCollectingContext(true);
            try {
                const context = await contextService.collectForQuery(newQuery);
                setContextPackage(context);
            } catch (error) {
                console.error('Failed to collect context for query:', error);
            } finally {
                setIsCollectingContext(false);
            }
        }
    }, [autoCollectContext]);

    const handleSendMessage = useCallback(async () => {
        if (!query.trim()) return;

        let finalQuery = query;
        
        if (contextPackage && contextPackage.items.length > 0) {
            // Enhance query with context
            finalQuery = buildContextualQuery(query, contextPackage);
        }

        // Send to AI with enhanced query
        await sendToAI(finalQuery);
        
        // Clear query and context
        setQuery('');
        setContextPackage(null);
    }, [query, contextPackage]);

    return (
        <div className="enhanced-ai-chat">
            <div className="chat-input-section">
                <textarea
                    value={query}
                    onChange={(e) => handleQueryChange(e.target.value)}
                    placeholder="Ask about your code..."
                    className="chat-input"
                />
                
                <div className="input-controls">
                    <label className="auto-context-toggle">
                        <input
                            type="checkbox"
                            checked={autoCollectContext}
                            onChange={(e) => setAutoCollectContext(e.target.checked)}
                        />
                        Auto-collect context
                    </label>
                    
                    <button 
                        onClick={handleSendMessage}
                        disabled={!query.trim()}
                        className="send-button"
                    >
                        Send
                    </button>
                </div>
            </div>

            {isCollectingContext && (
                <div className="context-collection-indicator">
                    <span>Collecting relevant context...</span>
                </div>
            )}

            {contextPackage && !isCollectingContext && (
                <div className="context-preview-inline">
                    <div className="context-summary">
                        <span>Context: {contextPackage.items.length} items</span>
                        <button onClick={() => setContextPackage(null)}>
                            Remove context
                        </button>
                    </div>
                    
                    <div className="context-items-summary">
                        {contextPackage.items.slice(0, 3).map(item => (
                            <div key={item.id} className="context-item-summary">
                                <span className="item-type">{item.context_type}</span>
                                <span className="item-source">{item.source_file.name}</span>
                            </div>
                        ))}
                        {contextPackage.items.length > 3 && (
                            <span className="more-items">
                                +{contextPackage.items.length - 3} more
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
```

### 3. Service Integration

#### Context Service
```typescript
// src/services/contextService.ts
import { invoke } from '@tauri-apps/api/tauri';
import { Symbol, ContextPackage } from '../types';

class ContextService {
    async collectForSymbol(symbol: Symbol): Promise<ContextPackage> {
        return await invoke('collect_context_for_symbol', { symbol });
    }

    async collectForQuery(query: string, currentFile?: string): Promise<ContextPackage> {
        return await invoke('collect_context_for_query', { 
            query, 
            currentFile 
        });
    }

    async invalidateCache(filePath: string): Promise<void> {
        return await invoke('invalidate_context_cache', { filePath });
    }
}

export const contextService = new ContextService();
```

#### Tauri Commands
```rust
// src-tauri/src/commands/context.rs
use crate::context::ContextService;
use crate::symbol::Symbol;
use std::path::PathBuf;

#[tauri::command]
pub async fn collect_context_for_symbol(
    symbol: Symbol,
    state: tauri::State<'_, ContextService>,
) -> Result<ContextPackage, String> {
    state
        .collect_for_symbol(&symbol)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn collect_context_for_query(
    query: String,
    current_file: Option<PathBuf>,
    state: tauri::State<'_, ContextService>,
) -> Result<ContextPackage, String> {
    state
        .collect_for_ai_query(&query, current_file.as_ref())
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn invalidate_context_cache(
    file_path: PathBuf,
    state: tauri::State<'_, ContextService>,
) -> Result<(), String> {
    state
        .invalidate_cache(&file_path)
        .await
        .map_err(|e| e.to_string())
}
```

## Testing Strategy

### Unit Tests
```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_dependency_collector() {
        let collector = DependencyCollector::new(mock_symbol_analyzer(), mock_file_reader());
        let symbol = Symbol::new("TestFunction", SymbolType::Function);
        
        let items = collector.collect(&symbol).await.unwrap();
        
        assert!(!items.is_empty());
        assert_eq!(items[0].context_type, ContextType::DirectDependency);
    }

    #[tokio::test]
    async fn test_context_cache() {
        let mut cache = ContextCache::new();
        let context = mock_context_package();
        
        cache.insert("test_symbol".to_string(), context.clone());
        let retrieved = cache.get("test_symbol").unwrap();
        
        assert_eq!(retrieved.id, context.id);
    }
}
```

### Integration Tests
```typescript
// src/tests/contextIntegration.test.ts
describe('Context Collection Integration', () => {
    test('should collect context when symbol is clicked', async () => {
        const symbol = mockSymbol();
        const contextPackage = await contextService.collectForSymbol(symbol);
        
        expect(contextPackage.items.length).toBeGreaterThan(0);
        expect(contextPackage.primary_symbol?.id).toBe(symbol.id);
    });

    test('should enhance AI query with context', async () => {
        const query = "How does authentication work?";
        const contextPackage = await contextService.collectForQuery(query);
        
        expect(contextPackage.items.some(item => 
            item.context_type === 'DirectDependency'
        )).toBe(true);
    });
});
```

## Performance Targets

### Response Time Goals
- Context collection: <500ms for typical symbols
- Cache hit: <50ms
- UI update: <100ms after context received

### Memory Usage Limits
- Context cache: <100MB
- Individual context package: <10MB
- UI component memory: <50MB

### Scalability Targets
- Support codebases up to 100k files
- Handle 1000+ symbols efficiently
- Maintain performance with 50+ concurrent context requests

This technical specification provides a complete blueprint for implementing the Smart Context Collection MVP that will immediately improve AI interactions and serve as the foundation for more advanced features.
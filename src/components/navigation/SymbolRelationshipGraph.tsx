// Symbol Relationship Graph Component
// Purpose: Interactive graph showing symbol dependencies and relationships
// Features: Force-directed layout, pan/zoom, node selection, relationship visualization

import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { 
  RelationshipGraphData, 
  GraphNode, 
  GraphEdge, 
  RelationshipFilter,
  RelationshipType 
} from '../../types/navigation';
import { Symbol } from '../../api';

export interface SymbolRelationshipGraphProps {
  data?: RelationshipGraphData;
  centerSymbol?: Symbol;
  onSymbolSelect?: (symbol: Symbol) => void;
  onRelationshipFilter?: (filter: RelationshipFilter) => void;
  className?: string;
  width?: number;
  height?: number;
  showFilters?: boolean;
  enableHover?: boolean;
}

interface D3Node extends d3.SimulationNodeDatum {
  id: string;
  symbol: Symbol;
  size: number;
  color: string;
  isExpanded: boolean;
  isSelected: boolean;
  degree: number;
}

interface D3Link extends d3.SimulationLinkDatum<D3Node> {
  id: string;
  relationship: {
    type: RelationshipType;
    strength: number;
  };
  color: string;
  width: number;
  dashPattern?: number[];
}

const RELATIONSHIP_COLORS: Record<RelationshipType, string> = {
  calls: '#3b82f6',
  inherits: '#10b981',
  implements: '#8b5cf6',
  imports: '#f59e0b',
  exports: '#ef4444',
  references: '#6b7280',
  defines: '#ec4899',
  extends: '#14b8a6',
  uses: '#84cc16',
  contains: '#f97316',
  overrides: '#dc2626',
  instantiates: '#7c3aed'
};

const RELATIONSHIP_CATEGORIES: Record<RelationshipType, 'structural' | 'behavioral' | 'dependency'> = {
  inherits: 'structural',
  implements: 'structural',
  extends: 'structural',
  contains: 'structural',
  overrides: 'structural',
  calls: 'behavioral',
  uses: 'behavioral',
  references: 'behavioral',
  instantiates: 'behavioral',
  imports: 'dependency',
  exports: 'dependency',
  defines: 'dependency'
};

const NODE_COLORS = {
  default: '#64748b',
  selected: '#2563eb',
  center: '#dc2626',
  hover: '#1e40af'
};

export function SymbolRelationshipGraph({
  data,
  centerSymbol,
  onSymbolSelect,
  onRelationshipFilter,
  className = '',
  width = 800,
  height = 600,
  showFilters = true,
  enableHover = true
}: SymbolRelationshipGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<Set<RelationshipType>>(
    new Set(Object.keys(RELATIONSHIP_COLORS) as RelationshipType[])
  );
  const [hoverInfo, setHoverInfo] = useState<{
    x: number;
    y: number;
    content: string;
    visible: boolean;
  }>({ x: 0, y: 0, content: '', visible: false });
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [categoryFilters, setCategoryFilters] = useState<{
    structural: boolean;
    behavioral: boolean;
    dependency: boolean;
  }>({ structural: true, behavioral: true, dependency: true });
  const simulationRef = useRef<d3.Simulation<D3Node, D3Link> | null>(null);

  // Convert navigation data to D3 format
  const convertToD3Data = useCallback((graphData: RelationshipGraphData) => {
    const nodes: D3Node[] = graphData.nodes.map(node => ({
      id: node.id,
      symbol: node.symbol,
      size: Math.max(8, Math.min(20, node.size)),
      color: node.isSelected ? NODE_COLORS.selected : 
             (centerSymbol && node.symbol.identifier === centerSymbol.identifier) ? NODE_COLORS.center :
             NODE_COLORS.default,
      isExpanded: expandedNodes.has(node.id),
      isSelected: node.isSelected,
      degree: node.metadata.degree,
      x: node.position.x,
      y: node.position.y
    }));

    const links: D3Link[] = graphData.edges
      .filter(edge => {
        // Filter by visibility and active relationship types
        if (!edge.isVisible || !activeFilters.has(edge.relationship.type)) {
          return false;
        }
        
        // Filter by category
        const category = RELATIONSHIP_CATEGORIES[edge.relationship.type];
        if (!categoryFilters[category]) {
          return false;
        }
        
        // Only show edges for expanded nodes or direct connections to center
        const sourceNode = graphData.nodes.find(n => n.id === edge.source);
        const targetNode = graphData.nodes.find(n => n.id === edge.target);
        
        if (centerSymbol) {
          const isCenterConnection = 
            sourceNode?.symbol.identifier === centerSymbol.identifier ||
            targetNode?.symbol.identifier === centerSymbol.identifier;
          
          if (!isCenterConnection) {
            return expandedNodes.has(edge.source) || expandedNodes.has(edge.target);
          }
        }
        
        return true;
      })
      .map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        relationship: {
          type: edge.relationship.type,
          strength: edge.relationship.strength
        },
        color: RELATIONSHIP_COLORS[edge.relationship.type] || '#6b7280',
        width: Math.max(1, edge.relationship.strength * 3),
        dashPattern: edge.relationship.bidirectional ? [5, 5] : undefined
      }));

    return { nodes, links };
  }, [centerSymbol, activeFilters, categoryFilters, expandedNodes]);

  // Initialize D3 simulation
  const initializeSimulation = useCallback((nodes: D3Node[], links: D3Link[]) => {
    if (simulationRef.current) {
      simulationRef.current.stop();
    }

    const simulation = d3.forceSimulation<D3Node>(nodes)
      .force('link', d3.forceLink<D3Node, D3Link>(links)
        .id(d => d.id)
        .distance(d => 50 + (1 - d.relationship.strength) * 50)
        .strength(d => d.relationship.strength * 0.5)
      )
      .force('charge', d3.forceManyBody()
        .strength(d => -300 - (d.degree * 20))
      )
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide()
        .radius(d => d.size + 5)
      );

    simulationRef.current = simulation;
    return simulation;
  }, [width, height]);

  // Handle node click
  const handleNodeClick = useCallback((event: MouseEvent, node: D3Node) => {
    event.stopPropagation();
    setSelectedNode(node.id);
    onSymbolSelect?.(node.symbol);
  }, [onSymbolSelect]);

  // Handle node hover
  const handleNodeHover = useCallback((node: D3Node | null, event?: MouseEvent) => {
    setHoveredNode(node?.id || null);
    if (enableHover && node && event) {
      setHoverInfo({
        x: event.clientX + 10,
        y: event.clientY - 10,
        content: `${node.symbol.kind}: ${node.symbol.identifier}\nDegree: ${node.degree}`,
        visible: true
      });
    } else {
      setHoverInfo(prev => ({ ...prev, visible: false }));
    }
  }, [enableHover]);

  // Handle edge hover
  const handleEdgeHover = useCallback((edge: D3Link | null, event?: MouseEvent) => {
    setHoveredEdge(edge?.id || null);
    if (enableHover && edge && event) {
      const sourceSymbol = (edge.source as D3Node).symbol;
      const targetSymbol = (edge.target as D3Node).symbol;
      setHoverInfo({
        x: event.clientX + 10,
        y: event.clientY - 10,
        content: `${edge.relationship.type}\n${sourceSymbol.identifier} → ${targetSymbol.identifier}\nStrength: ${edge.relationship.strength.toFixed(2)}`,
        visible: true
      });
    } else {
      setHoverInfo(prev => ({ ...prev, visible: false }));
    }
  }, [enableHover]);

  // Handle filter toggle
  const toggleFilter = useCallback((relationshipType: RelationshipType) => {
    setActiveFilters(prev => {
      const newFilters = new Set(prev);
      if (newFilters.has(relationshipType)) {
        newFilters.delete(relationshipType);
      } else {
        newFilters.add(relationshipType);
      }
      
      // Notify parent component of filter change
      if (onRelationshipFilter && data) {
        const newFilter: RelationshipFilter = {
          ...data.filters,
          types: newFilters
        };
        onRelationshipFilter(newFilter);
      }
      
      return newFilters;
    });
  }, [onRelationshipFilter, data]);

  // Handle category filter toggle
  const toggleCategoryFilter = useCallback((category: 'structural' | 'behavioral' | 'dependency') => {
    setCategoryFilters(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  }, []);

  // Handle node expansion/collapse
  const toggleNodeExpansion = useCallback((nodeId: string) => {
    setExpandedNodes(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(nodeId)) {
        newExpanded.delete(nodeId);
      } else {
        newExpanded.add(nodeId);
      }
      return newExpanded;
    });
  }, []);

  // Navigate to related symbol
  const navigateToSymbol = useCallback((symbol: Symbol) => {
    onSymbolSelect?.(symbol);
  }, [onSymbolSelect]);

  // Render graph
  useEffect(() => {
    if (!data || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { nodes, links } = convertToD3Data(data);
    
    if (nodes.length === 0) {
      // Show empty state
      svg.append('text')
        .attr('x', width / 2)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .attr('class', 'fill-muted-foreground text-sm')
        .text('No symbol relationships to display');
      return;
    }

    const simulation = initializeSimulation(nodes, links);

    // Create zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        container.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Create container for zoomable content
    const container = svg.append('g');

    // Create arrow markers for directed relationships
    const defs = svg.append('defs');
    
    Object.entries(RELATIONSHIP_COLORS).forEach(([type, color]) => {
      defs.append('marker')
        .attr('id', `arrow-${type}`)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 15)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', color);
    });

    // Create links
    const linkElements = container.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', d => d.id === hoveredEdge ? d.color : d.color)
      .attr('stroke-width', d => d.id === hoveredEdge ? d.width + 1 : d.width)
      .attr('stroke-dasharray', d => d.dashPattern?.join(',') || null)
      .attr('marker-end', d => `url(#arrow-${d.relationship.type})`)
      .attr('opacity', d => d.id === hoveredEdge ? 0.9 : 0.6)
      .style('cursor', 'pointer')
      .on('mouseenter', (event, d) => enableHover && handleEdgeHover(d, event))
      .on('mouseleave', () => enableHover && handleEdgeHover(null));

    // Create nodes
    const nodeElements = container.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .style('cursor', 'pointer');

    // Add circles for nodes
    nodeElements.append('circle')
      .attr('r', d => d.size)
      .attr('fill', d => {
        if (d.id === selectedNode) return NODE_COLORS.selected;
        if (d.id === hoveredNode) return NODE_COLORS.hover;
        return d.color;
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);

    // Add expansion indicators for nodes with connections
    nodeElements
      .filter(d => d.degree > 1)
      .append('circle')
      .attr('r', 4)
      .attr('cx', d => d.size - 4)
      .attr('cy', d => -d.size + 4)
      .attr('fill', d => d.isExpanded ? '#10b981' : '#6b7280')
      .attr('stroke', '#fff')
      .attr('stroke-width', 1)
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        toggleNodeExpansion(d.id);
      });

    // Add expansion indicator symbols
    nodeElements
      .filter(d => d.degree > 1)
      .append('text')
      .attr('x', d => d.size - 4)
      .attr('y', d => -d.size + 4)
      .attr('text-anchor', 'middle')
      .attr('dy', '.35em')
      .attr('class', 'fill-white text-xs font-bold')
      .text(d => d.isExpanded ? '−' : '+')
      .style('pointer-events', 'none');

    // Add labels
    nodeElements.append('text')
      .attr('dx', d => d.size + 5)
      .attr('dy', '.35em')
      .attr('class', 'fill-foreground text-xs font-medium')
      .text(d => d.symbol.identifier)
      .style('pointer-events', 'none');

    // Add interaction handlers
    nodeElements
      .on('click', handleNodeClick)
      .on('dblclick', (event, d) => {
        event.stopPropagation();
        navigateToSymbol(d.symbol);
      })
      .on('mouseenter', (event, d) => handleNodeHover(d, event))
      .on('mouseleave', () => handleNodeHover(null));

    // Add drag behavior
    const drag = d3.drag<SVGGElement, D3Node>()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    nodeElements.call(drag);

    // Update positions on simulation tick
    simulation.on('tick', () => {
      linkElements
        .attr('x1', d => (d.source as D3Node).x!)
        .attr('y1', d => (d.source as D3Node).y!)
        .attr('x2', d => (d.target as D3Node).x!)
        .attr('y2', d => (d.target as D3Node).y!);

      nodeElements
        .attr('transform', d => `translate(${d.x},${d.y})`);
    });

    // Cleanup function
    return () => {
      simulation.stop();
    };
  }, [data, width, height, selectedNode, hoveredNode, hoveredEdge, enableHover, expandedNodes, convertToD3Data, initializeSimulation, handleNodeClick, handleNodeHover, handleEdgeHover, toggleNodeExpansion, navigateToSymbol]);

  // Cleanup simulation on unmount
  useEffect(() => {
    return () => {
      if (simulationRef.current) {
        simulationRef.current.stop();
      }
    };
  }, []);

  return (
    <div className={`symbol-relationship-graph ${className}`} data-testid="relationship-graph-container">
      {showFilters && (
        <div className="mb-4 space-y-3">
          {/* Category Filters */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="text-sm font-medium mb-2">Relationship Categories</div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(categoryFilters).map(([category, isActive]) => (
                <button
                  key={category}
                  onClick={() => toggleCategoryFilter(category as 'structural' | 'behavioral' | 'dependency')}
                  className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-border hover:bg-muted'
                  }`}
                  data-testid={`category-filter-${category}`}
                >
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Relationship Type Filters */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="text-sm font-medium mb-2">Relationship Types</div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(RELATIONSHIP_COLORS).map(([type, color]) => (
                <button
                  key={type}
                  onClick={() => toggleFilter(type as RelationshipType)}
                  className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                    activeFilters.has(type as RelationshipType)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-border hover:bg-muted'
                  }`}
                  style={{
                    borderColor: activeFilters.has(type as RelationshipType) ? color : undefined
                  }}
                  data-testid={`filter-${type}`}
                >
                  <span
                    className="inline-block w-2 h-2 rounded-full mr-1"
                    style={{ backgroundColor: color }}
                  />
                  {type}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      
      <div className="relative">
        <svg
          ref={svgRef}
          width={width}
          height={height}
          className="border border-border rounded-lg bg-background"
          style={{ minHeight: '400px' }}
          data-testid="relationship-graph-svg"
        >
          {/* SVG content will be rendered by D3 */}
        </svg>
        
        {/* Navigation Instructions */}
        <div className="absolute top-2 right-2 p-2 bg-background/90 border border-border rounded text-xs text-muted-foreground">
          <div>Click: Select node</div>
          <div>Double-click: Navigate to symbol</div>
          <div>+/−: Expand/collapse connections</div>
        </div>

        {/* Hover tooltip */}
        {hoverInfo.visible && (
          <div
            className="absolute z-10 px-2 py-1 text-xs bg-popover text-popover-foreground border border-border rounded shadow-lg pointer-events-none whitespace-pre-line"
            style={{
              left: hoverInfo.x,
              top: hoverInfo.y,
              transform: 'translate(-50%, -100%)'
            }}
            data-testid="hover-tooltip"
          >
            {hoverInfo.content}
          </div>
        )}
      </div>
    </div>
  );
}

export default SymbolRelationshipGraph;
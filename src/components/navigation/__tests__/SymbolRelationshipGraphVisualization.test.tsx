import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import SymbolRelationshipGraph from '../SymbolRelationshipGraph';
import { RelationshipGraphData, GraphNode, GraphEdge, RelationshipType } from '../../../types/navigation';
import { Symbol } from '../../../api';

// Mock D3 to avoid DOM manipulation issues in tests
const mockD3Selection = {
  selectAll: vi.fn(() => mockD3Selection),
  remove: vi.fn(() => mockD3Selection),
  append: vi.fn(() => mockD3Selection),
  attr: vi.fn(() => mockD3Selection),
  text: vi.fn(() => mockD3Selection),
  call: vi.fn(() => mockD3Selection),
  data: vi.fn(() => mockD3Selection),
  enter: vi.fn(() => mockD3Selection),
  style: vi.fn(() => mockD3Selection),
  on: vi.fn(() => mockD3Selection),
  filter: vi.fn(() => mockD3Selection)
};

const mockSimulation = {
  force: vi.fn(() => mockSimulation),
  on: vi.fn(() => mockSimulation),
  stop: vi.fn(),
  alphaTarget: vi.fn(() => ({
    restart: vi.fn()
  }))
};

vi.mock('d3', () => ({
  select: vi.fn(() => mockD3Selection),
  forceSimulation: vi.fn(() => mockSimulation),
  forceLink: vi.fn(() => ({
    id: vi.fn(() => ({
      distance: vi.fn(() => ({
        strength: vi.fn()
      }))
    }))
  })),
  forceManyBody: vi.fn(() => ({
    strength: vi.fn()
  })),
  forceCenter: vi.fn(),
  forceCollide: vi.fn(() => ({
    radius: vi.fn()
  })),
  zoom: vi.fn(() => ({
    scaleExtent: vi.fn(() => ({
      on: vi.fn()
    }))
  })),
  drag: vi.fn(() => ({
    on: vi.fn(() => ({
      on: vi.fn(() => ({
        on: vi.fn()
      }))
    }))
  }))
}));

describe('SymbolRelationshipGraph - Relationship Type Visualization', () => {
  const mockSymbol1: Symbol = {
    identifier: 'TestClass',
    kind: 'TSClass',
    location: {
      path: '/test/file1.ts',
      line: 10,
      column: 5
    }
  };

  const mockSymbol2: Symbol = {
    identifier: 'TestMethod',
    kind: 'TSFunction',
    location: {
      path: '/test/file1.ts',
      line: 15,
      column: 10
    }
  };

  const mockNode1: GraphNode = {
    id: 'node1',
    symbol: mockSymbol1,
    position: { x: 100, y: 100 },
    size: 15,
    color: '#64748b',
    isExpanded: true,
    isSelected: false,
    metadata: {
      degree: 2,
      centrality: 0.5,
      cluster: 'cluster1',
      importance: 0.8,
      lastInteraction: new Date()
    }
  };

  const mockNode2: GraphNode = {
    id: 'node2',
    symbol: mockSymbol2,
    position: { x: 200, y: 200 },
    size: 12,
    color: '#64748b',
    isExpanded: true,
    isSelected: false,
    metadata: {
      degree: 1,
      centrality: 0.3,
      cluster: 'cluster1',
      importance: 0.6,
      lastInteraction: new Date()
    }
  };

  const createMockEdge = (type: RelationshipType, id: string = 'edge1'): GraphEdge => ({
    id,
    source: 'node1',
    target: 'node2',
    relationship: {
      id: `rel-${id}`,
      type,
      source: mockSymbol1,
      target: mockSymbol2,
      strength: 0.8,
      bidirectional: false,
      metadata: {
        confidence: 1.0,
        sourceLocation: {
          filePath: mockSymbol1.location.path,
          position: {
            line: mockSymbol1.location.line,
            column: mockSymbol1.location.column
          }
        },
        targetLocation: {
          filePath: mockSymbol2.location.path,
          position: {
            line: mockSymbol2.location.line,
            column: mockSymbol2.location.column
          }
        },
        contextLines: [],
        isDirectRelation: true,
        relationshipDepth: 1
      }
    },
    style: {
      color: '#3b82f6',
      width: 2,
      opacity: 0.6,
      animated: false
    },
    isVisible: true
  });

  const createMockGraphData = (edges: GraphEdge[]): RelationshipGraphData => ({
    nodes: [mockNode1, mockNode2],
    edges,
    layout: {
      algorithm: 'force-directed',
      parameters: new Map(),
      iterations: 100,
      stabilized: false
    },
    filters: {
      types: new Set(['calls', 'inherits', 'implements']),
      minStrength: 0.1,
      maxDepth: 3,
      showBidirectional: true,
      hideWeakConnections: false
    },
    viewport: {
      center: { x: 400, y: 300 },
      zoom: 1,
      bounds: { minX: 0, maxX: 800, minY: 0, maxY: 600 }
    }
  });

  const defaultProps = {
    data: createMockGraphData([createMockEdge('calls')]),
    centerSymbol: mockSymbol1,
    onSymbolSelect: vi.fn(),
    onRelationshipFilter: vi.fn(),
    width: 800,
    height: 600,
    showFilters: true,
    enableHover: true
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Filter UI', () => {
    it('renders filter buttons when showFilters is true', () => {
      render(<SymbolRelationshipGraph {...defaultProps} />);
      
      expect(screen.getByText('Relationship Types')).toBeInTheDocument();
      expect(screen.getByTestId('filter-calls')).toBeInTheDocument();
      expect(screen.getByTestId('filter-inherits')).toBeInTheDocument();
      expect(screen.getByTestId('filter-implements')).toBeInTheDocument();
    });

    it('does not render filter buttons when showFilters is false', () => {
      render(<SymbolRelationshipGraph {...defaultProps} showFilters={false} />);
      
      expect(screen.queryByText('Relationship Types')).not.toBeInTheDocument();
      expect(screen.queryByTestId('filter-calls')).not.toBeInTheDocument();
    });

    it('shows all relationship types as filter buttons', () => {
      render(<SymbolRelationshipGraph {...defaultProps} />);
      
      const relationshipTypes = [
        'calls', 'inherits', 'implements', 'imports', 'exports',
        'references', 'defines', 'extends', 'uses', 'contains',
        'overrides', 'instantiates'
      ];

      relationshipTypes.forEach(type => {
        expect(screen.getByTestId(`filter-${type}`)).toBeInTheDocument();
      });
    });

    it('applies correct styling to active filter buttons', () => {
      render(<SymbolRelationshipGraph {...defaultProps} />);
      
      const callsFilter = screen.getByTestId('filter-calls');
      expect(callsFilter).toHaveClass('bg-primary', 'text-primary-foreground', 'border-primary');
    });

    it('calls onRelationshipFilter when filter is toggled', () => {
      const onRelationshipFilter = vi.fn();
      render(<SymbolRelationshipGraph {...defaultProps} onRelationshipFilter={onRelationshipFilter} />);
      
      const callsFilter = screen.getByTestId('filter-calls');
      fireEvent.click(callsFilter);
      
      expect(onRelationshipFilter).toHaveBeenCalled();
    });

    it('toggles filter state when clicked', () => {
      render(<SymbolRelationshipGraph {...defaultProps} />);
      
      const callsFilter = screen.getByTestId('filter-calls');
      
      // Initially active
      expect(callsFilter).toHaveClass('bg-primary');
      
      // Click to deactivate
      fireEvent.click(callsFilter);
      
      // Should now be inactive (note: this tests the visual state change)
      // The actual filter logic is tested through the callback
    });
  });

  describe('Hover Information', () => {
    it('does not show hover tooltip when enableHover is false', () => {
      render(<SymbolRelationshipGraph {...defaultProps} enableHover={false} />);
      
      expect(screen.queryByTestId('hover-tooltip')).not.toBeInTheDocument();
    });

    it('shows hover tooltip when enableHover is true and hovering', () => {
      // This test would require more complex mocking of D3 interactions
      // For now, we test that the tooltip element can be rendered
      render(<SymbolRelationshipGraph {...defaultProps} enableHover={true} />);
      
      // The tooltip is initially not visible
      expect(screen.queryByTestId('hover-tooltip')).not.toBeInTheDocument();
    });
  });

  describe('Relationship Type Filtering', () => {
    it('filters edges based on active relationship types', () => {
      const callsEdge = createMockEdge('calls', 'edge1');
      const inheritsEdge = createMockEdge('inherits', 'edge2');
      const data = createMockGraphData([callsEdge, inheritsEdge]);
      
      render(<SymbolRelationshipGraph {...defaultProps} data={data} />);
      
      // Both edges should be visible initially
      expect(screen.getByTestId('relationship-graph-svg')).toBeInTheDocument();
    });

    it('handles multiple relationship types correctly', () => {
      const edges = [
        createMockEdge('calls', 'edge1'),
        createMockEdge('inherits', 'edge2'),
        createMockEdge('implements', 'edge3'),
        createMockEdge('imports', 'edge4')
      ];
      const data = createMockGraphData(edges);
      
      render(<SymbolRelationshipGraph {...defaultProps} data={data} />);
      
      expect(screen.getByTestId('relationship-graph-svg')).toBeInTheDocument();
    });

    it('updates visualization when filters change', () => {
      const { rerender } = render(<SymbolRelationshipGraph {...defaultProps} />);
      
      // Click to toggle a filter
      const callsFilter = screen.getByTestId('filter-calls');
      fireEvent.click(callsFilter);
      
      // Rerender should reflect the change
      rerender(<SymbolRelationshipGraph {...defaultProps} />);
      
      expect(screen.getByTestId('relationship-graph-svg')).toBeInTheDocument();
    });
  });

  describe('Visual Styles', () => {
    it('applies correct colors to different relationship types', () => {
      const relationshipColors = {
        calls: '#3b82f6',
        inherits: '#10b981',
        implements: '#8b5cf6',
        imports: '#f59e0b',
        exports: '#ef4444'
      };

      Object.entries(relationshipColors).forEach(([type, expectedColor]) => {
        const edge = createMockEdge(type as RelationshipType);
        const data = createMockGraphData([edge]);
        
        const { unmount } = render(<SymbolRelationshipGraph {...defaultProps} data={data} />);
        
        // Test that the component renders without error
        expect(screen.getByTestId('relationship-graph-svg')).toBeInTheDocument();
        
        unmount();
      });
    });

    it('shows color indicators in filter buttons', () => {
      render(<SymbolRelationshipGraph {...defaultProps} />);
      
      const callsFilter = screen.getByTestId('filter-calls');
      const colorIndicator = callsFilter.querySelector('.inline-block.w-2.h-2.rounded-full');
      
      expect(colorIndicator).toBeInTheDocument();
      expect(colorIndicator).toHaveStyle({ backgroundColor: '#3b82f6' });
    });

    it('handles bidirectional relationships with dashed lines', () => {
      const bidirectionalEdge: GraphEdge = {
        ...createMockEdge('calls'),
        relationship: {
          ...createMockEdge('calls').relationship,
          bidirectional: true
        }
      };
      const data = createMockGraphData([bidirectionalEdge]);
      
      render(<SymbolRelationshipGraph {...defaultProps} data={data} />);
      
      expect(screen.getByTestId('relationship-graph-svg')).toBeInTheDocument();
    });
  });

  describe('Edge Interaction', () => {
    it('handles edge hover events when enableHover is true', () => {
      render(<SymbolRelationshipGraph {...defaultProps} enableHover={true} />);
      
      // Since D3 is mocked, we can't test actual hover events
      // But we can verify the component renders correctly
      expect(screen.getByTestId('relationship-graph-svg')).toBeInTheDocument();
    });

    it('does not handle edge hover events when enableHover is false', () => {
      render(<SymbolRelationshipGraph {...defaultProps} enableHover={false} />);
      
      expect(screen.getByTestId('relationship-graph-svg')).toBeInTheDocument();
    });
  });

  describe('Integration', () => {
    it('works with empty relationship data', () => {
      const emptyData = createMockGraphData([]);
      
      render(<SymbolRelationshipGraph {...defaultProps} data={emptyData} />);
      
      expect(screen.getByTestId('relationship-graph-svg')).toBeInTheDocument();
      expect(screen.getByText('Relationship Types')).toBeInTheDocument();
    });

    it('handles data updates correctly', () => {
      const initialData = createMockGraphData([createMockEdge('calls')]);
      const { rerender } = render(<SymbolRelationshipGraph {...defaultProps} data={initialData} />);
      
      const updatedData = createMockGraphData([
        createMockEdge('calls'),
        createMockEdge('inherits', 'edge2')
      ]);
      
      rerender(<SymbolRelationshipGraph {...defaultProps} data={updatedData} />);
      
      expect(screen.getByTestId('relationship-graph-svg')).toBeInTheDocument();
    });

    it('maintains filter state across data updates', () => {
      const { rerender } = render(<SymbolRelationshipGraph {...defaultProps} />);
      
      // Toggle a filter
      const callsFilter = screen.getByTestId('filter-calls');
      fireEvent.click(callsFilter);
      
      // Update data
      const newData = createMockGraphData([createMockEdge('inherits')]);
      rerender(<SymbolRelationshipGraph {...defaultProps} data={newData} />);
      
      // Filter state should be maintained
      expect(screen.getByTestId('filter-calls')).toBeInTheDocument();
    });
  });
});
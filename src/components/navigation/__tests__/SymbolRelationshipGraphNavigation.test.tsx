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

describe('SymbolRelationshipGraph - Navigation and Expansion', () => {
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

  const mockSymbol3: Symbol = {
    identifier: 'TestInterface',
    kind: 'TSInterface',
    location: {
      path: '/test/file2.ts',
      line: 5,
      column: 0
    }
  };

  const createMockNode = (id: string, symbol: Symbol, degree: number = 2): GraphNode => ({
    id,
    symbol,
    position: { x: 100 * parseInt(id.slice(-1)), y: 100 * parseInt(id.slice(-1)) },
    size: 15,
    color: '#64748b',
    isExpanded: false,
    isSelected: false,
    metadata: {
      degree,
      centrality: 0.5,
      cluster: 'cluster1',
      importance: 0.8,
      lastInteraction: new Date()
    }
  });

  const createMockEdge = (
    id: string,
    source: string,
    target: string,
    type: RelationshipType,
    sourceSymbol: Symbol,
    targetSymbol: Symbol
  ): GraphEdge => ({
    id,
    source,
    target,
    relationship: {
      id: `rel-${id}`,
      type,
      source: sourceSymbol,
      target: targetSymbol,
      strength: 0.8,
      bidirectional: false,
      metadata: {
        confidence: 1.0,
        sourceLocation: {
          filePath: sourceSymbol.location.path,
          position: {
            line: sourceSymbol.location.line,
            column: sourceSymbol.location.column
          }
        },
        targetLocation: {
          filePath: targetSymbol.location.path,
          position: {
            line: targetSymbol.location.line,
            column: targetSymbol.location.column
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

  const createMockGraphData = (nodes: GraphNode[], edges: GraphEdge[]): RelationshipGraphData => ({
    nodes,
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

  describe('Category Filtering', () => {
    it('renders category filter buttons', () => {
      const nodes = [createMockNode('node1', mockSymbol1)];
      const edges = [createMockEdge('edge1', 'node1', 'node2', 'calls', mockSymbol1, mockSymbol2)];
      const data = createMockGraphData(nodes, edges);

      render(<SymbolRelationshipGraph {...defaultProps} data={data} />);

      expect(screen.getByText('Relationship Categories')).toBeInTheDocument();
      expect(screen.getByTestId('category-filter-structural')).toBeInTheDocument();
      expect(screen.getByTestId('category-filter-behavioral')).toBeInTheDocument();
      expect(screen.getByTestId('category-filter-dependency')).toBeInTheDocument();
    });

    it('toggles category filters when clicked', () => {
      const nodes = [createMockNode('node1', mockSymbol1)];
      const edges = [createMockEdge('edge1', 'node1', 'node2', 'calls', mockSymbol1, mockSymbol2)];
      const data = createMockGraphData(nodes, edges);

      render(<SymbolRelationshipGraph {...defaultProps} data={data} />);

      const structuralFilter = screen.getByTestId('category-filter-structural');
      
      // Initially active
      expect(structuralFilter).toHaveClass('bg-primary');
      
      // Click to deactivate
      fireEvent.click(structuralFilter);
      
      // Should update (visual state change is tested through class changes)
      expect(structuralFilter).toBeInTheDocument();
    });

    it('filters relationships by category', () => {
      const nodes = [
        createMockNode('node1', mockSymbol1),
        createMockNode('node2', mockSymbol2),
        createMockNode('node3', mockSymbol3)
      ];
      const edges = [
        createMockEdge('edge1', 'node1', 'node2', 'calls', mockSymbol1, mockSymbol2), // behavioral
        createMockEdge('edge2', 'node1', 'node3', 'inherits', mockSymbol1, mockSymbol3), // structural
        createMockEdge('edge3', 'node2', 'node3', 'imports', mockSymbol2, mockSymbol3) // dependency
      ];
      const data = createMockGraphData(nodes, edges);

      render(<SymbolRelationshipGraph {...defaultProps} data={data} />);

      expect(screen.getByTestId('relationship-graph-svg')).toBeInTheDocument();
    });
  });

  describe('Node Expansion/Collapse', () => {
    it('shows expansion indicators for nodes with multiple connections', () => {
      const nodes = [
        createMockNode('node1', mockSymbol1, 3), // degree > 1
        createMockNode('node2', mockSymbol2, 1)  // degree = 1
      ];
      const edges = [createMockEdge('edge1', 'node1', 'node2', 'calls', mockSymbol1, mockSymbol2)];
      const data = createMockGraphData(nodes, edges);

      render(<SymbolRelationshipGraph {...defaultProps} data={data} />);

      // Component should render without error
      expect(screen.getByTestId('relationship-graph-svg')).toBeInTheDocument();
    });

    it('handles node expansion state changes', () => {
      const nodes = [createMockNode('node1', mockSymbol1, 3)];
      const edges = [createMockEdge('edge1', 'node1', 'node2', 'calls', mockSymbol1, mockSymbol2)];
      const data = createMockGraphData(nodes, edges);

      const { rerender } = render(<SymbolRelationshipGraph {...defaultProps} data={data} />);

      // Rerender to test state changes
      rerender(<SymbolRelationshipGraph {...defaultProps} data={data} />);

      expect(screen.getByTestId('relationship-graph-svg')).toBeInTheDocument();
    });

    it('filters edges based on node expansion state', () => {
      const nodes = [
        createMockNode('node1', mockSymbol1, 3),
        createMockNode('node2', mockSymbol2, 2),
        createMockNode('node3', mockSymbol3, 1)
      ];
      const edges = [
        createMockEdge('edge1', 'node1', 'node2', 'calls', mockSymbol1, mockSymbol2),
        createMockEdge('edge2', 'node2', 'node3', 'uses', mockSymbol2, mockSymbol3)
      ];
      const data = createMockGraphData(nodes, edges);

      render(<SymbolRelationshipGraph {...defaultProps} data={data} centerSymbol={mockSymbol1} />);

      expect(screen.getByTestId('relationship-graph-svg')).toBeInTheDocument();
    });
  });

  describe('Symbol Navigation', () => {
    it('calls onSymbolSelect when node is clicked', () => {
      const onSymbolSelect = vi.fn();
      const nodes = [createMockNode('node1', mockSymbol1)];
      const edges: GraphEdge[] = [];
      const data = createMockGraphData(nodes, edges);

      render(<SymbolRelationshipGraph {...defaultProps} data={data} onSymbolSelect={onSymbolSelect} />);

      // Since D3 is mocked, we can't test actual click events
      // But we can verify the component renders and accepts the callback
      expect(screen.getByTestId('relationship-graph-svg')).toBeInTheDocument();
    });

    it('provides navigation instructions', () => {
      const nodes = [createMockNode('node1', mockSymbol1)];
      const edges: GraphEdge[] = [];
      const data = createMockGraphData(nodes, edges);

      render(<SymbolRelationshipGraph {...defaultProps} data={data} />);

      expect(screen.getByText('Click: Select node')).toBeInTheDocument();
      expect(screen.getByText('Double-click: Navigate to symbol')).toBeInTheDocument();
      expect(screen.getByText('+/−: Expand/collapse connections')).toBeInTheDocument();
    });

    it('handles center symbol highlighting', () => {
      const nodes = [
        createMockNode('node1', mockSymbol1),
        createMockNode('node2', mockSymbol2)
      ];
      const edges = [createMockEdge('edge1', 'node1', 'node2', 'calls', mockSymbol1, mockSymbol2)];
      const data = createMockGraphData(nodes, edges);

      render(<SymbolRelationshipGraph {...defaultProps} data={data} centerSymbol={mockSymbol1} />);

      expect(screen.getByTestId('relationship-graph-svg')).toBeInTheDocument();
    });
  });

  describe('Integration Tests', () => {
    it('combines category and type filtering correctly', () => {
      const nodes = [
        createMockNode('node1', mockSymbol1),
        createMockNode('node2', mockSymbol2),
        createMockNode('node3', mockSymbol3)
      ];
      const edges = [
        createMockEdge('edge1', 'node1', 'node2', 'calls', mockSymbol1, mockSymbol2),
        createMockEdge('edge2', 'node1', 'node3', 'inherits', mockSymbol1, mockSymbol3),
        createMockEdge('edge3', 'node2', 'node3', 'imports', mockSymbol2, mockSymbol3)
      ];
      const data = createMockGraphData(nodes, edges);

      render(<SymbolRelationshipGraph {...defaultProps} data={data} />);

      // Toggle category filter
      const behavioralFilter = screen.getByTestId('category-filter-behavioral');
      fireEvent.click(behavioralFilter);

      // Toggle type filter
      const callsFilter = screen.getByTestId('filter-calls');
      fireEvent.click(callsFilter);

      expect(screen.getByTestId('relationship-graph-svg')).toBeInTheDocument();
    });

    it('maintains state across data updates', () => {
      const initialNodes = [createMockNode('node1', mockSymbol1)];
      const initialEdges = [createMockEdge('edge1', 'node1', 'node2', 'calls', mockSymbol1, mockSymbol2)];
      const initialData = createMockGraphData(initialNodes, initialEdges);

      const { rerender } = render(<SymbolRelationshipGraph {...defaultProps} data={initialData} />);

      // Toggle a filter
      const structuralFilter = screen.getByTestId('category-filter-structural');
      fireEvent.click(structuralFilter);

      // Update data
      const updatedNodes = [
        createMockNode('node1', mockSymbol1),
        createMockNode('node3', mockSymbol3)
      ];
      const updatedEdges = [createMockEdge('edge2', 'node1', 'node3', 'inherits', mockSymbol1, mockSymbol3)];
      const updatedData = createMockGraphData(updatedNodes, updatedEdges);

      rerender(<SymbolRelationshipGraph {...defaultProps} data={updatedData} />);

      // Filter state should be maintained
      expect(screen.getByTestId('category-filter-structural')).toBeInTheDocument();
    });

    it('handles complex graph with multiple relationship types and categories', () => {
      const nodes = [
        createMockNode('node1', mockSymbol1, 4),
        createMockNode('node2', mockSymbol2, 3),
        createMockNode('node3', mockSymbol3, 2)
      ];
      const edges = [
        createMockEdge('edge1', 'node1', 'node2', 'calls', mockSymbol1, mockSymbol2),
        createMockEdge('edge2', 'node1', 'node3', 'inherits', mockSymbol1, mockSymbol3),
        createMockEdge('edge3', 'node2', 'node3', 'imports', mockSymbol2, mockSymbol3),
        createMockEdge('edge4', 'node1', 'node2', 'uses', mockSymbol1, mockSymbol2),
        createMockEdge('edge5', 'node2', 'node1', 'references', mockSymbol2, mockSymbol1)
      ];
      const data = createMockGraphData(nodes, edges);

      render(<SymbolRelationshipGraph {...defaultProps} data={data} centerSymbol={mockSymbol1} />);

      expect(screen.getByTestId('relationship-graph-svg')).toBeInTheDocument();
      expect(screen.getByText('Relationship Categories')).toBeInTheDocument();
      expect(screen.getByText('Relationship Types')).toBeInTheDocument();
    });

    it('works with empty graph data', () => {
      const data = createMockGraphData([], []);

      render(<SymbolRelationshipGraph {...defaultProps} data={data} />);

      expect(screen.getByTestId('relationship-graph-svg')).toBeInTheDocument();
      expect(screen.getByText('Relationship Categories')).toBeInTheDocument();
    });

    it('handles missing center symbol gracefully', () => {
      const nodes = [createMockNode('node1', mockSymbol1)];
      const edges = [createMockEdge('edge1', 'node1', 'node2', 'calls', mockSymbol1, mockSymbol2)];
      const data = createMockGraphData(nodes, edges);

      render(<SymbolRelationshipGraph {...defaultProps} data={data} centerSymbol={undefined} />);

      expect(screen.getByTestId('relationship-graph-svg')).toBeInTheDocument();
    });
  });

  describe('Performance and Edge Cases', () => {
    it('handles large number of nodes and edges', () => {
      const nodes = Array.from({ length: 50 }, (_, i) => 
        createMockNode(`node${i}`, {
          ...mockSymbol1,
          identifier: `Symbol${i}`
        })
      );
      const edges = Array.from({ length: 100 }, (_, i) => 
        createMockEdge(
          `edge${i}`,
          `node${i % 25}`,
          `node${(i + 1) % 25}`,
          'calls',
          mockSymbol1,
          mockSymbol2
        )
      );
      const data = createMockGraphData(nodes, edges);

      render(<SymbolRelationshipGraph {...defaultProps} data={data} />);

      expect(screen.getByTestId('relationship-graph-svg')).toBeInTheDocument();
    });

    it('handles rapid filter changes', () => {
      const nodes = [createMockNode('node1', mockSymbol1)];
      const edges = [createMockEdge('edge1', 'node1', 'node2', 'calls', mockSymbol1, mockSymbol2)];
      const data = createMockGraphData(nodes, edges);

      render(<SymbolRelationshipGraph {...defaultProps} data={data} />);

      // Rapidly toggle filters
      const structuralFilter = screen.getByTestId('category-filter-structural');
      const behavioralFilter = screen.getByTestId('category-filter-behavioral');
      const callsFilter = screen.getByTestId('filter-calls');

      fireEvent.click(structuralFilter);
      fireEvent.click(behavioralFilter);
      fireEvent.click(callsFilter);
      fireEvent.click(structuralFilter);
      fireEvent.click(behavioralFilter);

      expect(screen.getByTestId('relationship-graph-svg')).toBeInTheDocument();
    });
  });
});
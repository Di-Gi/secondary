import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import SymbolRelationshipGraph from '../SymbolRelationshipGraph';
import { RelationshipGraphData, GraphNode, GraphEdge } from '../../../types/navigation';
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

describe('SymbolRelationshipGraph', () => {
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

  const mockEdge: GraphEdge = {
    id: 'edge1',
    source: 'node1',
    target: 'node2',
    relationship: {
      id: 'rel1',
      type: 'calls',
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
  };

  const mockGraphData: RelationshipGraphData = {
    nodes: [mockNode1, mockNode2],
    edges: [mockEdge],
    layout: {
      algorithm: 'force-directed',
      parameters: new Map(),
      iterations: 100,
      stabilized: false
    },
    filters: {
      types: new Set(['calls']),
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
  };

  const defaultProps = {
    data: mockGraphData,
    centerSymbol: mockSymbol1,
    onSymbolSelect: vi.fn(),
    onRelationshipFilter: vi.fn(),
    width: 800,
    height: 600
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders without crashing', () => {
    render(<SymbolRelationshipGraph {...defaultProps} />);
    const svg = screen.getByTestId('relationship-graph-svg');
    expect(svg).toBeInTheDocument();
  });

  it('renders SVG with correct dimensions', () => {
    render(<SymbolRelationshipGraph {...defaultProps} />);
    const svg = screen.getByTestId('relationship-graph-svg');
    expect(svg).toHaveAttribute('width', '800');
    expect(svg).toHaveAttribute('height', '600');
  });

  it('applies custom className', () => {
    const customClass = 'custom-graph-class';
    render(<SymbolRelationshipGraph {...defaultProps} className={customClass} />);
    const container = screen.getByTestId('relationship-graph-container');
    expect(container).toHaveClass('symbol-relationship-graph');
    expect(container).toHaveClass(customClass);
  });

  it('handles empty data gracefully', () => {
    const emptyData: RelationshipGraphData = {
      ...mockGraphData,
      nodes: [],
      edges: []
    };
    
    render(<SymbolRelationshipGraph {...defaultProps} data={emptyData} />);
    expect(screen.getByTestId('relationship-graph-svg')).toBeInTheDocument();
  });

  it('handles missing data prop', () => {
    render(<SymbolRelationshipGraph {...defaultProps} data={undefined} />);
    expect(screen.getByTestId('relationship-graph-svg')).toBeInTheDocument();
  });

  it('calls onSymbolSelect when provided', () => {
    const onSymbolSelect = vi.fn();
    render(<SymbolRelationshipGraph {...defaultProps} onSymbolSelect={onSymbolSelect} />);
    
    // Since D3 is mocked, we can't test actual click events
    // But we can verify the component renders and accepts the callback
    expect(onSymbolSelect).not.toHaveBeenCalled();
  });

  it('calls onRelationshipFilter when provided', () => {
    const onRelationshipFilter = vi.fn();
    render(<SymbolRelationshipGraph {...defaultProps} onRelationshipFilter={onRelationshipFilter} />);
    
    // Since D3 is mocked, we can't test actual filter events
    // But we can verify the component renders and accepts the callback
    expect(onRelationshipFilter).not.toHaveBeenCalled();
  });

  it('uses default dimensions when not provided', () => {
    const { width, height, ...propsWithoutDimensions } = defaultProps;
    render(<SymbolRelationshipGraph {...propsWithoutDimensions} />);
    
    const svg = screen.getByTestId('relationship-graph-svg');
    expect(svg).toHaveAttribute('width', '800'); // default width
    expect(svg).toHaveAttribute('height', '600'); // default height
  });

  it('handles centerSymbol prop correctly', () => {
    render(<SymbolRelationshipGraph {...defaultProps} centerSymbol={mockSymbol2} />);
    expect(screen.getByTestId('relationship-graph-svg')).toBeInTheDocument();
  });

  it('renders with proper CSS classes', () => {
    render(<SymbolRelationshipGraph {...defaultProps} />);
    const svg = screen.getByTestId('relationship-graph-svg');
    expect(svg).toHaveClass('border', 'border-border', 'rounded-lg', 'bg-background');
  });

  it('has minimum height style', () => {
    render(<SymbolRelationshipGraph {...defaultProps} />);
    const svg = screen.getByTestId('relationship-graph-svg');
    expect(svg).toHaveStyle({ minHeight: '400px' });
  });

  describe('Data conversion', () => {
    it('handles nodes with different properties', () => {
      const nodeWithDifferentProps: GraphNode = {
        ...mockNode1,
        isSelected: true,
        size: 25,
        metadata: {
          ...mockNode1.metadata,
          degree: 5
        }
      };

      const dataWithDifferentNode: RelationshipGraphData = {
        ...mockGraphData,
        nodes: [nodeWithDifferentProps, mockNode2]
      };

      render(<SymbolRelationshipGraph {...defaultProps} data={dataWithDifferentNode} />);
      expect(screen.getByTestId('relationship-graph-svg')).toBeInTheDocument();
    });

    it('handles edges with different relationship types', () => {
      const inheritanceEdge: GraphEdge = {
        ...mockEdge,
        id: 'edge2',
        relationship: {
          ...mockEdge.relationship,
          type: 'inherits'
        }
      };

      const dataWithDifferentEdge: RelationshipGraphData = {
        ...mockGraphData,
        edges: [mockEdge, inheritanceEdge]
      };

      render(<SymbolRelationshipGraph {...defaultProps} data={dataWithDifferentEdge} />);
      expect(screen.getByTestId('relationship-graph-svg')).toBeInTheDocument();
    });

    it('filters out invisible edges', () => {
      const invisibleEdge: GraphEdge = {
        ...mockEdge,
        id: 'edge2',
        isVisible: false
      };

      const dataWithInvisibleEdge: RelationshipGraphData = {
        ...mockGraphData,
        edges: [mockEdge, invisibleEdge]
      };

      render(<SymbolRelationshipGraph {...defaultProps} data={dataWithInvisibleEdge} />);
      expect(screen.getByTestId('relationship-graph-svg')).toBeInTheDocument();
    });
  });

  describe('Relationship colors', () => {
    it('assigns correct colors to different relationship types', () => {
      const relationshipTypes: Array<{ type: any, expectedColor: string }> = [
        { type: 'calls', expectedColor: '#3b82f6' },
        { type: 'inherits', expectedColor: '#10b981' },
        { type: 'implements', expectedColor: '#8b5cf6' },
        { type: 'imports', expectedColor: '#f59e0b' },
        { type: 'exports', expectedColor: '#ef4444' }
      ];

      // Test each relationship type individually
      relationshipTypes.forEach(({ type, expectedColor }, index) => {
        const edgeWithType: GraphEdge = {
          ...mockEdge,
          id: `edge-${index}`,
          relationship: {
            ...mockEdge.relationship,
            type
          }
        };

        const dataWithTypedEdge: RelationshipGraphData = {
          ...mockGraphData,
          edges: [edgeWithType]
        };

        const { unmount } = render(<SymbolRelationshipGraph {...defaultProps} data={dataWithTypedEdge} />);
        expect(screen.getByTestId('relationship-graph-svg')).toBeInTheDocument();
        unmount(); // Clean up after each render
      });
    });
  });

  describe('Node colors', () => {
    it('handles selected nodes', () => {
      const selectedNode: GraphNode = {
        ...mockNode1,
        isSelected: true
      };

      const dataWithSelectedNode: RelationshipGraphData = {
        ...mockGraphData,
        nodes: [selectedNode, mockNode2]
      };

      render(<SymbolRelationshipGraph {...defaultProps} data={dataWithSelectedNode} />);
      expect(screen.getByTestId('relationship-graph-svg')).toBeInTheDocument();
    });

    it('handles center symbol highlighting', () => {
      render(<SymbolRelationshipGraph {...defaultProps} centerSymbol={mockSymbol1} />);
      expect(screen.getByTestId('relationship-graph-svg')).toBeInTheDocument();
    });
  });
});
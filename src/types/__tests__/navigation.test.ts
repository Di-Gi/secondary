import { describe, it, expect } from 'vitest';
import {
  validateNavigationLocation,
  validateNavigationSession,
  validateSymbol,
  validateRelationship,
  createNavigationLocation,
  createNavigationSession,
  createRelationship,
  NavigationLocation,
  NavigationSession,
  NavigationContext,
  Position,
  Symbol,
  Relationship,
  RelationshipType
} from '../navigation';

describe('Navigation Data Model Validation', () => {
  describe('validateNavigationLocation', () => {
    const validContext: NavigationContext = {
      projectPath: '/test/project',
      breadcrumbs: [],
      relatedSymbols: []
    };

    const validPosition: Position = {
      line: 10,
      column: 5
    };

    it('should validate a correct NavigationLocation', () => {
      const location: NavigationLocation = {
        id: 'test-location-1',
        filePath: '/test/file.ts',
        position: validPosition,
        context: validContext,
        timestamp: new Date(),
        metadata: {
          title: 'Test File',
          tags: [],
          visitCount: 1,
          lastAccessed: new Date(),
          isBookmarked: false,
          isFavorite: false
        }
      };

      const result = validateNavigationLocation(location);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject NavigationLocation with missing id', () => {
      const location = {
        filePath: '/test/file.ts',
        position: validPosition,
        context: validContext,
        timestamp: new Date(),
        metadata: {}
      };

      const result = validateNavigationLocation(location);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('NavigationLocation.id must be a non-empty string');
    });

    it('should reject NavigationLocation with invalid position', () => {
      const location = {
        id: 'test-location-1',
        filePath: '/test/file.ts',
        position: { line: -1, column: 5 },
        context: validContext,
        timestamp: new Date(),
        metadata: {}
      };

      const result = validateNavigationLocation(location);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('NavigationLocation.position.line must be a non-negative number');
    });

    it('should reject NavigationLocation with missing required fields', () => {
      const result = validateNavigationLocation(null);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('NavigationLocation is required');
    });
  });

  describe('validateNavigationSession', () => {
    it('should validate a correct NavigationSession', () => {
      const session: NavigationSession = {
        id: 'test-session-1',
        name: 'Test Session',
        locations: [],
        layout: {
          panelSizes: new Map(),
          visiblePanels: [],
          minimapSettings: {
            zoomLevel: 1,
            showSymbolTypes: true,
            showComplexity: false,
            autoUpdate: true,
            renderQuality: 'medium',
            maxFileSize: 1024
          },
          treeSettings: {
            showHiddenFiles: false,
            showGitStatus: true,
            showFileIcons: true,
            sortBy: 'name',
            sortOrder: 'asc',
            virtualScrolling: true,
            previewOnHover: true
          },
          graphSettings: {
            defaultLayout: 'force-directed',
            nodeSize: 20,
            edgeWidth: 2,
            animationSpeed: 1000,
            showLabels: true,
            clusterNodes: false,
            maxNodes: 100
          },
          breadcrumbSettings: {
            maxSegments: 8,
            showFileExtensions: true,
            showSymbolTypes: true,
            truncationStrategy: 'intelligent',
            showTooltips: true
          }
        },
        createdAt: new Date(),
        lastAccessed: new Date(),
        metadata: {
          projectPath: '/test/project',
          totalTimeSpent: 0,
          locationCount: 0,
          tags: [],
          isShared: false,
          version: 1
        }
      };

      const result = validateNavigationSession(session);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject NavigationSession with missing name', () => {
      const session = {
        id: 'test-session-1',
        locations: [],
        layout: {},
        createdAt: new Date(),
        lastAccessed: new Date(),
        metadata: {}
      };

      const result = validateNavigationSession(session);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('NavigationSession.name must be a non-empty string');
    });

    it('should reject NavigationSession with invalid locations array', () => {
      const session = {
        id: 'test-session-1',
        name: 'Test Session',
        locations: 'not-an-array',
        layout: {},
        createdAt: new Date(),
        lastAccessed: new Date(),
        metadata: {}
      };

      const result = validateNavigationSession(session);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('NavigationSession.locations must be an array');
    });
  });

  describe('validateSymbol', () => {
    it('should validate a correct Symbol', () => {
      const symbol: Symbol = {
        identifier: 'testFunction',
        kind: 'Function',
        location: {
          path: '/test/file.ts',
          line: 10,
          column: 5
        }
      };

      const result = validateSymbol(symbol);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject Symbol with invalid kind', () => {
      const symbol = {
        identifier: 'testFunction',
        kind: 'InvalidKind',
        location: {
          path: '/test/file.ts',
          line: 10,
          column: 5
        }
      };

      const result = validateSymbol(symbol);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('Symbol.kind must be one of'))).toBe(true);
    });

    it('should reject Symbol with missing location', () => {
      const symbol = {
        identifier: 'testFunction',
        kind: 'Function'
      };

      const result = validateSymbol(symbol);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Symbol.location is required');
    });

    it('should reject Symbol with invalid location coordinates', () => {
      const symbol = {
        identifier: 'testFunction',
        kind: 'Function',
        location: {
          path: '/test/file.ts',
          line: -1,
          column: 5
        }
      };

      const result = validateSymbol(symbol);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Symbol.location.line must be a non-negative number');
    });
  });

  describe('validateRelationship', () => {
    const sourceSymbol: Symbol = {
      identifier: 'sourceFunction',
      kind: 'Function',
      location: { path: '/test/source.ts', line: 10, column: 5 }
    };

    const targetSymbol: Symbol = {
      identifier: 'targetFunction',
      kind: 'Function',
      location: { path: '/test/target.ts', line: 20, column: 10 }
    };

    it('should validate a correct Relationship', () => {
      const relationship: Relationship = {
        id: 'test-relationship-1',
        type: 'calls',
        source: sourceSymbol,
        target: targetSymbol,
        strength: 0.8,
        bidirectional: false,
        metadata: {
          confidence: 1.0,
          sourceLocation: {
            filePath: sourceSymbol.location.path,
            position: { line: sourceSymbol.location.line, column: sourceSymbol.location.column }
          },
          targetLocation: {
            filePath: targetSymbol.location.path,
            position: { line: targetSymbol.location.line, column: targetSymbol.location.column }
          },
          contextLines: [],
          isDirectRelation: true,
          relationshipDepth: 1
        }
      };

      const result = validateRelationship(relationship);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject Relationship with invalid type', () => {
      const relationship = {
        id: 'test-relationship-1',
        type: 'invalid-type',
        source: sourceSymbol,
        target: targetSymbol,
        strength: 0.8,
        bidirectional: false,
        metadata: {}
      };

      const result = validateRelationship(relationship);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('Relationship.type must be one of'))).toBe(true);
    });

    it('should reject Relationship with invalid strength', () => {
      const relationship = {
        id: 'test-relationship-1',
        type: 'calls',
        source: sourceSymbol,
        target: targetSymbol,
        strength: 1.5,
        bidirectional: false,
        metadata: {}
      };

      const result = validateRelationship(relationship);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Relationship.strength must be a number between 0 and 1');
    });

    it('should reject Relationship with invalid source symbol', () => {
      const relationship = {
        id: 'test-relationship-1',
        type: 'calls',
        source: { identifier: '', kind: 'InvalidKind' },
        target: targetSymbol,
        strength: 0.8,
        bidirectional: false,
        metadata: {}
      };

      const result = validateRelationship(relationship);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('Relationship.source'))).toBe(true);
    });
  });

  describe('Factory Functions', () => {
    describe('createNavigationLocation', () => {
      it('should create a valid NavigationLocation', () => {
        const context: NavigationContext = {
          projectPath: '/test/project',
          breadcrumbs: [],
          relatedSymbols: []
        };

        const position: Position = { line: 10, column: 5 };
        const location = createNavigationLocation('/test/file.ts', position, context);

        expect(location.id).toBeDefined();
        expect(location.filePath).toBe('/test/file.ts');
        expect(location.position).toEqual(position);
        expect(location.context).toEqual(context);
        expect(location.timestamp).toBeInstanceOf(Date);
        expect(location.metadata.title).toBe('file.ts');
        expect(location.metadata.visitCount).toBe(1);

        const validation = validateNavigationLocation(location);
        expect(validation.isValid).toBe(true);
      });

      it('should create NavigationLocation with custom metadata', () => {
        const context: NavigationContext = {
          projectPath: '/test/project',
          breadcrumbs: [],
          relatedSymbols: []
        };

        const position: Position = { line: 10, column: 5 };
        const customMetadata = {
          title: 'Custom Title',
          isBookmarked: true,
          tags: ['important']
        };

        const location = createNavigationLocation('/test/file.ts', position, context, customMetadata);

        expect(location.metadata.title).toBe('Custom Title');
        expect(location.metadata.isBookmarked).toBe(true);
        expect(location.metadata.tags).toEqual(['important']);
      });
    });

    describe('createNavigationSession', () => {
      it('should create a valid NavigationSession', () => {
        const session = createNavigationSession('Test Session', '/test/project', 'Test description');

        expect(session.id).toBeDefined();
        expect(session.name).toBe('Test Session');
        expect(session.description).toBe('Test description');
        expect(session.locations).toEqual([]);
        expect(session.metadata.projectPath).toBe('/test/project');
        expect(session.createdAt).toBeInstanceOf(Date);
        expect(session.lastAccessed).toBeInstanceOf(Date);

        const validation = validateNavigationSession(session);
        expect(validation.isValid).toBe(true);
      });
    });

    describe('createRelationship', () => {
      it('should create a valid Relationship', () => {
        const sourceSymbol: Symbol = {
          identifier: 'sourceFunction',
          kind: 'Function',
          location: { path: '/test/source.ts', line: 10, column: 5 }
        };

        const targetSymbol: Symbol = {
          identifier: 'targetFunction',
          kind: 'Function',
          location: { path: '/test/target.ts', line: 20, column: 10 }
        };

        const relationship = createRelationship('calls', sourceSymbol, targetSymbol, 0.8, true);

        expect(relationship.id).toBeDefined();
        expect(relationship.type).toBe('calls');
        expect(relationship.source).toEqual(sourceSymbol);
        expect(relationship.target).toEqual(targetSymbol);
        expect(relationship.strength).toBe(0.8);
        expect(relationship.bidirectional).toBe(true);
        expect(relationship.metadata.confidence).toBe(1.0);

        const validation = validateRelationship(relationship);
        expect(validation.isValid).toBe(true);
      });

      it('should clamp strength values to valid range', () => {
        const sourceSymbol: Symbol = {
          identifier: 'sourceFunction',
          kind: 'Function',
          location: { path: '/test/source.ts', line: 10, column: 5 }
        };

        const targetSymbol: Symbol = {
          identifier: 'targetFunction',
          kind: 'Function',
          location: { path: '/test/target.ts', line: 20, column: 10 }
        };

        const relationship1 = createRelationship('calls', sourceSymbol, targetSymbol, 1.5);
        expect(relationship1.strength).toBe(1.0);

        const relationship2 = createRelationship('calls', sourceSymbol, targetSymbol, -0.5);
        expect(relationship2.strength).toBe(0.0);
      });
    });
  });
});
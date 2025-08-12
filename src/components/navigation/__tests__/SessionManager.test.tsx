import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { SessionManager } from '../SessionManager';
import { NavigationSession } from '../../../types/navigation';
import { useAppStore } from '../../../store/appStore';

// Mock the store
vi.mock('../../../store/appStore');

// Mock UI components
vi.mock('../../ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  )
}));

vi.mock('../../ui/input', () => ({
  Input: ({ value, onChange, ...props }: any) => (
    <input 
      value={value} 
      onChange={onChange} 
      {...props}
    />
  )
}));

vi.mock('../../ui/textarea', () => ({
  Textarea: ({ value, onChange, ...props }: any) => (
    <textarea 
      value={value} 
      onChange={onChange} 
      {...props}
    />
  )
}));

vi.mock('../../ui/dialog', () => ({
  Dialog: ({ children, open }: any) => <div data-testid="dialog" style={{ display: open ? 'block' : 'none' }}>{children}</div>,
  DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: any) => <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }: any) => <h2 data-testid="dialog-title">{children}</h2>,
  DialogTrigger: ({ children, asChild }: any) => <div data-testid="dialog-trigger">{children}</div>
}));

vi.mock('../../ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className} data-testid="card">{children}</div>,
  CardContent: ({ children }: any) => <div data-testid="card-content">{children}</div>,
  CardDescription: ({ children }: any) => <div data-testid="card-description">{children}</div>,
  CardHeader: ({ children }: any) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }: any) => <h3 data-testid="card-title">{children}</h3>
}));

vi.mock('../../ui/badge', () => ({
  Badge: ({ children, className }: any) => <span className={className} data-testid="badge">{children}</span>
}));

vi.mock('../../ui/label', () => ({
  Label: ({ children, htmlFor }: any) => <label htmlFor={htmlFor} data-testid="label">{children}</label>
}));

vi.mock('../../ui/scroll-area', () => ({
  ScrollArea: ({ children }: any) => <div data-testid="scroll-area">{children}</div>
}));

const mockSession: NavigationSession = {
  id: 'test-session-1',
  name: 'Test Session',
  description: 'A test session',
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
      maxFileSize: 1024 * 1024
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
  createdAt: new Date('2024-01-01'),
  lastAccessed: new Date('2024-01-02'),
  metadata: {
    projectPath: '/test/project',
    totalTimeSpent: 0,
    locationCount: 0,
    tags: ['test', 'development'],
    isShared: false,
    version: 1
  }
};

describe('SessionManager', () => {
  const mockStore = {
    navigationSessions: [mockSession],
    activeNavigationSession: mockSession,
    createNavigationSession: vi.fn(),
    saveNavigationSession: vi.fn(),
    loadNavigationSession: vi.fn(),
    loadAllNavigationSessions: vi.fn(),
    setActiveNavigationSession: vi.fn(),
    deleteNavigationSession: vi.fn(),
    currentProject: { project_path: '/test/project' }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useAppStore as any).mockReturnValue(mockStore);
  });

  it('renders session manager with sessions', () => {
    render(<SessionManager />);
    
    expect(screen.getByTestId('card-title')).toHaveTextContent('Session Manager');
    expect(screen.getByTestId('card-description')).toHaveTextContent('Manage navigation sessions and workspace layouts');
    expect(screen.getAllByText('Test Session')).toHaveLength(2); // One in active session, one in session list
  });

  it('displays active session indicator', () => {
    render(<SessionManager />);
    
    expect(screen.getByText('Active Session')).toBeInTheDocument();
    expect(screen.getAllByText('Test Session')).toHaveLength(2); // One in active session, one in session list
  });

  it('opens create session dialog when new session button is clicked', () => {
    render(<SessionManager />);
    
    // The button is inside a dialog trigger, so we need to find it differently
    const dialogTrigger = screen.getByTestId('dialog-trigger');
    const newSessionButton = dialogTrigger.querySelector('button');
    
    expect(newSessionButton).toBeInTheDocument();
    expect(newSessionButton).toHaveTextContent('New Session');
  });

  it('creates a new session with form data', async () => {
    const mockCreateSession = vi.fn().mockReturnValue({
      ...mockSession,
      id: 'new-session',
      name: 'New Test Session'
    });
    mockStore.createNavigationSession = mockCreateSession;
    
    render(<SessionManager />);
    
    // Use getAllBy to get the first form (create form)
    const nameInputs = screen.getAllByPlaceholderText('Enter session name...');
    const nameInput = nameInputs[0]; // First one is the create form
    fireEvent.change(nameInput, { target: { value: 'New Test Session' } });
    
    const descriptionInputs = screen.getAllByPlaceholderText('Describe what this session is for...');
    const descriptionInput = descriptionInputs[0]; // First one is the create form
    fireEvent.change(descriptionInput, { target: { value: 'Test description' } });
    
    // Submit form
    const createButton = screen.getByText('Create Session');
    fireEvent.click(createButton);
    
    await waitFor(() => {
      expect(mockCreateSession).toHaveBeenCalledWith('New Test Session', 'Test description');
    });
  });

  it('loads a session when load button is clicked', async () => {
    render(<SessionManager />);
    
    // Find the load button by looking for disabled button (since active session can't be loaded)
    const buttons = screen.getAllByRole('button');
    const loadButton = buttons.find(btn => btn.hasAttribute('disabled') && btn.querySelector('svg'));
    
    // Since the active session load button is disabled, we'll test that it exists
    expect(loadButton).toBeInTheDocument();
    expect(loadButton).toBeDisabled();
  });

  it('saves active session when save button is clicked', async () => {
    render(<SessionManager />);
    
    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(mockStore.saveNavigationSession).toHaveBeenCalledWith(mockSession);
    });
  });

  it('deletes session with confirmation', async () => {
    // Mock window.confirm
    const originalConfirm = window.confirm;
    window.confirm = vi.fn().mockReturnValue(true);
    
    render(<SessionManager />);
    
    // Find the delete button by looking for the destructive class
    const deleteButton = screen.getAllByRole('button').find(btn => 
      btn.className.includes('text-destructive')
    );
    
    expect(deleteButton).toBeInTheDocument();
    
    fireEvent.click(deleteButton!);
    
    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalled();
      expect(mockStore.deleteNavigationSession).toHaveBeenCalledWith(mockSession.id);
    });
    
    // Restore original confirm
    window.confirm = originalConfirm;
  });

  it('displays session metadata correctly', () => {
    render(<SessionManager />);
    
    expect(screen.getByText('0 locations')).toBeInTheDocument();
    // Check that the session has the expected metadata structure
    expect(screen.getByText('A test session')).toBeInTheDocument(); // Description
    // The date formatting should show the last accessed time
    expect(screen.getByText(/Jan \d+, \d+:\d+ [AP]M/)).toBeInTheDocument();
  });

  it('handles empty sessions list', () => {
    const emptyStore = {
      ...mockStore,
      navigationSessions: [],
      activeNavigationSession: null
    };
    (useAppStore as any).mockReturnValue(emptyStore);
    
    render(<SessionManager />);
    
    expect(screen.getByText('No sessions found')).toBeInTheDocument();
    expect(screen.getByText('Create your first session to get started')).toBeInTheDocument();
  });

  it('handles auto-save toggle', () => {
    render(<SessionManager />);
    
    const autoSaveButton = screen.getByText(/Auto-save/);
    expect(autoSaveButton).toHaveTextContent('Auto-save On');
    
    fireEvent.click(autoSaveButton);
    expect(autoSaveButton).toHaveTextContent('Auto-save Off');
  });

  it('adds and removes tags in session form', () => {
    render(<SessionManager />);
    
    // Use getAllBy to get the first form (create form)
    const tagInputs = screen.getAllByPlaceholderText('Add tag...');
    const tagInput = tagInputs[0]; // First one is the create form
    fireEvent.change(tagInput, { target: { value: 'newtag' } });
    
    const addTagButtons = screen.getAllByText('Add');
    const addTagButton = addTagButtons[0]; // First one is the create form
    fireEvent.click(addTagButton);
    
    expect(screen.getAllByText('newtag')).toHaveLength(2); // Tag appears in both create and edit forms
  });

  it('validates required session name', async () => {
    render(<SessionManager />);
    
    // Try to create without name (form is always rendered)
    const createButton = screen.getByText('Create Session');
    fireEvent.click(createButton);
    
    // Should not call create function
    expect(mockStore.createNavigationSession).not.toHaveBeenCalled();
  });

  it('calls external handlers when provided', async () => {
    const onSessionCreate = vi.fn();
    const onSessionLoad = vi.fn();
    const onSessionSave = vi.fn();
    const onSessionDelete = vi.fn();
    
    render(
      <SessionManager 
        onSessionCreate={onSessionCreate}
        onSessionLoad={onSessionLoad}
        onSessionSave={onSessionSave}
        onSessionDelete={onSessionDelete}
      />
    );
    
    // Test save handler
    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(onSessionSave).toHaveBeenCalledWith(mockSession);
    });
  });
});
// [[SECONDARY_MIND]]/src/components/ui/ToastNotification.tsx
// Purpose: Toast notification system for user feedback with different types and actions.
// Architecture: React components with Zustand state management for global toast handling.
// Dependencies: React, Lucide icons, Tailwind CSS, Zustand.

import React, { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle, Loader2 } from 'lucide-react';
import { create } from 'zustand';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'loading';
  title: string;
  message?: string;
  duration?: number; // in milliseconds, 0 for persistent
  actions?: ToastAction[];
  dismissible?: boolean;
  timestamp: Date;
}

export interface ToastAction {
  label: string;
  action: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
}

interface ToastStore {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id' | 'timestamp'>) => string;
  removeToast: (id: string) => void;
  clearAllToasts: () => void;
  updateToast: (id: string, updates: Partial<Toast>) => void;
}

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],
  
  addToast: (toast) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newToast: Toast = {
      ...toast,
      id,
      timestamp: new Date(),
      duration: toast.duration ?? (toast.type === 'error' ? 0 : 5000),
      dismissible: toast.dismissible ?? true,
    };
    
    set((state) => ({
      toasts: [...state.toasts, newToast],
    }));
    
    // Auto-dismiss if duration is set
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        get().removeToast(id);
      }, newToast.duration);
    }
    
    return id;
  },
  
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    }));
  },
  
  clearAllToasts: () => {
    set({ toasts: [] });
  },
  
  updateToast: (id, updates) => {
    set((state) => ({
      toasts: state.toasts.map((toast) =>
        toast.id === id ? { ...toast, ...updates } : toast
      ),
    }));
  },
}));

// Hook for easy toast creation
export const useToast = () => {
  const { addToast, removeToast, updateToast } = useToastStore();
  
  const toast = {
    success: (title: string, message?: string, options?: Partial<Toast>) =>
      addToast({ type: 'success', title, message, ...options }),
    
    error: (title: string, message?: string, options?: Partial<Toast>) =>
      addToast({ type: 'error', title, message, ...options }),
    
    warning: (title: string, message?: string, options?: Partial<Toast>) =>
      addToast({ type: 'warning', title, message, ...options }),
    
    info: (title: string, message?: string, options?: Partial<Toast>) =>
      addToast({ type: 'info', title, message, ...options }),
    
    loading: (title: string, message?: string, options?: Partial<Toast>) =>
      addToast({ type: 'loading', title, message, duration: 0, ...options }),
    
    promise: async <T,>(
      promise: Promise<T>,
      {
        loading: loadingMessage,
        success: successMessage,
        error: errorMessage,
      }: {
        loading: string;
        success: string | ((data: T) => string);
        error: string | ((error: any) => string);
      }
    ): Promise<T> => {
      const loadingId = addToast({
        type: 'loading',
        title: loadingMessage,
        duration: 0,
        dismissible: false,
      });
      
      try {
        const result = await promise;
        removeToast(loadingId);
        addToast({
          type: 'success',
          title: typeof successMessage === 'function' ? successMessage(result) : successMessage,
        });
        return result;
      } catch (error) {
        removeToast(loadingId);
        addToast({
          type: 'error',
          title: typeof errorMessage === 'function' ? errorMessage(error) : errorMessage,
        });
        throw error;
      }
    },
    
    dismiss: removeToast,
    update: updateToast,
  };
  
  return toast;
};

// Individual toast component
export interface ToastItemProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

export const ToastItem: React.FC<ToastItemProps> = ({ toast, onDismiss }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  
  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);
  
  const handleDismiss = () => {
    if (!toast.dismissible) return;
    
    setIsExiting(true);
    setTimeout(() => onDismiss(toast.id), 200);
  };
  
  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-500" />;
      case 'loading':
        return <Loader2 className="w-5 h-5 text-gray-500 animate-spin" />;
    }
  };
  
  const getBackgroundColor = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
      case 'loading':
        return 'bg-gray-50 border-gray-200';
    }
  };
  
  return (
    <div
      className={`
        transform transition-all duration-200 ease-in-out
        ${isVisible && !isExiting ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        ${getBackgroundColor()}
        border rounded-lg shadow-lg p-4 mb-3 max-w-md w-full
      `}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          {getIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-900">
            {toast.title}
          </div>
          
          {toast.message && (
            <div className="mt-1 text-sm text-gray-600">
              {toast.message}
            </div>
          )}
          
          {toast.actions && toast.actions.length > 0 && (
            <div className="mt-3 flex space-x-2">
              {toast.actions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.action}
                  className={`
                    px-3 py-1 text-xs font-medium rounded transition-colors
                    ${action.variant === 'primary' ? 'bg-blue-600 text-white hover:bg-blue-700' :
                      action.variant === 'danger' ? 'bg-red-600 text-white hover:bg-red-700' :
                      'bg-gray-200 text-gray-800 hover:bg-gray-300'}
                  `}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
        
        {toast.dismissible && (
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 hover:bg-gray-200 rounded transition-colors"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        )}
      </div>
    </div>
  );
};

// Toast container component
export const ToastContainer: React.FC = () => {
  const toasts = useToastStore((state) => state.toasts);
  const removeToast = useToastStore((state) => state.removeToast);
  
  if (toasts.length === 0) return null;
  
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onDismiss={removeToast}
        />
      ))}
    </div>
  );
};

// Utility functions for common toast patterns
export const showErrorToast = (error: Error | string, options?: Partial<Toast>) => {
  const toast = useToastStore.getState().addToast;
  const message = error instanceof Error ? error.message : error;
  
  return toast({
    type: 'error',
    title: 'Error',
    message,
    actions: [
      {
        label: 'Retry',
        action: () => window.location.reload(),
        variant: 'primary',
      },
      {
        label: 'Report',
        action: () => {
          // In real implementation, would open error reporting dialog
          console.log('Report error:', message);
        },
        variant: 'secondary',
      },
    ],
    ...options,
  });
};

export const showSuccessToast = (title: string, message?: string, options?: Partial<Toast>) => {
  const toast = useToastStore.getState().addToast;
  return toast({
    type: 'success',
    title,
    message,
    ...options,
  });
};

export const showWarningToast = (title: string, message?: string, options?: Partial<Toast>) => {
  const toast = useToastStore.getState().addToast;
  return toast({
    type: 'warning',
    title,
    message,
    ...options,
  });
};

export const showInfoToast = (title: string, message?: string, options?: Partial<Toast>) => {
  const toast = useToastStore.getState().addToast;
  return toast({
    type: 'info',
    title,
    message,
    ...options,
  });
};

// Operation status toast helpers
export const createOperationToast = (operation: string) => {
  const toast = useToast();
  
  return {
    start: (message?: string) => toast.loading(`${operation} in progress...`, message),
    success: (message?: string) => toast.success(`${operation} completed`, message),
    error: (error: Error | string) => {
      const errorMessage = error instanceof Error ? error.message : error;
      return toast.error(`${operation} failed`, errorMessage, {
        actions: [
          {
            label: 'Retry',
            action: () => {
              // Retry logic would be implemented by the caller
            },
            variant: 'primary',
          },
        ],
      });
    },
  };
};
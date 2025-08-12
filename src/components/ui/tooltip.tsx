// Tooltip Component
// Purpose: Provides tooltip functionality for UI elements
// Architecture: Simple tooltip implementation using CSS and React

import * as React from "react";
import { cn } from "../../lib/utils";

export interface TooltipProps {
  children: React.ReactNode;
}

export interface TooltipContentProps {
  children: React.ReactNode;
  className?: string;
}

export interface TooltipTriggerProps {
  children: React.ReactNode;
  asChild?: boolean;
}

export interface TooltipProviderProps {
  children: React.ReactNode;
}

// Simple tooltip context
const TooltipContext = React.createContext<{
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}>({
  isOpen: false,
  setIsOpen: () => {}
});

export function TooltipProvider({ children }: TooltipProviderProps) {
  return <div>{children}</div>;
}

export function Tooltip({ children }: TooltipProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <TooltipContext.Provider value={{ isOpen, setIsOpen }}>
      <div className="relative inline-block">
        {children}
      </div>
    </TooltipContext.Provider>
  );
}

export function TooltipTrigger({ children, asChild = false }: TooltipTriggerProps) {
  const { setIsOpen } = React.useContext(TooltipContext);

  const handleMouseEnter = () => setIsOpen(true);
  const handleMouseLeave = () => setIsOpen(false);

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
      ...children.props
    });
  }

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </div>
  );
}

export function TooltipContent({ children, className }: TooltipContentProps) {
  const { isOpen } = React.useContext(TooltipContext);

  if (!isOpen) return null;

  return (
    <div
      className={cn(
        "absolute z-50 px-2 py-1 text-xs text-white bg-gray-900 rounded shadow-lg",
        "bottom-full left-1/2 transform -translate-x-1/2 mb-1",
        "before:content-[''] before:absolute before:top-full before:left-1/2",
        "before:transform before:-translate-x-1/2 before:border-4",
        "before:border-transparent before:border-t-gray-900",
        className
      )}
    >
      {children}
    </div>
  );
}
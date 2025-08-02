// [[SECONDARY_MIND_DESKTOP]]/src/components/ui/loading-spinner.tsx
// Purpose: Reusable loading spinner component for indicating loading states throughout the application.
// Architecture: Simple, flexible spinner component with size variants and consistent styling.
// Dependencies: React, class-variance-authority for size variants, Lucide React for icon.

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"
import { cn } from "../../lib/utils"

const spinnerVariants = cva(
  "animate-spin",
  {
    variants: {
      size: {
        sm: "h-4 w-4",
        default: "h-6 w-6",
        lg: "h-8 w-8",
        xl: "h-12 w-12",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

export interface LoadingSpinnerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof spinnerVariants> {}

const LoadingSpinner = React.forwardRef<HTMLDivElement, LoadingSpinnerProps>(
  ({ className, size, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("flex items-center justify-center", className)}
        {...props}
      >
        <Loader2 className={cn(spinnerVariants({ size }))} />
      </div>
    )
  }
)
LoadingSpinner.displayName = "LoadingSpinner"

export { LoadingSpinner, spinnerVariants }

// Integration: Used in loading states throughout the application, particularly in the main App component and chat interface.
// Notes: Provides consistent loading indication with multiple size options for different contexts.
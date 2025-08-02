// [[SECONDARY_MIND_DESKTOP]]/src/components/ui/input.tsx
// Purpose: Reusable input component with consistent styling and proper TypeScript typing.
// Architecture: shadcn/ui-style input component that maintains design system consistency.
// Dependencies: React, clsx, tailwind-merge for utility class management.

import * as React from "react"
import { cn } from "../../lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }

// Integration: Used in search fields, chat input, and form components throughout the application.
// Notes: Consistent with design system and includes proper focus states and accessibility features.
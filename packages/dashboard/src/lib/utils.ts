import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// Export ClassValue type for consumers
export type { ClassValue }

/**
 * Combines class names using clsx and tailwind-merge.
 * 
 * This utility function merges class names intelligently by:
 * 1. Using clsx to handle conditional classes and various input formats
 * 2. Using tailwind-merge to resolve Tailwind CSS class conflicts
 * 
 * @param inputs - Class values that can be strings, objects, arrays, or conditional expressions
 * @returns A string of merged and deduplicated class names
 * 
 * @example
 * ```typescript
 * cn("px-4 py-2", "bg-blue-500", { "text-white": true })
 * // Returns: "px-4 py-2 bg-blue-500 text-white"
 * 
 * cn("p-4", "px-6") // Tailwind conflict resolution
 * // Returns: "py-4 px-6" (px-6 overrides px-4)
 * ```
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

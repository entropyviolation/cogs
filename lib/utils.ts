/**
 * lib/utils.ts — Misc UI utilities
 *
 * `cn()` merges Tailwind class names (clsx + tailwind-merge), resolving
 * conflicting utilities. Used by virtually every shadcn/ui component.
 */
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

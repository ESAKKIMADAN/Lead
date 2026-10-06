import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function parseTaskDate(val?: string | null): Date | null {
  if (!val) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(val)) {
    const parts = val.split('T')[0].split('-').map(Number);
    if (parts.length === 3 && !parts.some(isNaN)) {
      return new Date(parts[0], parts[1] - 1, parts[2]);
    }
  }
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}


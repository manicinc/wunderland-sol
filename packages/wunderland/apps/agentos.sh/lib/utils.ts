import { type ClassValue, clsx } from 'clsx';

/**
 * Merge class names efficiently
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}


import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * A robust function to convert various date formats into a JavaScript Date object.
 * Handles Firestore Timestamps (both live and serialized), ISO strings, and existing Date objects.
 * @param date The value to convert.
 * @returns A Date object or null if the conversion fails.
 */
export const toDate = (date: any): Date | null => {
  if (!date) return null;

  // Case 1: Firestore Timestamp object (live)
  if (typeof date.toDate === 'function') {
    return date.toDate();
  }

  // Case 2: Already a Date object
  if (date instanceof Date) {
    return !isNaN(date.getTime()) ? date : null;
  }

  // Case 3: Serialized Firestore Timestamp from SSR/database export
  if (typeof date === 'object' && typeof date.seconds === 'number' && typeof date.nanoseconds === 'number') {
    return new Date(date.seconds * 1000 + date.nanoseconds / 1000000);
  }
  
  // Case 4: ISO date string or number (milliseconds)
  if (typeof date === 'string' || typeof date === 'number') {
    const d = new Date(date);
    return !isNaN(d.getTime()) ? d : null;
  }

  // Return null if no case matches
  return null;
};

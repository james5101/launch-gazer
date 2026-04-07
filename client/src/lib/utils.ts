import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Shortest signed angular distance from a to b in degrees. Result in [-180, 180]. */
export function angleDelta(a: number, b: number): number {
  return ((b - a + 540) % 360) - 180
}

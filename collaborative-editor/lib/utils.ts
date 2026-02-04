import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

const COLORS = [
  'bg-red-500/10 text-red-600 dark:text-red-400',
  'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  'bg-green-500/10 text-green-600 dark:text-green-400',
  'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
  'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  'bg-pink-500/10 text-pink-600 dark:text-pink-400',
  'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
  'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
];

export function getWorkspaceColor(id: string) {
  // Use simple hash of ID to pick a consistent color
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

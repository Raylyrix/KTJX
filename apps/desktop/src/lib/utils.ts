import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

export function extractPlaceholders(text: string): string[] {
  const regex = /\(\(([^)]+)\)\)/g
  const placeholders: string[] = []
  let match
  
  while ((match = regex.exec(text)) !== null) {
    placeholders.push(match[1])
  }
  
  return [...new Set(placeholders)]
}

export function replacePlaceholders(text: string, data: Record<string, any>): string {
  return text.replace(/\(\(([^)]+)\)\)/g, (match, placeholder) => {
    return data[placeholder] || match
  })
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function generateId(): string {
  return Math.random().toString(36).substr(2, 9)
}

import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(amount)
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '-'
  
  try {
    const dateObj = new Date(date)
    if (isNaN(dateObj.getTime())) {
      return '-'
    }
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(dateObj)
  } catch {
    return '-'
  }
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export async function parseJsonSafe(res: Response) {
  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    const data = await res.json()
    if (!res.ok) {
      const err: any = new Error('HTTP error')
      err.status = res.status
      err.body = data
      throw err
    }
    return data
  }

  // Non-JSON response: read text for diagnostics (could be HTML redirect/login page)
  const text = await res.text()
  const err: any = new Error('Non-JSON response')
  err.status = res.status
  err.text = text
  throw err
}

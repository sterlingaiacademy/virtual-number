import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date) {
  return format(new Date(date), 'dd MMM yyyy');
}

export function formatDateTime(date: string | Date) {
  return format(new Date(date), 'dd MMM yyyy, HH:mm');
}

export function formatRelative(date: string | Date) {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function formatDuration(seconds: number): string {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function truncate(str: string, len = 32): string {
  return str?.length > len ? str.slice(0, len) + '…' : str;
}

export function getInitials(name: string): string {
  return name
    ?.split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '??';
}

export function statusColor(status: string) {
  switch (status) {
    case 'active':    return 'badge-active';
    case 'inactive':
    case 'suspended': return 'badge-danger';
    case 'pending':   return 'badge-pending';
    case 'completed': return 'badge-active';
    case 'failed':    return 'badge-danger';
    case 'paid':      return 'badge-active';
    default:          return 'badge-inactive';
  }
}

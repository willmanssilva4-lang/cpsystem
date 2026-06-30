import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDateBR(dateInput?: string | Date | null) {
  if (!dateInput) return '-';
  
  if (typeof dateInput === 'string') {
    const matchYMD = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (matchYMD) {
      return `${matchYMD[3]}/${matchYMD[2]}/${matchYMD[1]}`;
    }
    
    const matchDMY = dateInput.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (matchDMY) {
      return `${matchDMY[1]}/${matchDMY[2]}/${matchDMY[3]}`;
    }
  }
  
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(date.getTime())) return '-';
  
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date);
  } catch (e) {
    return date.toLocaleDateString('pt-BR');
  }
}

export function formatDateTimeBR(dateInput?: string | Date | null) {
  if (!dateInput) return '-';
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(date.getTime())) return '-';
  
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  } catch (e) {
    return date.toLocaleString('pt-BR');
  }
}

export function formatTimeBR(dateInput?: string | Date | null) {
  if (!dateInput) return '-';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '-';
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function toLocalDateString(dateInput?: string | Date | null) {
  if (!dateInput) return '';
  
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    return dateInput;
  }
  
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '';
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getLocalDateString(dateInput?: string | Date) {
  if (!dateInput) {
    const d = new Date();
    try {
      const formatter = new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      return formatter.format(d);
    } catch (e) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }
  
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    return dateInput;
  }
  
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) {
    return getLocalDateString();
  }
  
  try {
    const formatter = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return formatter.format(date);
  } catch (e) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

export function normalizeArray(val: any): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.filter(Boolean).map(String);
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.filter(Boolean).map(String);
        }
      } catch (e) {
        console.error("Error parsing stringified array", e);
      }
    }
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      return trimmed.slice(1, -1).split(',').map(s => s.trim().replace(/^"|"$/g, '')).filter(Boolean);
    }
    if (trimmed.includes(',')) {
      return trimmed.split(',').map(s => s.trim()).filter(Boolean);
    }
    if (trimmed) return [trimmed];
  }
  return [];
}


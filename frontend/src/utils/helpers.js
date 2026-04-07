import { v4 as uuidv4 } from 'uuid';

export function generateId() {
  return uuidv4();
}

export function formatDate(isoString) {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours === 0) {
        const diffMins = Math.floor(diffMs / (1000 * 60));
        if (diffMins < 2) return 'just now';
        return `${diffMins} minutes ago`;
      }
      if (diffHours === 1) return '1 hour ago';
      return `${diffHours} hours ago`;
    }
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
    }

    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch (e) {
    return isoString;
  }
}

export function truncateText(text, maxLength = 120) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '…';
}

export function compressImage(base64, maxWidth = 800, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;

      // Calculate new dimensions maintaining aspect ratio
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to JPEG with compression
      const compressed = canvas.toDataURL('image/jpeg', quality);
      resolve(compressed);
    };
    img.onerror = () => reject(new Error('Failed to load image for compression'));
    img.src = base64;
  });
}

export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export function isHebrew(text) {
  if (!text) return false;
  const hebrewPattern = /[\u0590-\u05FF]/;
  return hebrewPattern.test(text);
}

export function getTextDirection(text) {
  return isHebrew(text) ? 'rtl' : 'ltr';
}

export function sortBooks(books, sortOrder) {
  const sorted = [...books];
  switch (sortOrder) {
    case 'title':
      return sorted.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    case 'author':
      return sorted.sort((a, b) => (a.author || '').localeCompare(b.author || ''));
    case 'rating':
      return sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    case 'dateAdded':
    default:
      return sorted.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
  }
}

export function sortHighlights(highlights, sortOrder = 'dateAdded') {
  const sorted = [...highlights];
  switch (sortOrder) {
    case 'dateAdded':
    default:
      return sorted.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
  }
}

export function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}

export function getStorageSize() {
  try {
    const data = localStorage.getItem('bookmarks_app') || '';
    return new Blob([data]).size;
  } catch {
    return 0;
  }
}

// All supported input MIME types
export const SUPPORTED_TYPES = {
  'image/jpeg': 'JPG',
  'image/png': 'PNG',
  'image/webp': 'WEBP',
  'image/avif': 'AVIF',
  'image/bmp': 'BMP',
  'image/gif': 'GIF',
  'image/tiff': 'TIFF',
  'image/x-icon': 'ICO',
  'image/vnd.microsoft.icon': 'ICO',
  'image/svg+xml': 'SVG',
  'image/heic': 'HEIC',
  'image/heif': 'HEIF',
};

// Output formats and their MIME types
export const FORMAT_MIME = {
  JPG: 'image/jpeg',
  PNG: 'image/png',
  WEBP: 'image/webp',
  AVIF: 'image/avif',
  BMP: 'image/bmp',
  GIF: 'image/gif',
  TIFF: 'image/tiff',
  ICO: 'image/x-icon',
  SVG: 'image/svg+xml',
};

export const FORMAT_EXT = {
  JPG: 'jpg',
  PNG: 'png',
  WEBP: 'webp',
  AVIF: 'avif',
  BMP: 'bmp',
  GIF: 'gif',
  TIFF: 'tiff',
  ICO: 'ico',
  SVG: 'svg',
};

// Formats that support quality slider
export const QUALITY_FORMATS = new Set(['JPG', 'WEBP', 'AVIF']);

// All output format options
export const OUTPUT_FORMATS = ['JPG', 'PNG', 'WEBP', 'AVIF', 'BMP', 'GIF', 'TIFF', 'ICO', 'SVG'];

export function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function sizeDiff(original, converted) {
  if (!original || !converted) return null;
  const pct = ((converted - original) / original) * 100;
  const sign = pct > 0 ? '+' : '';
  return `${sign}${pct.toFixed(1)}%`;
}

export function replaceExtension(filename, newExt) {
  const dot = filename.lastIndexOf('.');
  const base = dot !== -1 ? filename.slice(0, dot) : filename;
  return `${base}.${newExt}`;
}

export function isSupported(file) {
  // Also accept by extension for HEIC/HEIF which may have wrong MIME
  if (Object.keys(SUPPORTED_TYPES).includes(file.type)) return true;
  const ext = file.name.split('.').pop()?.toLowerCase();
  return ['heic', 'heif'].includes(ext);
}

export function getFormatLabel(mimeType) {
  return SUPPORTED_TYPES[mimeType] ?? mimeType.split('/')[1]?.toUpperCase() ?? mimeType;
}

let idCounter = 0;
export function uid() {
  return `f_${Date.now()}_${++idCounter}`;
}

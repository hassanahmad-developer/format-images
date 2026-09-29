import { FORMAT_MIME } from './fileUtils.js';
import { GIFEncoder, quantize, applyPalette } from 'gifenc';

// Runtime capability cache
const canvasSupport = {};
function canvasCanEncode(mime) {
  if (mime in canvasSupport) return canvasSupport[mime];
  const canvas = document.createElement('canvas');
  canvas.width = 1; canvas.height = 1;
  const dataUrl = canvas.toDataURL(mime);
  canvasSupport[mime] = dataUrl.startsWith(`data:${mime}`);
  return canvasSupport[mime];
}

// Decode HEIC/HEIF using heic2any
async function decodeHeic(file) {
  const heic2any = (await import('heic2any')).default;
  const blob = await heic2any({ blob: file, toType: 'image/png', quality: 1 });
  const arrayBlob = Array.isArray(blob) ? blob[0] : blob;
  return createImageBitmap(arrayBlob);
}

// Sanitize SVG: strip scripts and event handlers
function sanitizeSvg(svgText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, 'image/svg+xml');
  // Remove script elements
  doc.querySelectorAll('script').forEach((el) => el.remove());
  // Remove on* attributes
  doc.querySelectorAll('*').forEach((el) => {
    Array.from(el.attributes).forEach((attr) => {
      if (attr.name.startsWith('on') || attr.value.toLowerCase().includes('javascript:')) {
        el.removeAttribute(attr.name);
      }
    });
  });
  return new XMLSerializer().serializeToString(doc.documentElement);
}

// Decode SVG to ImageBitmap via a sanitized blob
async function decodeSvg(file) {
  const text = await file.text();
  const clean = sanitizeSvg(text);
  const blob = new Blob([clean], { type: 'image/svg+xml' });
  return createImageBitmap(blob);
}

// Check if GIF is animated
async function isAnimatedGif(file) {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let frameCount = 0;
  for (let i = 0; i < bytes.length - 3; i++) {
    if (bytes[i] === 0x21 && bytes[i + 1] === 0xf9) frameCount++;
    if (frameCount > 1) return true;
  }
  return false;
}

/**
 * Encode a canvas to a GIF Blob using gifenc.
 * Supports an optional onProgress(0..1) callback.
 * Handles transparency: pixels with alpha < 128 map to a transparent index.
 */
async function encodeGif(canvas, bgColor, onProgress) {
  const { width, height } = canvas;

  // GIF max dimension is 65535; practical limit to avoid OOM
  if (width > 4096 || height > 4096) {
    throw new Error('Image is too large for GIF encoding (max 4096×4096).');
  }

  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, width, height);
  const rgba = imageData.data; // Uint8ClampedArray, RGBA

  onProgress?.(0.1);

  // Determine if any pixel has meaningful transparency (alpha < 128)
  let hasTransparency = false;
  for (let i = 3; i < rgba.length; i += 4) {
    if (rgba[i] < 128) { hasTransparency = true; break; }
  }

  // If no transparency, flatten onto bgColor before quantizing
  let pixels = rgba;
  if (!hasTransparency) {
    // Parse bgColor hex → RGB
    const r = parseInt(bgColor.slice(1, 3), 16) || 255;
    const g = parseInt(bgColor.slice(3, 5), 16) || 255;
    const b = parseInt(bgColor.slice(5, 7), 16) || 255;
    const flat = new Uint8ClampedArray(rgba.length);
    for (let i = 0; i < rgba.length; i += 4) {
      const a = rgba[i + 3] / 255;
      flat[i]     = Math.round(rgba[i]     * a + r * (1 - a));
      flat[i + 1] = Math.round(rgba[i + 1] * a + g * (1 - a));
      flat[i + 2] = Math.round(rgba[i + 2] * a + b * (1 - a));
      flat[i + 3] = 255;
    }
    pixels = flat;
  }

  onProgress?.(0.2);

  // Quantize to ≤256 colours. Reserve one slot for transparency if needed.
  const maxColors = hasTransparency ? 255 : 256;
  const palette = quantize(pixels, maxColors, { format: 'rgb565' });

  onProgress?.(0.6);

  // Map each pixel to its nearest palette index
  const index = applyPalette(pixels, palette, 'rgb565');

  onProgress?.(0.8);

  const encoder = GIFEncoder();

  const frameOpts = { palette, repeat: -1 }; // repeat: -1 = no loop (static)

  if (hasTransparency) {
    // Append a transparent colour at the end of the palette
    const transparentIndex = palette.length;
    palette.push([0, 0, 0]);

    // Remap fully-transparent pixels to the transparent index
    for (let i = 0; i < index.length; i++) {
      if (rgba[i * 4 + 3] < 128) index[i] = transparentIndex;
    }

    frameOpts.transparent = true;
    frameOpts.transparentIndex = transparentIndex;
  }

  encoder.writeFrame(index, width, height, frameOpts);
  encoder.finish();

  onProgress?.(1.0);

  const bytes = encoder.bytes();
  return new Blob([bytes], { type: 'image/gif' });
}

// Lazy init flag for @jsquash/avif encoder
let _avifInitialized = false;

/**
 * Encode a canvas to AVIF using @jsquash/avif.
 * quality: 0 (worst) – 100 (best)
 */
async function encodeAvif(canvas, quality) {
  const { init, default: encode } = await import('@jsquash/avif/encode.js');

  if (!_avifInitialized) {
    // Force single-threaded codec to avoid SharedArrayBuffer requirement
    const { default: avifFactory } = await import('@jsquash/avif/codec/enc/avif_enc.js');
    await init(avifFactory);
    _avifInitialized = true;
  }

  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  const buffer = await encode(imageData, { quality, qualityAlpha: -1, speed: 6 });
  if (!buffer) throw new Error('AVIF encoding failed.');
  return new Blob([buffer], { type: 'image/avif' });
}

// Encode canvas to ICO (simple 32x32 BMP-based ICO)
async function encodeIco(canvas) {
  // Resize to 256x256 max for ICO
  const size = Math.min(canvas.width, canvas.height, 256);
  const offscreen = document.createElement('canvas');
  offscreen.width = size;
  offscreen.height = size;
  const ctx = offscreen.getContext('2d');
  ctx.drawImage(canvas, 0, 0, size, size);

  // Get PNG blob and wrap in ICO container
  const pngBlob = await new Promise((res, rej) =>
    offscreen.toBlob((b) => (b ? res(b) : rej(new Error('PNG encode failed'))), 'image/png')
  );
  const pngData = new Uint8Array(await pngBlob.arrayBuffer());

  // ICO header: ICONDIR (6 bytes) + ICONDIRENTRY (16 bytes) + PNG data
  const buf = new ArrayBuffer(6 + 16 + pngData.byteLength);
  const view = new DataView(buf);
  // ICONDIR
  view.setUint16(0, 0, true);  // reserved
  view.setUint16(2, 1, true);  // type: 1 = ICO
  view.setUint16(4, 1, true);  // count: 1 image
  // ICONDIRENTRY
  view.setUint8(6, size >= 256 ? 0 : size);   // width (0 = 256)
  view.setUint8(7, size >= 256 ? 0 : size);   // height
  view.setUint8(8, 0);   // color count
  view.setUint8(9, 0);   // reserved
  view.setUint16(10, 1, true); // planes
  view.setUint16(12, 32, true); // bit count
  view.setUint32(14, pngData.byteLength, true); // size of image data
  view.setUint32(18, 22, true); // offset to image data
  new Uint8Array(buf, 22).set(pngData);
  return new Blob([buf], { type: 'image/x-icon' });
}

// Encode canvas to SVG (embeds canvas pixels as base64 PNG inside an SVG wrapper)
async function encodeSvg(canvas) {
  const { width, height } = canvas;
  const pngBlob = await new Promise((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error('PNG encode failed'))), 'image/png')
  );
  const bytes = new Uint8Array(await pngBlob.arrayBuffer());
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  const base64 = btoa(binary);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><image width="${width}" height="${height}" xlink:href="data:image/png;base64,${base64}"/></svg>`;
  return new Blob([svg], { type: 'image/svg+xml' });
}

// Encode canvas to BMP
async function encodeBmp(canvas) {
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  const imageData = ctx.getImageData(0, 0, width, height);
  const pixels = imageData.data;

  const rowSize = Math.ceil((width * 3) / 4) * 4;
  const pixelDataSize = rowSize * height;
  const fileSize = 54 + pixelDataSize;
  const buf = new ArrayBuffer(fileSize);
  const view = new DataView(buf);

  // BMP file header
  view.setUint8(0, 0x42); view.setUint8(1, 0x4d); // 'BM'
  view.setUint32(2, fileSize, true);
  view.setUint32(6, 0, true);
  view.setUint32(10, 54, true); // pixel data offset

  // DIB header (BITMAPINFOHEADER)
  view.setUint32(14, 40, true);  // header size
  view.setInt32(18, width, true);
  view.setInt32(22, -height, true); // negative = top-down
  view.setUint16(26, 1, true);   // planes
  view.setUint16(28, 24, true);  // bits per pixel (RGB)
  view.setUint32(30, 0, true);   // compression: none
  view.setUint32(34, pixelDataSize, true);
  view.setInt32(38, 2835, true); // X pixels per meter
  view.setInt32(42, 2835, true); // Y pixels per meter
  view.setUint32(46, 0, true);
  view.setUint32(50, 0, true);

  const bytes = new Uint8Array(buf);
  for (let y = 0; y < height; y++) {
    const rowOffset = 54 + y * rowSize;
    for (let x = 0; x < width; x++) {
      const src = (y * width + x) * 4;
      const dst = rowOffset + x * 3;
      bytes[dst] = pixels[src + 2];     // B
      bytes[dst + 1] = pixels[src + 1]; // G
      bytes[dst + 2] = pixels[src];     // R
    }
  }
  return new Blob([buf], { type: 'image/bmp' });
}

/**
 * Converts a File to the target format.
 * Returns { blob, width, height, warning? }
 * @param {File} file
 * @param {string} targetFormat
 * @param {number} quality
 * @param {string} bgColor
 * @param {{ onProgress?: (pct: number) => void }} [options]
 */
export async function convertImage(file, targetFormat, quality, bgColor = '#ffffff', options = {}) {
  const mime = FORMAT_MIME[targetFormat];
  if (!mime) throw new Error('Unsupported target format');

  // Warn about animated GIF → static
  let warning = null;
  if (file.type === 'image/gif' && targetFormat !== 'GIF') {
    const animated = await isAnimatedGif(file);
    if (animated) warning = 'Animated GIF: only the first frame will be converted.';
  }
  if (targetFormat === 'GIF' && file.type === 'image/gif') {
    const animated = await isAnimatedGif(file);
    if (animated) warning = 'Animated GIF re-encoded as a static GIF (animation not preserved).';
  }

  // Decode source
  let bitmap;
  const isHeic = file.type === 'image/heic' || file.type === 'image/heif' ||
    ['heic', 'heif'].includes(file.name.split('.').pop()?.toLowerCase());

  if (isHeic) {
    bitmap = await decodeHeic(file).catch((e) => {
      throw new Error(`HEIC decode failed: ${e.message}`);
    });
  } else if (file.type === 'image/svg+xml') {
    bitmap = await decodeSvg(file).catch((e) => {
      throw new Error(`SVG decode failed: ${e.message}`);
    });
  } else {
    bitmap = await createImageBitmap(file).catch(() => {
      throw new Error('Your browser could not decode this file.');
    });
  }

  const { width, height } = bitmap;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Fill background for formats without alpha (GIF handles its own background in encodeGif)
  const needsBg = ['image/jpeg', 'image/bmp', 'image/tiff', 'image/x-icon'].includes(mime);
  if (needsBg) {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);
  }

  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  const q = QUALITY_FORMATS.has(targetFormat) ? quality / 100 : undefined;

  let blob;

  if (targetFormat === 'GIF') {
    blob = await encodeGif(canvas, bgColor, options?.onProgress);
  } else if (targetFormat === 'ICO') {
    blob = await encodeIco(canvas);
  } else if (targetFormat === 'BMP') {
    blob = await encodeBmp(canvas);
  } else if (targetFormat === 'TIFF') {
    // TIFF: use PNG as fallback since canvas doesn't encode TIFF natively
    if (!canvasCanEncode('image/tiff')) {
      // Encode as PNG data wrapped in a TIFF-named blob
      blob = await new Promise((res, rej) =>
        canvas.toBlob((b) => (b ? res(b) : rej(new Error('Encode failed'))), 'image/png')
      );
      // Re-wrap with TIFF mime for download naming, but note limitation
      blob = new Blob([await blob.arrayBuffer()], { type: 'image/tiff' });
      warning = (warning ? warning + ' ' : '') + 'TIFF output is PNG data with .tiff extension (browser canvas lacks native TIFF encoding).';
    } else {
      blob = await new Promise((res, rej) =>
        canvas.toBlob((b) => (b ? res(b) : rej(new Error('Encode failed'))), 'image/tiff')
      );
    }
  } else if (targetFormat === 'AVIF') {
    blob = await encodeAvif(canvas, quality);
  } else if (targetFormat === 'SVG') {
    blob = await encodeSvg(canvas);
  } else {
    if (!canvasCanEncode(mime)) {
      throw new Error(`${targetFormat} encoding is not supported in this browser.`);
    }
    blob = await new Promise((res, rej) =>
      canvas.toBlob((b) => (b ? res(b) : rej(new Error('Canvas encoding failed.'))), mime, q)
    );
  }

  return { blob, width, height, warning };
}

const QUALITY_FORMATS = new Set(['JPG', 'WEBP', 'AVIF']);

/**
 * Reads image dimensions from a File without full conversion.
 */
export async function getImageDimensions(file) {
  try {
    const isHeic = file.type === 'image/heic' || file.type === 'image/heif' ||
      ['heic', 'heif'].includes(file.name.split('.').pop()?.toLowerCase());
    if (isHeic) {
      const bitmap = await decodeHeic(file);
      const { width, height } = bitmap;
      bitmap.close();
      return { width, height };
    }
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;
    bitmap.close();
    return { width, height };
  } catch {
    return null;
  }
}

/**
 * Draw a File onto a canvas and return the canvas (for AI processing).
 */
export async function fileToCanvas(file) {
  const isHeic = file.type === 'image/heic' || file.type === 'image/heif' ||
    ['heic', 'heif'].includes(file.name.split('.').pop()?.toLowerCase());
  let bitmap;
  if (isHeic) {
    bitmap = await decodeHeic(file);
  } else if (file.type === 'image/svg+xml') {
    bitmap = await decodeSvg(file);
  } else {
    bitmap = await createImageBitmap(file);
  }
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  canvas.getContext('2d').drawImage(bitmap, 0, 0);
  bitmap.close();
  return canvas;
}

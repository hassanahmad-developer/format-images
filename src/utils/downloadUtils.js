import JSZip from 'jszip';
import { FORMAT_EXT, replaceExtension } from './fileUtils.js';

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export async function downloadAllAsZip(items) {
  const zip = new JSZip();
  for (const item of items) {
    if (!item.convertedBlob) continue;
    const ext = FORMAT_EXT[item.targetFormat] ?? 'bin';
    const filename = replaceExtension(item.file.name, ext);
    zip.file(filename, item.convertedBlob);
  }
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  downloadBlob(zipBlob, 'convertly-images.zip');
}

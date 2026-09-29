import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { formatBytes, getFormatLabel, replaceExtension, sizeDiff, FORMAT_EXT } from '../utils/fileUtils.js';
import { downloadBlob } from '../utils/downloadUtils.js';
import { ThumbnailSkeleton, TextSkeleton } from './Skeleton.jsx';

export default function FileItem({ item, onRemove }) {
  const { file, status, error, warning, width, height, convertedBlob, targetFormat, convertedSize, gifProgress } = item;
  const [thumb, setThumb] = useState(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setThumb(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function handleDownload() {
    if (!convertedBlob) return;
    const ext = FORMAT_EXT[targetFormat] ?? 'bin';
    downloadBlob(convertedBlob, replaceExtension(file.name, ext));
  }

  const diffLabel = status === 'done' ? sizeDiff(file.size, convertedSize) : null;
  const diffPositive = diffLabel && diffLabel.startsWith('+');

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="flex items-start gap-3 py-2.5 border-b border-[#26282C] last:border-0 px-3"
    >
      {/* Thumbnail */}
      {thumb ? (
        <div className="shrink-0 w-10 h-10 rounded overflow-hidden border border-[#303236] mt-0.5 bg-[#26282C]">
          <img src={thumb} alt="" className="w-full h-full object-cover" aria-hidden="true" />
        </div>
      ) : (
        <ThumbnailSkeleton />
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#E4E4E7] truncate" title={file.name}>
          {file.name}
        </p>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
          <span className="text-xs text-[#52525B]">{getFormatLabel(file.type)}</span>

          {width && height ? (
            <span className="text-xs text-[#52525B]">{width}&times;{height}</span>
          ) : status === 'idle' ? (
            <TextSkeleton className="h-2.5 w-12 rounded" />
          ) : null}

          <span className="text-xs text-[#52525B]">{formatBytes(file.size)}</span>

          {status === 'converting' && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-[#14B8A6] font-medium"
            >
              Converting{gifProgress != null ? ` ${gifProgress}%` : '…'}
            </motion.span>
          )}

          {status === 'done' && (
            <motion.span
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-1.5"
            >
              <span className="text-xs text-[#3F3F46]">→</span>
              <span className="text-xs text-[#A1A1AA] font-medium">{targetFormat}</span>
              <span className="text-xs text-[#52525B]">{formatBytes(convertedSize)}</span>
              {diffLabel && (
                <span className={`text-xs font-medium ${diffPositive ? 'text-red-400' : 'text-emerald-400'}`}>
                  {diffLabel}
                </span>
              )}
            </motion.span>
          )}

          {status === 'error' && (
            <span className="text-xs text-red-400">{error ?? 'Could not process this image.'}</span>
          )}
        </div>
        {warning && status === 'done' && (
          <p className="text-xs text-amber-400 mt-0.5">{warning}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0 mt-0.5">
        {status === 'done' && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.15 }}
            whileTap={{ scale: 0.95 }}
            className="btn btn-secondary text-xs px-2.5 py-1"
            onClick={handleDownload}
            aria-label={`Download ${file.name}`}
          >
            Download
          </motion.button>
        )}
        <motion.button
          whileTap={{ scale: 0.9 }}
          className="btn btn-danger-ghost p-1.5"
          onClick={() => onRemove(item.id)}
          aria-label={`Remove ${file.name}`}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </motion.button>
      </div>
    </motion.div>
  );
}

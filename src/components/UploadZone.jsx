import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { isSupported } from '../utils/fileUtils.js';

const ACCEPT = [
  'image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/bmp',
  'image/gif', 'image/tiff', 'image/x-icon', 'image/svg+xml',
  'image/heic', 'image/heif', '.heic', '.heif',
].join(',');

export default function UploadZone({ onFiles, compact = false }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(isSupported);
    if (files.length) onFiles(files);
  }

  function handleChange(e) {
    const files = Array.from(e.target.files).filter(isSupported);
    if (files.length) onFiles(files);
    e.target.value = '';
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
  }

  if (compact) {
    return (
      <>
        <input ref={inputRef} type="file" accept={ACCEPT} multiple className="hidden"
          onChange={handleChange} aria-hidden="true" tabIndex={-1} />
        <motion.button
          className="btn btn-ghost text-xs py-1 px-2"
          onClick={() => inputRef.current?.click()}
          aria-label="Add more images"
          whileTap={{ scale: 0.96 }}
        >
          + Add more
        </motion.button>
      </>
    );
  }

  return (
    <motion.div
      role="button"
      tabIndex={0}
      aria-label="Upload images — click or drag and drop"
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      onKeyDown={handleKeyDown}
      animate={{
        borderColor: dragging ? '#14B8A6' : '#303236',
        backgroundColor: dragging ? 'rgba(20,184,166,0.05)' : 'transparent',
      }}
      transition={{ duration: 0.15 }}
      className="border-2 border-dashed rounded-lg px-6 py-14 text-center cursor-pointer select-none"
      style={{ borderColor: '#303236' }}
      whileHover={{ borderColor: '#3f4146', backgroundColor: 'rgba(255,255,255,0.02)' }}
    >
      <input ref={inputRef} type="file" accept={ACCEPT} multiple className="hidden"
        onChange={handleChange} aria-hidden="true" tabIndex={-1} />

      <div className="flex flex-col items-center gap-2.5 pointer-events-none">
        <motion.div
          animate={{ scale: dragging ? 1.1 : 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ color: dragging ? '#14B8A6' : '#52525B' }} aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        </motion.div>
        <div>
          <p className="text-sm font-medium text-[#D4D4D8]">Drop images here</p>
          <p className="text-xs text-[#52525B] mt-1">or click to choose files</p>
        </div>
        <p className="text-[11px] text-[#3F3F46] mt-0.5">
          JPG · PNG · WEBP · AVIF · BMP · GIF · TIFF · ICO · SVG · HEIC
        </p>
      </div>
    </motion.div>
  );
}

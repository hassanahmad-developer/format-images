import { motion } from 'framer-motion';
import { AnimatePresence } from 'framer-motion';
import { OUTPUT_FORMATS, QUALITY_FORMATS } from '../utils/fileUtils.js';

export default function ConversionControls({
  targetFormat, onTargetFormat,
  quality, onQuality,
  bgColor, onBgColor,
  onConvert, converting, hasFiles,
}) {
  const showQuality = QUALITY_FORMATS.has(targetFormat);
  const showBgColor = ['JPG', 'BMP', 'GIF', 'TIFF', 'ICO'].includes(targetFormat);

  const chevronSvg = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='%2371717A' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`;

  return (
    <div className="flex flex-wrap items-end gap-4 py-4 border-t border-[#303236]">
      {/* Format selector */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="target-format" className="text-[11px] font-medium text-[#52525B] uppercase tracking-wider">
          Convert to
        </label>
        <select
          id="target-format"
          value={targetFormat}
          onChange={(e) => onTargetFormat(e.target.value)}
          disabled={converting}
          className="btn btn-secondary pr-7 appearance-none bg-no-repeat cursor-pointer"
          style={{
            backgroundImage: chevronSvg,
            backgroundPosition: 'right 0.5rem center',
          }}
        >
          {OUTPUT_FORMATS.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
      </div>

      {/* Quality slider */}
      <AnimatePresence>
        {showQuality && (
          <motion.div
            key="quality"
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-1.5 min-w-[150px] overflow-hidden"
          >
            <label htmlFor="quality-slider" className="text-[11px] font-medium text-[#52525B] uppercase tracking-wider">
              Quality <span className="text-[#A1A1AA] font-semibold normal-case">{quality}</span>
            </label>
            <input
              id="quality-slider"
              type="range"
              min={10} max={100} step={1}
              value={quality}
              onChange={(e) => onQuality(Number(e.target.value))}
              disabled={converting}
              className="w-full cursor-pointer"
              aria-label={`Output quality: ${quality}`}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background color */}
      <AnimatePresence>
        {showBgColor && (
          <motion.div
            key="bgcolor"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-1.5"
          >
            <label htmlFor="bg-color-convert" className="text-[11px] font-medium text-[#52525B] uppercase tracking-wider">
              BG Color
            </label>
            <input
              id="bg-color-convert"
              type="color"
              value={bgColor}
              onChange={(e) => onBgColor(e.target.value)}
              disabled={converting}
              className="w-9 h-8 rounded border border-[#303236] cursor-pointer p-0.5 bg-[#1D1F22]"
              aria-label="Background color for transparent images"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Convert button */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        className="btn btn-primary ml-auto"
        onClick={onConvert}
        disabled={!hasFiles || converting}
        aria-label={converting ? 'Converting images…' : 'Convert images'}
      >
        {converting ? (
          <>
            <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            Converting…
          </>
        ) : 'Convert images'}
      </motion.button>
    </div>
  );
}

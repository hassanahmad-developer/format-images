import { motion } from 'framer-motion';

export default function Header() {
  return (
    <motion.header
      className="border-b border-[#303236] bg-[#18191C]"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 h-13 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="3" y="3" width="8" height="8" rx="1.5" fill="#14B8A6" />
            <rect x="13" y="3" width="8" height="8" rx="1.5" fill="#14B8A6" opacity="0.5" />
            <rect x="3" y="13" width="8" height="8" rx="1.5" fill="#14B8A6" opacity="0.5" />
            <rect x="13" y="13" width="8" height="8" rx="1.5" fill="#14B8A6" opacity="0.25" />
          </svg>
          <span className="text-sm font-semibold tracking-tight text-[#F1F1F1]">
            format-images
          </span>
        </div>
        <span className="text-xs text-[#52525B] font-medium hidden sm:block">
          Private &bull; Runs in your browser
        </span>
      </div>
    </motion.header>
  );
}

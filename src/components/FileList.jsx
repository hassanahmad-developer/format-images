import { AnimatePresence, motion } from 'framer-motion';
import FileItem from './FileItem.jsx';

export default function FileList({ items, onRemove, onClearAll, progress, total }) {
  const doneCount = items.filter((i) => i.status === 'done').length;
  const converting = items.some((i) => i.status === 'converting');

  return (
    <div>
      {/* List header */}
      <div className="flex items-center justify-between py-2">
        <span className="text-xs text-[#52525B]">
          {items.length} {items.length === 1 ? 'image' : 'images'}
          {converting && total > 0 && (
            <span className="ml-2 text-[#14B8A6] font-medium">
              {progress}/{total} converting
            </span>
          )}
          {!converting && doneCount > 0 && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="ml-2 text-emerald-400 font-medium"
            >
              {doneCount} converted
            </motion.span>
          )}
        </span>
        <motion.button
          whileTap={{ scale: 0.95 }}
          className="btn btn-ghost text-xs py-1 px-2"
          onClick={onClearAll}
          aria-label="Clear all files"
        >
          Clear all
        </motion.button>
      </div>

      {/* Progress bar */}
      <AnimatePresence>
        {converting && total > 0 && (
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            exit={{ opacity: 0 }}
            style={{ originX: 0 }}
            className="h-px bg-[#303236] rounded-full overflow-hidden mb-3"
          >
            <motion.div
              className="h-full bg-[#14B8A6]"
              initial={{ width: 0 }}
              animate={{ width: `${(progress / total) * 100}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={total}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* File rows */}
      <div className="bg-[#1D1F22] border border-[#303236] rounded-lg overflow-hidden">
        <AnimatePresence initial={false}>
          {items.map((item) => (
            <FileItem key={item.id} item={item} onRemove={onRemove} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

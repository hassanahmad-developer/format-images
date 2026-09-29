import { motion } from 'framer-motion';

const TABS = [
  { id: 'convert', label: 'Convert' },
  { id: 'removebg', label: 'Remove Background' },
];

export default function TabBar({ activeTab, onTab }) {
  return (
    <div className="flex gap-0 border-b border-[#303236] mb-6" role="tablist">
      {TABS.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={activeTab === t.id}
          onClick={() => onTab(t.id)}
          className="cursor-pointer relative px-4 py-2.5 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14B8A6] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111214]"
          style={{ color: activeTab === t.id ? '#F1F1F1' : '#71717A' }}
        >
          {t.label}
          {activeTab === t.id && (
            <motion.div
              layoutId="tab-indicator"
              className="absolute bottom-0 left-0 right-0 h-px bg-[#14B8A6]"
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            />
          )}
        </button>
      ))}
    </div>
  );
}

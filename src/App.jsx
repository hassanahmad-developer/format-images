import { useCallback, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from './components/Header.jsx';
import TabBar from './components/TabBar.jsx';
import UploadZone from './components/UploadZone.jsx';
import FileList from './components/FileList.jsx';
import ConversionControls from './components/ConversionControls.jsx';
import RemoveBgPanel from './components/RemoveBgPanel.jsx';
import { isSupported, uid } from './utils/fileUtils.js';
import { convertImage, getImageDimensions } from './utils/imageConverter.js';
import { downloadAllAsZip } from './utils/downloadUtils.js';

const tabVariants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.22, ease: 'easeOut' } },
  exit:    { opacity: 0, y: -4, transition: { duration: 0.15, ease: 'easeIn' } },
};

export default function App() {
  const [tab, setTab] = useState('convert');

  const [items, setItems] = useState([]);
  const [activeFile, setActiveFile] = useState(null);

  const [targetFormat, setTargetFormat] = useState('WEBP');
  const [quality, setQuality] = useState(85);
  const [bgColor, setBgColor] = useState('#ffffff');
  const [converting, setConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const convertedBlobsRef = useRef({});

  function revokeBlob(id) { delete convertedBlobsRef.current[id]; }

  const addFiles = useCallback((files) => {
    const supported = files.filter(isSupported);
    if (!supported.length) return;

    if (tab !== 'convert') {
      setActiveFile(supported[0]);
      return;
    }

    const newItems = supported.map((file) => ({
      id: uid(), file, status: 'idle', error: null, warning: null,
      width: null, height: null, convertedBlob: null, convertedSize: null,
      targetFormat: null, gifProgress: null,
    }));

    setItems((prev) => {
      const existingKeys = new Set(prev.map((i) => i.file.name + i.file.size));
      return [...prev, ...newItems.filter((i) => !existingKeys.has(i.file.name + i.file.size))];
    });

    for (const item of newItems) {
      getImageDimensions(item.file).then((dims) => {
        if (!dims) return;
        setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, ...dims } : i));
      });
    }
  }, [tab]);

  function handleTabChange(newTab) {
    setTab(newTab);
    if (newTab === 'removebg' && !activeFile && items.length > 0) {
      setActiveFile(items[0].file);
    }
  }

  async function handleConvert() {
    const toConvert = items.filter((i) => i.status !== 'converting');
    if (!toConvert.length) return;

    setConverting(true);
    setProgress(0);
    setItems((prev) => prev.map((i) => ({
      ...i, status: 'idle', convertedBlob: null, convertedSize: null,
      error: null, warning: null, gifProgress: null,
    })));

    let done = 0;
    for (const item of toConvert) {
      setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, status: 'converting' } : i));

      try {
        const { blob, width, height, warning } = await convertImage(
          item.file, targetFormat, quality, bgColor,
          {
            onProgress: targetFormat === 'GIF' ? (pct) => {
              setItems((prev) => prev.map((i) =>
                i.id === item.id ? { ...i, gifProgress: Math.round(pct * 100) } : i
              ));
            } : undefined,
          }
        );
        revokeBlob(item.id);
        convertedBlobsRef.current[item.id] = blob;
        setItems((prev) => prev.map((i) =>
          i.id === item.id
            ? { ...i, status: 'done', convertedBlob: blob, convertedSize: blob.size, targetFormat, width, height, warning: warning ?? null }
            : i
        ));
      } catch (err) {
        setItems((prev) => prev.map((i) =>
          i.id === item.id ? { ...i, status: 'error', error: err?.message ?? 'Could not process this image.' } : i
        ));
      }

      done++;
      setProgress(done);
    }

    setConverting(false);
  }

  function handleRemove(id) { revokeBlob(id); setItems((prev) => prev.filter((i) => i.id !== id)); }
  function handleClearAll() { Object.keys(convertedBlobsRef.current).forEach(revokeBlob); setItems([]); }

  const doneItems = items.filter((i) => i.status === 'done');
  const hasFiles = items.length > 0;

  return (
    <div className="min-h-screen flex flex-col bg-[#111214]">
      <Header />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-10">
        {/* Hero */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut', delay: 0.05 }}
        >
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#F1F1F1]">
            format-images
          </h1>
          <p className="mt-1 text-sm text-[#52525B] max-w-md">
            Convert formats and remove backgrounds — locally in your browser.
          </p>
        </motion.div>

        <TabBar activeTab={tab} onTab={handleTabChange} />

        <AnimatePresence mode="wait">
          {/* ── CONVERT TAB ── */}
          {tab === 'convert' && (
            <motion.div key="convert" variants={tabVariants} initial="initial" animate="animate" exit="exit" className="space-y-4">
              {!hasFiles ? (
                <>
                  <UploadZone onFiles={addFiles} />
                  <p className="text-xs text-[#3F3F46] text-center">
                    JPG · PNG · WEBP · AVIF · BMP · GIF · TIFF · ICO · SVG · HEIC
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <UploadZone onFiles={addFiles} compact />
                  </div>

                  <FileList
                    items={items}
                    onRemove={handleRemove}
                    onClearAll={handleClearAll}
                    progress={progress}
                    total={items.length}
                  />

                  <ConversionControls
                    targetFormat={targetFormat}
                    onTargetFormat={setTargetFormat}
                    quality={quality}
                    onQuality={setQuality}
                    bgColor={bgColor}
                    onBgColor={setBgColor}
                    onConvert={handleConvert}
                    converting={converting}
                    hasFiles={hasFiles}
                  />

                  <AnimatePresence>
                    {doneItems.length > 1 && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex justify-end pt-1"
                      >
                        <motion.button
                          whileTap={{ scale: 0.97 }}
                          className="btn btn-secondary text-sm"
                          onClick={() => downloadAllAsZip(doneItems)}
                          aria-label="Download all converted images as ZIP"
                        >
                          <DownloadIcon />
                          Download all ({doneItems.length})
                        </motion.button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}
            </motion.div>
          )}

          {/* ── REMOVE BACKGROUND TAB ── */}
          {tab === 'removebg' && (
            <motion.div key="removebg" variants={tabVariants} initial="initial" animate="animate" exit="exit" className="space-y-4">
              {!activeFile ? (
                <UploadZone onFiles={(files) => { const s = files.filter(isSupported); if (s.length) setActiveFile(s[0]); }} />
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-[#52525B] truncate max-w-xs">{activeFile.name}</p>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      className="btn btn-ghost text-xs py-1 px-2"
                      onClick={() => setActiveFile(null)}
                    >
                      Change image
                    </motion.button>
                  </div>
                  <RemoveBgPanel file={activeFile} />
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="border-t border-[#1D1F22] py-4 text-center">
        <p className="text-xs text-[#3F3F46]">
          All processing happens locally in your browser &mdash; no uploads, no tracking.
        </p>
      </footer>
    </div>
  );
}

function DownloadIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fileToCanvas } from '../utils/imageConverter.js';
import { removeBackground, canvasToPngBlob } from '../utils/backgroundRemoval.js';
import { downloadBlob } from '../utils/downloadUtils.js';
import { replaceExtension } from '../utils/fileUtils.js';

export default function RemoveBgPanel({ file }) {
  const [sourceReady, setSourceReady] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [modelPhase, setModelPhase] = useState(null);
  const [modelPct, setModelPct] = useState(null);
  const [resultCanvas, setResultCanvas] = useState(null);
  const [error, setError] = useState(null);
  const [bgColor, setBgColor] = useState('transparent');

  const sourceCanvasRef = useRef(null);
  const sourceUrlRef = useRef(null);
  const [sourceUrl, setSourceUrl] = useState(null);
  const previewRef = useRef(null);
  const mountedRef = useRef(true);
  // Keep latest values accessible inside the callback ref
  const resultCanvasRef = useRef(null);
  const bgColorRef = useRef(bgColor);
  bgColorRef.current = bgColor;

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!file) return;

    if (sourceUrlRef.current) { URL.revokeObjectURL(sourceUrlRef.current); sourceUrlRef.current = null; }

    setSourceReady(false);
    setResultCanvas(null);
    setError(null);
    setModelPhase(null);
    setModelPct(null);

    const url = URL.createObjectURL(file);
    sourceUrlRef.current = url;
    setSourceUrl(url);

    fileToCanvas(file)
      .then((c) => { if (mountedRef.current) { sourceCanvasRef.current = c; setSourceReady(true); } })
      .catch((e) => { if (mountedRef.current) setError(e.message); });

    return () => {
      if (sourceUrlRef.current) { URL.revokeObjectURL(sourceUrlRef.current); sourceUrlRef.current = null; }
    };
  }, [file]);

  function drawToPreview(canvas, color) {
    if (!canvas || !previewRef.current) return;
    const preview = previewRef.current;
    preview.width = canvas.width;
    preview.height = canvas.height;
    const ctx = preview.getContext('2d');
    ctx.clearRect(0, 0, preview.width, preview.height);
    if (color !== 'transparent') {
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, preview.width, preview.height);
    }
    ctx.drawImage(canvas, 0, 0);
  }

  // Redraw whenever bgColor changes (resultCanvas already in ref)
  useEffect(() => {
    drawToPreview(resultCanvasRef.current, bgColor);
  }, [bgColor]);

  // Callback ref — fires as soon as the <canvas> mounts in the DOM
  const setPreviewRef = useCallback((node) => {
    previewRef.current = node;
    if (node) drawToPreview(resultCanvasRef.current, bgColorRef.current);
  }, []);

  async function handleRemove() {
    if (!sourceCanvasRef.current || processing) return;
    setProcessing(true);
    setError(null);
    setModelPhase(null);
    setModelPct(null);

    try {
      const out = await removeBackground(sourceCanvasRef.current, (p) => {
        if (!mountedRef.current) return;
        if (p.status === 'progress') { setModelPhase('downloading'); setModelPct(p.pct ?? null); }
        else if (p.status === 'loading') { setModelPhase('downloading'); setModelPct(null); }
        else if (p.status === 'ready') { setModelPhase('running'); setModelPct(null); }
      });
      if (mountedRef.current) {
        resultCanvasRef.current = out;
        setResultCanvas(out);
        setModelPhase(null);
      }
    } catch (e) {
      if (mountedRef.current) setError(e.message);
    } finally {
      if (mountedRef.current) setProcessing(false);
    }
  }

  async function handleDownload() {
    if (!resultCanvas) return;
    let canvas = resultCanvas;
    if (bgColor !== 'transparent') {
      const flat = document.createElement('canvas');
      flat.width = resultCanvas.width; flat.height = resultCanvas.height;
      const ctx = flat.getContext('2d');
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, flat.width, flat.height);
      ctx.drawImage(resultCanvas, 0, 0);
      canvas = flat;
    }
    const blob = await canvasToPngBlob(canvas);
    downloadBlob(blob, replaceExtension(file.name, 'png'));
  }

  if (!file) return <EmptyState />;

  const showResultSkeleton = processing && !resultCanvas;

  return (
    <motion.div
      className="space-y-4"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      {/* Info banner */}
      <div className="bg-[#1D1F22] border border-[#303236] rounded-lg px-4 py-3 text-xs text-[#71717A] leading-relaxed">
        <strong className="text-[#A1A1AA]">AI Background Removal</strong> — Runs entirely in your browser. First use downloads model weights. Your images are never uploaded.
      </div>

      {/* Preview grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Source */}
        <div>
          <p className="text-[11px] font-medium text-[#52525B] mb-2 uppercase tracking-wider">Original</p>
          <div className="rounded-lg border border-[#303236] overflow-hidden bg-[#1D1F22] aspect-square flex items-center justify-center">
            <AnimatePresence mode="wait">
              {sourceReady && sourceUrl ? (
                <motion.img
                  key="source-img"
                  src={sourceUrl}
                  alt="Original"
                  className="max-w-full max-h-full object-contain"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                />
              ) : (
                <motion.div
                  key="source-skeleton"
                  className="skeleton w-full h-full rounded-none"
                  aria-label="Loading image…"
                  aria-busy="true"
                  exit={{ opacity: 0 }}
                />
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Result */}
        <div>
          <p className="text-[11px] font-medium text-[#52525B] mb-2 uppercase tracking-wider">Result</p>
          <AnimatePresence mode="wait">
            {showResultSkeleton ? (
              <motion.div
                key="result-skeleton"
                className="rounded-lg border border-[#303236] overflow-hidden aspect-square"
                aria-label="Processing…"
                aria-busy="true"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="skeleton w-full h-full rounded-none" />
              </motion.div>
            ) : (
              <motion.div
                key="result-panel"
                className="rounded-lg border border-[#303236] overflow-hidden aspect-square flex items-center justify-center checkerboard"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.25 }}
              >
                {resultCanvas ? (
                  <canvas ref={setPreviewRef} className="max-w-full max-h-full object-contain" />
                ) : (
                  <span className="text-xs text-white">Result will appear here</span>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Model download progress */}
      <AnimatePresence>
        {modelPhase === 'downloading' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-1.5 overflow-hidden"
          >
            <p className="text-xs text-[#71717A]">
              {modelPct != null ? `Preparing… ${modelPct}%` : 'Preparing…'}
            </p>
            {modelPct != null && (
              <div className="h-px bg-[#303236] rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-[#14B8A6]"
                  initial={{ width: 0 }}
                  animate={{ width: `${modelPct}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-sm text-red-400 bg-red-950/40 border border-red-900/50 rounded-lg px-4 py-3"
            role="alert"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Controls */}
      <div className="flex flex-wrap items-end gap-4 pt-3 border-t border-[#303236]">
        <AnimatePresence>
          {resultCanvas && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-1.5"
            >
              <label htmlFor="bg-color" className="text-[11px] font-medium text-[#52525B] uppercase tracking-wider">
                Background
              </label>
              <div className="flex items-center gap-2">
                <select
                  id="bg-color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="btn btn-secondary text-sm"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='%2371717A' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 0.5rem center',
                    paddingRight: '1.75rem',
                    appearance: 'none',
                  }}
                >
                  <option value="transparent">Transparent</option>
                  <option value="#ffffff">White</option>
                  <option value="#000000">Black</option>
                  <option value="#f0f0f0">Light gray</option>
                  <option value="custom">Custom…</option>
                </select>
                {bgColor === 'custom' && (
                  <input
                    type="color"
                    defaultValue="#ffffff"
                    onChange={(e) => setBgColor(e.target.value)}
                    className="w-8 h-8 rounded border border-[#303236] cursor-pointer p-0.5 bg-[#1D1F22]"
                  />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-2 ml-auto">
          <AnimatePresence>
            {resultCanvas && (
              <motion.button
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                whileTap={{ scale: 0.96 }}
                className="btn btn-secondary"
                onClick={handleDownload}
                disabled={processing}
              >
                <DownloadIcon /> Download PNG
              </motion.button>
            )}
          </AnimatePresence>
          <motion.button
            whileTap={{ scale: 0.97 }}
            className="btn btn-primary"
            onClick={handleRemove}
            disabled={processing || !sourceReady}
          >
            {processing ? <><SpinIcon /> Processing…</> : resultCanvas ? 'Re-run' : 'Remove Background'}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

function EmptyState() {
  return (
    <div className="py-16 text-center text-[#3F3F46]">
      <p className="text-sm">Upload an image to use AI background removal.</p>
    </div>
  );
}

function SpinIcon() {
  return (
    <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
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

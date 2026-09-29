/**
 * AI Background Removal using RMBG-1.4 via Transformers.js.
 * Model runs entirely in the browser via ONNX Runtime Web.
 */

let pipeline = null;
let loadingPromise = null;

export async function loadBgRemovalModel(onProgress) {
  if (pipeline) return pipeline;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    const { AutoModel, AutoProcessor, env, RawImage } = await import('@huggingface/transformers');

    // Use browser cache (IndexedDB) so weights download only once
    env.allowLocalModels = false;
    env.useBrowserCache = true;

    onProgress?.({ status: 'loading', message: 'Downloading model weights (first use only, ~175 MB)…' });

    const model = await AutoModel.from_pretrained('briaai/RMBG-1.4', {
      config: { model_type: 'custom' },
      progress_callback: (p) => {
        if (p.status === 'progress' && p.total) {
          const pct = Math.round((p.loaded / p.total) * 100);
          onProgress?.({ status: 'progress', pct, message: `Downloading model… ${pct}%` });
        }
      },
    });

    const processor = await AutoProcessor.from_pretrained('briaai/RMBG-1.4', {
      config: {
        do_normalize: true,
        do_pad: false,
        do_rescale: true,
        do_resize: true,
        image_mean: [0.5, 0.5, 0.5],
        image_std: [1, 1, 1],
        resample: 2,
        rescale_factor: 0.00392156862745098,
        size: { width: 1024, height: 1024 },
      },
    });

    pipeline = { model, processor, RawImage };
    onProgress?.({ status: 'ready', message: 'Model ready.' });
    return pipeline;
  })();

  return loadingPromise;
}

/**
 * Remove background from an HTMLCanvasElement.
 * Returns a new canvas with transparent background.
 */
export async function removeBackground(sourceCanvas, onProgress) {
  const { model, processor, RawImage } = await loadBgRemovalModel(onProgress);

  const { width, height } = sourceCanvas;

  // Convert canvas to RawImage
  const ctx = sourceCanvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, width, height);
  const rawImage = new RawImage(imageData.data, width, height, 4);

  // Preprocess
  const { pixel_values } = await processor(rawImage);

  // Inference
  const { output } = await model({ input: pixel_values });

  // Post-process mask
  const maskData = (await RawImage.fromTensor(output[0].mul(255).to('uint8')).resize(width, height)).data;

  // Apply mask to original image
  const outCanvas = document.createElement('canvas');
  outCanvas.width = width;
  outCanvas.height = height;
  const outCtx = outCanvas.getContext('2d');
  outCtx.drawImage(sourceCanvas, 0, 0);
  const outData = outCtx.getImageData(0, 0, width, height);

  for (let i = 0; i < maskData.length; i++) {
    outData.data[i * 4 + 3] = maskData[i];
  }
  outCtx.putImageData(outData, 0, 0);

  return outCanvas;
}

/**
 * Export a canvas as a PNG Blob.
 */
export function canvasToPngBlob(canvas) {
  return new Promise((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error('Export failed'))), 'image/png')
  );
}

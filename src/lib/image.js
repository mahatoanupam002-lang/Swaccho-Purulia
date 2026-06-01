// Client-side image compression. Resizes large photos down to a max dimension
// and re-encodes them as JPEG before upload, which cuts Supabase Storage usage
// and makes submissions far faster on slow mobile connections. EXIF orientation
// is respected. Fails open: if anything goes wrong, the original file is used.

const DEFAULTS = {
  maxDimension: 1600, // longest edge, in px
  quality: 0.8, // JPEG quality 0..1
  mimeType: 'image/jpeg',
};

export async function compressImage(file, opts = {}) {
  const { maxDimension, quality, mimeType } = { ...DEFAULTS, ...opts };
  if (!file || !file.type?.startsWith('image/')) return file;

  try {
    const bitmap = await loadBitmap(file);
    const origW = bitmap.width || bitmap.naturalWidth;
    const origH = bitmap.height || bitmap.naturalHeight;
    const { width, height } = scaleToFit(origW, origH, maxDimension);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0, width, height);
    if (typeof bitmap.close === 'function') bitmap.close();

    const blob = await canvasToBlob(canvas, mimeType, quality);
    if (!blob) return file;

    // If re-encoding didn't actually shrink the file and we didn't resize,
    // keep the original to avoid needlessly degrading quality.
    if (blob.size >= file.size && width === origW && height === origH) {
      return file;
    }

    return new File([blob], renameExt(file.name || 'photo', 'jpg'), {
      type: mimeType,
      lastModified: Date.now(),
    });
  } catch {
    return file; // fail open — upload the original
  }
}

async function loadBitmap(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      return await createImageBitmap(file); // older browsers ignore options
    }
  }
  // Fallback for environments without createImageBitmap.
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

function scaleToFit(w, h, max) {
  if (!w || !h || (w <= max && h <= max)) return { width: w, height: h };
  const ratio = Math.min(max / w, max / h);
  return { width: Math.round(w * ratio), height: Math.round(h * ratio) };
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => {
    if (canvas.toBlob) {
      canvas.toBlob(resolve, type, quality);
    } else {
      // Very old fallback via data URL.
      try {
        resolve(dataURLToBlob(canvas.toDataURL(type, quality)));
      } catch {
        resolve(null);
      }
    }
  });
}

function dataURLToBlob(dataURL) {
  const [head, body] = dataURL.split(',');
  const mime = head.match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bytes = atob(body);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

function renameExt(name, ext) {
  return name.replace(/\.[^./\\]+$/, '') + '.' + ext;
}

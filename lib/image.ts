/**
 * Load an image File and return a compressed data URL.
 * Large phone photos are downscaled so they still fit in Postgres TEXT
 * without a hard client-side file-size reject.
 */
export const fileToCompressedDataUrl = (
  file: File,
  options?: { maxEdge?: number; quality?: number; mimeType?: string }
): Promise<string> => {
  const maxEdge = options?.maxEdge ?? 2048;
  const quality = options?.quality ?? 0.85;
  const mimeType = options?.mimeType ?? 'image/jpeg';

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read image file.'));
    reader.onload = () => {
      const src = reader.result as string;
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image file.'));
      img.onload = () => {
        const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(src);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        try {
          // Keep PNG/WebP transparency only when small enough after scale
          if (file.type === 'image/png' || file.type === 'image/webp') {
            resolve(canvas.toDataURL(file.type));
          } else {
            resolve(canvas.toDataURL(mimeType, quality));
          }
        } catch {
          resolve(src);
        }
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
};

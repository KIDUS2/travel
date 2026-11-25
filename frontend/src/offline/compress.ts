import { getUploadSettings } from './settings';

const MAX_SIDE = 2048;
const QUALITY = 0.85;

/**
 * With data saver on, shrinks large photos to at most 2048 px as JPEG.
 * Re-encoding also drops the photo's hidden GPS data from the uploaded file.
 * Videos, audio and small images are returned unchanged.
 */
export async function prepareForUpload(file: File): Promise<File> {
  if (!getUploadSettings().dataSaver) return file;
  if (!/^image\/(jpeg|png|webp|heic|heif)$/.test(file.type)) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', QUALITY));
    // Keep a smaller PNG/WebP original (no GPS data there); JPEGs are always re-encoded so their GPS is dropped.
    if (!blob || (blob.size >= file.size && file.type !== 'image/jpeg')) return file;
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg', lastModified: file.lastModified });
  } catch {
    return file; // the browser cannot decode it (e.g. HEIC on desktop): upload the original
  }
}

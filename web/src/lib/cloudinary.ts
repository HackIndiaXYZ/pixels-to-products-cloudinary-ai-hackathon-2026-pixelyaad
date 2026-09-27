/**
 * Cloudinary URL builder for Pixelyaad.
 *
 * All delivery URLs are derived client-side from the cloud name + public ID —
 * no secret ever touches the browser. Transformation credit costs (free tier):
 * e_gen_restore ~100 tx, e_improve 1 tx, everything else below is free.
 */

const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined;

export function isCloudinaryConfigured(): boolean {
  return Boolean(cloudName);
}

function buildUrl(publicId: string, transformation: string): string {
  const t = transformation ? `${transformation}/` : '';
  return `https://res.cloudinary.com/${cloudName}/image/upload/${t}${publicId}`;
}

/** Standard optimized delivery (f_auto + q_auto). */
export function deliveryUrl(publicId: string): string {
  return buildUrl(publicId, 'f_auto,q_auto');
}

/** Gallery thumbnail, width-capped. */
export function thumbnailUrl(publicId: string): string {
  return buildUrl(publicId, 'w_800,c_limit,f_auto,q_auto');
}

/** AI generative restore — the "after" side of the before/after slider. */
export function restoreUrl(publicId: string): string {
  return buildUrl(publicId, 'e_gen_restore,f_auto,q_auto');
}

/** Cheap AI auto-enhance variant. */
export function enhancedUrl(publicId: string): string {
  return buildUrl(publicId, 'e_improve,f_auto,q_auto');
}

/** Escape user text for Cloudinary text overlays (commas, slashes, %). */
function escapeOverlayText(text: string): string {
  return text.replace(/%/g, '%25').replace(/,/g, '%2C').replace(/\//g, '%2F');
}

/**
 * Shareable memory card: 4:5 crop with a gold caption overlay at the bottom.
 * Opens as a plain image URL — easy to share on WhatsApp/Instagram.
 */
export function memoryCardUrl(publicId: string, caption: string): string {
  const safe = escapeOverlayText(caption.slice(0, 80).trim() || 'Pixelyaad');
  return buildUrl(
    publicId,
    `w_1080,h_1350,c_fill,g_auto,f_auto,q_auto/l_text:Arial_48_bold:${safe},co_rgb:F5C518,g_south,y_60`,
  );
}

export interface UploadResult {
  public_id: string;
  secure_url: string;
  /** Populated when the AI auto-tagging add-on is registered on the cloud. */
  tags?: string[];
  /** Raw add-on payloads (AI Vision, categorization, …) — parsed later. */
  info?: Record<string, unknown>;
}

/**
 * Direct browser → Cloudinary upload via an unsigned preset.
 * No backend round-trip, no secret needed.
 */
export async function uploadUnsigned(file: File, preset: string): Promise<UploadResult> {
  if (!cloudName) throw new Error('Cloudinary cloud name is not configured (VITE_CLOUDINARY_CLOUD_NAME)');
  const form = new FormData();
  form.append('file', file);
  form.append('upload_preset', preset);
  form.append('tags', 'pixelyaad');

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Cloudinary upload failed (${res.status}): ${text.slice(0, 200)}`);
  }
  return (await res.json()) as UploadResult;
}

/**
 * Same unsigned upload, but with byte-level progress via XMLHttpRequest
 * (fetch has no upload-progress API). Used by the dropzone progress bar.
 */
export function uploadUnsignedWithProgress(
  file: File,
  preset: string,
  onProgress: (pct: number) => void,
): Promise<UploadResult> {
  if (!cloudName) return Promise.reject(new Error('Cloudinary cloud name is not configured (VITE_CLOUDINARY_CLOUD_NAME)'));
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as UploadResult);
        } catch {
          reject(new Error('Upload succeeded but the response was unreadable'));
        }
      } else {
        reject(new Error(`Cloudinary upload failed (${xhr.status}): ${xhr.responseText.slice(0, 200)}`));
      }
    };
    xhr.onerror = () => reject(new Error('Upload network error — connection toot gaya'));
    const form = new FormData();
    form.append('file', file);
    form.append('upload_preset', preset);
    form.append('tags', 'pixelyaad');
    xhr.send(form);
  });
}

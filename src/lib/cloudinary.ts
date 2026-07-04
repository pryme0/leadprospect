/**
 * Server-side Cloudinary uploads.
 *
 * Uploads run through OUR API route (not the browser) so the API secret never
 * reaches the client. Configuration comes from env:
 *   CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
 * (or a single CLOUDINARY_URL). When unset, uploads are considered
 * "not configured" and callers fall back to an inline data URI so the feature
 * still works before keys are added.
 */
import { v2 as cloudinary } from 'cloudinary';

let configured = false;

function ensureConfig(): boolean {
  if (configured) return true;
  const url = process.env.CLOUDINARY_URL;
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  const key = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;

  if (url) {
    // CLOUDINARY_URL is auto-read by the SDK; just enable https.
    cloudinary.config({ secure: true });
    configured = true;
  } else if (cloud && key && secret) {
    cloudinary.config({ cloud_name: cloud, api_key: key, api_secret: secret, secure: true });
    configured = true;
  }
  return configured;
}

/** True when Cloudinary credentials are present. */
export function cloudinaryConfigured(): boolean {
  return ensureConfig();
}

export interface UploadResult {
  url: string;        // https secure_url
  publicId: string;
  width?: number;
  height?: number;
  bytes?: number;
  format?: string;
}

/**
 * Upload an image buffer to Cloudinary. `folder` scopes assets (e.g. 'synq/logos').
 * The image is stored as-is; delivery transformations can be applied at the URL.
 * Throws if Cloudinary isn't configured or the upload fails.
 */
export function uploadImage(buffer: Buffer, opts: { folder?: string; publicId?: string } = {}): Promise<UploadResult> {
  if (!ensureConfig()) throw new Error('Cloudinary is not configured');
  return new Promise<UploadResult>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: opts.folder ?? 'synq',
        public_id: opts.publicId,
        resource_type: 'image',
        overwrite: true,
        // Modest cap + auto format/quality on delivery keeps stored logos small.
        transformation: [{ width: 1024, height: 1024, crop: 'limit' }],
      },
      (error, result) => {
        if (error || !result) return reject(error ?? new Error('Upload failed'));
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
          bytes: result.bytes,
          format: result.format,
        });
      },
    );
    stream.end(buffer);
  });
}

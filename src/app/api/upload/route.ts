import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/session';
import { cloudinaryConfigured, uploadImage } from '@/lib/cloudinary';

export const dynamic = 'force-dynamic';
// Uploads use the Node runtime (Buffer + Cloudinary SDK), not the edge runtime.
export const runtime = 'nodejs';

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml']);

/**
 * POST /api/upload — upload an image (e.g. company logo) to Cloudinary and
 * return its hosted URL. Multipart form: `file` (+ optional `folder`). Auth
 * required. When Cloudinary isn't configured, returns 503 with code
 * 'not_configured' so the client can fall back to an inline data URI.
 */
export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });

  if (!cloudinaryConfigured()) {
    return NextResponse.json(
      { message: 'Image hosting is not configured (set CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET).', code: 'not_configured' },
      { status: 503 },
    );
  }

  let form: FormData;
  try { form = await req.formData(); } catch { return NextResponse.json({ message: 'Expected multipart form data.' }, { status: 400 }); }

  const file = form.get('file');
  if (!(file instanceof File)) return NextResponse.json({ message: 'No file provided.' }, { status: 400 });
  if (!ALLOWED.has(file.type)) return NextResponse.json({ message: 'Unsupported image type.' }, { status: 415 });
  if (file.size > MAX_BYTES) return NextResponse.json({ message: 'Image is too large (max 5MB).' }, { status: 413 });

  const folderRaw = String(form.get('folder') ?? 'synq/logos');
  const folder = /^[a-z0-9/_-]+$/i.test(folderRaw) ? folderRaw : 'synq/logos';

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    // Scope the asset to the uploading user (folder is applied separately) so
    // logos don't collide across orgs and re-uploads overwrite the same asset.
    const result = await uploadImage(buffer, { folder, publicId: user.org });
    return NextResponse.json({ url: result.url, publicId: result.publicId, width: result.width, height: result.height });
  } catch (err) {
    console.error('[POST /api/upload]', err);
    return NextResponse.json({ message: 'Upload failed. Please try again.' }, { status: 502 });
  }
}

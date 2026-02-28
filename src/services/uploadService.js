const { v2: cloudinary } = require('cloudinary');
const { Readable } = require('stream');

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (cloudName && apiKey && apiSecret) {
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
}

/**
 * Upload a file buffer to Cloudinary.
 * @param {Buffer} buffer - File buffer
 * @param {string} folder - Cloudinary folder (e.g. 'clinic/avatars/userId')
 * @param {string} mimeType - e.g. 'image/jpeg'
 * @param {string} originalName - optional, for public_id
 * @returns {Promise<{ url: string } | null>} Secure URL or null on failure
 */
function uploadToCloudinary(buffer, folder, mimeType = 'application/octet-stream', originalName = '') {
  if (!cloudName || !apiKey || !apiSecret) {
    console.warn('Cloudinary not configured (missing CLOUDINARY_CLOUD_NAME, API_KEY, or API_SECRET)');
    return null;
  }
  return new Promise((resolve) => {
    const publicId = originalName ? `${Date.now()}-${originalName.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9-_]/g, '_')}` : undefined;
    const opts = {
      folder,
      resource_type: mimeType.startsWith('image/') ? 'image' : 'raw',
      ...(publicId && { public_id: publicId }),
    };
    const stream = cloudinary.uploader.upload_stream(opts, (err, result) => {
      if (err) {
        console.error('Cloudinary upload error:', err);
        resolve(null);
        return;
      }
      resolve({ url: result.secure_url });
    });
    const readable = Readable.from(buffer);
    readable.pipe(stream);
  });
}

/**
 * Folder path for avatar upload.
 */
function avatarFolder(userId) {
  return `clinic/avatars/${userId}`;
}

/**
 * Folder path for document upload.
 */
function documentFolder(userId) {
  return `clinic/documents/${userId}`;
}

module.exports = { uploadToCloudinary, avatarFolder, documentFolder };

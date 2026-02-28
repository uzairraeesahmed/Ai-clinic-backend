const multer = require('multer');
const { uploadToCloudinary, avatarFolder, documentFolder } = require('../services/uploadService');

// Store file in memory for Cloudinary upload (no disk write)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    const allowedImages = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const allowedDocs = ['application/pdf', 'image/jpeg', 'image/png'];
    const type = req.body?.type || req.query?.type || 'avatar';
    const allowed = type === 'document' ? allowedDocs : allowedImages;
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error(`File type not allowed. Use: ${allowed.join(', ')}`));
  },
}).single('file');

exports.uploadFile = (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message || 'Upload failed' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file provided' });
    }
    const type = req.body?.type || 'avatar';
    const userId = req.user._id.toString();
    const folder = type === 'document'
      ? documentFolder(userId)
      : avatarFolder(userId);
    const result = await uploadToCloudinary(
      req.file.buffer,
      folder,
      req.file.mimetype,
      req.file.originalname
    );
    if (!result) {
      return res.status(503).json({ success: false, message: 'File storage unavailable. Check Cloudinary config.' });
    }
    res.json({ success: true, data: { url: result.url } });
  });
};

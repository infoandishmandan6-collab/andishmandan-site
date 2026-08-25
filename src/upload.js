// upload.js
// تنظیمات آپلود فایل (عکس اساتید و عکس/ویدیوی گالری) با استفاده از multer

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');

const uploadsRoot = path.join(__dirname, '..', 'uploads');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}
ensureDir(path.join(uploadsRoot, 'teachers'));
ensureDir(path.join(uploadsRoot, 'gallery'));

function makeStorage(subfolder) {
  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(uploadsRoot, subfolder)),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const randomName = crypto.randomBytes(16).toString('hex');
      cb(null, `${randomName}${ext}`);
    }
  });
}

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];

// آپلود عکس پروفایل استاد (فقط عکس، حداکثر ۵ مگابایت)
const uploadTeacherPhoto = multer({
  storage: makeStorage('teachers'),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      return cb(new Error('فقط فایل تصویری (jpg, png, webp, gif) مجاز است.'));
    }
    cb(null, true);
  }
});

// آپلود عکس یا ویدیوی گالری (حداکثر ۲۵ مگابایت)
const uploadGalleryMedia = multer({
  storage: makeStorage('gallery'),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (![...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES].includes(file.mimetype)) {
      return cb(new Error('فقط فایل تصویری یا ویدیویی مجاز است.'));
    }
    cb(null, true);
  }
});

module.exports = { uploadTeacherPhoto, uploadGalleryMedia, uploadsRoot };

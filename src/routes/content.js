// routes/content.js
// مسیرهای مدیریتی برای اساتید، گالری و محتوای متنی سایت
// این فایل جداگانه است تا هیچ تغییری در routes/admin.js (که از قبل کار می‌کرد) ایجاد نشود

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const db = require('../db');
const { requireAuth } = require('../auth');
const { uploadTeacherPhoto, uploadGalleryMedia } = require('../upload');

function clean(value, max = 2000) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}

function fileUrl(subfolder, filename) {
  return `/uploads/${subfolder}/${filename}`;
}

function deleteFileIfExists(fileUrlPath) {
  if (!fileUrlPath) return;
  const relative = fileUrlPath.replace(/^\/uploads\//, '');
  const fullPath = path.join(__dirname, '..', '..', 'uploads', relative);
  fs.unlink(fullPath, () => {}); // خطای عدم وجود فایل را نادیده می‌گیریم
}

// ==================== اساتید ====================

// لیست همه اساتید (برای پنل مدیریت)
router.get('/teachers', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM teachers ORDER BY sort_order ASC, id ASC').all();
  res.json({ ok: true, rows });
});

// افزودن استاد جدید (با آپلود عکس اختیاری)
router.post('/teachers', requireAuth, (req, res, next) => {
  uploadTeacherPhoto.single('photo')(req, res, (err) => {
    if (err) return res.status(400).json({ ok: false, error: err.message });
    next();
  });
}, (req, res) => {
  const { name_fa, name_en, name_ps, role_fa, role_en, role_ps, bio_fa, bio_en, bio_ps, sort_order } = req.body;

  if (!clean(name_fa)) {
    return res.status(400).json({ ok: false, error: 'نام استاد (فارسی) الزامی است.' });
  }

  const photoUrl = req.file ? fileUrl('teachers', req.file.filename) : null;

  const stmt = db.prepare(`
    INSERT INTO teachers (name_fa, name_en, name_ps, role_fa, role_en, role_ps, bio_fa, bio_en, bio_ps, photo_url, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    clean(name_fa), clean(name_en), clean(name_ps),
    clean(role_fa), clean(role_en), clean(role_ps),
    clean(bio_fa, 4000), clean(bio_en, 4000), clean(bio_ps, 4000),
    photoUrl, parseInt(sort_order) || 0
  );

  res.json({ ok: true, id: result.lastInsertRowid });
});

// ویرایش استاد (با امکان جایگزینی عکس)
router.put('/teachers/:id', requireAuth, (req, res, next) => {
  uploadTeacherPhoto.single('photo')(req, res, (err) => {
    if (err) return res.status(400).json({ ok: false, error: err.message });
    next();
  });
}, (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM teachers WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ ok: false, error: 'استاد پیدا نشد.' });
  }

  const { name_fa, name_en, name_ps, role_fa, role_en, role_ps, bio_fa, bio_en, bio_ps, sort_order } = req.body;

  let photoUrl = existing.photo_url;
  if (req.file) {
    deleteFileIfExists(existing.photo_url);
    photoUrl = fileUrl('teachers', req.file.filename);
  }

  db.prepare(`
    UPDATE teachers SET
      name_fa=?, name_en=?, name_ps=?, role_fa=?, role_en=?, role_ps=?,
      bio_fa=?, bio_en=?, bio_ps=?, photo_url=?, sort_order=?
    WHERE id=?
  `).run(
    clean(name_fa) || existing.name_fa, clean(name_en), clean(name_ps),
    clean(role_fa), clean(role_en), clean(role_ps),
    clean(bio_fa, 4000), clean(bio_en, 4000), clean(bio_ps, 4000),
    photoUrl, parseInt(sort_order) || 0, id
  );

  res.json({ ok: true });
});

// حذف استاد (عکسش هم پاک می‌شود)
router.delete('/teachers/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM teachers WHERE id = ?').get(id);
  if (existing) deleteFileIfExists(existing.photo_url);
  db.prepare('DELETE FROM teachers WHERE id = ?').run(id);
  res.json({ ok: true });
});

// ==================== گالری ====================

// لیست همه آیتم‌های گالری (برای پنل مدیریت)
router.get('/gallery', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM gallery ORDER BY sort_order ASC, id ASC').all();
  res.json({ ok: true, rows });
});

// افزودن آیتم جدید به گالری (آپلود عکس یا ویدیو)
router.post('/gallery', requireAuth, (req, res, next) => {
  uploadGalleryMedia.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ ok: false, error: err.message });
    next();
  });
}, (req, res) => {
  if (!req.file) {
    return res.status(400).json({ ok: false, error: 'انتخاب فایل عکس یا ویدیو الزامی است.' });
  }

  const { caption_fa, caption_en, caption_ps, sort_order } = req.body;
  const mediaType = req.file.mimetype.startsWith('video/') ? 'video' : 'image';
  const url = fileUrl('gallery', req.file.filename);

  const stmt = db.prepare(`
    INSERT INTO gallery (media_type, file_url, caption_fa, caption_en, caption_ps, sort_order)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(mediaType, url, clean(caption_fa), clean(caption_en), clean(caption_ps), parseInt(sort_order) || 0);

  res.json({ ok: true, id: result.lastInsertRowid });
});

// ویرایش کپشن/ترتیب یک آیتم گالری (بدون تغییر فایل)
router.put('/gallery/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM gallery WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ ok: false, error: 'آیتم گالری پیدا نشد.' });
  }
  const { caption_fa, caption_en, caption_ps, sort_order } = req.body;
  db.prepare(`
    UPDATE gallery SET caption_fa=?, caption_en=?, caption_ps=?, sort_order=? WHERE id=?
  `).run(clean(caption_fa), clean(caption_en), clean(caption_ps), parseInt(sort_order) || 0, id);
  res.json({ ok: true });
});

// حذف آیتم گالری (فایلش هم پاک می‌شود)
router.delete('/gallery/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM gallery WHERE id = ?').get(id);
  if (existing) deleteFileIfExists(existing.file_url);
  db.prepare('DELETE FROM gallery WHERE id = ?').run(id);
  res.json({ ok: true });
});

// ==================== محتوای متنی سایت ====================

// لیست کامل محتوای سایت، دسته‌بندی‌شده بر اساس بخش (برای پنل مدیریت)
router.get('/site-content', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM site_content ORDER BY section ASC, content_key ASC').all();
  res.json({ ok: true, rows });
});

// ویرایش یک متن مشخص (با کلید یکتا)
router.put('/site-content/:key', requireAuth, (req, res) => {
  const { key } = req.params;
  const existing = db.prepare('SELECT * FROM site_content WHERE content_key = ?').get(key);
  if (!existing) {
    return res.status(404).json({ ok: false, error: 'این متن در دیتابیس پیدا نشد.' });
  }
  const { value_fa, value_en, value_ps } = req.body;
  db.prepare(`
    UPDATE site_content SET value_fa=?, value_en=?, value_ps=?, updated_at=CURRENT_TIMESTAMP WHERE content_key=?
  `).run(
    clean(value_fa, 4000) || existing.value_fa,
    clean(value_en, 4000) || existing.value_en,
    clean(value_ps, 4000) || existing.value_ps,
    key
  );
  res.json({ ok: true });
});

module.exports = router;

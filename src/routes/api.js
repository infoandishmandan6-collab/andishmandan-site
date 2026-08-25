// routes/api.js
// مسیرهای عمومی برای ارسال فرم‌ها از سمت سایت

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const db = require('../db');

// محدودیت تعداد درخواست فقط برای ارسال فرم‌ها (POST) - از اسپم جلوگیری می‌کند
// مسیرهای GET (اساتید، گالری، محتوای سایت) که هنگام بازدید عادی سایت صدا زده می‌شوند، محدود نیستند
const formLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // ۱۵ دقیقه
  max: 20, // حداکثر ۲۰ درخواست ارسال فرم در ۱۵ دقیقه از هر آی‌پی
  message: { ok: false, error: 'تعداد درخواست‌های شما زیاد بوده، کمی بعد دوباره تلاش کنید.' }
});

// تابع کمکی برای پاک‌سازی ساده‌ی ورودی متنی
function clean(value) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, 2000); // جلوگیری از متن‌های خیلی طولانی
}

// ۱. فرم درخواست همکاری (مدرس / پرسنل / نمایندگی)
router.post('/collaboration', formLimiter, (req, res) => {
  const { name, phone, email, join_type, education_level, teaching_experience, english_certificate } = req.body;

  if (!clean(name) || !clean(phone)) {
    return res.status(400).json({ ok: false, error: 'نام و شماره تماس الزامی است.' });
  }

  const stmt = db.prepare(`
    INSERT INTO collaborations (name, phone, email, join_type, education_level, teaching_experience, english_certificate)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    clean(name), clean(phone), clean(email), clean(join_type),
    clean(education_level), clean(teaching_experience), clean(english_certificate)
  );

  res.json({ ok: true, id: result.lastInsertRowid });
});

// ۲. فرم ثبت‌نام دانش‌آموز
router.post('/registration', formLimiter, (req, res) => {
  const { name, phone, age, gender, course, level, message } = req.body;

  if (!clean(name) || !clean(phone)) {
    return res.status(400).json({ ok: false, error: 'نام و شماره تماس الزامی است.' });
  }

  const stmt = db.prepare(`
    INSERT INTO registrations (name, phone, age, gender, course, level, message)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    clean(name), clean(phone), clean(age), clean(gender),
    clean(course), clean(level), clean(message)
  );

  res.json({ ok: true, id: result.lastInsertRowid });
});

// ۳. فرم نظرات دانش‌آموزان
router.post('/testimonial', formLimiter, (req, res) => {
  const { name, course, teacher, level_taken, review } = req.body;

  if (!clean(name) || !clean(review)) {
    return res.status(400).json({ ok: false, error: 'نام و متن نظر الزامی است.' });
  }

  const stmt = db.prepare(`
    INSERT INTO testimonials (name, course, teacher, level_taken, review)
    VALUES (?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    clean(name), clean(course), clean(teacher), clean(level_taken), clean(review)
  );

  res.json({ ok: true, id: result.lastInsertRowid });
});

// ۴. فرم شکایات
router.post('/complaint', formLimiter, (req, res) => {
  const { name, phone, subject, details } = req.body;

  if (!clean(name) || !clean(details)) {
    return res.status(400).json({ ok: false, error: 'نام و شرح شکایت الزامی است.' });
  }

  const stmt = db.prepare(`
    INSERT INTO complaints (name, phone, subject, details)
    VALUES (?, ?, ?, ?)
  `);
  const result = stmt.run(clean(name), clean(phone), clean(subject), clean(details));

  res.json({ ok: true, id: result.lastInsertRowid });
});

// ۵. لیست عمومی اساتید (برای نمایش در سایت)
router.get('/teachers', (req, res) => {
  const rows = db.prepare('SELECT * FROM teachers ORDER BY sort_order ASC, id ASC').all();
  res.json({ ok: true, rows });
});

// ۶. لیست عمومی گالری (برای نمایش در سایت)
router.get('/gallery', (req, res) => {
  const rows = db.prepare('SELECT * FROM gallery ORDER BY sort_order ASC, id ASC').all();
  res.json({ ok: true, rows });
});

// ۷. محتوای متنی سایت (برای جایگزینی متن‌های قابل‌ویرایش)
router.get('/site-content', (req, res) => {
  const content = db.prepare('SELECT content_key, value_fa, value_en, value_ps FROM site_content').all();
  res.json({ ok: true, content });
});

module.exports = router;

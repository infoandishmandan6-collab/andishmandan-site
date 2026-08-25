// db.js
// راه‌اندازی دیتابیس SQLite و ساخت جدول‌های مربوط به هر فرم

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'andishmandan.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

// جدول فرم درخواست همکاری (مدرس / پرسنل / نمایندگی)
db.exec(`
CREATE TABLE IF NOT EXISTS collaborations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  phone TEXT,
  email TEXT,
  join_type TEXT,
  education_level TEXT,
  teaching_experience TEXT,
  english_certificate TEXT,
  status TEXT DEFAULT 'new',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// جدول فرم ثبت‌نام دانش‌آموز
db.exec(`
CREATE TABLE IF NOT EXISTS registrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  phone TEXT,
  age TEXT,
  gender TEXT,
  course TEXT,
  level TEXT,
  message TEXT,
  status TEXT DEFAULT 'new',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// جدول فرم نظرات دانش‌آموزان
db.exec(`
CREATE TABLE IF NOT EXISTS testimonials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  course TEXT,
  teacher TEXT,
  level_taken TEXT,
  review TEXT,
  status TEXT DEFAULT 'new',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// جدول فرم شکایات
db.exec(`
CREATE TABLE IF NOT EXISTS complaints (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  phone TEXT,
  subject TEXT,
  details TEXT,
  status TEXT DEFAULT 'new',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// جدول اساتید
db.exec(`
CREATE TABLE IF NOT EXISTS teachers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name_fa TEXT, name_en TEXT, name_ps TEXT,
  role_fa TEXT, role_en TEXT, role_ps TEXT,
  bio_fa TEXT, bio_en TEXT, bio_ps TEXT,
  photo_url TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// جدول گالری عکس و ویدیو
db.exec(`
CREATE TABLE IF NOT EXISTS gallery (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  media_type TEXT NOT NULL, -- 'image' یا 'video'
  file_url TEXT NOT NULL,
  caption_fa TEXT, caption_en TEXT, caption_ps TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// جدول محتوای سایت - هر ردیف یک متن قابل‌ویرایش با کلید یکتا و ترجمه سه‌زبانه
db.exec(`
CREATE TABLE IF NOT EXISTS site_content (
  content_key TEXT PRIMARY KEY,
  section TEXT,
  label TEXT,
  value_fa TEXT, value_en TEXT, value_ps TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// پر کردن اولیه‌ی جدول محتوای سایت با مقادیر پیش‌فرض متن‌های موجود در HTML
// (فقط برای کلیدهایی که هنوز در دیتابیس ثبت نشده‌اند - اجرای مجدد باعث بازنویسی نمی‌شود)
try {
  const seedPath = path.join(__dirname, 'content-seed.json');
  if (fs.existsSync(seedPath)) {
    const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));
    const insertIfMissing = db.prepare(`
      INSERT OR IGNORE INTO site_content (content_key, section, label, value_fa, value_en, value_ps)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const seedAll = db.transaction((items) => {
      for (const item of items) {
        insertIfMissing.run(item.key, item.section, item.label, item.fa, item.en, item.ps);
      }
    });
    seedAll(seedData);
  }
} catch (err) {
  console.error('خطا در بارگذاری مقادیر پیش‌فرض محتوای سایت:', err.message);
}

module.exports = db;

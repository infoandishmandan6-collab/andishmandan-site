// routes/admin.js
// مسیرهای پنل مدیریت: ورود، دیدن لیست فرم‌ها، تغییر وضعیت، حذف

const express = require('express');
const router = express.Router();
const db = require('../db');
const { login, logout, requireAuth } = require('../auth');

const TABLES = ['collaborations', 'registrations', 'testimonials', 'complaints'];

// ورود به پنل مدیریت
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const token = login(username, password);

  if (!token) {
    return res.status(401).json({ ok: false, error: 'نام کاربری یا رمز عبور اشتباه است.' });
  }
  res.json({ ok: true, token });
});

// خروج از پنل مدیریت
router.post('/logout', requireAuth, (req, res) => {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace('Bearer ', '').trim();
  logout(token);
  res.json({ ok: true });
});

// گرفتن خلاصه‌ی تعداد درخواست‌های هر فرم (برای صفحه اصلی پنل)
router.get('/summary', requireAuth, (req, res) => {
  const summary = {};
  for (const table of TABLES) {
    const total = db.prepare(`SELECT COUNT(*) as c FROM ${table}`).get().c;
    const newCount = db.prepare(`SELECT COUNT(*) as c FROM ${table} WHERE status = 'new'`).get().c;
    summary[table] = { total, new: newCount };
  }
  res.json({ ok: true, summary });
});

// گرفتن لیست رکوردهای یک فرم خاص
router.get('/:table', requireAuth, (req, res) => {
  const { table } = req.params;
  if (!TABLES.includes(table)) {
    return res.status(404).json({ ok: false, error: 'چنین فرمی وجود ندارد.' });
  }
  const rows = db.prepare(`SELECT * FROM ${table} ORDER BY id DESC`).all();
  res.json({ ok: true, rows });
});

// تغییر وضعیت یک رکورد (مثلاً از "جدید" به "بررسی‌شده")
router.patch('/:table/:id/status', requireAuth, (req, res) => {
  const { table, id } = req.params;
  const { status } = req.body;
  const allowedStatus = ['new', 'seen', 'done'];

  if (!TABLES.includes(table)) {
    return res.status(404).json({ ok: false, error: 'چنین فرمی وجود ندارد.' });
  }
  if (!allowedStatus.includes(status)) {
    return res.status(400).json({ ok: false, error: 'وضعیت نامعتبر است.' });
  }

  db.prepare(`UPDATE ${table} SET status = ? WHERE id = ?`).run(status, id);
  res.json({ ok: true });
});

// حذف یک رکورد
router.delete('/:table/:id', requireAuth, (req, res) => {
  const { table, id } = req.params;
  if (!TABLES.includes(table)) {
    return res.status(404).json({ ok: false, error: 'چنین فرمی وجود ندارد.' });
  }
  db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
  res.json({ ok: true });
});

module.exports = router;
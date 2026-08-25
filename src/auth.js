// auth.js
// سیستم ساده‌ی ورود برای پنل مدیریت (بدون نیاز به دیتابیس کاربران جدا)
// یک توکن تصادفی هنگام ورود موفق ساخته می‌شود و در حافظه سرور نگه داشته می‌شود.

const crypto = require('crypto');

// نگهداری توکن‌های فعال در حافظه: { token: expiryTimestamp }
const activeSessions = new Map();

const SESSION_DURATION_MS = 12 * 60 * 60 * 1000; // 12 ساعت

function login(username, password) {
  const validUser = process.env.ADMIN_USERNAME || 'admin';
  const validPass = process.env.ADMIN_PASSWORD || 'admin';

  if (username !== validUser || password !== validPass) {
    return null;
  }

  const token = crypto.randomBytes(32).toString('hex');
  activeSessions.set(token, Date.now() + SESSION_DURATION_MS);
  return token;
}

function isValidToken(token) {
  if (!token) return false;
  const expiry = activeSessions.get(token);
  if (!expiry) return false;
  if (Date.now() > expiry) {
    activeSessions.delete(token);
    return false;
  }
  return true;
}

function logout(token) {
  activeSessions.delete(token);
}

// میان‌افزار (middleware) برای محافظت از مسیرهای پنل مدیریت
function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace('Bearer ', '').trim();

  if (!isValidToken(token)) {
    return res.status(401).json({ ok: false, error: 'ورود شما منقضی شده یا نامعتبر است.' });
  }
  next();
}

module.exports = { login, logout, isValidToken, requireAuth };

// server.js
// نقطه ورود اصلی سرور - سایت + API فرم‌ها + پنل مدیریت را سرو می‌کند

require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');

const apiRoutes = require('./src/routes/api');
const adminRoutes = require('./src/routes/admin');
const contentRoutes = require('./src/routes/content');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// مسیرهای API عمومی (ارسال فرم از سایت + دریافت اساتید/گالری/محتوا)
// محدودیت تعداد درخواست فقط روی مسیرهای POST داخل api.js اعمال می‌شود، نه مسیرهای GET عمومی
app.use('/api', apiRoutes);

// مسیرهای مدیریتی جدید (اساتید، گالری، محتوای سایت) - باید قبل از مسیرهای عمومی پنل مدیریت باشد
app.use('/api/admin', contentRoutes);

// مسیرهای پنل مدیریت (فرم‌های قبلی: ثبت‌نام، همکاری، نظرات، شکایات)
app.use('/api/admin', adminRoutes);

// سرو کردن فایل‌های آپلودشده (عکس اساتید و گالری)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// سرو کردن فایل‌های سایت اصلی (index.html و غیره)
app.use(express.static(path.join(__dirname, 'public')));

// سرو کردن پنل مدیریت روی مسیر /admin
app.use('/admin', express.static(path.join(__dirname, 'public', 'admin')));

app.listen(PORT, () => {
  console.log(`سرور در حال اجراست: http://localhost:${PORT}`);
  console.log(`پنل مدیریت: http://localhost:${PORT}/admin`);
});

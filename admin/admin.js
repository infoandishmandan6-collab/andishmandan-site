// admin.js - منطق پنل مدیریت

const API_BASE = '/api/admin';
let currentTable = 'registrations';
let authToken = localStorage.getItem('admin_token') || '';

// برچسب فارسی فیلدها برای هر جدول
const FIELD_LABELS = {
  registrations: {
    name: 'نام کامل', phone: 'شماره تماس', age: 'سن', gender: 'جنسیت',
    course: 'صنف مورد نظر', level: 'سطح فعلی', message: 'توضیح تکمیلی'
  },
  collaborations: {
    name: 'نام کامل', phone: 'شماره تماس', email: 'ایمیل', join_type: 'نوع همکاری',
    education_level: 'مقطع تحصیلی', teaching_experience: 'سابقه تدریس', english_certificate: 'مدرک زبان'
  },
  testimonials: {
    name: 'نام کامل', course: 'دوره', teacher: 'استاد', level_taken: 'لیول', review: 'نظر'
  },
  complaints: {
    name: 'نام کامل', phone: 'شماره تماس', subject: 'موضوع', details: 'شرح شکایت'
  }
};

// فیلدهایی که باید به‌صورت متن بلند (پاراگراف) نمایش داده شوند
const LONG_FIELDS = ['message', 'review', 'details'];

const TABLE_TITLES = {
  registrations: 'هیچ ثبت‌نامی هنوز ثبت نشده است.',
  collaborations: 'هیچ درخواست همکاری‌ای هنوز ثبت نشده است.',
  testimonials: 'هیچ نظری هنوز ثبت نشده است.',
  complaints: 'هیچ شکایتی هنوز ثبت نشده است.'
};

const loginScreen = document.getElementById('loginScreen');
const dashboard = document.getElementById('dashboard');

function showDashboard() {
  loginScreen.style.display = 'none';
  dashboard.style.display = 'block';
  loadSummary();
  loadTable(currentTable);
}

function showLogin() {
  loginScreen.style.display = 'flex';
  dashboard.style.display = 'none';
}

// بررسی اینکه آیا قبلاً وارد شده‌ایم
if (authToken) {
  showDashboard();
} else {
  showLogin();
}

// --- ورود ---
document.getElementById('loginBtn').addEventListener('click', doLogin);
document.getElementById('password').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') doLogin();
});

async function doLogin() {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const errorBox = document.getElementById('loginError');
  errorBox.style.display = 'none';

  try {
    const res = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!data.ok) {
      errorBox.textContent = data.error || 'ورود ناموفق بود.';
      errorBox.style.display = 'block';
      return;
    }
    authToken = data.token;
    localStorage.setItem('admin_token', authToken);
    showDashboard();
  } catch (err) {
    errorBox.textContent = 'خطا در اتصال به سرور.';
    errorBox.style.display = 'block';
  }
}

// --- خروج ---
document.getElementById('logoutBtn').addEventListener('click', async () => {
  try {
    await fetch(`${API_BASE}/logout`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
  } catch (e) {}
  authToken = '';
  localStorage.removeItem('admin_token');
  showLogin();
});

// --- تب‌ها (فرم‌های قبلی: ثبت‌نام، همکاری، نظرات، شکایات) ---
document.querySelectorAll('.tab-btn[data-table]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('customContainer').style.display = 'none';
    document.getElementById('tableContainer').style.display = 'block';
    currentTable = btn.dataset.table;
    loadTable(currentTable);
  });
});

// --- تب‌های جدید (اساتید، گالری، محتوای سایت) ---
document.querySelectorAll('.tab-btn[data-custom]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tableContainer').style.display = 'none';
    document.getElementById('customContainer').style.display = 'block';
    const section = btn.dataset.custom;
    if (section === 'teachers') loadTeachersAdmin();
    else if (section === 'gallery') loadGalleryAdmin();
    else if (section === 'content') loadContentAdmin();
  });
});

// --- خلاصه تعداد (بج‌های عدد جدید) ---
async function loadSummary() {
  const res = await authFetch(`${API_BASE}/summary`);
  if (!res || !res.ok) return;
  for (const table in res.summary) {
    const badgeEl = document.getElementById(`badge-${table}`);
    if (badgeEl) {
      const n = res.summary[table].new;
      badgeEl.textContent = n > 0 ? n : '';
    }
  }
}

// --- بارگذاری لیست یک جدول ---
async function loadTable(table) {
  const container = document.getElementById('tableContainer');
  container.innerHTML = '<p class="empty-state">در حال بارگذاری...</p>';

  const res = await authFetch(`${API_BASE}/${table}`);
  if (!res || !res.ok) {
    container.innerHTML = '<p class="empty-state">خطا در بارگذاری اطلاعات.</p>';
    return;
  }

  if (res.rows.length === 0) {
    container.innerHTML = `<p class="empty-state">${TABLE_TITLES[table]}</p>`;
    return;
  }

  container.innerHTML = res.rows.map(row => renderCard(table, row)).join('');

  // اتصال رویدادها به دکمه‌ها و منوهای کشویی
  container.querySelectorAll('[data-action="status"]').forEach(sel => {
    sel.addEventListener('change', (e) => updateStatus(table, e.target.dataset.id, e.target.value));
  });
  container.querySelectorAll('[data-action="delete"]').forEach(btn => {
    btn.addEventListener('click', (e) => deleteRecord(table, e.target.dataset.id));
  });

  loadSummary();
}

function renderCard(table, row) {
  const labels = FIELD_LABELS[table];
  const date = new Date(row.created_at).toLocaleString('fa-IR');

  let gridHtml = '';
  let longHtml = '';

  for (const key in labels) {
    if (key === 'name') continue;
    const value = row[key] || '—';
    if (LONG_FIELDS.includes(key)) {
      longHtml += `<div class="record-msg"><span class="k">${labels[key]}:</span><br>${escapeHtml(value)}</div>`;
    } else {
      gridHtml += `<div class="record-field"><span class="k">${labels[key]}</span><span class="v">${escapeHtml(value)}</span></div>`;
    }
  }

  return `
    <div class="record-card status-${row.status}">
      <div class="record-top">
        <span class="record-name">${escapeHtml(row.name || '—')}</span>
        <span class="record-date">${date}</span>
      </div>
      <div class="record-grid">${gridHtml}</div>
      ${longHtml}
      <div class="record-actions">
        <select data-action="status" data-id="${row.id}">
          <option value="new" ${row.status === 'new' ? 'selected' : ''}>جدید</option>
          <option value="seen" ${row.status === 'seen' ? 'selected' : ''}>بررسی‌شده</option>
          <option value="done" ${row.status === 'done' ? 'selected' : ''}>تکمیل‌شده</option>
        </select>
        <button class="btn-del" data-action="delete" data-id="${row.id}">حذف</button>
      </div>
    </div>
  `;
}

async function updateStatus(table, id, status) {
  await authFetch(`${API_BASE}/${table}/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
  loadTable(table);
}

async function deleteRecord(table, id) {
  if (!confirm('آیا از حذف این رکورد مطمئن هستید؟')) return;
  await authFetch(`${API_BASE}/${table}/${id}`, { method: 'DELETE' });
  loadTable(table);
}

// تابع کمکی برای درخواست‌های دارای توکن ورود، با مدیریت خودکار خروج در صورت انقضا
async function authFetch(url, options = {}) {
  options.headers = Object.assign({}, options.headers, { 'Authorization': `Bearer ${authToken}` });
  try {
    const res = await fetch(url, options);
    if (res.status === 401) {
      authToken = '';
      localStorage.removeItem('admin_token');
      showLogin();
      return null;
    }
    return await res.json();
  } catch (err) {
    return null;
  }
}

// تابع کمکی برای درخواست‌های آپلود فایل (multipart) با توکن ورود
async function authFetchForm(url, method, formData) {
  try {
    const res = await fetch(url, {
      method,
      headers: { 'Authorization': `Bearer ${authToken}` },
      body: formData
    });
    if (res.status === 401) {
      authToken = '';
      localStorage.removeItem('admin_token');
      showLogin();
      return null;
    }
    return await res.json();
  } catch (err) {
    return null;
  }
}

// ==================== اساتید ====================

async function loadTeachersAdmin() {
  const container = document.getElementById('customContainer');
  container.innerHTML = '<p class="empty-state">در حال بارگذاری...</p>';

  const res = await authFetch(`${API_BASE}/teachers`);
  if (!res || !res.ok) {
    container.innerHTML = '<p class="empty-state">خطا در بارگذاری اطلاعات.</p>';
    return;
  }

  const listHtml = res.rows.length === 0
    ? '<p class="empty-state">هنوز استادی اضافه نشده است.</p>'
    : res.rows.map(t => `
      <div class="admin-card">
        <div class="admin-card-top">
          <div class="admin-card-photo">${t.photo_url ? `<img src="${t.photo_url}" alt="">` : '<span>👤</span>'}</div>
          <div>
            <div class="record-name">${escapeHtml(t.name_fa)}</div>
            <div class="record-date">${escapeHtml(t.role_fa || '')}</div>
          </div>
        </div>
        <div class="admin-card-actions">
          <button class="btn-edit" data-action="edit-teacher" data-id="${t.id}">ویرایش</button>
          <button class="btn-del" data-action="delete-teacher" data-id="${t.id}">حذف</button>
        </div>
      </div>
    `).join('');

  container.innerHTML = `
    <button class="btn-primary btn-add" id="addTeacherBtn" style="width:auto; padding:10px 20px; margin-bottom:18px;">+ افزودن استاد جدید</button>
    <div id="teacherFormWrap"></div>
    <div class="admin-grid">${listHtml}</div>
  `;

  document.getElementById('addTeacherBtn').addEventListener('click', () => renderTeacherForm());
  container.querySelectorAll('[data-action="edit-teacher"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const teacher = res.rows.find(t => String(t.id) === btn.dataset.id);
      renderTeacherForm(teacher);
    });
  });
  container.querySelectorAll('[data-action="delete-teacher"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('آیا از حذف این استاد مطمئن هستید؟')) return;
      await authFetch(`${API_BASE}/teachers/${btn.dataset.id}`, { method: 'DELETE' });
      loadTeachersAdmin();
    });
  });
}

function renderTeacherForm(teacher) {
  const wrap = document.getElementById('teacherFormWrap');
  const isEdit = !!teacher;
  wrap.innerHTML = `
    <div class="admin-form">
      <h3>${isEdit ? 'ویرایش استاد' : 'افزودن استاد جدید'}</h3>
      <div class="form-grid-3">
        <div class="field"><label>نام (فارسی) *</label><input type="text" id="tf_name_fa" value="${escapeAttr(teacher?.name_fa)}"></div>
        <div class="field"><label>نام (English)</label><input type="text" id="tf_name_en" value="${escapeAttr(teacher?.name_en)}"></div>
        <div class="field"><label>نام (پشتو)</label><input type="text" id="tf_name_ps" value="${escapeAttr(teacher?.name_ps)}"></div>
      </div>
      <div class="form-grid-3">
        <div class="field"><label>نقش (فارسی)</label><input type="text" id="tf_role_fa" value="${escapeAttr(teacher?.role_fa)}" placeholder="مثلاً مدرس آیلتس"></div>
        <div class="field"><label>نقش (English)</label><input type="text" id="tf_role_en" value="${escapeAttr(teacher?.role_en)}"></div>
        <div class="field"><label>نقش (پشتو)</label><input type="text" id="tf_role_ps" value="${escapeAttr(teacher?.role_ps)}"></div>
      </div>
      <div class="form-grid-3">
        <div class="field"><label>بیوگرافی (فارسی)</label><textarea id="tf_bio_fa">${escapeHtml(teacher?.bio_fa)}</textarea></div>
        <div class="field"><label>بیوگرافی (English)</label><textarea id="tf_bio_en">${escapeHtml(teacher?.bio_en)}</textarea></div>
        <div class="field"><label>بیوگرافی (پشتو)</label><textarea id="tf_bio_ps">${escapeHtml(teacher?.bio_ps)}</textarea></div>
      </div>
      <div class="field"><label>عکس پروفایل ${isEdit ? '(اختیاری - فقط برای تغییر عکس)' : ''}</label><input type="file" id="tf_photo" accept="image/*"></div>
      <div id="teacherFormMsg" class="form-msg-admin"></div>
      <div class="admin-form-actions">
        <button class="btn-primary" id="tf_save" style="width:auto; padding:10px 24px;">${isEdit ? 'ذخیره تغییرات' : 'افزودن استاد'}</button>
        <button class="btn-cancel" id="tf_cancel">انصراف</button>
      </div>
    </div>
  `;

  document.getElementById('tf_cancel').addEventListener('click', () => { wrap.innerHTML = ''; });
  document.getElementById('tf_save').addEventListener('click', async () => {
    const fd = new FormData();
    fd.append('name_fa', document.getElementById('tf_name_fa').value);
    fd.append('name_en', document.getElementById('tf_name_en').value);
    fd.append('name_ps', document.getElementById('tf_name_ps').value);
    fd.append('role_fa', document.getElementById('tf_role_fa').value);
    fd.append('role_en', document.getElementById('tf_role_en').value);
    fd.append('role_ps', document.getElementById('tf_role_ps').value);
    fd.append('bio_fa', document.getElementById('tf_bio_fa').value);
    fd.append('bio_en', document.getElementById('tf_bio_en').value);
    fd.append('bio_ps', document.getElementById('tf_bio_ps').value);
    const photoFile = document.getElementById('tf_photo').files[0];
    if (photoFile) fd.append('photo', photoFile);

    const msgBox = document.getElementById('teacherFormMsg');
    const url = isEdit ? `${API_BASE}/teachers/${teacher.id}` : `${API_BASE}/teachers`;
    const method = isEdit ? 'PUT' : 'POST';
    const res = await authFetchForm(url, method, fd);

    if (res && res.ok) {
      wrap.innerHTML = '';
      loadTeachersAdmin();
    } else {
      msgBox.textContent = (res && res.error) || 'خطا در ذخیره‌سازی.';
      msgBox.classList.add('show', 'error-inline');
    }
  });
}

// ==================== گالری ====================

async function loadGalleryAdmin() {
  const container = document.getElementById('customContainer');
  container.innerHTML = '<p class="empty-state">در حال بارگذاری...</p>';

  const res = await authFetch(`${API_BASE}/gallery`);
  if (!res || !res.ok) {
    container.innerHTML = '<p class="empty-state">خطا در بارگذاری اطلاعات.</p>';
    return;
  }

  const listHtml = res.rows.length === 0
    ? '<p class="empty-state">هنوز آیتمی به گالری اضافه نشده است.</p>'
    : res.rows.map(g => `
      <div class="gallery-admin-item">
        ${g.media_type === 'video'
          ? `<video src="${g.file_url}" muted></video>`
          : `<img src="${g.file_url}" alt="">`}
        <div class="gallery-admin-caption">${escapeHtml(g.caption_fa) || '<span style="opacity:.5">بدون توضیح</span>'}</div>
        <button class="btn-del" data-action="delete-gallery" data-id="${g.id}">حذف</button>
      </div>
    `).join('');

  container.innerHTML = `
    <div class="admin-form">
      <h3>افزودن عکس یا ویدیو جدید</h3>
      <div class="field"><label>فایل (عکس یا ویدیو) *</label><input type="file" id="gf_file" accept="image/*,video/*"></div>
      <div class="field"><label>توضیح (فارسی)</label><input type="text" id="gf_caption_fa"></div>
      <div id="galleryFormMsg" class="form-msg-admin"></div>
      <button class="btn-primary" id="gf_save" style="width:auto; padding:10px 24px;">افزودن به گالری</button>
    </div>
    <div class="gallery-admin-grid">${listHtml}</div>
  `;

  document.getElementById('gf_save').addEventListener('click', async () => {
    const file = document.getElementById('gf_file').files[0];
    const msgBox = document.getElementById('galleryFormMsg');
    if (!file) {
      msgBox.textContent = 'لطفاً یک فایل انتخاب کنید.';
      msgBox.classList.add('show', 'error-inline');
      return;
    }
    const fd = new FormData();
    fd.append('file', file);
    fd.append('caption_fa', document.getElementById('gf_caption_fa').value);

    const res = await authFetchForm(`${API_BASE}/gallery`, 'POST', fd);
    if (res && res.ok) {
      loadGalleryAdmin();
    } else {
      msgBox.textContent = (res && res.error) || 'خطا در آپلود فایل.';
      msgBox.classList.add('show', 'error-inline');
    }
  });

  container.querySelectorAll('[data-action="delete-gallery"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('آیا از حذف این آیتم مطمئن هستید؟')) return;
      await authFetch(`${API_BASE}/gallery/${btn.dataset.id}`, { method: 'DELETE' });
      loadGalleryAdmin();
    });
  });
}

// ==================== محتوای سایت ====================

async function loadContentAdmin() {
  const container = document.getElementById('customContainer');
  container.innerHTML = '<p class="empty-state">در حال بارگذاری...</p>';

  const res = await authFetch(`${API_BASE}/site-content`);
  if (!res || !res.ok) {
    container.innerHTML = '<p class="empty-state">خطا در بارگذاری اطلاعات.</p>';
    return;
  }

  const bySection = {};
  res.rows.forEach(row => {
    if (!bySection[row.section]) bySection[row.section] = [];
    bySection[row.section].push(row);
  });

  const sectionNames = {
    global: 'عمومی (منو، هدر، فوتر)', about: 'درباره ما', courses: 'دوره‌ها',
    teachers: 'اساتید (عنوان بخش)', gallery: 'گالری (عنوان بخش)', roadmap: 'مسیر یادگیری',
    jobs: 'فرصت‌های شغلی', representative: 'فرم همکاری', rules: 'قوانین و مقررات',
    'online-class': 'صنف‌های آنلاین', contact: 'تماس با ما', register: 'فرم ثبت‌نام',
    testimonials: 'نظرات', complaints: 'شکایات'
  };

  let html = '<p style="color:var(--text-muted); font-size:0.85rem; margin-bottom:16px;">هر متن را ویرایش کرده و دکمه ذخیره کنار همان مورد را بزنید.</p>';
  html += '<div class="content-accordion">';
  for (const section in bySection) {
    const title = sectionNames[section] || section;
    html += `<details class="content-section">
      <summary>${title} <span class="badge" style="background:var(--blue-soft);">${bySection[section].length}</span></summary>
      <div class="content-section-body">`;
    bySection[section].forEach(item => {
      html += `
        <div class="content-row" data-key="${item.content_key}">
          <div class="content-row-label">${escapeHtml(item.label)}</div>
          <div class="form-grid-3">
            <div class="field"><label>فارسی</label><textarea class="cf_fa">${escapeHtml(item.value_fa)}</textarea></div>
            <div class="field"><label>English</label><textarea class="cf_en">${escapeHtml(item.value_en)}</textarea></div>
            <div class="field"><label>پشتو</label><textarea class="cf_ps">${escapeHtml(item.value_ps)}</textarea></div>
          </div>
          <div class="content-row-msg"></div>
          <button class="btn-edit" data-action="save-content">ذخیره این متن</button>
        </div>`;
    });
    html += `</div></details>`;
  }
  html += '</div>';

  container.innerHTML = html;

  container.querySelectorAll('[data-action="save-content"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const row = btn.closest('.content-row');
      const key = row.dataset.key;
      const value_fa = row.querySelector('.cf_fa').value;
      const value_en = row.querySelector('.cf_en').value;
      const value_ps = row.querySelector('.cf_ps').value;
      const msgBox = row.querySelector('.content-row-msg');

      const result = await authFetch(`${API_BASE}/site-content/${encodeURIComponent(key)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value_fa, value_en, value_ps })
      });

      if (result && result.ok) {
        msgBox.textContent = 'ذخیره شد ✓';
        msgBox.classList.add('show', 'success-inline');
        setTimeout(() => { msgBox.classList.remove('show'); }, 2000);
      } else {
        msgBox.textContent = 'خطا در ذخیره‌سازی.';
        msgBox.classList.add('show', 'error-inline');
      }
    });
  });
}

function escapeHtml(str) {
  return String(str || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function escapeAttr(str) {
  return escapeHtml(str);
}

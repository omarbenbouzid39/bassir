# 🎬 بصير — دليل النشر الكامل
**by omar benbouzid dev**

---

## 📁 هيكل المشروع

```
baseer/
├── server.js                  ← Express 5 — نقطة البداية
├── database.js                ← PostgreSQL
├── package.json
├── render.yaml                ← إعدادات Render التلقائية
├── .env                       ← متغيرات البيئة المحلية
├── middleware/
│   ├── auth.js                ← JWT
│   └── upload.js              ← Cloudinary رفع الفيديوهات
├── routes/
│   ├── auth.js                ← /api/auth/register + login
│   ├── videos.js              ← /api/videos CRUD
│   └── users.js               ← /api/users profiles
└── public/
    ├── style.css
    ├── api.js
    ├── index.html             ← يعرض فيديوهات Cloudinary الحقيقية
    ├── upload.html            ← رفع فيديو حقيقي على Cloudinary
    ├── login.html
    └── profile.html
```

---

## ⚙️ الخطوة 1 — Cloudinary (مجاني)

1. اذهب إلى cloudinary.com وأنشئ حساباً مجانياً
2. من Dashboard احصل على: Cloud Name, API Key, API Secret

---

## 🚀 الخطوة 2 — النشر على Render

1. ارفع المشروع على GitHub
2. Render → New → Blueprint → اختر الـ repo
3. Render يقرأ render.yaml تلقائياً وينشئ:
   - Web Service + PostgreSQL مجانية مربوطة تلقائياً
4. أضف في Environment Variables:
   - CLOUDINARY_CLOUD_NAME
   - CLOUDINARY_API_KEY
   - CLOUDINARY_API_SECRET
5. Deploy ✅

---

## 💻 التشغيل المحلي

```bash
npm install
# عدّل .env بمعلومات قاعدة بياناتك و Cloudinary
npm start
# http://localhost:3000
```

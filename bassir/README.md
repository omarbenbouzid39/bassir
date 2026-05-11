# 🎬 بصير — دليل النشر الكامل
**by omar benbouzid dev**

---

## 📁 هيكل المشروع

```
baseer/
├── server.js                  ← Express 4 — نقطة البداية
├── database.js                ← MongoDB / Mongoose
├── package.json
├── render.yaml                ← إعدادات Render التلقائية
├── .env                       ← متغيرات البيئة المحلية
├── middleware/
│   ├── auth.js                ← JWT
│   └── upload.js              ← Cloudinary
├── routes/
│   ├── auth.js                ← /api/auth
│   ├── videos.js              ← /api/videos
│   └── users.js               ← /api/users
└── public/
    ├── style.css
    ├── api.js
    ├── index.html
    ├── upload.html
    ├── login.html
    └── profile.html
```

---

## ⚙️ الخطوة 1 — Cloudinary (مجاني)

1. اذهب إلى **cloudinary.com** وأنشئ حساباً مجانياً
2. من Dashboard احصل على:
   - **Cloud Name**
   - **API Key**
   - **API Secret**

---

## 🚀 الخطوة 2 — النشر على Render

1. ارفع المشروع على **GitHub**
2. اذهب إلى **render.com** → New → Web Service → اختر الـ repo
3. أضف **Environment Variables** يدوياً:

| المتغير | القيمة |
|---------|--------|
| `MONGODB_URI` | `mongodb+srv://omarbenbouzid39_db_user:123123123@cluster0.hhlnc36.mongodb.net/bassir?retryWrites=true&w=majority&appName=Cluster0` |
| `CLOUDINARY_CLOUD_NAME` | من Cloudinary Dashboard |
| `CLOUDINARY_API_KEY` | من Cloudinary Dashboard |
| `CLOUDINARY_API_SECRET` | من Cloudinary Dashboard |
| `JWT_SECRET` | أي نص طويل عشوائي |
| `NODE_ENV` | `production` |

4. **Build Command:** `npm install`
5. **Start Command:** `node server.js`
6. Deploy ✅

---

## 💻 التشغيل المحلي

```bash
npm install
# عدّل .env بمعلومات Cloudinary
npm start
# http://localhost:3000
```

---

## ✅ المشاكل التي تم إصلاحها

- **login.html** — كانت تعرض نجاح وهمي بدون API، الآن تتصل فعلاً بالسيرفر
- **users.js** — تعارض مسارات `/me/saved` و `/:handle`، تم ترتيبهما بشكل صحيح
- **PostgreSQL → MongoDB** — تم التحويل الكامل مع Mongoose
- **profile.html** — كانت تعرض بيانات ثابتة، الآن تجلب بيانات المستخدم الحقيقية
- **videos.js** — كانت تستخدم `filename/thumbnail` القديمة، الآن تستخدم `video_url/thumbnail_url`

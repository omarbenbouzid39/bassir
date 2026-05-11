# بصير 🎬 — منصة تغذية بصرية

منصة Shorts بصرية كاملة مع Backend حقيقي.

---

## ⚡ تشغيل سريع

```bash
# 1. تثبيت المكتبات
npm install

# 2. تشغيل السيرفر
npm start

# 3. افتح المتصفح على
http://localhost:3000
```

---

## 📁 هيكل المشروع

```
baseer/
├── server.js          ← السيرفر الرئيسي (Express)
├── database.js        ← قاعدة البيانات (SQLite)
├── .env               ← إعدادات البيئة
├── baseer.db          ← ملف قاعدة البيانات (يُنشأ تلقائياً)
├── uploads/           ← ملفات الفيديو المرفوعة
├── middleware/
│   └── auth.js        ← JWT Authentication
├── routes/
│   ├── auth.js        ← تسجيل الدخول / إنشاء حساب
│   ├── videos.js      ← رفع / عرض / لايك / حفظ
│   └── users.js       ← الملف الشخصي / المتابعة
└── public/
    ├── style.css      ← نظام التصميم المشترك
    ├── api.js         ← عميل API مشترك
    ├── index.html     ← الخلاصة الرئيسية
    ├── login.html     ← تسجيل الدخول / إنشاء حساب
    ├── upload.html    ← رفع مقطع
    └── profile.html   ← الملف الشخصي
```

---

## 🔌 API Endpoints

### Auth
| Method | Path | الوصف |
|--------|------|-------|
| POST | /api/auth/register | إنشاء حساب |
| POST | /api/auth/login | تسجيل الدخول |
| GET  | /api/auth/me | بيانات المستخدم الحالي |

### Videos
| Method | Path | الوصف |
|--------|------|-------|
| GET  | /api/videos | جلب الخلاصة |
| GET  | /api/videos/trending | الأكثر مشاهدة |
| GET  | /api/videos/:id | تفاصيل فيديو |
| POST | /api/videos | رفع فيديو (multipart) |
| DELETE | /api/videos/:id | حذف فيديو |
| POST | /api/videos/:id/like | لايك / إلغاء لايك |
| POST | /api/videos/:id/save | حفظ / إلغاء حفظ |
| GET  | /api/videos/:id/comments | التعليقات |
| POST | /api/videos/:id/comments | إضافة تعليق |

### Users
| Method | Path | الوصف |
|--------|------|-------|
| GET  | /api/users/:handle | الملف الشخصي |
| GET  | /api/users/:handle/videos | مقاطع المستخدم |
| GET  | /api/users/me/saved | المحفوظات |
| POST | /api/users/:id/follow | متابعة / إلغاء |
| PUT  | /api/users/me/update | تحديث الملف |

---

## ⚙️ متغيرات البيئة (.env)

```
PORT=3000
JWT_SECRET=your_secret_key_here
NODE_ENV=development
```

---

## 🛡️ الأمان
- كلمات المرور مشفرة بـ **bcryptjs**
- المصادقة بـ **JWT** (صالح 30 يوم)
- حد رفع الملفات: **500 MB**
- فحص نوع الملف قبل الرفع

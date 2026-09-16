# โมดูล Auth

เอกสารนี้อธิบายการทำงานของโมดูลยืนยันตัวตนตามเส้นทางข้อมูล ตั้งแต่ HTTP request ผ่าน validation และ business logic ไปจนถึง MongoDB/JWT แล้วกลับเป็น HTTP response

## ภาพรวมและข้อมูลที่จัดเก็บ

โมดูลถูก mount จาก `src/app.js` ที่ `/api/v1/auth` และมี endpoint ดังนี้

| Method | Path | หน้าที่ |
| --- | --- | --- |
| POST | `/register` | สร้างบัญชีและออก token คู่แรก |
| POST | `/login` | ตรวจสอบรหัสผ่านและออก token คู่ใหม่ |
| POST | `/refresh` | หมุน refresh token และออก access token ใหม่ |
| POST | `/logout` | เพิกถอน refresh token ปัจจุบัน |
| POST | `/change-password` | เปลี่ยนรหัสผ่านและยกเลิกทุก session |

โมดูลใช้ข้อมูลจากสอง collection:

- `users` (model อยู่ที่ `src/modules/users/user.model.js`) เก็บ `name`, `email`, password ที่ถูก hash, `role`, `isActive` และ `lastLoginAt` โดย password ถูกซ่อนจาก query ตามปกติด้วย `select: false`
- `refreshsessions` (model อยู่ที่ `refreshSession.model.js`) เก็บ `userId`, hash ของ `jti`, `familyId`, `expiresAt` และ `revokedAt` เพื่อให้ refresh token ถูกเพิกถอนได้ แม้ JWT เองจะเป็น token แบบ signed

`RefreshSession.jtiHash` มี unique index และ `expiresAt` มี TTL index จึงลบ session ที่หมดอายุจาก MongoDB โดยอัตโนมัติในภายหลัง (TTL cleanup ของ MongoDB ไม่ได้เกิดขึ้นทันทีพอดีกับเวลา expiry)

## รูปแบบ token และการส่งกลับ

ระบบออก JWT สองชนิดด้วย HS256 พร้อม `issuer` และ `audience` จาก environment:

- **Access token**: payload มี `sub` เป็น user ID, `role`, `email`, `type: 'access'`; ส่งกลับใน JSON เพื่อให้ client ส่งต่อเป็น `Authorization: Bearer <token>`
- **Refresh token**: payload มี `type: 'refresh'`, `jti` แบบ UUID และ `familyId` แบบ UUID; เก็บเป็น cookie ชื่อ `refreshToken` เท่านั้น ไม่ส่งใน JSON

cookie refresh token ตั้งเป็น `httpOnly`, `sameSite: 'lax'`, มี path เฉพาะ `/api/v1/auth`, อายุ 7 วัน และตั้ง `secure: true` เมื่อ `NODE_ENV` เป็น `production` จึง JavaScript ฝั่ง browser อ่าน cookie นี้ไม่ได้

## ลำดับการทำงานราย endpoint

### 1. สมัครสมาชิก — `POST /api/v1/auth/register`

ตัวอย่าง body:

```json
{
  "name": "Somchai Jaidee",
  "email": "SOMCHAI@example.com",
  "password": "secure-pass-123"
}
```

1. Router เรียก `authLimiter` เพื่อลดความเสี่ยงจากการยิง endpoint ถี่เกินไป
2. `validate(registerSchema)` ตรวจ body แบบ strict: ชื่อถูก trim และยาว 2–100 ตัวอักษร, email ถูก trim/แปลงเป็นตัวพิมพ์เล็กและต้องเป็น email, password ยาว 8–72 ตัวอักษร; field เกินหรือข้อมูลไม่ผ่านจะจบด้วย error 422 ก่อนถึง controller
3. Controller ส่ง `req.body` ที่ parse แล้วให้ `authService.register()` โดยไม่ทำงานกับ MongoDB เอง
4. Service ค้น `User.findOne({ email })`; หากพบ email เดิมจะโยน `ConflictError` (409)
5. Service สร้าง `User` ใหม่; pre-save hook ใน user model hash password ด้วย bcrypt cost 12 ก่อนบันทึก MongoDB
6. `generateTokens()` สุ่ม `familyId` และ `jti`, สร้าง access/refresh JWT พร้อมกัน, hash `jti` ด้วย SHA-256 แล้วสร้าง `RefreshSession` เพื่อบันทึก session ที่เพิกถอนได้
7. Service แปลง user เป็น safe object โดยตัด password ออก แล้วคืน user และ token คู่ดังกล่าว
8. Controller ใส่ refresh token ใน httpOnly cookie และตอบ 201:

```json
{
  "success": true,
  "data": {
    "user": { "_id": "...", "name": "Somchai Jaidee", "email": "somchai@example.com", "role": "customer" },
    "accessToken": "eyJ..."
  }
}
```

### 2. เข้าสู่ระบบ — `POST /api/v1/auth/login`

1. Router ใช้ `authLimiter` แล้ว validate email (normalize เป็น lowercase) และ password ที่ไม่ว่าง
2. Service query user ด้วย `.select('+password')` เพราะ password ถูกซ่อนไว้โดย default
3. หากไม่พบ user หรือ `isActive` เป็น false จะตอบ 401 `Invalid email or password`; ใช้ข้อความเดียวกันเพื่อไม่เปิดเผยว่า email ใดมีอยู่
4. `user.comparePassword()` ใช้ bcrypt เปรียบเทียบ password ที่ผู้ใช้ส่งมากับ hash ในฐานข้อมูล; ไม่ผ่านจะตอบ 401 เดียวกัน
5. เมื่อผ่าน ระบบอัปเดต `lastLoginAt`, บันทึก user, สร้าง token และ `RefreshSession` ใหม่ โดยแต่ละ login ได้ `familyId` ใหม่
6. Controller ตั้ง refresh cookie และตอบ 200 ด้วย user แบบปลอดภัยกับ access token เช่นเดียวกับ register

### 3. ต่ออายุ token — `POST /api/v1/auth/refresh`

ไม่มี body; controller อ่าน `refreshToken` จาก cookie ที่ `cookie-parser` แปลงไว้ใน `req.cookies`

1. ถ้าไม่มี cookie service ตอบ 401 `Refresh token missing`
2. Service ตรวจลายเซ็น, HS256 algorithm, issuer, audience และอายุของ JWT ด้วย refresh secret; ตรวจไม่ผ่านหรือหมดอายุตอบ 401
3. Service ยืนยันว่า payload เป็น `type: 'refresh'` และมี string `jti`/`familyId`
4. Service ทำ atomic `findOneAndUpdate` ที่ refresh session โดยต้องตรงทั้ง hash ของ `jti`, `userId` จาก `sub`, `revokedAt: null` และ `expiresAt` ยังไม่ผ่านเวลา จากนั้นตั้ง `revokedAt` เป็นเวลาปัจจุบัน
5. หากหา session ไม่พบ แปลว่า token ถูกใช้ไปแล้ว/ถูกเพิกถอน/ไม่มีในระบบ ระบบค้น session เดิมจาก `jti` และถ้ายังรู้ `familyId` จะ revoke session ที่ยังใช้ได้ทั้ง family แล้วตอบ 401 นี่คือการตรวจจับ token reuse
6. หาก session ใช้ได้ ระบบอ่าน user; ถ้า user หายหรือ inactive จะ revoke ทุก session ของ user แล้วตอบ 401
7. หากทุกอย่างผ่าน ระบบสร้าง token คู่ใหม่โดยใช้ `familyId` เดิม, บันทึก refresh session ใหม่ และ controller แทนที่ cookie เดิม พร้อมตอบเฉพาะ access token ใหม่:

```json
{ "success": true, "data": { "accessToken": "eyJ..." } }
```

### 4. ออกจากระบบ — `POST /api/v1/auth/logout`

1. Controller อ่าน refresh token จาก cookie และเรียก `revokeRefreshToken()`
2. Service พยายาม verify token; ถ้าเป็น refresh token ที่มี `jti` จะตั้ง `revokedAt` ให้ session นั้น หากไม่มี/หมดอายุ/ไม่ถูกต้อง จะไม่โยน error เพื่อให้ logout ทำซ้ำได้อย่างปลอดภัย
3. Controller ลบ cookie โดยใช้ path เดียวกับตอนตั้ง cookie แล้วตอบ `204 No Content`

### 5. เปลี่ยนรหัสผ่าน — `POST /api/v1/auth/change-password`

endpoint นี้ต้องมี access token เช่น `Authorization: Bearer <accessToken>`

1. `authenticate` ตรวจ access JWT (secret, algorithm, issuer, audience, `type: 'access'` และ `sub`) แล้วอ่าน user จาก MongoDB เพื่อยืนยันว่า user ยัง active; จากนั้นเติม `req.user = { id, role, email }`
2. `validate(changePasswordSchema)` รับเฉพาะ `currentPassword` ที่ไม่ว่างและ `newPassword` ยาว 8–72 ตัวอักษร
3. Controller ส่ง `req.user.id` และ body ไป service
4. Service query user รวม password, ตรวจ current password ด้วย bcrypt; ไม่ถูกต้องตอบ 401 `Current password is incorrect`
5. Service กำหนด password ใหม่แล้ว save; pre-save hook hash ค่าใหม่
6. Service เรียก `revokeAllUserSessions(userId)` เพื่อตั้ง `revokedAt` ให้ refresh session ที่ยังไม่ถูก revoke ทุกอัน จึงบังคับให้ทุกอุปกรณ์ login ใหม่เมื่อ access token หมดอายุ
7. Controller ตอบ `204 No Content` โดยไม่ได้ออก token ใหม่

## การส่งต่อข้อผิดพลาด

Controller ทุกตัวส่ง error ให้ `next(err)` และ error middleware ส่วนกลางเป็นผู้แปลงเป็น HTTP response ที่สอดคล้องกัน: validation เป็น 422, email ซ้ำ/จำนวนทรัพยากรขัดแย้งเป็น 409, และ token หรือ credential ไม่ถูกต้องเป็น 401

## ความสัมพันธ์กับโมดูลอื่น

`authenticate` ใน `src/middleware/auth.middleware.js` เป็น consumer หลักของ access token และถูกใช้โดย cart รวมถึง route ที่ต้องล็อกอินอื่น ๆ. refresh token ไม่มีสิทธิ์เรียก API ที่ป้องกันไว้โดยตรง; ต้อง refresh เพื่อขอ access token ก่อน

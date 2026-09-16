> โปรเจกต์นี้เป็นแค่ตัวอย่าง backend e-commerce ของสำนักไป่หลอ เพื่อการศึกษา

# API อีคอมเมิร์ซด้วย Express

ตัวอย่างแบ็กเอนด์ Express พร้อม JWT, การกำหนดสิทธิ์ตามบทบาท, Zod, MongoDB, Stripe Checkout และการจัดการข้อผิดพลาด

## เริ่มต้นใช้งาน

```bash
git clone https://github.com/naay99999/ecom-express-mongo-example.git
cd ecom-express-mongo-example
npm ci
cp .env.example .env
```

ไม่ต้องการโคลนและติดตั้งเอง สามารถทดลองเรียก API ได้ที่
[https://example-ecom-api.naay.cc/reference](https://example-ecom-api.naay.cc/reference)

กำหนดค่าใน `.env`:

```dotenv
MONGO_URI=<mongodb-cloud-connection-uri>
JWT_ACCESS_SECRET=<secret-อย่างน้อย-32-อักขระ>
JWT_REFRESH_SECRET=<secret-อย่างน้อย-32-อักขระ>
COOKIE_SECRET=<secret>
```

`JWT_ACCESS_SECRET` และ `JWT_REFRESH_SECRET` ต้องเป็นคนละค่าและยาวอย่างน้อย 32 อักขระ

```bash
npm run dev
curl http://localhost:4000/health
```

API เริ่มที่ `http://localhost:4000` เอกสาร API อยู่ที่ `/reference`, OpenAPI อยู่ที่ `/openapi.json` และ `llms.txt` อยู่ที่ `/llms.txt`

## ข้อมูลตัวอย่าง

```bash
npm run db:seed
npm run db:reset
```

`db:clear` และ `db:reset` ลบข้อมูลแอปในฐานข้อมูลที่ตั้งค่าไว้อย่างถาวร ใช้กับฐานข้อมูลสำหรับพัฒนาเท่านั้น

## Stripe

การชำระเงินปลายทาง (`cod`) ใช้งานได้โดยไม่ต้องตั้งค่า Stripe หากใช้ Stripe Checkout ให้เพิ่มค่าเหล่านี้ใน `.env`:

```dotenv
STRIPE_SECRET_KEY=rk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CHECKOUT_SUCCESS_URL=http://localhost:3000/checkout/success
STRIPE_CHECKOUT_CANCEL_URL=http://localhost:3000/checkout/cancel
```

ใช้ [restricted key](https://docs.stripe.com/keys/restricted-api-keys) สำหรับ `STRIPE_SECRET_KEY` โดยให้สิทธิ์ **Checkout Sessions: Write** เท่านั้น

เมื่อตั้งค่า Stripe ต้องตั้งค่า webhook ด้วย:

```bash
stripe listen --forward-to localhost:4000/api/v1/payments/webhook
```

นำ signing secret ที่คำสั่งแสดงมาใส่ใน `STRIPE_WEBHOOK_SECRET` แล้วเริ่ม API ใหม่ สำหรับระบบที่ deploy แล้ว ให้ลงทะเบียน endpoint `https://<your-domain>/api/v1/payments/webhook` และ subscribe event ต่อไปนี้:

`checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.expired`, `checkout.session.async_payment_failed`

## คำสั่ง

| คำสั่ง | รายละเอียด |
| --- | --- |
| `npm run dev` | เริ่ม API พร้อมรีโหลดอัตโนมัติ |
| `npm start` | เริ่ม API หนึ่งครั้ง |
| `npm test` | รันชุดทดสอบ |
| `npm run test:watch` | รันชุดทดสอบแบบ watch |
| `npm run db:seed` | เพิ่มข้อมูลตัวอย่าง |
| `npm run db:clear` | ลบข้อมูลแอปทั้งหมด |
| `npm run db:reset` | ล้างข้อมูลแล้วเพิ่มข้อมูลตัวอย่าง |

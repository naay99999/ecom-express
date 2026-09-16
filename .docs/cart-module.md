# โมดูล Cart

เอกสารนี้อธิบายโมดูลตะกร้าสินค้าตามเส้นทางข้อมูล ตั้งแต่ request ผ่านการยืนยันตัวตนและ validation ไปจนถึง MongoDB แล้วกลับเป็น response

## ภาพรวมและข้อมูลที่จัดเก็บ

โมดูลถูก mount ที่ `/api/v1/cart` และทุก endpoint บังคับ login เพราะ router เรียก `router.use(authenticate)` ก่อน route ใด ๆ. เวอร์ชันปัจจุบันไม่มี guest cart: ตะกร้าหนึ่งใบเป็นของ user หนึ่งคนโดย `userId` เป็น unique index

Collection `carts` มีโครงสร้าง:

```js
{
  userId: ObjectId, // อ้างถึง User, unique
  items: [
    {
      productId: ObjectId, // อ้างถึง Product
      variantId: ObjectId, // _id ของ variant ที่ฝังใน Product
      quantity: Number     // อย่างน้อย 1
    }
  ],
  createdAt: Date,
  updatedAt: Date
}
```

รายการในตะกร้าเก็บเฉพาะ ID และจำนวน จึงไม่ได้ snapshot ชื่อ ราคา หรือ stock ใน cart. เมื่อแก้ไขรายการ ระบบอ่าน product/variant ปัจจุบันเสมอเพื่อเช็กว่าสินค้ายัง active และมี stock พอ. การจองหรือตัด stock ยังไม่เกิดในขั้นนี้; กระบวนการ checkout/order เป็นผู้จัดการเรื่องนั้น

## ชั้นข้อมูลและส่วนร่วมของแต่ละชั้น

1. **Route** (`cart.route.js`) กำหนด HTTP method/path และลำดับ middleware
2. **Authentication** (`authenticate`) ตรวจ access JWT, อ่าน User เพื่อยืนยัน `isActive`, แล้วตั้ง `req.user.id`; token หาย/ไม่ถูกต้องตอบ 401
3. **Validation** (`cart.schema.js` ผ่าน middleware `validate`) parse ข้อมูล Zod ก่อน controller; ObjectId ไม่ถูกต้องหรือ quantity นอกขอบเขตตอบ 422
4. **Controller** อ่านเฉพาะ `req.user`, params และ body ที่ผ่าน validation แล้ว เรียก service และเลือก HTTP status
5. **Service** เป็นที่รวมกติกาทางธุรกิจและ query MongoDB ผ่าน `Cart`/`Product` model
6. **Model** (`cart.model.js`) บังคับ persistence shape, `quantity >= 1`, และ unique `userId`

## Endpoint และลำดับข้อมูล

### 1. อ่านตะกร้า — `GET /api/v1/cart`

1. `authenticate` สร้าง `req.user.id` จาก access token ที่ถูกต้อง
2. Controller เรียก `getCart(req.user.id)`
3. Service ค้น `Cart.findOne({ userId })` และ `populate('items.productId')` เพื่อส่งข้อมูล product เต็ม document กลับมาพร้อมแต่ละ item
4. ถ้าไม่พบ document cart จะคืน object ชั่วคราว `{ userId, items: [] }` โดยไม่สร้าง document ว่างในฐานข้อมูล
5. Controller ตอบ 200:

```json
{ "success": true, "data": { "userId": "...", "items": [] } }
```

### 2. เพิ่มสินค้า — `POST /api/v1/cart/items`

ตัวอย่าง body:

```json
{ "productId": "66a...", "variantId": "66b...", "quantity": 2 }
```

1. หลัง authenticate, Zod รับเฉพาะ `productId`, `variantId` ที่เป็น ObjectId และ `quantity` เป็น integer 1–100; `z.coerce.number()` ทำให้ numeric string ถูกแปลงเป็น number ได้
2. Controller ส่ง `userId` กับ body ที่ parse แล้วไป `addCartItem()`
3. Service เรียก `getAvailableVariant(productId, variantId)`: ค้น Product ที่ `_id` ตรง, product `isActive: true`, และมี variant ID ดังกล่าวที่ `isActive: true`; ไม่พบตอบ 404 `Product not found`
4. Service หยิบ embedded variant ด้วย `product.variants.id(variantId)`; หากไม่มีจะตอบ 404 `Product variant not found`
5. Service อ่าน cart ของ user หรือสร้าง Cart ในหน่วยความจำเมื่อยังไม่มี จากนั้นหา item ที่ `variantId` เดียวกัน
6. ถ้ามี item อยู่แล้ว จะคำนวณ `nextQuantity = quantity เดิม + quantity ใหม่`; หากไม่มี ใช้ quantity ที่ request ส่งมา
7. `assertAvailableStock` เปรียบเทียบ stock ของ variant กับจำนวนหลังรวม; stock ไม่พอตอบ 409 `Requested quantity is not available`
8. Service เพิ่ม item ใหม่ หรือเพิ่ม quantity ของ item เดิม, save cart และเรียก `getCart()` อีกครั้งเพื่อคืน cart ที่ populate product แล้ว
9. Controller ตอบ 201 พร้อม cart ล่าสุด

หมายเหตุ: การระบุ `productId` ต้องสอดคล้องกับ `variantId` จริง เพราะ product query หา variant ภายใน product นั้นโดยตรง

### 3. เปลี่ยนจำนวน — `PATCH /api/v1/cart/items/:variantId`

ตัวอย่าง body:

```json
{ "quantity": 3 }
```

1. validate params ก่อนด้วย `cartVariantIdParamsSchema` แล้ว validate body ว่า quantity เป็น integer 1–100
2. Service ค้น cart ของ user แล้วหา item จาก `variantId`; ไม่พบ cart หรือ item ตอบ 404 `Cart item not found`
3. Service อ่าน product ที่ item อ้างถึงและตรวจ product/variant active ผ่าน `getAvailableVariant()` อีกครั้ง
4. Service เช็ก stock เทียบกับ **จำนวนใหม่ทั้งหมด** ไม่ใช่ผลบวกกับค่าเดิม; stock ไม่พอตอบ 409
5. Service ตั้ง `item.quantity = quantity`, save แล้ว query/populate ใหม่เพื่อคืน cart ล่าสุด
6. Controller ตอบ 200

### 4. ลบรายการเดียว — `DELETE /api/v1/cart/items/:variantId`

1. validate `variantId` ใน params และ service ค้น cart ของ user
2. ถ้าไม่มี cart ตอบ 404 `Cart item not found`
3. Service เก็บจำนวน items ก่อน แล้ว filter รายการที่ variant ID ไม่ตรงออก
4. หากจำนวนเท่าเดิม แปลว่าไม่พบ item เป้าหมาย จึงตอบ 404; หากลดลง save cart
5. Service อ่าน/populate cart ล่าสุดและ controller ตอบ 200

cart document ยังคงอยู่แม้ลบ item สุดท้ายแล้ว แต่มี `items: []`

### 5. ล้างตะกร้า — `DELETE /api/v1/cart`

1. หลัง authenticate controller เรียก `clearCart(userId)`
2. Service ใช้ `Cart.deleteOne({ userId })` เพื่อลบ document cart ทั้งใบ; หากเดิมไม่มี cart ก็ยังสำเร็จได้ (idempotent)
3. Controller ตอบ `204 No Content`

## ข้อควรทราบด้านความถูกต้องของข้อมูล

- การเช็ก stock ใน cart เป็นการตรวจเพื่อประสบการณ์ผู้ใช้ ณ เวลาที่แก้ตะกร้า ไม่ใช่ inventory reservation และไม่ได้ป้องกันการแข่งขันระหว่างผู้ใช้หลายคนโดยตัวมันเอง
- `GET` populate product ปัจจุบัน ดังนั้นสินค้าอาจ inactive หรือรายละเอียดเปลี่ยนภายหลังจากที่ถูกใส่ตะกร้าได้; การ mutation จะปฏิเสธ product/variant inactive แล้ว
- Item ถูกระบุด้วย `variantId` ภายในตะกร้า จึงไม่สามารถเพิ่ม variant เดิมเป็นบรรทัดแยกหลายบรรทัดได้; การเพิ่มซ้ำจะรวม quantity
- Product model เก็บ variant แบบ embedded และแต่ละ variant มี `priceAmount`, `stock`, `isActive`; cart จงใจไม่เก็บราคาเพื่อไม่ให้ใช้ข้อมูลราคาเก่าในการ checkout

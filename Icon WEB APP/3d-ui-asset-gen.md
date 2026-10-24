---
name: 3d-ui-asset-gen
description: Dùng khi cần viết prompt cho AI tạo ảnh 3D dùng trong giao diện web/app — icon 3D, minh họa hero, empty state, onboarding, badge gamification, mascot, background trang trí. Kích hoạt khi người dùng nói "ảnh 3D cho UI", "icon 3D", "illustration 3D cho landing page", "clay style", "glassmorphism 3D", "bộ icon đồng bộ".
---

# Skill: Tạo ảnh 3D cho UI/UX Web & App

## 1. Mục tiêu
Sinh ảnh 3D **dùng được ngay trong giao diện**: nền sạch hoặc tách nền dễ, góc nhìn/ánh sáng nhất quán giữa các asset, rõ ở kích thước nhỏ, đúng màu thương hiệu, không lấn át nội dung chính.

## 2. Nguyên tắc cốt lõi
1. **Chức năng trước thẩm mỹ**: mỗi asset trả lời câu hỏi "nó giúp người dùng hiểu/làm gì?" (định hướng onboarding, an ủi ở empty state, thưởng ở badge...).
2. **Nhất quán theo bộ (Style Lock)**: cùng phong cách vật liệu, góc camera, hướng ánh sáng, palette, mức chi tiết. Một bộ icon lệch góc nhìn là lỗi nặng nhất.
3. **Đọc được ở kích thước nhỏ**: hình khối đơn giản, silhouette rõ, tối đa 1–2 vật thể chính, không chi tiết vụn.
4. **Tôn trọng nền tảng**: trên iOS asset nên mềm, tinh tế, hợp nền kính mờ/Liquid Glass; trên Android hợp tonal surface của Material 3. Asset 3D không thay thế icon hệ thống (tab bar, nav bar vẫn dùng icon phẳng SF Symbols / Material Symbols).
5. **Tiết chế**: 3D dùng cho điểm nhấn (hero, onboarding, empty state, phần thưởng), không dùng cho mọi icon chức năng.

## 3. Bảng chọn loại asset

| Loại asset | Vị trí dùng | Tỉ lệ khung | Kích thước xuất gợi ý | Mức chi tiết |
|---|---|---|---|---|
| Icon 3D tính năng | Card tính năng, menu khám phá | 1:1 | 512×512 (xuất @1x/2x/3x: 64/128/192) | Thấp |
| Badge / thành tích | Gamification, hồ sơ | 1:1 | 512×512 | Thấp–vừa |
| Minh họa empty state | Màn hình trống, lỗi, offline | 1:1 hoặc 4:3 | 800×800 | Vừa |
| Onboarding | Slide giới thiệu app | 3:4 hoặc 4:5 | 1080×1350 | Vừa |
| Hero landing page | Đầu trang web | 16:9 hoặc 3:2 | 2400×1350 | Cao |
| Mascot / nhân vật | Trợ lý AI, thông báo | 1:1 | 1024×1024 | Vừa |
| Background trang trí | Section web, splash | 16:9 / 9:16 | theo màn hình | Thấp (trừu tượng) |

## 4. Thư viện phong cách (chọn 1 cho cả bộ)

| Phong cách | Cụm prompt | Hợp với |
|---|---|---|
| Clay / Soft 3D | `soft clay 3D render, matte plasticine material, rounded chunky shapes, soft studio lighting` | EdTech, app thân thiện, trẻ em |
| Glass / Glassmorphism | `frosted glass 3D object, translucent material, subtle refraction, glossy highlights, gradient glow` | Fintech, AI, phong cách iOS hiện đại |
| Glossy plastic | `glossy plastic toy-like 3D, smooth surfaces, specular highlights` | App tiêu dùng, game hóa |
| Isometric | `isometric 3D illustration, 30-degree isometric view, clean geometry, orthographic camera` | Dashboard, SaaS, sơ đồ hệ thống |
| Low-poly | `low-poly 3D, flat shaded facets, minimal geometry` | Game, bản đồ, chủ đề công nghệ |
| Inflated / puffy | `inflated puffy 3D, balloon-like soft volume, pastel colors` | Social, sticker, marketing |
| Realistic product | `photorealistic 3D product render, PBR materials, studio softbox lighting` | Hero sản phẩm, e-commerce |

## 5. Khối thông số kỹ thuật (Style Lock) — giữ nguyên cho cả bộ

```
CAMERA: {front view | 3/4 view rotated 30° | isometric}, slight high angle, centered composition, object fills ~70% of frame, 15% padding on all sides
LIGHTING: soft studio key light from top-left, gentle rim light, soft contact shadow directly below, no harsh shadows
MATERIAL: {theo phong cách mục 4}
PALETTE: primary {#HEX}, secondary {#HEX}, accent {#HEX}, neutral off-white; max 3-4 colors
BACKGROUND: {plain solid #FFFFFF | plain solid #F2F2F7 | transparent-ready isolated object on pure white}
RENDER: Blender/Cinema 4D style, octane-like soft render, high detail, clean edges, 8k sharp
```

Lưu ý tách nền: đa số model không xuất PNG trong suốt thật. Hãy yêu cầu **nền đặc một màu tương phản**, rồi tách nền bằng công cụ remove background; tránh nền gradient phức tạp nếu cần tách.

## 6. Template prompt

```
[SUBJECT] A single 3D {loại asset} of {vật thể/ẩn dụ}, representing "{ý nghĩa chức năng}".
[STYLE] {cụm phong cách mục 4}
[STYLE LOCK] {khối mục 5}
[UI CONTEXT] Designed as a UI asset for a {web landing page | mobile app {iOS|Android}}, must stay readable at {64px | 128px | full width}, simple silhouette, no text.
[MOOD] {friendly | trustworthy | energetic | calm}
```

**Negative prompt:** `text, letters, logos, watermark, cluttered scene, multiple unrelated objects, harsh shadows, busy background, cropped object, distorted perspective, inconsistent lighting, photographic hands, noise, low resolution`

## 7. Quy trình tạo một BỘ asset đồng bộ
1. Viết **Style Lock** một lần (mục 5), lưu lại làm "design token" của bộ.
2. Gen **asset mẫu (hero/anchor)** trước, chọn bản tốt nhất.
3. Dùng ảnh mẫu làm **style reference / image reference** (ví dụ `--sref` trên Midjourney, tính năng reference trên Firefly/Imagen/Flux) + cố định seed nếu công cụ hỗ trợ.
4. Với mỗi asset tiếp theo chỉ đổi khối [SUBJECT]; giữ nguyên mọi phần còn lại.
5. Đặt tất cả lên một artboard trong Figma để so: kích thước vật thể, hướng sáng, độ bão hòa màu.
6. Hậu kỳ: tách nền → căn padding đều → chỉnh màu về đúng HEX → xuất WebP/PNG.

## 8. Checklist kiểm tra
- [ ] Ý nghĩa đọc được trong 1 giây (thử thu nhỏ còn 64px).
- [ ] Cùng góc camera, cùng hướng sáng (sáng từ trên-trái) với các asset khác.
- [ ] Không có chữ/logo méo do AI tạo.
- [ ] Palette đúng màu thương hiệu, ≤ 4 màu.
- [ ] Bóng đổ mềm, vật thể không bị cắt mép, padding đều.
- [ ] Đặt thử trên nền light và dark theme đều ổn.
- [ ] Asset không cạnh tranh với CTA/nội dung chính về độ nổi bật.

## 9. Xuất file & tối ưu hiệu năng
- Web: WebP/AVIF, nén < 150KB cho icon/minh họa, < 400KB cho hero; dùng `srcset` cho @1x/@2x; lazy-load ảnh dưới màn hình đầu.
- App: PNG/WebP theo @1x/@2x/@3x (iOS) hoặc mdpi→xxxhdpi (Android).
- Có `alt` text mô tả chức năng (với minh họa trang trí thì `alt=""`).
- Nếu cần xoay/tương tác 3D thật: cân nhắc file GLB + three.js / Spline thay vì ảnh tĩnh.

## 10. Ví dụ hoàn chỉnh (EdTech)

**Bộ icon tính năng cho app trợ lý học tập AI** — Style Lock: clay, 3/4 view 30°, sáng trên-trái, palette #4F46E5 / #22C55E / #F59E0B, nền #FFFFFF.

1. **Lộ trình học:**
```
A single 3D feature icon of a winding path with three milestone flags leading to a small graduation cap,
representing "personalized learning roadmap".
Soft clay 3D render, matte plasticine material, rounded chunky shapes.
3/4 view rotated 30°, slight high angle, centered, object fills 70% of frame, 15% padding;
soft studio key light from top-left, gentle rim light, soft contact shadow;
palette indigo #4F46E5, green #22C55E, amber #F59E0B, off-white; plain solid #FFFFFF background;
Blender style soft render, clean edges.
UI asset for a mobile app, readable at 64px, simple silhouette, no text. Mood: friendly, motivating.
Negative: text, letters, logos, cluttered scene, harsh shadows, cropped object.
```
2. **AI Tutor:** đổi SUBJECT → `a friendly rounded robot head with a speech bubble and a tiny open book`.
3. **Flashcard:** đổi SUBJECT → `a small stack of three tilted flashcards with a lightning spark`.
4. **Empty state "Chưa có lịch học":** loại asset minh họa 1:1, SUBJECT → `an empty calendar page with a sleeping clay alarm clock beside it`, mood calm.

## 11. Đầu ra skill phải trả cho người dùng
1. Phong cách đã chọn + lý do ngắn (vì sao hợp sản phẩm/đối tượng).
2. Khối Style Lock dùng chung.
3. Prompt hoàn chỉnh cho từng asset + negative prompt.
4. Thông số xuất file theo nơi dùng (web/app).
5. Checklist kiểm tra để người dùng tự đánh giá ảnh.

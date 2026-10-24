---
name: ui-platform-image-gen
description: Dùng khi cần viết prompt cho AI tạo ảnh (Midjourney, DALL·E, Imagen, Flux, Firefly, Ideogram...) để sinh mockup/màn hình app đúng chuẩn Google Material Design 3 (Android) hoặc Apple Human Interface Guidelines (iOS). Kích hoạt khi người dùng nói "gen ảnh UI", "mockup app Android/iOS", "màn hình app theo chuẩn Material/HIG", "concept UI cho Dribbble/portfolio".
---

# Skill: Tạo ảnh UI chuẩn Material Design 3 & Apple HIG

## 1. Mục tiêu
Biến một yêu cầu màn hình (ví dụ: "màn hình lịch học của app sinh viên") thành **prompt ảnh chính xác theo nền tảng**: đúng bố cục, đúng component, đúng thói quen thao tác của người dùng Android hoặc iOS. Ảnh dùng cho moodboard, concept, portfolio, pitch — **không thay thế file Figma** (AI ảnh không đảm bảo kích thước pixel tuyệt đối).

## 2. Quy trình bắt buộc (làm theo thứ tự)
1. **Xác định nền tảng**: Android (M3) / iOS (HIG) / cả hai (tạo 2 prompt riêng, không trộn).
2. **Xác định loại màn hình**: Home, List, Detail, Form, Onboarding, Settings, Empty state, Dashboard.
3. **Chọn khung điều hướng** theo bảng ở mục 3 — đây là phần AI hay sai nhất.
4. **Xác định hành động chính** (primary action) và đặt đúng vị trí theo nền tảng.
5. **Khai báo design tokens**: màu thương hiệu, bo góc, font, mật độ.
6. **Ráp prompt theo template mục 5**, thêm negative prompt mục 6.
7. **Kiểm tra ảnh đầu ra bằng checklist mục 7**, sai điểm nào thì sửa prompt đúng điểm đó.

## 3. Bảng quy tắc nền tảng (nguồn sự thật cho prompt)

| Yếu tố | Android – Material Design 3 | iOS – Human Interface Guidelines |
|---|---|---|
| Triết lý | Màu động (Dynamic Color / Material You), **tonal elevation** — phân tầng chủ yếu bằng sắc độ màu nền, đổ bóng nhẹ; bản M3 Expressive tăng hình khối bo tròn, chuyển động lò xo | Tôn trọng nội dung (Clarity, Deference, Depth); vật liệu mờ/trong suốt (blur, translucency); từ iOS 26 là ngôn ngữ **Liquid Glass** — thanh điều hướng & điều khiển dạng kính nổi |
| Đơn vị | dp (layout), sp (chữ) | pt |
| Khung thiết kế phổ biến | 360×800 hoặc 412×915 dp (tỉ lệ ~9:20) | 393×852 pt (iPhone 15/16), 402×874 pt (16 Pro), 375×812 pt |
| Vùng chạm tối thiểu | 48×48 dp | 44×44 pt |
| Font | Roboto / Roboto Flex | SF Pro (sans), New York (serif) |
| Thang chữ | Display / Headline / Title / Body / Label | Large Title (34pt bold) / Title / Headline / Body (17pt) / Caption |
| Thanh trên | Top App Bar (small / medium / large), tiêu đề căn trái | Navigation Bar; **Large Title căn trái** khi ở đầu trang, thu nhỏ căn giữa khi cuộn |
| Điều hướng chính | **Navigation Bar** đáy, 3–5 đích, icon + label; pill indicator quanh icon đang chọn. Nhiều đích hơn → Navigation Drawer / Rail (tablet) | **Tab Bar** đáy, tối đa 5 tab, icon SF Symbols + label; tab đang chọn tô màu tint. **Không dùng hamburger menu** |
| Hành động chính | **FAB** (bo góc vuông-tròn ~16dp, không còn tròn tuyệt đối ở M3) góc dưới phải, hoặc Extended FAB có chữ | Nút chữ/icon ở **góc trên phải** Navigation Bar ("Edit", "Done", "+"); nút filled lớn ở cuối form |
| Quay lại | Nút/cử chỉ Back hệ thống (vuốt từ cả 2 cạnh); mũi tên ← trong Top App Bar | Vuốt từ cạnh trái; nút "‹ Tiêu đề trước" góc trên trái |
| Danh sách | List items, divider tùy chọn, Card (elevated / filled / outlined) | Inset Grouped List (nhóm bo góc trên nền xám nhạt), chevron › bên phải |
| Hộp thoại | Dialog bo 28dp, nút chữ căn phải | Alert căn giữa, nút xếp ngang/dọc; Action Sheet trượt từ đáy |
| Công tắc | Switch M3 có thumb to, có icon ✓ tùy chọn | Toggle xanh lá dạng viên thuốc |
| Phản hồi chạm | Ripple + state layer | Highlight mờ, haptic |
| Bo góc | Thang shape: 4 / 8 / 12 / 16 / 28 dp | Bo góc liên tục (squircle); card thường 10–20 pt |
| Lưới & lề | Lưới 4dp/8dp, lề màn hình 16dp | Lề hệ thống 16–20pt, tôn trọng Safe Area (Dynamic Island, Home Indicator) |

> Lưu ý: tài liệu gốc mô tả Material là "giấy và mực, đổ bóng rõ" — đó là đặc trưng của Material 1–2. Với M3, ưu tiên mô tả **tonal surface** thay vì bóng đổ đậm, và M3 không dùng hamburger trong Navigation Bar (hamburger thuộc Navigation Drawer). Product Sans là font thương hiệu Google, không phải font Material. Khi dùng skill vào thời điểm mới, kiểm tra lại phiên bản HIG/Material mới nhất.

## 4. Quy tắc thiết kế chéo nền tảng
- **Platform familiarity**: không ép iOS có FAB, không ép Android có nút "Done" góc trên phải.
- **Internal consistency**: giữ nguyên màu thương hiệu, minh họa, icon style, giọng văn; chỉ thay "khung xương" (thanh điều hướng, nút, dialog, list) theo native.
- Khi gen bộ đôi Android/iOS: dùng **cùng nội dung, cùng palette, cùng seed/style reference**, chỉ đổi khối PLATFORM trong prompt.

## 5. Template prompt (viết bằng tiếng Anh — model ảnh hiểu tốt hơn)

```
[SHOT] High-fidelity mobile app UI screen, flat front view, single {Android phone | iPhone} screen,
       {no device frame | minimal device frame}, aspect ratio 9:19.5, crisp vector-like rendering.
[PLATFORM] {Khối Android hoặc iOS bên dưới}
[SCREEN] {Loại màn hình} for {tên app / ngữ cảnh}. Content: {liệt kê từ trên xuống dưới}.
[PRIMARY ACTION] {vị trí theo nền tảng}
[TOKENS] Brand color {#HEX}, {light|dark} theme, corner radius {N}, generous whitespace,
         8pt spacing grid, clear typographic hierarchy, short realistic {Vietnamese|English} labels.
[QUALITY] Dribbble-quality, pixel-perfect alignment, consistent icon stroke, accessible contrast (WCAG AA).
```

**Khối PLATFORM – Android (M3):**
```
Google Material Design 3 (Material You) style: tonal surface colors derived from brand color,
small top app bar with left-aligned title, bottom navigation bar with 4 destinations
(icon + label, pill-shaped active indicator behind selected icon), rounded-square FAB
bottom-right above the nav bar, Roboto font, elevated and filled cards with 12-16dp corners,
subtle shadows, Android status bar and gesture navigation handle.
```

**Khối PLATFORM – iOS (HIG):**
```
Apple iOS Human Interface Guidelines style: large left-aligned bold title (Large Title),
translucent blurred navigation bar, primary action as text/icon button top-right,
bottom tab bar with 4 tabs (SF Symbols-style icons + labels, selected tab in tint color),
SF Pro font, inset grouped lists on light gray background with chevrons,
continuous rounded corners, Dynamic Island status bar and home indicator, no hamburger menu,
no floating action button.
```

## 6. Negative prompt (thêm vào cuối hoặc ô negative)
- Chung: `blurry text, gibberish text, lorem ipsum overflow, misaligned elements, inconsistent icon styles, more than 5 bottom tabs, cluttered layout, 3D perspective tilt, photo of hand holding phone, watermark`
- Riêng Android: `iOS tab bar, SF Pro, Dynamic Island, top-right Done button, heavy drop shadows`
- Riêng iOS: `floating action button, hamburger menu, Material ripple, Roboto font, Android navigation buttons`

## 7. Checklist kiểm tra ảnh đầu ra
- [ ] Đúng nền tảng: không có thành phần "lai" (FAB trên iOS, hamburger trên tab bar...).
- [ ] Điều hướng đáy 3–5 mục, có label dưới icon.
- [ ] Hành động chính đúng vị trí (FAB dưới phải / nút góc trên phải).
- [ ] Tiêu đề đúng kiểu (Top App Bar trái / Large Title trái).
- [ ] Vùng chạm trông đủ lớn (≥ 48dp / 44pt), khoảng cách nút không chen chúc.
- [ ] Có Safe Area: không đè lên status bar, Dynamic Island, thanh home.
- [ ] Màu thương hiệu nhất quán, độ tương phản chữ đọc được.
- [ ] Chữ hiển thị đọc được (nếu model render chữ kém → yêu cầu "minimal short labels" hoặc thêm chữ thật trong Figma sau).

Sai mục nào → sửa đúng cụm từ trong prompt, gen lại; không viết lại toàn bộ.

## 8. Ví dụ hoàn chỉnh (EdTech)

**Yêu cầu:** Màn hình "Kế hoạch học tuần" của app trợ lý học tập AI cho sinh viên năm nhất, màu thương hiệu #4F46E5.

**Prompt iOS:**
```
High-fidelity mobile app UI screen, flat front view, single iPhone screen, no device frame, 9:19.5.
Apple iOS Human Interface Guidelines style: large left-aligned bold title "Tuần này",
translucent blurred navigation bar, "+" icon button top-right, bottom tab bar with 4 tabs
(Home, Plan, AI Tutor, Profile; SF Symbols-style icons + labels, Plan selected in #4F46E5),
SF Pro font, inset grouped lists on light gray background, continuous rounded corners,
Dynamic Island and home indicator, no hamburger menu, no floating action button.
Content top to bottom: horizontal 7-day date strip, progress ring card "68% mục tiêu tuần",
grouped list of study sessions (subject, time, chevron), AI suggestion card with soft indigo tint.
Light theme, 8pt grid, generous whitespace, short Vietnamese labels, Dribbble-quality, WCAG AA contrast.
Negative: floating action button, Roboto, Android nav buttons, gibberish text, cluttered layout.
```

**Prompt Android:** giữ nguyên SCREEN + TOKENS, thay khối PLATFORM bằng khối Android, đổi "+" góc trên thành `Extended FAB "Thêm buổi học" bottom-right above navigation bar`.

## 9. Đầu ra skill phải trả cho người dùng
1. Tóm tắt 1 dòng: nền tảng + loại màn hình.
2. Prompt hoàn chỉnh (kèm negative) cho từng nền tảng.
3. 3–5 gạch đầu dòng "những gì đã áp dụng từ chuẩn" để người dùng học được lý do.
4. Gợi ý bước tiếp: dựng lại trong Figma với Material 3 Design Kit / Apple iOS UI Kit để có kích thước chính xác.

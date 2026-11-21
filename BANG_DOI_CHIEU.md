# Đối chiếu code BA CLUBS với thiết kế cơ sở dữ liệu (chương 4)

Tài liệu này ghi lại kết quả đối chiếu giữa **phần code đã xây dựng** và **thiết kế CSDL trong báo cáo**,
cùng toàn bộ thay đổi đã thực hiện để code khớp với thiết kế.

---

## 1. Kết luận ngắn

Lược đồ cũ trong code **lệch khá xa** so với thiết kế: 11 bảng tên tiếng Anh, thiếu 5 trong 13 thực thể,
và 3 nghiệp vụ trong thiết kế chưa được hiện thực. Sau khi sửa, CSDL có **đúng 13 bảng theo thiết kế**
(+1 bảng mở rộng), **17 khoá ngoại trong schema `public`** đúng như mô hình ERD, và cả 3 nghiệp vụ còn
thiếu đã có đầy đủ CSDL + giao diện.

| | Trước | Sau |
|---|---|---|
| Số bảng | 11 (tên tiếng Anh) | 13 theo thiết kế + 1 mở rộng |
| Thực thể của thiết kế bị thiếu | 5 | 0 |
| Khoá ngoại trong `public` | 8 | 17 |
| Nghiệp vụ trong thiết kế chưa làm | 3 | 0 |
| Lỗi TypeScript | 227 (do file thiếu) | 0 |

---

## 2. Đối chiếu từng bảng

### 2.1 Bảng bị thiếu hoàn toàn trong code cũ

| Bảng trong thiết kế | Tình trạng cũ | Đã xử lý |
|---|---|---|
| `yeu_cau_cap_nhat` | **Không có.** Đại diện CLB sửa trực tiếp bảng `clubs`, không qua phê duyệt — trái quan hệ 4 & 5 | Đã tạo bảng; RLS nay **chặn** CLB sửa trực tiếp `cau_lac_bo`, mọi thay đổi phải đi qua yêu cầu và chỉ áp dụng khi Quản trị viên duyệt |
| `su_kien` | **Không có.** Các thuộc tính sự kiện bị dồn vào `posts` (chỉ có `event_time`, `location`) | Đã tạo bảng con theo chiến lược *table-per-subtype*, khoá chính `MaBaiDang` đồng thời là khoá ngoại tới `bai_dang` |
| `kiem_duyet` | **Không có.** Chỉ lưu kết quả cuối ở `posts.status` + `reject_reason`, không có lịch sử, không biết ai duyệt | Đã tạo bảng; trigger tự ghi một lượt kiểm duyệt mỗi lần Quản trị viên duyệt/từ chối |
| `nhat_ky_hoat_dong` | **Không có.** Không có bất kỳ cơ chế ghi vết nào | Đã tạo bảng + 5 trigger ghi tự động; có trang `/admin/nhat-ky` |
| `nguoi_nhan_thong_bao` | **Không có.** `notifications` gộp cả nội dung và người nhận vào một bảng → nội dung bị nhân bản cho từng người nhận, **vi phạm 3NF** mà báo cáo tuyên bố | Đã tách thành `thong_bao` + `nguoi_nhan_thong_bao` đúng thiết kế |
| `vai_tro` | **Không có bảng.** Vai trò là `ENUM app_role` + bảng phụ `user_roles` cho phép **nhiều vai trò / tài khoản**, trái bội số 1–n của quan hệ 3 | Đã tạo bảng `vai_tro`; `nguoi_dung.MaVaiTro` là khoá ngoại **một** vai trò |

### 2.2 Bảng có nhưng sai tên / thiếu thuộc tính

| Thiết kế | Code cũ | Thuộc tính bị thiếu trong code cũ |
|---|---|---|
| `linh_vuc` | `categories` | `MoTa` |
| `cau_lac_bo` | `clubs` | `DonViTrucThuoc`, `Fanpage`, `NgayCapNhat`; `TrangThaiHoatDong` chỉ là boolean `is_active` (2 trạng thái) thay vì 3 |
| `nguoi_dung` | `profiles` + `user_roles` + `club_reps` | `SoDienThoai`, `MaVaiTro`, `MaCLB`; `TrangThaiTaiKhoan` là boolean `is_locked` |
| `bai_dang` | `posts` | `NgayDang`; `LoaiBaiDang` chỉ có 2 giá trị (`news`/`event`) thay vì **5** (`TinTuc`/`ChuongTrinh`/`ThanhTich`/`ThongBaoCLB`/`SuKien`) |
| `theo_doi_clb` | `follows` | `BatThongBao` |
| `thong_bao` | `notifications` | `LoaiThongBao`, `TieuDe` |
| `yeu_thich_su_kien` | `favorite_events` | Khoá ngoại trỏ tới `posts` thay vì `su_kien` → **có thể yêu thích một bài tin tức** |

Tất cả đã được đặt lại tên và bổ sung đủ thuộc tính.

### 2.3 Quan hệ sai bội số đã sửa

| Quan hệ (thiết kế) | Code cũ | Sau khi sửa |
|---|---|---|
| VAI_TRO – NGUOI_DUNG (1–n) | `user_roles` cho một tài khoản nhiều vai trò | `nguoi_dung.MaVaiTro NOT NULL` — đúng một vai trò |
| CAU_LAC_BO – NGUOI_DUNG (1–1) | `club_reps` cho một tài khoản phụ trách nhiều CLB và một CLB có nhiều tài khoản | `nguoi_dung.MaCLB UNIQUE` — đã kiểm thử: tài khoản thứ hai của cùng một CLB bị chặn |
| NGUOI_DUNG – SU_KIEN (n–n) | Trỏ tới `posts` | Trỏ tới `su_kien` |

---

## 3. Ba điểm buộc phải lệch so với báo cáo (do nền tảng)

Nền tảng là **PostgreSQL / Supabase**, không phải MySQL như kiểu dữ liệu trong báo cáo gợi ý.
Ba điểm sau **không thể** làm đúng y nguyên và nên được ghi chú lại trong báo cáo:

| # | Báo cáo | Thực tế | Lý do |
|---|---|---|---|
| 1 | `MaNguoiDung int AUTO_INCREMENT` | `uuid` | Khoá chính phải trùng `auth.users.id` của Supabase Auth. Các bảng còn lại **vẫn dùng `int` tự tăng** đúng thiết kế (`int GENERATED ALWAYS AS IDENTITY` — tương đương `AUTO_INCREMENT`) |
| 2 | `nguoi_dung.MatKhau varchar(255)` | Không có cột này | Supabase Auth lưu hash mật khẩu ở `auth.users.encrypted_password`. Lưu thêm một bản trong `nguoi_dung` vừa trùng lặp vừa rủi ro bảo mật |
| 3 | `NamThanhLap year`, `BatThongBao/DaDoc tinyint(1)` | `smallint` + CHECK, `boolean` | PostgreSQL không có kiểu `YEAR` và `tinyint` |

Ngoài ra `bai_dang.MaNguoiTao` được để **cho phép NULL** (báo cáo ghi NOT NULL), với `ON DELETE SET NULL`:
khi một tài khoản đại diện bị xoá, bài đăng của CLB vẫn phải được giữ lại như dữ liệu lịch sử.

---

## 4. Cột mở rộng ngoài thiết kế — cần thêm vào báo cáo

Giao diện đã xây dựng dùng những cột dưới đây mà **Bảng 19 và Bảng 20 trong báo cáo chưa có**.
Chúng được giữ lại để không mất chức năng; nhóm nên bổ sung các dòng này vào báo cáo:

**Thêm vào Bảng 19 (`cau_lac_bo`):**

| Tên thuộc tính | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| GioiThieuNgan | varchar(300) | NULL | Câu giới thiệu ngắn hiển thị trên thẻ CLB ở trang danh sách |
| BanChuyenMon | text | NULL | Danh sách các ban chuyên môn của CLB |
| ThanhTich | text | NULL | Thành tích nổi bật, hiển thị ở trang chi tiết |
| AnhBia | varchar(255) | NULL | Đường dẫn ảnh bìa của CLB |
| NoiBat | boolean | NOT NULL, DEFAULT false | Đánh dấu CLB nổi bật để đưa lên trang chủ |

**Thêm vào Bảng 20 (`nguoi_dung`):**

| Tên thuộc tính | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| TenDangNhap | varchar(30) | NULL, UNIQUE | Tên đăng nhập do Quản trị viên cấp cho Đại diện CLB (tài khoản CLB không có email trường) |

**Thêm vào Bảng 21 (`yeu_cau_cap_nhat`):**

| Tên thuộc tính | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| LyDoTuChoi | text | NULL | Lý do Quản trị viên từ chối yêu cầu, để CLB biết cần sửa gì |

**Bảng mở rộng ngoài 13 bảng:** `thong_ke_truy_cap (MaThongKe, LuotTruyCap)` — đếm lượt truy cập cho
ô "Lượt truy cập" trên Dashboard của Quản trị viên.

---

## 5. Hai điểm nên sửa trong phần chữ của báo cáo

1. **Số mối quan hệ chưa khớp.** Bảng 15 được giới thiệu là "15 mối quan hệ" nhưng chỉ liệt kê **14 dòng**.
   Với 14 quan hệ, trong đó 3 quan hệ nhiều-nhiều được tách thành 2 → tổng là **11 + 6 = 17**, không phải 18.
   CSDL sau khi sửa có **đúng 17 khoá ngoại** trong schema `public` (cộng thêm khoá ngoại
   `nguoi_dung → auth.users` của nền tảng thì thành 18).
2. **Số bảng chưa khớp.** Mục 4.2 viết "Kết quả chuẩn hoá cho 14 bảng" nhưng chỉ liệt kê **13 dòng**,
   còn mục 4.3 lại ghi đúng "13 bảng". Con số đúng là **13**.
3. **Trùng tiêu đề.** Cả mục 4.3 và 4.4 đều mang tên "Thiết kế mức vật lý"; mục 4.3 thực chất là
   danh sách quan hệ kèm khoá ngoại, nên đặt tên khác (ví dụ "Lược đồ quan hệ").

---

## 6. Ba nghiệp vụ trong thiết kế nay đã có giao diện

| Nghiệp vụ | Trang mới | Mô tả |
|---|---|---|
| Yêu cầu cập nhật thông tin CLB | `/clb/thong-tin` (gửi), `/clb/yeu-cau` (theo dõi), `/admin/yeu-cau` (duyệt) | CLB sửa form → hệ thống chỉ lưu **những trường thay đổi** dưới dạng JSON vào `NoiDungThayDoi`. Khi Quản trị viên duyệt, trigger ghi thay đổi vào `cau_lac_bo` và cập nhật `NgayCapNhat` |
| Lịch sử kiểm duyệt | nút "Lịch sử" ở `/clb/bai-dang` | Hiển thị toàn bộ các lượt duyệt/từ chối kèm lý do và thời điểm |
| Nhật ký hoạt động | `/admin/nhat-ky` | 300 thao tác gần nhất, có tìm kiếm; ghi tự động bởi trigger |

Ngoài ra: bật/tắt thông báo theo từng CLB (`BatThongBao`) ở trang `/dang-theo-doi` và trang chi tiết CLB;
lọc sự kiện theo `LoaiSuKien`; sự kiện có giờ kết thúc và trạng thái diễn ra.

---

## 7. Hai lỗi có sẵn đã sửa kèm

1. **Thiếu file làm vỡ build.** `src/lib/club-account.ts` được 3 file import nhưng không có trong
   mã nguồn, và `drizzle/migrations/0003_migration.sql` được `_journal.json` tham chiếu nhưng cũng
   không có. Dự án không build được. Cả hai đã được tạo lại.
2. **Trang chủ trống sau khi triển khai mới.** Trigger `posts_before()` cũ ép
   `new.status := 'pending'` với mọi bài khi `auth.uid()` là NULL — mà trong migration thì
   `auth.uid()` **luôn** NULL, nên toàn bộ 10 bài dữ liệu mẫu bị kẹt ở trạng thái chờ duyệt và
   trang chủ không hiển thị gì. Migration mới công khai lại đúng trạng thái cho các bài mẫu
   (chỉ các bài mẫu, nhận diện qua `MaNguoiTao IS NULL`, không ảnh hưởng dữ liệu thật).

---

## 8. Cách triển khai

Migration mới là `drizzle/migrations/0005_migration.sql`, đã được thêm vào `meta/_journal.json`.
Nó **tự chuyển toàn bộ dữ liệu cũ sang lược đồ mới rồi xoá các bảng cũ**, nên chỉ cần chạy migration
như bình thường (Lovable chạy tự động khi push, hoặc `npx drizzle-kit migrate`).

Những gì migration tự làm:

- Tạo 13 bảng thiết kế + `thong_ke_truy_cap`, seed `vai_tro` và `MoTa` cho `linh_vuc`
- Chuyển dữ liệu: `categories→linh_vuc`, `clubs→cau_lac_bo`, `profiles+user_roles+club_reps→nguoi_dung`,
  `posts→bai_dang+su_kien+kiem_duyet`, `follows→theo_doi_clb`, `favorite_events→yeu_thich_su_kien`,
  `notifications→thong_bao+nguoi_nhan_thong_bao`, `site_stats→thong_ke_truy_cap`
- Tự tách `Fanpage` ra khỏi `contact_info` cũ bằng biểu thức chính quy
- Gán lĩnh vực `"Khác"` cho CLB chưa phân loại (vì `MaLinhVuc` là NOT NULL)
- Bỏ các lượt yêu thích trỏ vào bài tin tức (khoá ngoại mới chỉ cho phép sự kiện)
- Giữ lại **một** tài khoản đại diện cho mỗi CLB (quan hệ 1–1)
- Xoá sạch bảng, hàm, trigger và ENUM của lược đồ cũ
- Tạo 32 RLS policy, 9 trigger và 23 hàm hỗ trợ

**Lưu ý:** migration xoá các bảng cũ nên hãy sao lưu (Supabase → Database → Backups) trước khi chạy
trên dữ liệu thật.

---

## 9. Đã kiểm thử những gì

Migration được chạy thật trên PostgreSQL 16 với một bản dữ liệu mô phỏng (6 CLB mẫu, 10 bài đăng,
5 tài khoản ở cả 3 vai trò, dữ liệu theo dõi và yêu thích, kể cả các trường hợp dữ liệu "bẩn"),
sau đó dựng **PostgREST** để gọi đúng những request mà frontend gửi. Kết quả: toàn bộ đạt.

**Mức CSDL** — 13 mục: tạo tài khoản mới nhận vai trò SinhVien; chặn email ngoài trường; sinh viên
không thấy bài chờ duyệt; Đại diện CLB không sửa trực tiếp `cau_lac_bo`; bài mới bị ép về `ChoDuyet`;
duyệt bài sinh `kiem_duyet` + `NgayDang` + thông báo; `BatThongBao=false` thì không nhận thông báo;
từ chối kèm lý do; yêu cầu cập nhật bị ép `ChoDuyet` và CLB không tự duyệt được; duyệt yêu cầu thì
áp dụng vào `cau_lac_bo`; ghi `ThoiGianDoc`; chặn yêu thích bài tin tức; ràng buộc 1–1 CLB ↔ tài khoản.

**Mức API (PostgREST)** — 13 truy vấn đọc và 8 luồng ghi, trong đó đã phát hiện và sửa một lỗi thật:
`nguoi_dung → cau_lac_bo` bị **nhập nhằng** vì ngoài khoá ngoại trực tiếp còn một đường nhiều-nhiều
qua `theo_doi_clb`; trang `/admin/tai-khoan` phải chỉ rõ `cau_lac_bo!nguoi_dung_MaCLB_fkey(TenCLB)`.

**Mức ứng dụng** — `tsc --noEmit`: 0 lỗi · `vitest run`: 1/1 đạt · `vite build`: thành công.

Các lỗi ESLint còn lại đều nằm ở những file **tự sinh, không chỉnh sửa** (`src/integrations/supabase/*`)
và đã tồn tại từ trước — bản `types.ts` gốc cũng báo 299 lỗi định dạng tương tự.

---

## 10. Tương tác bài viết và phân loại CLB theo sơ đồ Đoàn – Hội

File cấu trúc: `sql/0009_cau_truc_tuong_tac_va_so_do_to_chuc.sql` — **chỉ thay đổi lược đồ** (bảng, hàm,
trigger, RLS), vì công cụ migration của Lovable chỉ nhận thay đổi cấu trúc. Dữ liệu sơ đồ được nhập bằng hàm
`khoi_tao_so_do_to_chuc()` (chỉ Quản trị viên), chạy qua nút **"Nhập sơ đồ tổ chức"** ở trang Quản lý CLB.

### 10.1 Bỏ "lĩnh vực", thay bằng sơ đồ tổ chức

| Trước | Sau |
|---|---|
| Bảng `linh_vuc` + `cau_lac_bo.MaLinhVuc NOT NULL` (phân loại Học thuật / Nghệ thuật / Thể thao… do người dùng tự đặt, không thống nhất) | Giao diện **không còn dùng** lĩnh vực; `MaLinhVuc` cho phép NULL. Bảng và dữ liệu cũ được giữ lại để không mất dữ liệu (có thể xoá sau) |
| `DonViTrucThuoc` là chuỗi tự do (“Đoàn Thanh niên”, “Hội Sinh viên”, “Khác”) | Bảng mới `don_vi_to_chuc (MaDonVi, Khoi, TenDonVi, MoTa, ThuTu)` + `cau_lac_bo.MaDonVi` (khoá ngoại, NULL = khác / chưa phân loại). `DonViTrucThuoc` nay do trigger **tự sinh** dạng “Hội Sinh viên – CLB cụm Học thuật” |

`don_vi_to_chuc` thay vai trò của `linh_vuc` trong thiết kế. Hàm nhập dữ liệu tạo 9 đơn vị theo sơ đồ:

- **Đoàn Thanh niên:** Bộ phận hành chính · Đội trực thuộc · Ban chuyên môn · LCĐ, CĐ trực thuộc
- **Hội Sinh viên:** CLB cụm Tình nguyện – Sở thích · Liên chi hội · CLB cụm Học thuật · CLB cụm Kỹ năng · Đội trực thuộc

Hàm cũng **tự xếp** CLB đang có vào đơn vị theo tên (hàm `doan_don_vi`, đã kiểm thử đúng cả 51 đơn vị trong sơ đồ)
và **thêm 60 CLB / đội / ban / LCĐ / LCH** của sơ đồ, bỏ qua đơn vị đã có; bấm lại nhiều lần không tạo trùng.
CLB tạo mới chưa chọn đơn vị cũng được đoán tự động. Quản trị viên sửa lại trong *Quản lý CLB* và quản lý danh
sách đơn vị qua nút *Sơ đồ tổ chức*. Yêu cầu cập nhật của Đại diện CLB nay đề xuất `MaDonVi` thay vì `MaLinhVuc`.

### 10.2 Bảng và hàm mới cho số liệu tương tác

| Đối tượng | Mục đích |
|---|---|
| `luot_xem_bai_dang (MaLuotXem, MaBaiDang, MaNguoiDung NULL, ThoiGianXem)` | Mỗi lần mở bài đã duyệt; cùng tài khoản trong 30 phút chỉ tính 1 lượt |
| `binh_luan (MaBinhLuan, MaBaiDang, MaNguoiDung, NoiDung ≤ 1000 ký tự, ThoiGianTao)` | Bình luận dưới bài; chỉ bài đã duyệt, tối đa 5 bình luận/phút; người viết, Đại diện CLB của bài và Quản trị viên được xoá |
| `ghi_luot_xem(bai)` | Ghi lượt xem (gọi được cả khi chưa đăng nhập) |
| `binh_luan_cua_bai(bai)` | Danh sách bình luận kèm tên người viết (bảng `nguoi_dung` bị RLS khoá) |
| `bai_viet_noi_bat(gioi_han, so_ngay)` | Banner trang chủ: điểm = lượt xem + 5 × bình luận + 3 × yêu thích trong 30 ngày |
| `dem_tuong_tac(ds_bai)` | Tổng lượt xem / bình luận / yêu thích của các bài |
| `tuong_tac_clb(clb)` | Số liệu theo ngày cho trang *Tổng quan CLB* (chỉ Đại diện của CLB đó hoặc Quản trị viên) |

Các hàm thống kê là `SECURITY DEFINER` và chỉ trả về **con số**, không lộ ai đã xem / yêu thích gì.

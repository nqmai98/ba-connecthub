-- =====================================================================
-- 0010 — Nhập sẵn toàn bộ đơn vị trong
--        SƠ ĐỒ TỔ CHỨC ĐOÀN THANH NIÊN – HỘI SINH VIÊN HỌC VIỆN NGÂN HÀNG
--
-- 60 CLB / đội / ban / LCĐ / LCH, mỗi đơn vị gắn sẵn vào đúng ô xanh (MaDonVi 1–9
-- tạo ở migration 0009) và đều hiển thị cho sinh viên (TrangThaiHoatDong mặc định
-- 'DangHoatDong').
--
-- KHÔNG tạo trùng: một dòng bị bỏ qua nếu CSDL đã có CLB khớp "mau_trung"
-- (so trên tên đã bỏ dấu, viết thường – hàm bo_dau ở 0009), ví dụ đã có
-- "CLB Guitar - GBA" thì không thêm "GBA - CLB Guitar HVNH".
-- Chạy lại nhiều lần cũng không sinh bản sao.
--
-- Các CLB mới CHƯA có tài khoản Đại diện: Quản trị viên cấp sau ở Quản lý CLB.
-- =====================================================================

insert into public.cau_lac_bo ("TenCLB", "MaDonVi", "GioiThieuNgan")
select n.ten, n.ma_don_vi, n.gioi_thieu
from (values
  -- ===== ĐOÀN THANH NIÊN =====
  -- 1. Bộ phận hành chính
  ('Văn phòng Đoàn', 1, 'Bộ phận hành chính của Đoàn Thanh niên Học viện Ngân hàng',
     '\yvan phong doan\y'),
  -- 2. Đội trực thuộc
  ('TLD - Đội Thủ lĩnh Đoàn', 2, 'Đội trực thuộc Đoàn Thanh niên Học viện Ngân hàng',
     '\y(tld|thu linh doan)\y'),
  -- 3. Ban chuyên môn
  ('Ủy ban Kiểm tra', 3, 'Ban chuyên môn của Đoàn Thanh niên Học viện Ngân hàng',
     '\yuy ban kiem tra\y'),
  ('Ban TĐKT & Phát triển Đảng', 3, 'Ban Thi đua khen thưởng & Phát triển Đảng – Đoàn Thanh niên Học viện Ngân hàng',
     '\y(ban tdkt|thi dua khen thuong)\y'),
  ('Ban Tài chính', 3, 'Ban chuyên môn của Đoàn Thanh niên Học viện Ngân hàng',
     '^ban tai chinh'),
  ('Ban Tình nguyện', 3, 'Ban chuyên môn của Đoàn Thanh niên Học viện Ngân hàng',
     '^ban tinh nguyen'),
  ('Ban Phong trào', 3, 'Ban chuyên môn của Đoàn Thanh niên Học viện Ngân hàng',
     '^ban phong trao'),
  -- 4. LCĐ, CĐ trực thuộc
  ('LCĐ khoa Ngân hàng', 4, 'Liên chi đoàn khoa Ngân hàng',
     '\y(lcd|lien chi doan) khoa ngan hang\y'),
  ('LCĐ khoa Tài chính', 4, 'Liên chi đoàn khoa Tài chính',
     '\y(lcd|lien chi doan) khoa tai chinh\y'),
  ('LCĐ khoa Kế toán - Kiểm toán', 4, 'Liên chi đoàn khoa Kế toán - Kiểm toán',
     '\y(lcd|lien chi doan) khoa ke toan'),
  ('LCĐ khoa Quản trị kinh doanh', 4, 'Liên chi đoàn khoa Quản trị kinh doanh',
     '\y(lcd|lien chi doan) khoa quan tri kinh doanh\y'),
  ('LCĐ khoa Hệ thống thông tin quản lý', 4, 'Liên chi đoàn khoa Hệ thống thông tin quản lý',
     '\y(lcd|lien chi doan) khoa he thong thong tin'),
  ('LCĐ khoa Luật', 4, 'Liên chi đoàn khoa Luật',
     '\y(lcd|lien chi doan) khoa luat\y'),
  ('LCĐ khoa Ngoại ngữ', 4, 'Liên chi đoàn khoa Ngoại ngữ',
     '\y(lcd|lien chi doan) khoa ngoai ngu\y'),
  ('LCĐ khoa Kinh doanh quốc tế', 4, 'Liên chi đoàn khoa Kinh doanh quốc tế',
     '\y(lcd|lien chi doan) khoa kinh doanh quoc te\y'),
  ('LCĐ khoa Kinh tế', 4, 'Liên chi đoàn khoa Kinh tế',
     '\y(lcd|lien chi doan) khoa kinh te$'),
  ('LCĐ Viện Đào tạo quốc tế', 4, 'Liên chi đoàn Viện Đào tạo quốc tế',
     '\y(lcd|lien chi doan) vien dao tao quoc te\y'),
  ('LCĐ chương trình Chất lượng cao', 4, 'Liên chi đoàn chương trình Chất lượng cao',
     '\y(lcd|lien chi doan) chuong trinh chat luong cao\y'),
  ('CĐ Phòng ban trung tâm', 4, 'Chi đoàn Phòng ban trung tâm',
     '\y(cd|chi doan) phong ban trung tam\y'),
  ('CĐ Viện NCKH', 4, 'Chi đoàn Viện Nghiên cứu khoa học',
     '\y(cd|chi doan) vien (nckh|nghien cuu khoa hoc)\y'),
  ('LCĐ cơ sở đào tạo Sơn Tây', 4, 'Liên chi đoàn cơ sở đào tạo Sơn Tây',
     '\y(lcd|lien chi doan) .*son tay\y'),
  ('LCĐ Phân viện Bắc Ninh', 4, 'Liên chi đoàn Phân viện Bắc Ninh',
     '\y(lcd|lien chi doan) .*bac ninh\y'),

  -- ===== HỘI SINH VIÊN =====
  -- 5. CLB cụm Tình nguyện – Sở thích
  ('BAVT - Đội Sinh viên Tình nguyện HVNH', 5, 'Đội Sinh viên Tình nguyện Học viện Ngân hàng',
     '\y(bavt|doi sinh vien tinh nguyen)\y'),
  ('BBC - CLB Sinh viên tình nguyện Vận động hiến máu', 5, 'CLB Sinh viên tình nguyện Vận động hiến máu',
     '\y(bbc|hien mau)\y'),
  ('BAAT - Đội Văn nghệ HVNH', 5, 'Đội Văn nghệ Học viện Ngân hàng',
     '\y(baat|van nghe)\y'),
  ('MCC - CLB MC Học viện Ngân hàng', 5, 'CLB MC Học viện Ngân hàng',
     '\y(mcc|clb mc|cau lac bo mc)\y'),
  ('GBA - CLB Guitar HVNH', 5, 'CLB Guitar Học viện Ngân hàng',
     '\y(gba|guitar)\y'),
  ('SMC - CLB Truyền thông HVNH', 5, 'CLB Truyền thông Học viện Ngân hàng',
     '\y(smc|clb truyen thong|cau lac bo truyen thong)\y'),
  ('BKC - CLB Karatedo HVNH', 5, 'CLB Karatedo Học viện Ngân hàng',
     '\y(bkc|karate|karatedo)\y'),
  ('BTC - CLB Taekwondo HVNH', 5, 'CLB Taekwondo Học viện Ngân hàng',
     '\ytaekwondo\y'),
  ('BAFT - Đội Bóng đá HVNH', 5, 'Đội Bóng đá Học viện Ngân hàng',
     '\y(baft|bong da)\y'),
  ('BAC - CLB Cờ vua HVNH', 5, 'CLB Cờ vua Học viện Ngân hàng',
     '\yco vua\y'),
  ('BTTC - CLB Bóng bàn HVNH', 5, 'CLB Bóng bàn Học viện Ngân hàng',
     '\y(bttc|bong ban)\y'),
  ('BABC - CLB Cầu lông HVNH', 5, 'CLB Cầu lông Học viện Ngân hàng',
     '\y(babc|cau long)\y'),
  ('BBA - CLB Sách HVNH', 5, 'CLB Sách Học viện Ngân hàng',
     '\y(bba|clb sach|cau lac bo sach)\y'),
  ('Đội Nghi lễ', 5, 'Đội Nghi lễ Học viện Ngân hàng',
     '\ynghi le\y'),
  -- 6. Liên chi hội
  ('LCH khoa Ngân hàng', 6, 'Liên chi hội khoa Ngân hàng',
     '\y(lch|lien chi hoi) khoa ngan hang\y'),
  ('Đội CTV khoa Tài chính', 6, 'Đội Cộng tác viên khoa Tài chính',
     '\yctv khoa tai chinh\y'),
  ('LCH khoa Kế toán - Kiểm toán', 6, 'Liên chi hội khoa Kế toán - Kiểm toán',
     '\y(lch|lien chi hoi) khoa ke toan'),
  ('LCH khoa Quản trị kinh doanh', 6, 'Liên chi hội khoa Quản trị kinh doanh',
     '\y(lch|lien chi hoi) khoa quan tri kinh doanh\y'),
  ('LCH khoa Hệ thống thông tin quản lý', 6, 'Liên chi hội khoa Hệ thống thông tin quản lý',
     '\y(lch|lien chi hoi) khoa he thong thong tin'),
  ('LCH khoa Luật', 6, 'Liên chi hội khoa Luật',
     '\y(lch|lien chi hoi) khoa luat\y'),
  ('LCH khoa Ngoại ngữ', 6, 'Liên chi hội khoa Ngoại ngữ',
     '\y(lch|lien chi hoi) khoa ngoai ngu\y'),
  ('LCH khoa Kinh doanh quốc tế', 6, 'Liên chi hội khoa Kinh doanh quốc tế',
     '\y(lch|lien chi hoi) khoa kinh doanh quoc te\y'),
  ('LCH khoa Kinh tế', 6, 'Liên chi hội khoa Kinh tế',
     '\y(lch|lien chi hoi) khoa kinh te$'),
  -- 7. CLB cụm Học thuật
  ('AAC - CLB Kế toán - Kiểm toán', 7, 'CLB Kế toán - Kiểm toán',
     '\y(aac|clb ke toan|cau lac bo ke toan)\y'),
  ('IBC - CLB Kinh doanh quốc tế', 7, 'CLB Kinh doanh quốc tế',
     '\y(ibc|clb kinh doanh quoc te|cau lac bo kinh doanh quoc te)\y'),
  ('ECBA - CLB Tiếng Anh', 7, 'CLB Tiếng Anh Học viện Ngân hàng',
     '\y(ecba|tieng anh)\y'),
  ('BIT - CLB Tin học Ngân hàng', 7, 'CLB Tin học Ngân hàng',
     '\y(bit|tin hoc)\y'),
  ('SEC - CLB Chứng khoán', 7, 'CLB Chứng khoán Học viện Ngân hàng',
     '\y(sec|chung khoan)\y'),
  ('SRC - CLB Nghiên cứu Khoa học', 7, 'CLB Nghiên cứu Khoa học sinh viên',
     '\y(src|nghien cuu khoa hoc)\y'),
  ('FJC - CLB Luật gia tương lai', 7, 'CLB Luật gia tương lai',
     '\y(fjc|luat gia)\y'),
  ('YEC - CLB Nhà Kinh tế trẻ', 7, 'CLB Nhà Kinh tế trẻ',
     '\y(yec|kinh te tre)\y'),
  ('FC - CLB Tài chính', 7, 'CLB Tài chính Học viện Ngân hàng',
     '(^fc\y|\y(clb|cau lac bo) tai chinh\y)'),
  -- 8. CLB cụm Kỹ năng
  ('TBC - CLB Nhà Ngân hàng tương lai', 8, 'CLB Nhà Ngân hàng tương lai',
     '\y(tbc|nha ngan hang tuong lai)\y'),
  ('BSC - CLB Kỹ năng kinh doanh', 8, 'CLB Kỹ năng kinh doanh',
     '\y(bsc|ky nang kinh doanh)\y'),
  ('SCBA - CLB Thuyết trình', 8, 'CLB Thuyết trình Học viện Ngân hàng',
     '\y(scba|thuyet trinh)\y'),
  ('UBC - CLB Ngân hàng và nguồn nhân lực', 8, 'CLB Ngân hàng và nguồn nhân lực',
     '\y(ubc|nguon nhan luc)\y'),
  ('STC - CLB Khởi nghiệp', 8, 'CLB Khởi nghiệp Học viện Ngân hàng',
     '\y(stc|khoi nghiep)\y'),
  -- 9. Đội trực thuộc Hội
  ('BlueWings - Đội CTV BCH Hội Sinh viên', 9, 'Đội Cộng tác viên Ban Chấp hành Hội Sinh viên',
     '\y(bluewings|blue wings|ctv bch)\y')
) as n(ten, ma_don_vi, gioi_thieu, mau_trung)
where exists (select 1 from public.don_vi_to_chuc dv where dv."MaDonVi" = n.ma_don_vi)
  and not exists (
    select 1 from public.cau_lac_bo c
    where public.bo_dau(c."TenCLB") ~ n.mau_trung
       or public.bo_dau(c."TenCLB") = public.bo_dau(n.ten)
  );

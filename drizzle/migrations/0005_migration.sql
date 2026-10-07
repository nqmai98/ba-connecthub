-- =====================================================================
-- 0005_migration.sql — Chuẩn hoá CSDL theo Thiết kế mức vật lý (chương 4)
--
-- Chuyển toàn bộ lược đồ sang 13 bảng đặt tên tiếng Việt đúng theo báo cáo:
--   linh_vuc, vai_tro, cau_lac_bo, nguoi_dung, yeu_cau_cap_nhat, theo_doi_clb,
--   bai_dang, su_kien, kiem_duyet, yeu_thich_su_kien, nhat_ky_hoat_dong,
--   thong_bao, nguoi_nhan_thong_bao
--
-- Dữ liệu từ lược đồ cũ (categories, clubs, profiles, user_roles, club_reps,
-- posts, follows, favorite_events, notifications, site_stats) được chuyển sang
-- trước khi các bảng cũ bị xoá.
--
-- Ba điểm buộc phải lệch so với báo cáo vì nền tảng (xem BANG_DOI_CHIEU.md):
--   1. MaNguoiDung là uuid (khoá của auth.users – Supabase Auth), không phải int.
--   2. MatKhau không nằm trong nguoi_dung; Supabase lưu hash ở auth.users.
--   3. Postgres không có kiểu YEAR/tinyint: NamThanhLap là smallint + CHECK,
--      BatThongBao / DaDoc là boolean.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. BẢNG MỚI
-- ---------------------------------------------------------------------

create table public.linh_vuc (
  "MaLinhVuc"  int generated always as identity primary key,
  "TenLinhVuc" varchar(100) not null unique,
  "MoTa"       text
);

create table public.vai_tro (
  "MaVaiTro"  int generated always as identity primary key,
  "TenVaiTro" varchar(50) not null unique,
  "MoTaQuyen" text
);

create table public.cau_lac_bo (
  "MaCLB"             int generated always as identity primary key,
  "TenCLB"            varchar(255) not null,
  "NamThanhLap"       smallint check ("NamThanhLap" between 1900 and 2200),
  "MaLinhVuc"         int not null references public.linh_vuc("MaLinhVuc") on delete restrict,
  "DonViTrucThuoc"    varchar(255),
  "MoTa"              text,
  "LogoCLB"           varchar(255),
  "ThongTinLienHe"    varchar(255),
  "Fanpage"           varchar(255),
  "TrangThaiHoatDong" varchar(30) not null default 'DangHoatDong'
    check ("TrangThaiHoatDong" in ('DangHoatDong', 'TamNgung', 'NgungHoatDong')),
  "NgayCapNhat"       timestamptz not null default now(),
  -- Mở rộng ngoài báo cáo, phục vụ giao diện đã xây dựng (xem BANG_DOI_CHIEU.md)
  "GioiThieuNgan"     varchar(300),
  "BanChuyenMon"      text,
  "ThanhTich"         text,
  "AnhBia"            varchar(255),
  "NoiBat"            boolean not null default false
);
create index cau_lac_bo_linh_vuc_idx on public.cau_lac_bo ("MaLinhVuc");

create table public.nguoi_dung (
  "MaNguoiDung"       uuid primary key references auth.users(id) on delete cascade,
  "HoTen"             varchar(100) not null default '',
  "EmailTruong"       varchar(100) not null unique,
  "SoDienThoai"       varchar(15),
  "MaVaiTro"          int not null references public.vai_tro("MaVaiTro") on delete restrict,
  "MaCLB"             int unique references public.cau_lac_bo("MaCLB") on delete set null,
  "TrangThaiTaiKhoan" varchar(20) not null default 'HoatDong'
    check ("TrangThaiTaiKhoan" in ('HoatDong', 'BiKhoa')),
  "NgayCapTaiKhoan"   timestamptz not null default now(),
  -- Mở rộng: tên đăng nhập do Quản trị viên cấp cho Đại diện CLB
  "TenDangNhap"       varchar(30) unique
);
create index nguoi_dung_vai_tro_idx on public.nguoi_dung ("MaVaiTro");

create table public.yeu_cau_cap_nhat (
  "MaYeuCau"       int generated always as identity primary key,
  "MaCLB"          int not null references public.cau_lac_bo("MaCLB") on delete cascade,
  "MaQuanTriVien"  uuid references public.nguoi_dung("MaNguoiDung") on delete set null,
  "NoiDungThayDoi" text not null,
  "TrangThaiXuLy"  varchar(20) not null default 'ChoDuyet'
    check ("TrangThaiXuLy" in ('ChoDuyet', 'DaDuyet', 'TuChoi')),
  "ThoiGianGui"    timestamptz not null default now(),
  "ThoiGianXuLy"   timestamptz,
  -- Mở rộng: lý do khi Quản trị viên từ chối, để CLB biết cần sửa gì
  "LyDoTuChoi"     text
);
create index yeu_cau_cap_nhat_clb_idx on public.yeu_cau_cap_nhat ("MaCLB", "ThoiGianGui" desc);
create index yeu_cau_cap_nhat_trang_thai_idx on public.yeu_cau_cap_nhat ("TrangThaiXuLy");

create table public.theo_doi_clb (
  "MaNguoiDung" uuid not null references public.nguoi_dung("MaNguoiDung") on delete cascade,
  "MaCLB"       int  not null references public.cau_lac_bo("MaCLB") on delete cascade,
  "NgayTheoDoi" timestamptz not null default now(),
  "BatThongBao" boolean not null default true,
  primary key ("MaNguoiDung", "MaCLB")
);
create index theo_doi_clb_clb_idx on public.theo_doi_clb ("MaCLB");

create table public.bai_dang (
  "MaBaiDang"          int generated always as identity primary key,
  "MaCLB"              int not null references public.cau_lac_bo("MaCLB") on delete cascade,
  "MaNguoiTao"         uuid references public.nguoi_dung("MaNguoiDung") on delete set null,
  "LoaiBaiDang"        varchar(30) not null
    check ("LoaiBaiDang" in ('TinTuc', 'ChuongTrinh', 'ThanhTich', 'ThongBaoCLB', 'SuKien')),
  "TieuDe"             varchar(255) not null,
  "NoiDung"            text not null,
  "AnhBia"             varchar(255),
  "TrangThaiKiemDuyet" varchar(20) not null default 'ChoDuyet'
    check ("TrangThaiKiemDuyet" in ('ChoDuyet', 'DaDuyet', 'TuChoi')),
  "NgayTao"            timestamptz not null default now(),
  "NgayDang"           timestamptz
);
create index bai_dang_clb_idx on public.bai_dang ("MaCLB");
create index bai_dang_kiem_duyet_idx on public.bai_dang ("TrangThaiKiemDuyet", "LoaiBaiDang", "NgayTao" desc);

create table public.su_kien (
  "MaBaiDang"       int primary key references public.bai_dang("MaBaiDang") on delete cascade,
  "LoaiSuKien"      varchar(20) not null check ("LoaiSuKien" in ('HocThuat', 'PhiHocThuat')),
  "ThoiGianBatDau"  timestamptz not null,
  "ThoiGianKetThuc" timestamptz not null,
  "DiaDiem"         varchar(255),
  "TrangThaiDienRa" varchar(20) not null default 'SapDienRa'
    check ("TrangThaiDienRa" in ('SapDienRa', 'DangDienRa', 'DaDienRa')),
  constraint su_kien_thoi_gian_hop_le check ("ThoiGianKetThuc" >= "ThoiGianBatDau")
);
create index su_kien_bat_dau_idx on public.su_kien ("ThoiGianBatDau");

create table public.kiem_duyet (
  "MaKiemDuyet"       int generated always as identity primary key,
  "MaBaiDang"         int not null references public.bai_dang("MaBaiDang") on delete cascade,
  "MaQuanTriVien"     uuid not null references public.nguoi_dung("MaNguoiDung") on delete restrict,
  "KetQuaKiemDuyet"   varchar(20) not null check ("KetQuaKiemDuyet" in ('DaDuyet', 'TuChoi')),
  "LyDoTuChoi"        text,
  "ThoiGianKiemDuyet" timestamptz not null default now()
);
create index kiem_duyet_bai_dang_idx on public.kiem_duyet ("MaBaiDang", "ThoiGianKiemDuyet" desc);

create table public.yeu_thich_su_kien (
  "MaNguoiDung"  uuid not null references public.nguoi_dung("MaNguoiDung") on delete cascade,
  "MaBaiDang"    int  not null references public.su_kien("MaBaiDang") on delete cascade,
  "NgayYeuThich" timestamptz not null default now(),
  primary key ("MaNguoiDung", "MaBaiDang")
);

create table public.nhat_ky_hoat_dong (
  "MaNhatKy"        int generated always as identity primary key,
  "MaNguoiDung"     uuid not null references public.nguoi_dung("MaNguoiDung") on delete cascade,
  "HanhDong"        varchar(100) not null,
  "DoiTuongTacDong" varchar(50),
  "MaDoiTuong"      int,
  "GiaTriCu"        text,
  "GiaTriMoi"       text,
  "ThoiGian"        timestamptz not null default now()
);
create index nhat_ky_thoi_gian_idx on public.nhat_ky_hoat_dong ("ThoiGian" desc);

create table public.thong_bao (
  "MaThongBao"   int generated always as identity primary key,
  "LoaiThongBao" varchar(30) not null
    check ("LoaiThongBao" in ('DuyetBaiDang', 'CLBCapNhat', 'YeuCauCapNhat', 'HeThong')),
  "TieuDe"       varchar(255) not null,
  "NoiDung"      text not null,
  "DuongDan"     varchar(255),
  "ThoiGianTao"  timestamptz not null default now()
);

create table public.nguoi_nhan_thong_bao (
  "MaThongBao"  int  not null references public.thong_bao("MaThongBao") on delete cascade,
  "MaNguoiDung" uuid not null references public.nguoi_dung("MaNguoiDung") on delete cascade,
  "DaDoc"       boolean not null default false,
  "ThoiGianDoc" timestamptz,
  primary key ("MaThongBao", "MaNguoiDung")
);
create index nguoi_nhan_thong_bao_nguoi_idx on public.nguoi_nhan_thong_bao ("MaNguoiDung", "DaDoc");

-- Mở rộng ngoài 13 bảng: đếm lượt truy cập cho Dashboard của Quản trị viên
create table public.thong_ke_truy_cap (
  "MaThongKe"   int primary key default 1,
  "LuotTruyCap" bigint not null default 0
);
insert into public.thong_ke_truy_cap ("MaThongKe", "LuotTruyCap") values (1, 0);

-- ---------------------------------------------------------------------
-- 2. DỮ LIỆU DANH MỤC
-- ---------------------------------------------------------------------

insert into public.vai_tro ("TenVaiTro", "MoTaQuyen") values
  ('SinhVien',    'Tra cứu CLB, theo dõi CLB, yêu thích sự kiện và xem lịch cá nhân'),
  ('DaiDienCLB',  'Đăng bài chờ duyệt và gửi yêu cầu cập nhật thông tin CLB mình phụ trách'),
  ('QuanTriVien', 'Kiểm duyệt bài đăng, duyệt yêu cầu cập nhật, quản lý CLB, tài khoản và xem nhật ký');

-- ---------------------------------------------------------------------
-- 3. CHUYỂN DỮ LIỆU TỪ LƯỢC ĐỒ CŨ
-- ---------------------------------------------------------------------

create unlogged table _mig_linh_vuc (old_id uuid primary key, new_id int not null);
create unlogged table _mig_clb (old_id uuid primary key, new_id int not null);
create unlogged table _mig_bai_dang (old_id uuid primary key, new_id int not null);

-- 3.1 categories -> linh_vuc (+ "Khác" làm lĩnh vực mặc định vì MaLinhVuc NOT NULL)
with chen as (
  insert into public.linh_vuc ("TenLinhVuc")
  select c.name from public.categories c order by c.name
  returning "MaLinhVuc", "TenLinhVuc"
)
insert into _mig_linh_vuc (old_id, new_id)
select c.id, k."MaLinhVuc" from public.categories c join chen k on k."TenLinhVuc" = c.name;

insert into public.linh_vuc ("TenLinhVuc", "MoTa")
select 'Khác', 'Lĩnh vực mặc định cho CLB chưa phân loại'
where not exists (select 1 from public.linh_vuc where "TenLinhVuc" = 'Khác');

-- 3.2 clubs -> cau_lac_bo
with chen as (
  insert into public.cau_lac_bo (
    "TenCLB", "NamThanhLap", "MaLinhVuc", "MoTa", "LogoCLB", "ThongTinLienHe",
    "TrangThaiHoatDong", "NgayCapNhat", "GioiThieuNgan", "BanChuyenMon", "ThanhTich", "AnhBia", "NoiBat"
  )
  select
    cl.name,
    cl.founded_year::smallint,
    coalesce(m.new_id, (select "MaLinhVuc" from public.linh_vuc where "TenLinhVuc" = 'Khác')),
    nullif(cl.description, ''),
    cl.logo_url,
    nullif(cl.contact_email, ''),
    case when cl.is_active then 'DangHoatDong' else 'NgungHoatDong' end,
    cl.created_at,
    nullif(cl.short_intro, ''),
    nullif(cl.departments, ''),
    nullif(cl.achievements, ''),
    cl.cover_url,
    cl.is_featured
  from public.clubs cl
  left join _mig_linh_vuc m on m.old_id = cl.category_id
  order by cl.created_at, cl.name
  returning "MaCLB", "TenCLB", "NgayCapNhat"
)
insert into _mig_clb (old_id, new_id)
select distinct on (cl.id) cl.id, k."MaCLB"
from public.clubs cl
join chen k on k."TenCLB" = cl.name and k."NgayCapNhat" = cl.created_at
order by cl.id, k."MaCLB";

-- Thông tin liên hệ phụ: fanpage tách riêng, phần còn lại dồn vào ThongTinLienHe
update public.cau_lac_bo c
set "Fanpage" = substring(src.contact_info from '(?:https?://)?(?:www\.)?facebook\.com/[A-Za-z0-9._%/-]+'),
    "ThongTinLienHe" = nullif(
      trim(both ' ·' from concat_ws(' · ', nullif(c."ThongTinLienHe", ''),
        nullif(trim(regexp_replace(src.contact_info, '(?:Fanpage:\s*)?(?:https?://)?(?:www\.)?facebook\.com/[A-Za-z0-9._%/-]+', '', 'g')), ''))), '')
from public.clubs src
join _mig_clb m on m.old_id = src.id
where c."MaCLB" = m.new_id and coalesce(src.contact_info, '') <> '';

-- 3.3 profiles + user_roles + club_reps -> nguoi_dung (1 vai trò, tối đa 1 CLB)
insert into public.nguoi_dung (
  "MaNguoiDung", "HoTen", "EmailTruong", "MaVaiTro", "MaCLB",
  "TrangThaiTaiKhoan", "NgayCapTaiKhoan", "TenDangNhap"
)
select
  p.id,
  p.full_name,
  p.email,
  (select vt."MaVaiTro" from public.vai_tro vt where vt."TenVaiTro" =
     case
       when exists (select 1 from public.user_roles r where r.user_id = p.id and r.role = 'admin')     then 'QuanTriVien'
       when exists (select 1 from public.user_roles r where r.user_id = p.id and r.role = 'club_rep')  then 'DaiDienCLB'
       else 'SinhVien'
     end),
  rep.new_club_id,
  case when p.is_locked then 'BiKhoa' else 'HoatDong' end,
  p.created_at,
  p.username
from public.profiles p
left join (
  -- mỗi CLB chỉ giữ lại một tài khoản đại diện (quan hệ 1–1 theo thiết kế)
  select distinct on (m.new_id) cr.user_id, m.new_id as new_club_id
  from public.club_reps cr
  join _mig_clb m on m.old_id = cr.club_id
  order by m.new_id, cr.user_id
) rep on rep.user_id = p.id
order by p.created_at;

-- 3.4 posts -> bai_dang + su_kien
with chen as (
  insert into public.bai_dang (
    "MaCLB", "MaNguoiTao", "LoaiBaiDang", "TieuDe", "NoiDung", "AnhBia",
    "TrangThaiKiemDuyet", "NgayTao", "NgayDang"
  )
  select
    m.new_id,
    nd."MaNguoiDung",
    case when po.type = 'event' then 'SuKien' else 'TinTuc' end,
    po.title,
    po.content,
    po.image_url,
    case po.status when 'approved' then 'DaDuyet' when 'rejected' then 'TuChoi' else 'ChoDuyet' end,
    po.created_at,
    case when po.status = 'approved' then po.updated_at end
  from public.posts po
  join _mig_clb m on m.old_id = po.club_id
  left join public.nguoi_dung nd on nd."MaNguoiDung" = po.author_id
  order by po.created_at, po.id
  returning "MaBaiDang", "MaCLB", "TieuDe", "NgayTao"
)
insert into _mig_bai_dang (old_id, new_id)
select distinct on (po.id) po.id, k."MaBaiDang"
from public.posts po
join _mig_clb m on m.old_id = po.club_id
join chen k on k."MaCLB" = m.new_id and k."TieuDe" = po.title and k."NgayTao" = po.created_at
order by po.id, k."MaBaiDang";

insert into public.su_kien ("MaBaiDang", "LoaiSuKien", "ThoiGianBatDau", "ThoiGianKetThuc", "DiaDiem", "TrangThaiDienRa")
select
  m.new_id,
  case when lv."TenLinhVuc" = 'Học thuật' then 'HocThuat' else 'PhiHocThuat' end,
  coalesce(po.event_time, po.created_at),
  coalesce(po.event_time, po.created_at) + interval '2 hours',
  po.location,
  case
    when now() < coalesce(po.event_time, po.created_at) then 'SapDienRa'
    when now() > coalesce(po.event_time, po.created_at) + interval '2 hours' then 'DaDienRa'
    else 'DangDienRa'
  end
from public.posts po
join _mig_bai_dang m on m.old_id = po.id
join public.bai_dang bd on bd."MaBaiDang" = m.new_id
join public.cau_lac_bo clb on clb."MaCLB" = bd."MaCLB"
join public.linh_vuc lv on lv."MaLinhVuc" = clb."MaLinhVuc"
where po.type = 'event';

-- Sửa lỗi dữ liệu mẫu của migration 0000: trigger posts_before() cũ ép
-- new.status := 'pending' cho mọi bài khi auth.uid() là NULL, nên toàn bộ bài mẫu
-- nằm ở trạng thái chờ duyệt và trang chủ của bản triển khai mới bị trống.
-- Chỉ chạm vào các bài mẫu (MaNguoiTao còn NULL), không ảnh hưởng dữ liệu thật.
update public.bai_dang bd
set "TrangThaiKiemDuyet" = 'DaDuyet', "NgayDang" = bd."NgayTao"
where bd."MaNguoiTao" is null
  and bd."TrangThaiKiemDuyet" = 'ChoDuyet'
  and bd."TieuDe" in (
    'Seminar: Phương pháp nghiên cứu định lượng',
    'English Talk: Future of Fintech',
    'Đêm nhạc Acoustic "Thu về"',
    'Khai mạc giải bóng đá BAV Cup',
    'Chiến dịch Áo ấm vùng cao',
    'BA Media tuyển thành viên Gen 11',
    'Kết quả vòng sơ loại NCKH 2026'
  );

update public.bai_dang
set "TrangThaiKiemDuyet" = 'TuChoi'
where "MaNguoiTao" is null
  and "TrangThaiKiemDuyet" = 'ChoDuyet'
  and "TieuDe" = 'Tuyển cầu thủ đội tuyển';

-- Lịch sử kiểm duyệt của các bài đã duyệt / bị từ chối, gán cho Quản trị viên đầu tiên
insert into public.kiem_duyet ("MaBaiDang", "MaQuanTriVien", "KetQuaKiemDuyet", "LyDoTuChoi", "ThoiGianKiemDuyet")
select
  bd."MaBaiDang",
  qtv."MaNguoiDung",
  bd."TrangThaiKiemDuyet",
  case when bd."TrangThaiKiemDuyet" = 'TuChoi'
       then coalesce(po.reject_reason, 'Nội dung còn sơ sài, vui lòng bổ sung thông tin đăng ký.') end,
  coalesce(bd."NgayDang", bd."NgayTao")
from public.bai_dang bd
left join _mig_bai_dang m on m.new_id = bd."MaBaiDang"
left join public.posts po on po.id = m.old_id
cross join (
  select nd."MaNguoiDung"
  from public.nguoi_dung nd
  join public.vai_tro vt on vt."MaVaiTro" = nd."MaVaiTro"
  where vt."TenVaiTro" = 'QuanTriVien'
  order by nd."NgayCapTaiKhoan"
  limit 1
) qtv
where bd."TrangThaiKiemDuyet" in ('DaDuyet', 'TuChoi');

-- Bài mẫu chưa có người tạo: gán cho tài khoản đại diện của chính CLB đó (nếu có)
update public.bai_dang bd
set "MaNguoiTao" = nd."MaNguoiDung"
from public.nguoi_dung nd
where nd."MaCLB" = bd."MaCLB" and bd."MaNguoiTao" is null;

-- 3.5 follows -> theo_doi_clb
insert into public.theo_doi_clb ("MaNguoiDung", "MaCLB", "NgayTheoDoi", "BatThongBao")
select f.user_id, m.new_id, f.created_at, true
from public.follows f
join _mig_clb m on m.old_id = f.club_id
join public.nguoi_dung nd on nd."MaNguoiDung" = f.user_id;

-- 3.6 favorite_events -> yeu_thich_su_kien (chỉ các bài đăng là sự kiện)
insert into public.yeu_thich_su_kien ("MaNguoiDung", "MaBaiDang", "NgayYeuThich")
select fe.user_id, m.new_id, fe.created_at
from public.favorite_events fe
join _mig_bai_dang m on m.old_id = fe.post_id
join public.su_kien sk on sk."MaBaiDang" = m.new_id
join public.nguoi_dung nd on nd."MaNguoiDung" = fe.user_id;

-- 3.7 notifications -> thong_bao + nguoi_nhan_thong_bao
do $$
declare r record; v_ma int;
begin
  for r in
    select n.id, n.user_id, n.content, n.link, n.is_read, n.created_at
    from public.notifications n
    join public.profiles p on p.id = n.user_id
    order by n.created_at
  loop
    insert into public.thong_bao ("LoaiThongBao", "TieuDe", "NoiDung", "DuongDan", "ThoiGianTao")
    values ('HeThong', left(r.content, 255), r.content, r.link, r.created_at)
    returning "MaThongBao" into v_ma;
    insert into public.nguoi_nhan_thong_bao ("MaThongBao", "MaNguoiDung", "DaDoc", "ThoiGianDoc")
    values (v_ma, r.user_id, r.is_read, case when r.is_read then r.created_at end)
    on conflict do nothing;
  end loop;
end $$;

-- 3.8 site_stats -> thong_ke_truy_cap
update public.thong_ke_truy_cap t
set "LuotTruyCap" = coalesce((select s.visits from public.site_stats s where s.id = 1), 0)
where t."MaThongKe" = 1;

drop table _mig_linh_vuc;
drop table _mig_clb;
drop table _mig_bai_dang;

-- ---------------------------------------------------------------------
-- 4. SAO LƯU LƯỢC ĐỒ CŨ RỒI XOÁ
-- ---------------------------------------------------------------------

-- Toàn bộ dữ liệu của 10 bảng cũ được chép sang schema backup_truoc_0005 TRƯỚC KHI xoá,
-- để luôn có đường lùi kể cả khi dự án dùng gói Supabase không có tính năng backup.
-- Các cột kiểu ENUM được ép sang text, vì phần dưới có "drop type ... cascade"
-- và lệnh đó sẽ xoá luôn mọi cột còn tham chiếu tới ENUM, kể cả cột trong bản sao lưu.
-- Xem lại dữ liệu cũ:  select * from backup_truoc_0005.clubs;
-- Khi đã chắc chắn mọi thứ chạy đúng, có thể xoá:  drop schema backup_truoc_0005 cascade;
create schema if not exists backup_truoc_0005;

create table backup_truoc_0005.categories      as select * from public.categories;
create table backup_truoc_0005.clubs           as select * from public.clubs;
create table backup_truoc_0005.profiles        as select * from public.profiles;
create table backup_truoc_0005.club_reps       as select * from public.club_reps;
create table backup_truoc_0005.follows         as select * from public.follows;
create table backup_truoc_0005.favorite_events as select * from public.favorite_events;
create table backup_truoc_0005.notifications   as select * from public.notifications;
create table backup_truoc_0005.site_stats      as select * from public.site_stats;

create table backup_truoc_0005.user_roles as
  select id, user_id, role::text as role from public.user_roles;

create table backup_truoc_0005.posts as
  select id, club_id, author_id, type::text as type, title, content, image_url,
         event_time, location, status::text as status, reject_reason, created_at, updated_at
  from public.posts;

-- Bản sao lưu chỉ dành cho quản trị hệ thống, không lộ ra API công khai
revoke all on schema backup_truoc_0005 from anon, authenticated;
revoke all on all tables in schema backup_truoc_0005 from anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists posts_before_trg on public.posts;
drop trigger if exists posts_after_trg on public.posts;
drop trigger if exists clubs_protect on public.clubs;
drop trigger if exists profiles_protect on public.profiles;

drop table if exists public.favorite_events cascade;
drop table if exists public.follows cascade;
drop table if exists public.notifications cascade;
drop table if exists public.posts cascade;
drop table if exists public.club_reps cascade;
drop table if exists public.clubs cascade;
drop table if exists public.user_roles cascade;
drop table if exists public.profiles cascade;
drop table if exists public.categories cascade;
drop table if exists public.site_stats cascade;

drop function if exists public.handle_new_user() cascade;
drop function if exists public.protect_profile() cascade;
drop function if exists public.protect_club() cascade;
drop function if exists public.posts_before() cascade;
drop function if exists public.posts_after() cascade;
drop function if exists public.track_visit() cascade;
drop function if exists public.club_follower_count(uuid) cascade;
drop function if exists public.is_club_rep(uuid, uuid) cascade;
drop function if exists public.is_active_user(uuid) cascade;
drop function if exists public.has_role(uuid, public.app_role) cascade;

drop type if exists public.app_role cascade;
drop type if exists public.post_type cascade;
drop type if exists public.post_status cascade;

-- ---------------------------------------------------------------------
-- 5. HÀM HỖ TRỢ PHÂN QUYỀN
-- ---------------------------------------------------------------------

create or replace function public.co_vai_tro(_ma_nguoi_dung uuid, _ten_vai_tro text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.nguoi_dung nd
    join public.vai_tro vt on vt."MaVaiTro" = nd."MaVaiTro"
    where nd."MaNguoiDung" = _ma_nguoi_dung and vt."TenVaiTro" = _ten_vai_tro
  )
$$;

create or replace function public.la_quan_tri_vien(_ma_nguoi_dung uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.co_vai_tro(_ma_nguoi_dung, 'QuanTriVien')
$$;

create or replace function public.tai_khoan_hoat_dong(_ma_nguoi_dung uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.nguoi_dung nd
    where nd."MaNguoiDung" = _ma_nguoi_dung and nd."TrangThaiTaiKhoan" = 'HoatDong'
  )
$$;

-- CLB mà tài khoản đang phụ trách (quan hệ 1–1 theo thiết kế)
create or replace function public.clb_phu_trach(_ma_nguoi_dung uuid)
returns int language sql stable security definer set search_path = public as $$
  select nd."MaCLB" from public.nguoi_dung nd
  where nd."MaNguoiDung" = _ma_nguoi_dung and public.co_vai_tro(_ma_nguoi_dung, 'DaiDienCLB')
$$;

create or replace function public.la_dai_dien_clb(_ma_nguoi_dung uuid, _ma_clb int)
returns boolean language sql stable security definer set search_path = public as $$
  select _ma_clb is not null and public.clb_phu_trach(_ma_nguoi_dung) = _ma_clb
$$;

create or replace function public.la_dai_dien_bai_dang(_ma_nguoi_dung uuid, _ma_bai_dang int)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.bai_dang bd
    where bd."MaBaiDang" = _ma_bai_dang
      and public.clb_phu_trach(_ma_nguoi_dung) = bd."MaCLB"
  )
$$;

create or replace function public.bai_dang_xem_duoc(_ma_nguoi_dung uuid, _ma_bai_dang int)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.bai_dang bd
    where bd."MaBaiDang" = _ma_bai_dang
      and (bd."TrangThaiKiemDuyet" = 'DaDuyet'
           or public.la_quan_tri_vien(_ma_nguoi_dung)
           or public.clb_phu_trach(_ma_nguoi_dung) = bd."MaCLB")
  )
$$;

create or replace function public.dem_nguoi_theo_doi(_ma_clb int)
returns int language sql stable security definer set search_path = public as $$
  select count(*)::int from public.theo_doi_clb where "MaCLB" = _ma_clb
$$;

create or replace function public.ghi_nhan_truy_cap()
returns void language sql security definer set search_path = public as $$
  update public.thong_ke_truy_cap set "LuotTruyCap" = "LuotTruyCap" + 1 where "MaThongKe" = 1
$$;

-- TrangThaiDienRa phụ thuộc thời điểm hiện tại nên được làm mới khi có người xem sự kiện
create or replace function public.lam_moi_trang_thai_su_kien()
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.su_kien sk
  set "TrangThaiDienRa" = tt.moi
  from (
    select s."MaBaiDang",
           case
             when now() < s."ThoiGianBatDau"  then 'SapDienRa'
             when now() > s."ThoiGianKetThuc" then 'DaDienRa'
             else 'DangDienRa'
           end as moi
    from public.su_kien s
  ) tt
  where tt."MaBaiDang" = sk."MaBaiDang" and sk."TrangThaiDienRa" <> tt.moi;
end $$;

-- Gửi một thông báo tới nhiều người nhận
create or replace function public.gui_thong_bao(
  _loai varchar, _tieu_de varchar, _noi_dung text, _duong_dan varchar, _nguoi_nhan uuid[]
) returns int language plpgsql security definer set search_path = public as $$
declare v_ma int;
begin
  if _nguoi_nhan is null or array_length(_nguoi_nhan, 1) is null then return null; end if;
  insert into public.thong_bao ("LoaiThongBao", "TieuDe", "NoiDung", "DuongDan")
  values (_loai, left(_tieu_de, 255), _noi_dung, _duong_dan)
  returning "MaThongBao" into v_ma;
  insert into public.nguoi_nhan_thong_bao ("MaThongBao", "MaNguoiDung")
  select v_ma, u from unnest(_nguoi_nhan) u
  where exists (select 1 from public.nguoi_dung nd where nd."MaNguoiDung" = u)
  on conflict do nothing;
  return v_ma;
end $$;

create or replace function public.ghi_nhat_ky(
  _hanh_dong varchar, _doi_tuong varchar, _ma_doi_tuong int, _gia_tri_cu text, _gia_tri_moi text
) returns void language plpgsql security definer set search_path = public as $$
begin
  -- auth.uid() là NULL khi chạy bằng service role hoặc trong migration: bỏ qua
  if auth.uid() is null then return; end if;
  if not exists (select 1 from public.nguoi_dung where "MaNguoiDung" = auth.uid()) then return; end if;
  insert into public.nhat_ky_hoat_dong
    ("MaNguoiDung", "HanhDong", "DoiTuongTacDong", "MaDoiTuong", "GiaTriCu", "GiaTriMoi")
  values (auth.uid(), _hanh_dong, _doi_tuong, _ma_doi_tuong, _gia_tri_cu, _gia_tri_moi);
end $$;

-- ---------------------------------------------------------------------
-- 6. TRIGGER
-- ---------------------------------------------------------------------

-- 6.1 Tài khoản mới từ auth.users
create or replace function public.xu_ly_nguoi_dung_moi()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_vai_tro int;
begin
  if new.email is null
     or (lower(new.email) not like '%@hvnh.edu.vn' and lower(new.email) not like '%@clb.baclubs.local') then
    raise exception 'Chỉ chấp nhận email trường có đuôi @hvnh.edu.vn';
  end if;

  select "MaVaiTro" into v_vai_tro from public.vai_tro where "TenVaiTro" = 'SinhVien';
  -- Tài khoản email trường đầu tiên trở thành Quản trị viên
  if lower(new.email) like '%@hvnh.edu.vn'
     and not exists (
       select 1 from public.nguoi_dung nd
       join public.vai_tro vt on vt."MaVaiTro" = nd."MaVaiTro"
       where vt."TenVaiTro" = 'QuanTriVien'
     ) then
    select "MaVaiTro" into v_vai_tro from public.vai_tro where "TenVaiTro" = 'QuanTriVien';
  end if;

  insert into public.nguoi_dung ("MaNguoiDung", "EmailTruong", "HoTen", "MaVaiTro")
  values (new.id, lower(new.email),
          coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), v_vai_tro);
  return new;
end $$;
create trigger nguoi_dung_moi_trg
after insert on auth.users for each row execute function public.xu_ly_nguoi_dung_moi();

-- 6.2 Bảo vệ bảng nguoi_dung: chỉ Quản trị viên đổi vai trò / CLB / trạng thái / email
create or replace function public.bao_ve_nguoi_dung()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.la_quan_tri_vien(auth.uid()) then
    new."EmailTruong"       := old."EmailTruong";
    new."TenDangNhap"       := old."TenDangNhap";
    new."MaVaiTro"          := old."MaVaiTro";
    new."MaCLB"             := old."MaCLB";
    new."TrangThaiTaiKhoan" := old."TrangThaiTaiKhoan";
    new."NgayCapTaiKhoan"   := old."NgayCapTaiKhoan";
  end if;
  -- Quản trị viên không tự khoá chính mình
  if new."MaNguoiDung" = auth.uid() then
    new."TrangThaiTaiKhoan" := old."TrangThaiTaiKhoan";
  end if;
  return new;
end $$;
create trigger nguoi_dung_bao_ve_trg
before update on public.nguoi_dung for each row execute function public.bao_ve_nguoi_dung();

create or replace function public.nhat_ky_nguoi_dung()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new."TrangThaiTaiKhoan" <> old."TrangThaiTaiKhoan" then
    perform public.ghi_nhat_ky(
      case when new."TrangThaiTaiKhoan" = 'BiKhoa' then 'KhoaTaiKhoan' else 'MoKhoaTaiKhoan' end,
      'nguoi_dung', null, old."TrangThaiTaiKhoan", new."TrangThaiTaiKhoan" || ' · ' || new."EmailTruong");
  end if;
  if new."MaVaiTro" <> old."MaVaiTro" then
    perform public.ghi_nhat_ky('DoiVaiTro', 'nguoi_dung', null,
      (select "TenVaiTro" from public.vai_tro where "MaVaiTro" = old."MaVaiTro"),
      (select "TenVaiTro" from public.vai_tro where "MaVaiTro" = new."MaVaiTro") || ' · ' || new."EmailTruong");
  end if;
  return null;
end $$;
create trigger nguoi_dung_nhat_ky_trg
after update on public.nguoi_dung for each row execute function public.nhat_ky_nguoi_dung();

-- 6.3 cau_lac_bo: tự cập nhật NgayCapNhat + ghi nhật ký
create or replace function public.truoc_khi_sua_clb()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new."NgayCapNhat" := now();
  return new;
end $$;
create trigger cau_lac_bo_truoc_sua_trg
before update on public.cau_lac_bo for each row execute function public.truoc_khi_sua_clb();

create or replace function public.nhat_ky_clb()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform public.ghi_nhat_ky('TaoCLB', 'cau_lac_bo', new."MaCLB", null, new."TenCLB");
  elsif tg_op = 'DELETE' then
    perform public.ghi_nhat_ky('XoaCLB', 'cau_lac_bo', old."MaCLB", old."TenCLB", null);
  else
    perform public.ghi_nhat_ky('CapNhatCLB', 'cau_lac_bo', new."MaCLB",
      concat_ws(' · ', old."TenCLB", old."TrangThaiHoatDong"),
      concat_ws(' · ', new."TenCLB", new."TrangThaiHoatDong"));
  end if;
  return null;
end $$;
create trigger cau_lac_bo_nhat_ky_trg
after insert or update or delete on public.cau_lac_bo for each row execute function public.nhat_ky_clb();

-- 6.4 bai_dang: ép trạng thái chờ duyệt, gán người tạo, đặt NgayDang
create or replace function public.truoc_khi_luu_bai_dang()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new."MaNguoiTao" := coalesce(new."MaNguoiTao", auth.uid());
  end if;

  if auth.uid() is not null and not public.la_quan_tri_vien(auth.uid()) then
    -- CLB gửi hoặc sửa bài: luôn quay về chờ duyệt, không tự công khai
    new."TrangThaiKiemDuyet" := 'ChoDuyet';
    new."NgayDang" := null;
    if tg_op = 'UPDATE' then
      new."MaCLB" := old."MaCLB";
      new."MaNguoiTao" := old."MaNguoiTao";
      new."NgayTao" := old."NgayTao";
    end if;
  end if;

  if new."TrangThaiKiemDuyet" = 'DaDuyet' then
    new."NgayDang" := coalesce(new."NgayDang", now());
  else
    new."NgayDang" := null;
  end if;
  return new;
end $$;
create trigger bai_dang_truoc_luu_trg
before insert or update on public.bai_dang for each row execute function public.truoc_khi_luu_bai_dang();

-- 6.5 bai_dang: ghi lịch sử kiểm duyệt + gửi thông báo + nhật ký
create or replace function public.sau_khi_luu_bai_dang()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_ten_clb text;
  v_dai_dien uuid[];
  v_quan_tri uuid[];
  v_nguoi_theo_doi uuid[];
  v_ly_do text;
begin
  select "TenCLB" into v_ten_clb from public.cau_lac_bo where "MaCLB" = new."MaCLB";
  select coalesce(array_agg("MaNguoiDung"), '{}') into v_dai_dien
    from public.nguoi_dung where "MaCLB" = new."MaCLB";
  select coalesce(array_agg(nd."MaNguoiDung"), '{}') into v_quan_tri
    from public.nguoi_dung nd join public.vai_tro vt on vt."MaVaiTro" = nd."MaVaiTro"
    where vt."TenVaiTro" = 'QuanTriVien';

  if new."TrangThaiKiemDuyet" = 'ChoDuyet'
     and (tg_op = 'INSERT' or old."TrangThaiKiemDuyet" <> 'ChoDuyet' or old."NoiDung" <> new."NoiDung" or old."TieuDe" <> new."TieuDe") then
    perform public.gui_thong_bao('DuyetBaiDang', 'Bài đăng mới chờ duyệt',
      v_ten_clb || ' vừa gửi bài "' || new."TieuDe" || '" chờ duyệt', '/admin/duyet-bai', v_quan_tri);
    perform public.ghi_nhat_ky('GuiBaiDang', 'bai_dang', new."MaBaiDang", null, new."TieuDe");

  elsif tg_op = 'UPDATE' and new."TrangThaiKiemDuyet" = 'DaDuyet' and old."TrangThaiKiemDuyet" <> 'DaDuyet' then
    insert into public.kiem_duyet ("MaBaiDang", "MaQuanTriVien", "KetQuaKiemDuyet")
    select new."MaBaiDang", auth.uid(), 'DaDuyet' where auth.uid() is not null;

    perform public.gui_thong_bao('DuyetBaiDang', 'Bài đăng đã được duyệt',
      'Bài "' || new."TieuDe" || '" đã được duyệt và công khai', '/clb/bai-dang', v_dai_dien);

    select coalesce(array_agg("MaNguoiDung"), '{}') into v_nguoi_theo_doi
      from public.theo_doi_clb where "MaCLB" = new."MaCLB" and "BatThongBao";
    perform public.gui_thong_bao('CLBCapNhat', v_ten_clb || ' có nội dung mới',
      v_ten_clb || ' vừa đăng ' ||
      case when new."LoaiBaiDang" = 'SuKien' then 'sự kiện' else 'bài viết' end ||
      ' mới: ' || new."TieuDe", '/cau-lac-bo/' || new."MaCLB", v_nguoi_theo_doi);
    perform public.ghi_nhat_ky('DuyetBaiDang', 'bai_dang', new."MaBaiDang", old."TrangThaiKiemDuyet", 'DaDuyet');

  elsif tg_op = 'UPDATE' and new."TrangThaiKiemDuyet" = 'TuChoi' and old."TrangThaiKiemDuyet" <> 'TuChoi' then
    v_ly_do := nullif(current_setting('baclubs.ly_do_tu_choi', true), '');
    insert into public.kiem_duyet ("MaBaiDang", "MaQuanTriVien", "KetQuaKiemDuyet", "LyDoTuChoi")
    select new."MaBaiDang", auth.uid(), 'TuChoi', v_ly_do where auth.uid() is not null;

    perform public.gui_thong_bao('DuyetBaiDang', 'Bài đăng bị từ chối',
      'Bài "' || new."TieuDe" || '" bị từ chối. Lý do: ' || coalesce(v_ly_do, 'không ghi nhận'),
      '/clb/bai-dang', v_dai_dien);
    perform public.ghi_nhat_ky('TuChoiBaiDang', 'bai_dang', new."MaBaiDang", old."TrangThaiKiemDuyet", 'TuChoi');
  end if;
  return null;
end $$;
create trigger bai_dang_sau_luu_trg
after insert or update on public.bai_dang for each row execute function public.sau_khi_luu_bai_dang();

-- Quản trị viên từ chối bài: ghi lý do kèm theo lượt kiểm duyệt
create or replace function public.tu_choi_bai_dang(_ma_bai_dang int, _ly_do text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.la_quan_tri_vien(auth.uid()) then
    raise exception 'Chỉ Quản trị viên được kiểm duyệt bài đăng';
  end if;
  if coalesce(trim(_ly_do), '') = '' then
    raise exception 'Vui lòng nhập lý do từ chối';
  end if;
  perform set_config('baclubs.ly_do_tu_choi', _ly_do, true);
  update public.bai_dang set "TrangThaiKiemDuyet" = 'TuChoi' where "MaBaiDang" = _ma_bai_dang;
  perform set_config('baclubs.ly_do_tu_choi', '', true);
end $$;

-- 6.6 yeu_cau_cap_nhat: áp dụng thay đổi khi được duyệt + thông báo + nhật ký
create or replace function public.truoc_khi_luu_yeu_cau()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new."TrangThaiXuLy"  := 'ChoDuyet';
    new."MaQuanTriVien"  := null;
    new."ThoiGianXuLy"   := null;
    new."LyDoTuChoi"     := null;
  else
    if not public.la_quan_tri_vien(auth.uid()) then
      raise exception 'Chỉ Quản trị viên được xử lý yêu cầu cập nhật';
    end if;
    new."MaCLB"          := old."MaCLB";
    new."NoiDungThayDoi" := old."NoiDungThayDoi";
    new."ThoiGianGui"    := old."ThoiGianGui";
    if new."TrangThaiXuLy" <> old."TrangThaiXuLy" then
      new."MaQuanTriVien" := auth.uid();
      new."ThoiGianXuLy"  := now();
    end if;
  end if;
  return new;
end $$;
create trigger yeu_cau_truoc_luu_trg
before insert or update on public.yeu_cau_cap_nhat for each row execute function public.truoc_khi_luu_yeu_cau();

create or replace function public.sau_khi_luu_yeu_cau()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v jsonb;
  v_ten_clb text;
  v_dai_dien uuid[];
  v_quan_tri uuid[];
begin
  select "TenCLB" into v_ten_clb from public.cau_lac_bo where "MaCLB" = new."MaCLB";
  select coalesce(array_agg("MaNguoiDung"), '{}') into v_dai_dien
    from public.nguoi_dung where "MaCLB" = new."MaCLB";

  if tg_op = 'INSERT' then
    select coalesce(array_agg(nd."MaNguoiDung"), '{}') into v_quan_tri
      from public.nguoi_dung nd join public.vai_tro vt on vt."MaVaiTro" = nd."MaVaiTro"
      where vt."TenVaiTro" = 'QuanTriVien';
    perform public.gui_thong_bao('YeuCauCapNhat', 'Yêu cầu cập nhật thông tin CLB',
      v_ten_clb || ' vừa gửi yêu cầu cập nhật thông tin, đang chờ duyệt',
      '/admin/yeu-cau', v_quan_tri);
    perform public.ghi_nhat_ky('GuiYeuCauCapNhat', 'yeu_cau_cap_nhat', new."MaYeuCau", null, v_ten_clb);
    return null;
  end if;

  if new."TrangThaiXuLy" = old."TrangThaiXuLy" then return null; end if;

  if new."TrangThaiXuLy" = 'DaDuyet' then
    v := new."NoiDungThayDoi"::jsonb;
    update public.cau_lac_bo c set
      "TenCLB"           = case when v ? 'TenCLB'          then coalesce(nullif(v->>'TenCLB',''), c."TenCLB") else c."TenCLB" end,
      "NamThanhLap"      = case when v ? 'NamThanhLap'     then (v->>'NamThanhLap')::smallint else c."NamThanhLap" end,
      "MaLinhVuc"        = case when v ? 'MaLinhVuc'       then coalesce((v->>'MaLinhVuc')::int, c."MaLinhVuc") else c."MaLinhVuc" end,
      "DonViTrucThuoc"   = case when v ? 'DonViTrucThuoc'  then v->>'DonViTrucThuoc' else c."DonViTrucThuoc" end,
      "MoTa"             = case when v ? 'MoTa'            then v->>'MoTa' else c."MoTa" end,
      "LogoCLB"          = case when v ? 'LogoCLB'         then v->>'LogoCLB' else c."LogoCLB" end,
      "ThongTinLienHe"   = case when v ? 'ThongTinLienHe'  then v->>'ThongTinLienHe' else c."ThongTinLienHe" end,
      "Fanpage"          = case when v ? 'Fanpage'         then v->>'Fanpage' else c."Fanpage" end,
      "GioiThieuNgan"    = case when v ? 'GioiThieuNgan'   then v->>'GioiThieuNgan' else c."GioiThieuNgan" end,
      "BanChuyenMon"     = case when v ? 'BanChuyenMon'    then v->>'BanChuyenMon' else c."BanChuyenMon" end,
      "ThanhTich"        = case when v ? 'ThanhTich'       then v->>'ThanhTich' else c."ThanhTich" end,
      "AnhBia"           = case when v ? 'AnhBia'          then v->>'AnhBia' else c."AnhBia" end
    where c."MaCLB" = new."MaCLB";

    perform public.gui_thong_bao('YeuCauCapNhat', 'Yêu cầu cập nhật đã được duyệt',
      'Yêu cầu cập nhật thông tin của ' || v_ten_clb || ' đã được duyệt và áp dụng',
      '/clb/thong-tin', v_dai_dien);
    perform public.ghi_nhat_ky('DuyetYeuCauCapNhat', 'yeu_cau_cap_nhat', new."MaYeuCau",
      old."TrangThaiXuLy", 'DaDuyet');
  else
    perform public.gui_thong_bao('YeuCauCapNhat', 'Yêu cầu cập nhật bị từ chối',
      'Yêu cầu cập nhật thông tin của ' || v_ten_clb || ' bị từ chối. Lý do: ' ||
      coalesce(new."LyDoTuChoi", 'không ghi nhận'), '/clb/yeu-cau', v_dai_dien);
    perform public.ghi_nhat_ky('TuChoiYeuCauCapNhat', 'yeu_cau_cap_nhat', new."MaYeuCau",
      old."TrangThaiXuLy", 'TuChoi');
  end if;
  return null;
end $$;
create trigger yeu_cau_sau_luu_trg
after insert or update on public.yeu_cau_cap_nhat for each row execute function public.sau_khi_luu_yeu_cau();

-- 6.7 nguoi_nhan_thong_bao: ghi thời điểm đọc
create or replace function public.truoc_khi_doc_thong_bao()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new."DaDoc" and not old."DaDoc" then
    new."ThoiGianDoc" := coalesce(new."ThoiGianDoc", now());
  elsif not new."DaDoc" then
    new."ThoiGianDoc" := null;
  end if;
  return new;
end $$;
create trigger nguoi_nhan_thong_bao_doc_trg
before update on public.nguoi_nhan_thong_bao for each row execute function public.truoc_khi_doc_thong_bao();

-- ---------------------------------------------------------------------
-- 7. QUYỀN TRUY CẬP
-- ---------------------------------------------------------------------

grant select on public.linh_vuc, public.cau_lac_bo, public.bai_dang, public.su_kien to anon;
grant select on public.linh_vuc, public.vai_tro, public.cau_lac_bo, public.bai_dang, public.su_kien,
                public.kiem_duyet, public.nhat_ky_hoat_dong, public.thong_bao, public.thong_ke_truy_cap to authenticated;
grant select, insert, update, delete on
  public.nguoi_dung, public.theo_doi_clb, public.yeu_thich_su_kien,
  public.yeu_cau_cap_nhat, public.nguoi_nhan_thong_bao to authenticated;
grant insert, update, delete on public.cau_lac_bo, public.bai_dang, public.su_kien, public.linh_vuc to authenticated;
grant all on
  public.linh_vuc, public.vai_tro, public.cau_lac_bo, public.nguoi_dung, public.yeu_cau_cap_nhat,
  public.theo_doi_clb, public.bai_dang, public.su_kien, public.kiem_duyet, public.yeu_thich_su_kien,
  public.nhat_ky_hoat_dong, public.thong_bao, public.nguoi_nhan_thong_bao, public.thong_ke_truy_cap to service_role;

grant execute on function public.dem_nguoi_theo_doi(int) to anon, authenticated;
grant execute on function public.ghi_nhan_truy_cap() to anon, authenticated;
grant execute on function public.lam_moi_trang_thai_su_kien() to anon, authenticated;
grant execute on function public.la_quan_tri_vien(uuid) to authenticated;
grant execute on function public.co_vai_tro(uuid, text) to authenticated;
grant execute on function public.clb_phu_trach(uuid) to authenticated;
grant execute on function public.tu_choi_bai_dang(int, text) to authenticated;

alter table public.linh_vuc             enable row level security;
alter table public.vai_tro              enable row level security;
alter table public.cau_lac_bo           enable row level security;
alter table public.nguoi_dung           enable row level security;
alter table public.yeu_cau_cap_nhat     enable row level security;
alter table public.theo_doi_clb         enable row level security;
alter table public.bai_dang             enable row level security;
alter table public.su_kien              enable row level security;
alter table public.kiem_duyet           enable row level security;
alter table public.yeu_thich_su_kien    enable row level security;
alter table public.nhat_ky_hoat_dong    enable row level security;
alter table public.thong_bao            enable row level security;
alter table public.nguoi_nhan_thong_bao enable row level security;
alter table public.thong_ke_truy_cap    enable row level security;

-- linh_vuc / vai_tro: danh mục công khai, chỉ Quản trị viên sửa
create policy "linh_vuc_doc" on public.linh_vuc for select to anon, authenticated using (true);
create policy "linh_vuc_ghi" on public.linh_vuc for all to authenticated
  using (public.la_quan_tri_vien(auth.uid())) with check (public.la_quan_tri_vien(auth.uid()));
create policy "vai_tro_doc" on public.vai_tro for select to authenticated using (true);

-- cau_lac_bo: ai cũng xem CLB đang hoạt động; chỉ Quản trị viên thêm/sửa/xoá
-- (Đại diện CLB sửa thông tin qua bảng yeu_cau_cap_nhat — quan hệ 4 & 5 trong thiết kế)
create policy "clb_doc" on public.cau_lac_bo for select to anon, authenticated
  using ("TrangThaiHoatDong" <> 'NgungHoatDong'
         or public.la_quan_tri_vien(auth.uid())
         or public.la_dai_dien_clb(auth.uid(), "MaCLB"));
create policy "clb_them" on public.cau_lac_bo for insert to authenticated
  with check (public.la_quan_tri_vien(auth.uid()));
create policy "clb_sua" on public.cau_lac_bo for update to authenticated
  using (public.la_quan_tri_vien(auth.uid())) with check (public.la_quan_tri_vien(auth.uid()));
create policy "clb_xoa" on public.cau_lac_bo for delete to authenticated
  using (public.la_quan_tri_vien(auth.uid()));

-- nguoi_dung: xem hồ sơ của mình, Quản trị viên xem tất cả
create policy "nguoi_dung_doc" on public.nguoi_dung for select to authenticated
  using ("MaNguoiDung" = auth.uid() or public.la_quan_tri_vien(auth.uid()));
create policy "nguoi_dung_sua" on public.nguoi_dung for update to authenticated
  using ("MaNguoiDung" = auth.uid() or public.la_quan_tri_vien(auth.uid()))
  with check ("MaNguoiDung" = auth.uid() or public.la_quan_tri_vien(auth.uid()));

-- yeu_cau_cap_nhat: CLB gửi và xem yêu cầu của mình, Quản trị viên xem và xử lý tất cả
create policy "yeu_cau_doc" on public.yeu_cau_cap_nhat for select to authenticated
  using (public.la_quan_tri_vien(auth.uid()) or public.la_dai_dien_clb(auth.uid(), "MaCLB"));
create policy "yeu_cau_them" on public.yeu_cau_cap_nhat for insert to authenticated
  with check (public.la_dai_dien_clb(auth.uid(), "MaCLB") and public.tai_khoan_hoat_dong(auth.uid()));
create policy "yeu_cau_xu_ly" on public.yeu_cau_cap_nhat for update to authenticated
  using (public.la_quan_tri_vien(auth.uid())) with check (public.la_quan_tri_vien(auth.uid()));

-- theo_doi_clb
create policy "theo_doi_doc" on public.theo_doi_clb for select to authenticated
  using ("MaNguoiDung" = auth.uid() or public.la_quan_tri_vien(auth.uid())
         or public.la_dai_dien_clb(auth.uid(), "MaCLB"));
create policy "theo_doi_them" on public.theo_doi_clb for insert to authenticated
  with check ("MaNguoiDung" = auth.uid() and public.tai_khoan_hoat_dong(auth.uid()));
create policy "theo_doi_sua" on public.theo_doi_clb for update to authenticated
  using ("MaNguoiDung" = auth.uid()) with check ("MaNguoiDung" = auth.uid());
create policy "theo_doi_xoa" on public.theo_doi_clb for delete to authenticated
  using ("MaNguoiDung" = auth.uid());

-- bai_dang
create policy "bai_dang_doc" on public.bai_dang for select to anon, authenticated
  using ("TrangThaiKiemDuyet" = 'DaDuyet'
         or public.la_quan_tri_vien(auth.uid())
         or public.la_dai_dien_clb(auth.uid(), "MaCLB"));
create policy "bai_dang_them" on public.bai_dang for insert to authenticated
  with check (public.la_dai_dien_clb(auth.uid(), "MaCLB") and public.tai_khoan_hoat_dong(auth.uid()));
create policy "bai_dang_sua" on public.bai_dang for update to authenticated
  using (public.la_quan_tri_vien(auth.uid())
         or (public.la_dai_dien_clb(auth.uid(), "MaCLB") and public.tai_khoan_hoat_dong(auth.uid())))
  with check (public.la_quan_tri_vien(auth.uid()) or public.la_dai_dien_clb(auth.uid(), "MaCLB"));
create policy "bai_dang_xoa" on public.bai_dang for delete to authenticated
  using (public.la_quan_tri_vien(auth.uid()) or public.la_dai_dien_clb(auth.uid(), "MaCLB"));

-- su_kien: theo quyền của bài đăng gốc
create policy "su_kien_doc" on public.su_kien for select to anon, authenticated
  using (public.bai_dang_xem_duoc(auth.uid(), "MaBaiDang"));
create policy "su_kien_ghi" on public.su_kien for all to authenticated
  using (public.la_quan_tri_vien(auth.uid()) or public.la_dai_dien_bai_dang(auth.uid(), "MaBaiDang"))
  with check (public.la_quan_tri_vien(auth.uid()) or public.la_dai_dien_bai_dang(auth.uid(), "MaBaiDang"));

-- kiem_duyet: chỉ đọc, dành cho Quản trị viên và CLB sở hữu bài
create policy "kiem_duyet_doc" on public.kiem_duyet for select to authenticated
  using (public.la_quan_tri_vien(auth.uid()) or public.la_dai_dien_bai_dang(auth.uid(), "MaBaiDang"));

-- yeu_thich_su_kien
create policy "yeu_thich_doc" on public.yeu_thich_su_kien for select to authenticated
  using ("MaNguoiDung" = auth.uid());
create policy "yeu_thich_them" on public.yeu_thich_su_kien for insert to authenticated
  with check ("MaNguoiDung" = auth.uid() and public.tai_khoan_hoat_dong(auth.uid()));
create policy "yeu_thich_xoa" on public.yeu_thich_su_kien for delete to authenticated
  using ("MaNguoiDung" = auth.uid());

-- nhat_ky_hoat_dong: chỉ Quản trị viên xem
create policy "nhat_ky_doc" on public.nhat_ky_hoat_dong for select to authenticated
  using (public.la_quan_tri_vien(auth.uid()));

-- thong_bao: chỉ xem được thông báo mà mình là người nhận
create policy "thong_bao_doc" on public.thong_bao for select to authenticated
  using (exists (select 1 from public.nguoi_nhan_thong_bao n
                 where n."MaThongBao" = thong_bao."MaThongBao" and n."MaNguoiDung" = auth.uid()));
create policy "nguoi_nhan_doc" on public.nguoi_nhan_thong_bao for select to authenticated
  using ("MaNguoiDung" = auth.uid());
create policy "nguoi_nhan_sua" on public.nguoi_nhan_thong_bao for update to authenticated
  using ("MaNguoiDung" = auth.uid()) with check ("MaNguoiDung" = auth.uid());
create policy "nguoi_nhan_xoa" on public.nguoi_nhan_thong_bao for delete to authenticated
  using ("MaNguoiDung" = auth.uid());

-- thong_ke_truy_cap
create policy "thong_ke_doc" on public.thong_ke_truy_cap for select to authenticated
  using (public.la_quan_tri_vien(auth.uid()));

-- ---------------------------------------------------------------------
-- 8. BỔ SUNG MÔ TẢ CHO DANH MỤC LĨNH VỰC
-- ---------------------------------------------------------------------

update public.linh_vuc set "MoTa" = m.mo_ta from (values
  ('Học thuật',    'Nghiên cứu khoa học, seminar chuyên môn, các cuộc thi học thuật'),
  ('Kỹ năng mềm',  'Ngoại ngữ, thuyết trình, làm việc nhóm và phát triển bản thân'),
  ('Nghệ thuật',   'Âm nhạc, nhảy, nhiếp ảnh và các hoạt động biểu diễn'),
  ('Thể thao',     'Rèn luyện thể chất và các giải đấu phong trào'),
  ('Tình nguyện',  'Hoạt động cộng đồng, thiện nguyện, hỗ trợ xã hội'),
  ('Truyền thông', 'Sản xuất nội dung, thiết kế, ghi hình cho sự kiện của Học viện')
) as m(ten, mo_ta)
where public.linh_vuc."TenLinhVuc" = m.ten and public.linh_vuc."MoTa" is null;

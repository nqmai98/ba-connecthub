-- =====================================================================
-- 0009 — Tương tác bài viết (lượt xem, bình luận) + phân loại CLB theo
--        SƠ ĐỒ TỔ CHỨC ĐOÀN THANH NIÊN – HỘI SINH VIÊN HỌC VIỆN NGÂN HÀNG
--
-- A. Bảng luot_xem_bai_dang + hàm ghi_luot_xem: đếm lượt xem bài viết.
-- B. Bảng binh_luan + các hàm đọc/ghi: sinh viên bình luận dưới bài viết.
-- C. Hàm bai_viet_noi_bat: xếp hạng bài cho banner trang chủ theo
--    lượt xem, lượt bình luận, lượt yêu thích.
-- D. Hàm dem_tuong_tac / tuong_tac_clb: số liệu cho trang bài viết và
--    trang Tổng quan của Đại diện CLB.
-- E. Bỏ bảng linh_vuc; thay bằng bảng don_vi_to_chuc (Khối Đoàn / Hội
--    -> các ô xanh của sơ đồ) và cột cau_lac_bo.MaDonVi.
--
-- Mọi số liệu tổng hợp đi qua hàm SECURITY DEFINER chỉ trả về CON SỐ,
-- không lộ ai đã xem / yêu thích gì (RLS các bảng gốc vẫn khép kín).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. SAO LƯU TỰ ĐỘNG trước khi đổi lược đồ (bảng linh_vuc sẽ bị xoá ở mục E).
--    Bản sao nằm trong schema riêng "sao_luu", không mở ra API nên trình duyệt không đọc được.
--    Khôi phục: insert ... select * from sao_luu.<bang>_truoc_0009
-- ---------------------------------------------------------------------

create schema if not exists sao_luu;
revoke all on schema sao_luu from public;
create table if not exists sao_luu.linh_vuc_truoc_0009          as select * from public.linh_vuc;
create table if not exists sao_luu.cau_lac_bo_truoc_0009        as select * from public.cau_lac_bo;
create table if not exists sao_luu.nguoi_dung_truoc_0009        as select * from public.nguoi_dung;
create table if not exists sao_luu.bai_dang_truoc_0009          as select * from public.bai_dang;
create table if not exists sao_luu.su_kien_truoc_0009           as select * from public.su_kien;
create table if not exists sao_luu.kiem_duyet_truoc_0009        as select * from public.kiem_duyet;
create table if not exists sao_luu.yeu_cau_cap_nhat_truoc_0009  as select * from public.yeu_cau_cap_nhat;
create table if not exists sao_luu.theo_doi_clb_truoc_0009      as select * from public.theo_doi_clb;
create table if not exists sao_luu.yeu_thich_su_kien_truoc_0009 as select * from public.yeu_thich_su_kien;

-- ---------------------------------------------------------------------
-- A. LƯỢT XEM BÀI VIẾT
-- ---------------------------------------------------------------------

create table public.luot_xem_bai_dang (
  "MaLuotXem"   bigint generated always as identity primary key,
  "MaBaiDang"   int not null references public.bai_dang("MaBaiDang") on delete cascade,
  -- NULL = khách chưa đăng nhập
  "MaNguoiDung" uuid references public.nguoi_dung("MaNguoiDung") on delete set null,
  "ThoiGianXem" timestamptz not null default now()
);
create index luot_xem_bai_dang_bai_idx on public.luot_xem_bai_dang ("MaBaiDang", "ThoiGianXem" desc);
create index luot_xem_bai_dang_nguoi_idx on public.luot_xem_bai_dang ("MaNguoiDung", "MaBaiDang", "ThoiGianXem" desc);

alter table public.luot_xem_bai_dang enable row level security;
-- Không có policy đọc/ghi trực tiếp: chỉ ghi qua ghi_luot_xem(), chỉ đọc qua các hàm thống kê.
-- Quản trị viên vẫn xem được dữ liệu thô.
create policy "luot_xem_doc" on public.luot_xem_bai_dang for select to authenticated
  using (public.la_quan_tri_vien(auth.uid()));
grant select on public.luot_xem_bai_dang to authenticated;

-- Ghi một lượt xem. Chỉ tính bài đã duyệt. Cùng một tài khoản xem lại trong
-- vòng 30 phút không được tính thêm (chống bấm F5 làm tăng lượt xem).
-- Khách chưa đăng nhập được chống lặp ở trình duyệt (sessionStorage).
create or replace function public.ghi_luot_xem(_ma_bai_dang int)
returns void language plpgsql volatile security definer set search_path = public as $$
declare v_nguoi uuid := auth.uid();
begin
  if not exists (
    select 1 from public.bai_dang
    where "MaBaiDang" = _ma_bai_dang and "TrangThaiKiemDuyet" = 'DaDuyet'
  ) then return; end if;

  if v_nguoi is not null and not exists (select 1 from public.nguoi_dung where "MaNguoiDung" = v_nguoi) then
    v_nguoi := null;
  end if;

  if v_nguoi is not null and exists (
    select 1 from public.luot_xem_bai_dang
    where "MaNguoiDung" = v_nguoi and "MaBaiDang" = _ma_bai_dang
      and "ThoiGianXem" > now() - interval '30 minutes'
  ) then return; end if;

  insert into public.luot_xem_bai_dang ("MaBaiDang", "MaNguoiDung") values (_ma_bai_dang, v_nguoi);
end $$;

revoke all on function public.ghi_luot_xem(int) from public;
grant execute on function public.ghi_luot_xem(int) to anon, authenticated;

-- ---------------------------------------------------------------------
-- B. BÌNH LUẬN
-- ---------------------------------------------------------------------

create table public.binh_luan (
  "MaBinhLuan"  int generated always as identity primary key,
  "MaBaiDang"   int  not null references public.bai_dang("MaBaiDang") on delete cascade,
  "MaNguoiDung" uuid not null references public.nguoi_dung("MaNguoiDung") on delete cascade,
  "NoiDung"     text not null check (char_length(btrim("NoiDung")) between 1 and 1000),
  "ThoiGianTao" timestamptz not null default now()
);
create index binh_luan_bai_idx on public.binh_luan ("MaBaiDang", "ThoiGianTao" desc);
create index binh_luan_nguoi_idx on public.binh_luan ("MaNguoiDung");

alter table public.binh_luan enable row level security;
grant select, insert, delete on public.binh_luan to authenticated;

-- Đọc trực tiếp: chính chủ, Quản trị viên, Đại diện CLB của bài.
-- Mọi người (kể cả khách) đọc danh sách công khai qua hàm binh_luan_cua_bai().
create policy "binh_luan_doc" on public.binh_luan for select to authenticated
  using ("MaNguoiDung" = auth.uid()
         or public.la_quan_tri_vien(auth.uid())
         or public.la_dai_dien_bai_dang(auth.uid(), "MaBaiDang"));
-- Chỉ tài khoản đang hoạt động, bình luận dưới tên mình, trên bài đã duyệt.
create policy "binh_luan_them" on public.binh_luan for insert to authenticated
  with check ("MaNguoiDung" = auth.uid()
              and public.tai_khoan_hoat_dong(auth.uid())
              and exists (select 1 from public.bai_dang bd
                          where bd."MaBaiDang" = binh_luan."MaBaiDang"
                            and bd."TrangThaiKiemDuyet" = 'DaDuyet'));
-- Xoá: chính chủ, Quản trị viên, hoặc Đại diện CLB sở hữu bài (gỡ bình luận không phù hợp).
create policy "binh_luan_xoa" on public.binh_luan for delete to authenticated
  using ("MaNguoiDung" = auth.uid()
         or public.la_quan_tri_vien(auth.uid())
         or public.la_dai_dien_bai_dang(auth.uid(), "MaBaiDang"));

-- Ép người viết và thời gian, chống chèn bình luận hộ người khác / lùi giờ.
create or replace function public.truoc_khi_them_binh_luan()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null then new."MaNguoiDung" := auth.uid(); end if;
  new."NoiDung" := btrim(new."NoiDung");
  new."ThoiGianTao" := now();
  -- Chống spam: tối đa 5 bình luận / phút / tài khoản
  if (select count(*) from public.binh_luan
      where "MaNguoiDung" = new."MaNguoiDung" and "ThoiGianTao" > now() - interval '1 minute') >= 5 then
    raise exception 'Bạn bình luận quá nhanh, vui lòng thử lại sau ít phút';
  end if;
  return new;
end $$;
create trigger binh_luan_truoc_them_trg
before insert on public.binh_luan for each row execute function public.truoc_khi_them_binh_luan();

-- Báo cho Đại diện CLB khi bài của CLB có bình luận mới; ghi nhật ký khi bình luận bị gỡ bởi người khác.
create or replace function public.sau_khi_luu_binh_luan()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_tieu_de text;
  v_ma_clb int;
  v_dai_dien uuid[];
begin
  if tg_op = 'INSERT' then
    select "TieuDe", "MaCLB" into v_tieu_de, v_ma_clb from public.bai_dang where "MaBaiDang" = new."MaBaiDang";
    select coalesce(array_agg("MaNguoiDung"), '{}') into v_dai_dien
      from public.nguoi_dung where "MaCLB" = v_ma_clb and "MaNguoiDung" <> new."MaNguoiDung";
    perform public.gui_thong_bao('HeThong', 'Bình luận mới',
      'Bài "' || v_tieu_de || '" vừa có bình luận mới', '/bai-viet/' || new."MaBaiDang", v_dai_dien);
  elsif tg_op = 'DELETE' and auth.uid() is distinct from old."MaNguoiDung" then
    perform public.ghi_nhat_ky('GoBinhLuan', 'binh_luan', old."MaBinhLuan", left(old."NoiDung", 200), null);
  end if;
  return null;
end $$;
create trigger binh_luan_sau_luu_trg
after insert or delete on public.binh_luan for each row execute function public.sau_khi_luu_binh_luan();

-- Danh sách bình luận công khai của một bài (kèm tên người viết – bảng nguoi_dung
-- bị RLS khoá nên không join trực tiếp từ trình duyệt được).
create or replace function public.binh_luan_cua_bai(_ma_bai_dang int)
returns table (
  "MaBinhLuan"  int,
  "NoiDung"     text,
  "ThoiGianTao" timestamptz,
  "HoTen"       text,
  "VaiTro"      text,
  "CuaToi"      boolean,
  "CoTheXoa"    boolean
)
language sql stable security definer set search_path = public as $$
  select
    bl."MaBinhLuan",
    bl."NoiDung",
    bl."ThoiGianTao",
    coalesce(nullif(btrim(nd."HoTen"), ''), split_part(nd."EmailTruong", '@', 1))::text,
    vt."TenVaiTro"::text,
    bl."MaNguoiDung" = auth.uid(),
    (bl."MaNguoiDung" = auth.uid()
      or public.la_quan_tri_vien(auth.uid())
      or public.la_dai_dien_bai_dang(auth.uid(), bl."MaBaiDang"))
  from public.binh_luan bl
  join public.nguoi_dung nd on nd."MaNguoiDung" = bl."MaNguoiDung"
  join public.vai_tro vt on vt."MaVaiTro" = nd."MaVaiTro"
  where bl."MaBaiDang" = _ma_bai_dang
    and public.bai_dang_xem_duoc(auth.uid(), _ma_bai_dang)
  order by bl."ThoiGianTao" desc
  limit 300
$$;
revoke all on function public.binh_luan_cua_bai(int) from public;
grant execute on function public.binh_luan_cua_bai(int) to anon, authenticated;

-- ---------------------------------------------------------------------
-- C + D. SỐ LIỆU TƯƠNG TÁC
-- ---------------------------------------------------------------------

-- Tổng lượt xem / bình luận / yêu thích của một danh sách bài (chỉ bài người gọi được xem).
create or replace function public.dem_tuong_tac(_ds_bai_dang int[])
returns table ("MaBaiDang" int, "LuotXem" int, "LuotBinhLuan" int, "LuotYeuThich" int)
language sql stable security definer set search_path = public as $$
  select
    bd."MaBaiDang",
    (select count(*) from public.luot_xem_bai_dang x where x."MaBaiDang" = bd."MaBaiDang")::int,
    (select count(*) from public.binh_luan b where b."MaBaiDang" = bd."MaBaiDang")::int,
    (select count(*) from public.yeu_thich_su_kien y where y."MaBaiDang" = bd."MaBaiDang")::int
  from public.bai_dang bd
  where bd."MaBaiDang" = any(_ds_bai_dang[1:200])
    and public.bai_dang_xem_duoc(auth.uid(), bd."MaBaiDang")
$$;
revoke all on function public.dem_tuong_tac(int[]) from public;
grant execute on function public.dem_tuong_tac(int[]) to anon, authenticated;

-- Bài viết nổi bật cho banner trang chủ, chọn TỰ ĐỘNG theo tương tác:
--   DiemNoiBat = 1 × lượt xem + 5 × lượt bình luận + 3 × lượt yêu thích
-- tính trên tương tác trong _so_ngay ngày gần nhất (mặc định 30) để banner luôn "tươi".
-- Ứng viên: bài đã duyệt; sự kiện thì chưa kết thúc; bài thường thì đăng trong 180 ngày.
-- Hoà điểm (kể cả khi chưa ai tương tác) -> bài mới đăng đứng trước, nên banner không bao giờ trống
-- nếu còn bài.
create or replace function public.bai_viet_noi_bat(_gioi_han int default 7, _so_ngay int default 30)
returns table (
  "MaBaiDang"    int,
  "LuotXem"      int,
  "LuotBinhLuan" int,
  "LuotYeuThich" int,
  "DiemNoiBat"   int
)
language sql stable security definer set search_path = public as $$
  with moc as (
    select now() - make_interval(days => least(greatest(coalesce(_so_ngay, 30), 1), 365)) as tu
  ),
  ung_vien as (
    select bd."MaBaiDang", bd."NgayDang"
    from public.bai_dang bd
    left join public.su_kien sk on sk."MaBaiDang" = bd."MaBaiDang"
    where bd."TrangThaiKiemDuyet" = 'DaDuyet'
      and (
        (sk."MaBaiDang" is not null and sk."ThoiGianKetThuc" >= now())
        or (sk."MaBaiDang" is null and bd."NgayDang" >= now() - interval '180 days')
      )
  ),
  tk as (
    select
      u."MaBaiDang",
      u."NgayDang",
      (select count(*) from public.luot_xem_bai_dang x where x."MaBaiDang" = u."MaBaiDang") as xem,
      (select count(*) from public.binh_luan b where b."MaBaiDang" = u."MaBaiDang") as bl,
      (select count(*) from public.yeu_thich_su_kien y where y."MaBaiDang" = u."MaBaiDang") as yt,
      (select count(*) from public.luot_xem_bai_dang x, moc where x."MaBaiDang" = u."MaBaiDang" and x."ThoiGianXem" >= moc.tu) as xem_gan,
      (select count(*) from public.binh_luan b, moc where b."MaBaiDang" = u."MaBaiDang" and b."ThoiGianTao" >= moc.tu) as bl_gan,
      (select count(*) from public.yeu_thich_su_kien y, moc where y."MaBaiDang" = u."MaBaiDang" and y."NgayYeuThich" >= moc.tu) as yt_gan
    from ung_vien u
  )
  select
    tk."MaBaiDang",
    tk.xem::int,
    tk.bl::int,
    tk.yt::int,
    (tk.xem_gan + 5 * tk.bl_gan + 3 * tk.yt_gan)::int as "DiemNoiBat"
  from tk
  order by "DiemNoiBat" desc, tk."NgayDang" desc nulls last
  limit least(greatest(coalesce(_gioi_han, 7), 1), 10)
$$;
revoke all on function public.bai_viet_noi_bat(int, int) from public;
grant execute on function public.bai_viet_noi_bat(int, int) to anon, authenticated;

-- Số liệu tương tác theo ngày cho trang Tổng quan CLB (lọc theo học kì ở trình duyệt).
-- Chỉ Đại diện của chính CLB đó hoặc Quản trị viên gọi được.
create or replace function public.tuong_tac_clb(_ma_clb int)
returns table (
  "MaBaiDang"    int,
  "Ngay"         date,
  "LuotXem"      int,
  "LuotBinhLuan" int,
  "LuotYeuThich" int
)
language sql stable security definer set search_path = public as $$
  with bai as (
    select "MaBaiDang" from public.bai_dang
    where "MaCLB" = _ma_clb
      and (public.la_dai_dien_clb(auth.uid(), _ma_clb) or public.la_quan_tri_vien(auth.uid()))
  ),
  su_kien_tt as (
    select x."MaBaiDang", (x."ThoiGianXem" at time zone 'Asia/Ho_Chi_Minh')::date as ngay, 1 as xem, 0 as bl, 0 as yt
      from public.luot_xem_bai_dang x join bai using ("MaBaiDang")
    union all
    select b."MaBaiDang", (b."ThoiGianTao" at time zone 'Asia/Ho_Chi_Minh')::date, 0, 1, 0
      from public.binh_luan b join bai using ("MaBaiDang")
    union all
    select y."MaBaiDang", (y."NgayYeuThich" at time zone 'Asia/Ho_Chi_Minh')::date, 0, 0, 1
      from public.yeu_thich_su_kien y join bai using ("MaBaiDang")
  )
  select "MaBaiDang", ngay, sum(xem)::int, sum(bl)::int, sum(yt)::int
  from su_kien_tt
  group by "MaBaiDang", ngay
$$;
revoke all on function public.tuong_tac_clb(int) from public;
grant execute on function public.tuong_tac_clb(int) to authenticated;

-- ---------------------------------------------------------------------
-- E. SƠ ĐỒ TỔ CHỨC THAY CHO LĨNH VỰC
-- ---------------------------------------------------------------------

create table public.don_vi_to_chuc (
  "MaDonVi"  int generated by default as identity primary key,
  "Khoi"     varchar(20) not null check ("Khoi" in ('DoanThanhNien', 'HoiSinhVien')),
  "TenDonVi" varchar(100) not null,
  "MoTa"     text,
  "ThuTu"    smallint not null default 0,
  unique ("Khoi", "TenDonVi")
);

-- Mã 1–9 giữ nguyên như cấu hình cũ trong code để các đường link ?nhom=... vẫn đúng.
insert into public.don_vi_to_chuc ("MaDonVi", "Khoi", "TenDonVi", "ThuTu", "MoTa") values
  (1, 'DoanThanhNien', 'Bộ phận hành chính',              1, 'Văn phòng Đoàn'),
  (2, 'DoanThanhNien', 'Đội trực thuộc',                  2, 'Các đội trực thuộc Đoàn Thanh niên'),
  (3, 'DoanThanhNien', 'Ban chuyên môn',                  3, 'Ủy ban Kiểm tra, các Ban của Đoàn'),
  (4, 'DoanThanhNien', 'LCĐ, CĐ trực thuộc',              4, 'Liên chi đoàn các khoa, chi đoàn trực thuộc'),
  (5, 'HoiSinhVien',   'CLB cụm Tình nguyện – Sở thích',  1, 'Tình nguyện, văn nghệ, thể thao, sở thích'),
  (6, 'HoiSinhVien',   'Liên chi hội',                    2, 'Liên chi hội các khoa'),
  (7, 'HoiSinhVien',   'CLB cụm Học thuật',               3, 'Các CLB chuyên môn, học thuật'),
  (8, 'HoiSinhVien',   'CLB cụm Kỹ năng',                 4, 'Các CLB kỹ năng, khởi nghiệp'),
  (9, 'HoiSinhVien',   'Đội trực thuộc',                  5, 'Các đội trực thuộc BCH Hội Sinh viên');
select setval(pg_get_serial_sequence('public.don_vi_to_chuc', 'MaDonVi'), 9);

alter table public.don_vi_to_chuc enable row level security;
grant select on public.don_vi_to_chuc to anon, authenticated;
grant insert, update, delete on public.don_vi_to_chuc to authenticated;
create policy "don_vi_doc" on public.don_vi_to_chuc for select to anon, authenticated using (true);
create policy "don_vi_ghi" on public.don_vi_to_chuc for all to authenticated
  using (public.la_quan_tri_vien(auth.uid())) with check (public.la_quan_tri_vien(auth.uid()));

alter table public.cau_lac_bo
  add column "MaDonVi" int references public.don_vi_to_chuc("MaDonVi") on delete set null;
create index cau_lac_bo_don_vi_idx on public.cau_lac_bo ("MaDonVi");

-- Bỏ dấu tiếng Việt, viết thường (dùng để đoán đơn vị theo tên CLB).
create or replace function public.bo_dau(_s text)
returns text language sql immutable set search_path = public as $$
  select lower(translate(
    regexp_replace(normalize(coalesce(_s, ''), NFD), '[̀-ͯ]', '', 'g'),
    'đĐ', 'dD'))
$$;

-- Đoán đơn vị (ô xanh của sơ đồ) từ tên CLB. Quy tắc cụ thể đứng trước quy tắc chung.
-- _khoi (tuỳ chọn) giới hạn trong một khối khi đã biết CLB thuộc Đoàn hay Hội.
create or replace function public.doan_don_vi(_ten text, _khoi text default null)
returns int language sql stable set search_path = public as $$
  with t(ten) as (select public.bo_dau(_ten)),
  quy_tac(thu_tu, khoi, ten_don_vi, mau) as (values
    (1, 'HoiSinhVien',   'Đội trực thuộc',                 '\y(bluewings|blue wings|doi ctv bch|ctv bch)\y'),
    (2, 'HoiSinhVien',   'Liên chi hội',                   '\y(lien chi hoi|lch|doi ctv khoa|ctv khoa)\y'),
    (3, 'DoanThanhNien', 'LCĐ, CĐ trực thuộc',             '\y(lien chi doan|lcd|chi doan|cd phong ban|cd vien)\y'),
    (4, 'DoanThanhNien', 'Ban chuyên môn',                 '\y(ban phong trao|ban tinh nguyen|ban tai chinh|uy ban kiem tra|ban tdkt)\y'),
    (5, 'DoanThanhNien', 'Bộ phận hành chính',             '\y(van phong doan)\y'),
    (6, 'DoanThanhNien', 'Đội trực thuộc',                 '\y(doi thu linh doan|tld)\y'),
    (7, 'HoiSinhVien',   'CLB cụm Học thuật',
       '\y(chung khoan|sec|ke toan|kiem toan|aac|kinh doanh quoc te|ibc|tieng anh|ecba|tin hoc|bit|nghien cuu|src|luat gia|fjc|kinh te tre|yec|clb tai chinh|fc)\y'),
    (8, 'HoiSinhVien',   'CLB cụm Kỹ năng',
       '\y(ky nang|bsc|thuyet trinh|scba|khoi nghiep|stc|nha ngan hang tuong lai|tbc|nguon nhan luc|ubc)\y'),
    (9, 'HoiSinhVien',   'CLB cụm Tình nguyện – Sở thích',
       '\y(tinh nguyen|hien mau|van nghe|mc|mcc|guitar|truyen thong|karate|karatedo|taekwondo|bong chuyen|bong da|bong ban|cau long|co vua|sach|nghi le|nhay|dance)\y')
  )
  select dv."MaDonVi"
  from t, quy_tac q
  join public.don_vi_to_chuc dv on dv."Khoi" = q.khoi and dv."TenDonVi" = q.ten_don_vi
  where t.ten ~ q.mau and (_khoi is null or q.khoi = _khoi)
  order by q.thu_tu
  limit 1
$$;

-- Xếp các CLB hiện có vào đơn vị:
--   1) "DonViTrucThuoc" dạng "Khối – Đơn vị" khớp chính xác (bản giao diện cũ cho chọn chi tiết);
--   2) còn lại đoán theo tên, trong đúng khối đã chọn ở "DonViTrucThuoc" (nếu có).
--   "DonViTrucThuoc" = 'Khác' -> không thuộc đơn vị nào.
update public.cau_lac_bo c set "MaDonVi" = dv."MaDonVi"
from public.don_vi_to_chuc dv
where btrim(c."DonViTrucThuoc") =
  (case dv."Khoi" when 'DoanThanhNien' then 'Đoàn Thanh niên' else 'Hội Sinh viên' end) || ' – ' || dv."TenDonVi";

update public.cau_lac_bo c set "MaDonVi" = public.doan_don_vi(
  c."TenCLB",
  case
    when lower(btrim(c."DonViTrucThuoc")) like 'đoàn thanh niên%' then 'DoanThanhNien'
    when lower(btrim(c."DonViTrucThuoc")) like 'hội sinh viên%' then 'HoiSinhVien'
  end)
where c."MaDonVi" is null and coalesce(lower(btrim(c."DonViTrucThuoc")), '') <> 'khác';

-- "DonViTrucThuoc" (thuộc tính trong báo cáo) nay được SINH TỰ ĐỘNG từ MaDonVi
-- dạng "Hội Sinh viên – CLB cụm Học thuật"; NULL = khác / chưa phân loại.
create or replace function public.nhan_don_vi(_ma_don_vi int)
returns varchar language sql stable set search_path = public as $$
  select (case "Khoi" when 'DoanThanhNien' then 'Đoàn Thanh niên' else 'Hội Sinh viên' end) || ' – ' || "TenDonVi"
  from public.don_vi_to_chuc where "MaDonVi" = _ma_don_vi
$$;

update public.cau_lac_bo set "DonViTrucThuoc" = public.nhan_don_vi("MaDonVi");

create or replace function public.dong_bo_don_vi_clb()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- CLB mới tạo chưa chọn đơn vị: đoán theo tên
  if tg_op = 'INSERT' and new."MaDonVi" is null then
    new."MaDonVi" := public.doan_don_vi(new."TenCLB");
  end if;
  new."DonViTrucThuoc" := public.nhan_don_vi(new."MaDonVi");
  return new;
end $$;
create trigger cau_lac_bo_don_vi_trg
before insert or update on public.cau_lac_bo for each row execute function public.dong_bo_don_vi_clb();

-- Đổi tên đơn vị -> cập nhật nhãn ở các CLB thuộc đơn vị đó
create or replace function public.sau_khi_sua_don_vi()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.cau_lac_bo set "DonViTrucThuoc" = public.nhan_don_vi("MaDonVi")
  where "MaDonVi" = new."MaDonVi";
  return null;
end $$;
create trigger don_vi_sau_sua_trg
after update on public.don_vi_to_chuc for each row execute function public.sau_khi_sua_don_vi();

-- Yêu cầu cập nhật thông tin CLB: thay MaLinhVuc bằng MaDonVi
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
      "MaDonVi"          = case when v ? 'MaDonVi'         then (v->>'MaDonVi')::int else c."MaDonVi" end,
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

-- Gỡ hẳn lĩnh vực
alter table public.cau_lac_bo drop column "MaLinhVuc";
drop table public.linh_vuc;

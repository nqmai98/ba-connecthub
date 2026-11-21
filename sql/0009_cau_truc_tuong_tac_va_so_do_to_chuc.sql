-- =====================================================================
-- CẤU TRÚC (chỉ thay đổi lược đồ) — Tương tác bài viết + sơ đồ tổ chức Đoàn – Hội
--
-- File này CHỈ gồm thay đổi cấu trúc: bảng, cột, hàm, trigger, quyền, RLS.
-- Không thêm / sửa / xoá dữ liệu nào, không xoá bảng nào.
--
-- A. Bảng luot_xem_bai_dang + hàm ghi_luot_xem
-- B. Bảng binh_luan + các hàm đọc/ghi bình luận
-- C/D. Hàm bai_viet_noi_bat, dem_tuong_tac, tuong_tac_clb (số liệu tương tác)
-- E. Bảng don_vi_to_chuc + cột cau_lac_bo.MaDonVi (phân loại theo sơ đồ Đoàn – Hội)
-- F. Hàm khoi_tao_so_do_to_chuc(): NHẬP DỮ LIỆU sơ đồ (9 đơn vị, xếp CLB cũ, thêm 60
--    đơn vị). Hàm chỉ được TẠO ở đây; Quản trị viên chạy nó bằng nút
--    "Nhập sơ đồ tổ chức" ở trang Quản lý CLB.
--
-- Bảng linh_vuc và cột cau_lac_bo.MaLinhVuc được GIỮ LẠI (không còn dùng, cột cho phép NULL)
-- để không mất dữ liệu cũ.
-- =====================================================================

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

-- "DonViTrucThuoc" (thuộc tính trong báo cáo) nay được SINH TỰ ĐỘNG từ MaDonVi
-- dạng "Hội Sinh viên – CLB cụm Học thuật"; NULL = khác / chưa phân loại.
create or replace function public.nhan_don_vi(_ma_don_vi int)
returns varchar language sql stable set search_path = public as $$
  select (case "Khoi" when 'DoanThanhNien' then 'Đoàn Thanh niên' else 'Hội Sinh viên' end) || ' – ' || "TenDonVi"
  from public.don_vi_to_chuc where "MaDonVi" = _ma_don_vi
$$;

create or replace function public.dong_bo_don_vi_clb()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- CLB mới tạo chưa chọn đơn vị: đoán theo tên
  if tg_op = 'INSERT' and new."MaDonVi" is null then
    new."MaDonVi" := public.doan_don_vi(new."TenCLB");
  end if;
  if new."MaDonVi" is not null then
    new."DonViTrucThuoc" := public.nhan_don_vi(new."MaDonVi");
  elsif tg_op = 'UPDATE' and old."MaDonVi" is not null then
    new."DonViTrucThuoc" := null;  -- chuyển về "Khác"
  end if;
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

-- Lĩnh vực không còn dùng: cho phép NULL để CLB mới không cần lĩnh vực (giữ dữ liệu cũ)
alter table public.cau_lac_bo alter column "MaLinhVuc" drop not null;

-- ---------------------------------------------------------------------
-- F. HÀM NHẬP DỮ LIỆU SƠ ĐỒ TỔ CHỨC (chỉ tạo hàm; Quản trị viên bấm nút để chạy)
--    Chạy lại nhiều lần an toàn: không tạo trùng, không ghi đè lựa chọn của Quản trị viên.
-- ---------------------------------------------------------------------

create or replace function public.khoi_tao_so_do_to_chuc()
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  v_don_vi int;
  v_xep int;
  v_them int;
begin
  if not public.la_quan_tri_vien(auth.uid()) then
    raise exception 'Chỉ Quản trị viên được nhập sơ đồ tổ chức';
  end if;

  -- 1) 9 đơn vị (ô xanh) theo sơ đồ; mã 1–9 cố định
  insert into public.don_vi_to_chuc ("MaDonVi", "Khoi", "TenDonVi", "ThuTu", "MoTa")
  select * from (values
    (1, 'DoanThanhNien', 'Bộ phận hành chính',             1, 'Văn phòng Đoàn'),
    (2, 'DoanThanhNien', 'Đội trực thuộc',                 2, 'Các đội trực thuộc Đoàn Thanh niên'),
    (3, 'DoanThanhNien', 'Ban chuyên môn',                 3, 'Ủy ban Kiểm tra, các Ban của Đoàn'),
    (4, 'DoanThanhNien', 'LCĐ, CĐ trực thuộc',             4, 'Liên chi đoàn các khoa, chi đoàn trực thuộc'),
    (5, 'HoiSinhVien',   'CLB cụm Tình nguyện – Sở thích', 1, 'Tình nguyện, văn nghệ, thể thao, sở thích'),
    (6, 'HoiSinhVien',   'Liên chi hội',                   2, 'Liên chi hội các khoa'),
    (7, 'HoiSinhVien',   'CLB cụm Học thuật',              3, 'Các CLB chuyên môn, học thuật'),
    (8, 'HoiSinhVien',   'CLB cụm Kỹ năng',                4, 'Các CLB kỹ năng, khởi nghiệp'),
    (9, 'HoiSinhVien',   'Đội trực thuộc',                 5, 'Các đội trực thuộc BCH Hội Sinh viên')
  ) as dv(ma, khoi, ten, thu_tu, mo_ta)
  where not exists (select 1 from public.don_vi_to_chuc x where x."MaDonVi" = dv.ma or (x."Khoi" = dv.khoi and x."TenDonVi" = dv.ten))
  on conflict do nothing;
  get diagnostics v_don_vi = row_count;
  perform setval(pg_get_serial_sequence('public.don_vi_to_chuc', 'MaDonVi'),
                 greatest((select max("MaDonVi") from public.don_vi_to_chuc), 1));

  -- 2) Xếp các CLB đang có (chưa có đơn vị) vào ô theo tên; "Đoàn Thanh niên"/"Hội Sinh viên"
  --    ghi ở DonViTrucThuoc kiểu cũ được dùng làm gợi ý khối; "Khác" thì để nguyên.
  update public.cau_lac_bo c set "MaDonVi" = coalesce(
    (select dv."MaDonVi" from public.don_vi_to_chuc dv
      where btrim(c."DonViTrucThuoc") = public.nhan_don_vi(dv."MaDonVi")),
    public.doan_don_vi(c."TenCLB",
      case
        when lower(btrim(c."DonViTrucThuoc")) like 'đoàn thanh niên%' then 'DoanThanhNien'
        when lower(btrim(c."DonViTrucThuoc")) like 'hội sinh viên%' then 'HoiSinhVien'
      end))
  where c."MaDonVi" is null and coalesce(lower(btrim(c."DonViTrucThuoc")), '') <> 'khác'
    and public.doan_don_vi(c."TenCLB") is not null;
  get diagnostics v_xep = row_count;

  -- 3) Thêm các CLB / đội / ban / LCĐ / LCH còn thiếu trong sơ đồ (bỏ qua đơn vị đã có)
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
  get diagnostics v_them = row_count;

  perform public.ghi_nhat_ky('NhapSoDoToChuc', 'don_vi_to_chuc', null, null,
    format('%s đơn vị · xếp %s CLB · thêm %s CLB', v_don_vi, v_xep, v_them));

  return jsonb_build_object('DonViMoi', v_don_vi, 'CLBDuocXep', v_xep, 'CLBMoi', v_them);
end $$;

revoke all on function public.khoi_tao_so_do_to_chuc() from public;
grant execute on function public.khoi_tao_so_do_to_chuc() to authenticated;

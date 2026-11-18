-- =====================================================================
-- BAV CLUBS – Phân nhóm CLB theo Sơ đồ tổ chức Đoàn Thanh niên – Hội Sinh viên HVNH
--   Cấp 1 ("Khoi"):  DoanThanhNien | HoiSinhVien
--   Cấp 2 (nhom_to_chuc): các ô xanh trong sơ đồ tổ chức
-- Mỗi CLB thuộc tối đa 1 nhóm (cau_lac_bo."MaNhom", có thể NULL khi chưa phân loại).
-- Thêm mới, không xoá/sửa dữ liệu cũ.
-- =====================================================================

create table if not exists public.nhom_to_chuc (
  "MaNhom"  int generated always as identity primary key,
  "Khoi"    varchar(20)  not null check ("Khoi" in ('DoanThanhNien', 'HoiSinhVien')),
  "TenNhom" varchar(100) not null,
  "ThuTu"   smallint     not null default 0,
  unique ("Khoi", "TenNhom")
);

alter table public.cau_lac_bo
  add column if not exists "MaNhom" int references public.nhom_to_chuc("MaNhom") on delete set null;
create index if not exists cau_lac_bo_nhom_idx on public.cau_lac_bo ("MaNhom");

alter table public.nhom_to_chuc enable row level security;
create policy "nhom_to_chuc_doc" on public.nhom_to_chuc for select to anon, authenticated using (true);
create policy "nhom_to_chuc_ghi" on public.nhom_to_chuc for all to authenticated
  using (public.la_quan_tri_vien(auth.uid())) with check (public.la_quan_tri_vien(auth.uid()));
grant select on public.nhom_to_chuc to anon, authenticated;
grant insert, update, delete on public.nhom_to_chuc to authenticated;

insert into public.nhom_to_chuc ("Khoi", "TenNhom", "ThuTu") values
  ('DoanThanhNien', 'Bộ phận hành chính',              1),
  ('DoanThanhNien', 'Đội trực thuộc',                  2),
  ('DoanThanhNien', 'Ban chuyên môn',                  3),
  ('DoanThanhNien', 'LCĐ, CĐ trực thuộc',              4),
  ('DoanThanhNien', 'CLB cụm Tình nguyện – Sở thích',  5),
  ('HoiSinhVien',   'Liên chi hội',                    1),
  ('HoiSinhVien',   'CLB cụm Học thuật',               2),
  ('HoiSinhVien',   'CLB cụm Kỹ năng',                 3),
  ('HoiSinhVien',   'Đội trực thuộc',                  4)
on conflict ("Khoi", "TenNhom") do nothing;

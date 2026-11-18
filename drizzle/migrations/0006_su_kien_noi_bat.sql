create or replace function public.su_kien_noi_bat(_gioi_han int default 7)
returns table (
  "MaBaiDang"     int,
  "LuotYeuThich"  int,
  "DiemNoiBat"    int
)
language sql stable security definer set search_path = public as $$
  select
    sk."MaBaiDang",
    count(yt."MaNguoiDung")::int as "LuotYeuThich",
    (
      3 * count(yt."MaNguoiDung")
      + 2 * count(yt."MaNguoiDung") filter (where yt."NgayYeuThich" >= now() - interval '7 days')
      + public.dem_nguoi_theo_doi(bd."MaCLB")
    )::int as "DiemNoiBat"
  from public.su_kien sk
  join public.bai_dang bd on bd."MaBaiDang" = sk."MaBaiDang"
  left join public.yeu_thich_su_kien yt on yt."MaBaiDang" = sk."MaBaiDang"
  where bd."TrangThaiKiemDuyet" = 'DaDuyet'
    and sk."ThoiGianKetThuc" >= now()
  group by sk."MaBaiDang", bd."MaCLB", sk."ThoiGianBatDau"
  order by "DiemNoiBat" desc, sk."ThoiGianBatDau" asc
  limit least(greatest(coalesce(_gioi_han, 7), 1), 10)
$$;

grant execute on function public.su_kien_noi_bat(int) to anon, authenticated;
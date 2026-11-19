create or replace function public.luot_yeu_thich_clb(_ma_clb int)
returns table ("MaBaiDang" int, "NgayYeuThich" timestamptz)
language sql stable security definer set search_path = public as $$
  select yt."MaBaiDang", yt."NgayYeuThich"
  from public.yeu_thich_su_kien yt
  join public.bai_dang bd on bd."MaBaiDang" = yt."MaBaiDang"
  where bd."MaCLB" = _ma_clb
    and (public.la_dai_dien_clb(auth.uid(), _ma_clb) or public.la_quan_tri_vien(auth.uid()))
$$;

revoke all on function public.luot_yeu_thich_clb(int) from public;
grant execute on function public.luot_yeu_thich_clb(int) to authenticated;
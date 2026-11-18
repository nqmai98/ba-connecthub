-- =====================================================================
-- BAV CLUBS – Banner "Sự kiện nổi bật" trên trang chủ Sinh viên
-- Hàm xếp hạng độ "hot" của các sự kiện sắp/đang diễn ra.
--
-- Vì sao cần hàm này: chính sách RLS của bảng yeu_thich_su_kien chỉ cho
-- mỗi người xem lượt yêu thích CỦA CHÍNH MÌNH, nên trình duyệt không tự
-- đếm được tổng lượt yêu thích. Hàm security definer chỉ trả về CON SỐ
-- tổng hợp, không lộ ai đã yêu thích sự kiện nào.
--
-- Điểm nổi bật = 3 × tổng lượt yêu thích
--              + 2 × lượt yêu thích trong 7 ngày gần nhất (đang "lên")
--              + 1 × số người theo dõi CLB tổ chức
-- Chỉ xét bài đã duyệt và sự kiện chưa kết thúc.
-- =====================================================================

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

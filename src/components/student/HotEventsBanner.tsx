import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Calendar, ChevronLeft, ChevronRight, Eye, Flame, Heart, MapPin, MessageCircle, Search, Users } from "lucide-react";
import logo from "@/assets/bav-logo.png.asset.json";
import {
  formatDateTime,
  formatKhoangThoiGian,
  NHAN_LOAI_BAI_DANG,
  useBaiVietNoiBat,
  type BaiVietNoiBat,
} from "@/lib/data";
import { FavoriteButton } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { vanBanThuan } from "@/lib/noi-dung";

/** Thời gian mỗi slide (ms) trước khi tự lướt sang bài tiếp theo. */
const THOI_GIAN_SLIDE = 6000;

/**
 * Banner trang chủ Sinh viên: tự động lướt qua 5–7 bài viết / sự kiện nổi bật nhất.
 * Danh sách do CSDL chọn tự động theo lượt xem, lượt bình luận và lượt yêu thích
 * (hàm bai_viet_noi_bat), không ai phải chỉnh tay.
 * - Dừng khi rê chuột / chạm vào banner, hoặc khi người dùng bật "giảm chuyển động".
 * - Có nút trước/sau, chấm chuyển trang, vuốt trên điện thoại, phím mũi tên.
 */
export function HotEventsBanner() {
  const { data, isLoading } = useBaiVietNoiBat(7);
  const suKien = data ?? [];
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const touchX = useRef<number | null>(null);
  const n = suKien.length;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const on = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  useEffect(() => {
    if (index >= n && n > 0) setIndex(0);
  }, [n, index]);

  const go = useCallback((i: number) => setIndex(((i % n) + n) % n), [n]);

  const autoplay = n > 1 && !paused && !reduceMotion;
  useEffect(() => {
    if (!autoplay) return;
    const t = window.setTimeout(() => go(index + 1), THOI_GIAN_SLIDE);
    return () => window.clearTimeout(t);
  }, [autoplay, index, go]);

  if (isLoading) return <BannerShell><BannerSkeleton /></BannerShell>;
  if (!n) return <BannerShell><IntroSlide /></BannerShell>;

  return (
    <BannerShell>
      <div
        role="region"
        aria-roledescription="carousel"
        aria-label="Bài viết nổi bật"
        tabIndex={0}
        className="relative outline-none"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") go(index - 1);
          if (e.key === "ArrowRight") go(index + 1);
        }}
        onTouchStart={(e) => {
          touchX.current = e.touches[0]?.clientX ?? null;
          setPaused(true);
        }}
        onTouchEnd={(e) => {
          const start = touchX.current;
          const end = e.changedTouches[0]?.clientX;
          if (start != null && end != null && Math.abs(end - start) > 40)
            go(index + (end < start ? 1 : -1));
          touchX.current = null;
          setPaused(false);
        }}
      >
        {/* Ảnh nền mờ của sự kiện đang hiển thị, hoà vào nền tinh hà */}
        {suKien.map((e, i) =>
          e.AnhBia ? (
            <img
              key={`bg-${e.MaBaiDang}`}
              src={e.AnhBia}
              alt=""
              aria-hidden
              className={cn(
                "pointer-events-none absolute inset-0 -z-10 h-full w-full scale-110 object-cover blur-2xl transition-opacity duration-1000",
                i === index ? "opacity-25" : "opacity-0",
              )}
            />
          ) : null,
        )}

        <div className="grid">
          {suKien.map((e, i) => (
            <Slide key={e.MaBaiDang} e={e} active={i === index} total={n} />
          ))}
        </div>

        {n > 1 && (
          <div className="mt-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2" role="tablist" aria-label="Chọn bài viết">
              {suKien.map((e, i) => (
                <button
                  key={e.MaBaiDang}
                  role="tab"
                  aria-selected={i === index}
                  aria-label={`Bài ${i + 1}: ${e.TieuDe}`}
                  onClick={() => go(i)}
                  className={cn(
                    "relative h-2 overflow-hidden rounded-full bg-white/25 transition-all duration-500",
                    i === index ? "w-10" : "w-2 hover:bg-white/50",
                  )}
                >
                  {i === index && (
                    <span
                      key={`${index}-${autoplay}`}
                      className="absolute inset-0 origin-left rounded-full bg-accent"
                      style={
                        autoplay
                          ? { animation: `banner-progress ${THOI_GIAN_SLIDE}ms linear forwards` }
                          : undefined
                      }
                    />
                  )}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                aria-label="Bài trước"
                onClick={() => go(index - 1)}
                className="grid h-10 w-10 place-items-center rounded-full border border-white/25 bg-white/10 text-white backdrop-blur transition hover:bg-white/20"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                aria-label="Bài tiếp theo"
                onClick={() => go(index + 1)}
                className="grid h-10 w-10 place-items-center rounded-full border border-white/25 bg-white/10 text-white backdrop-blur transition hover:bg-white/20"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </BannerShell>
  );
}

function BannerShell({ children }: { children: ReactNode }) {
  return (
    <section className="bg-galaxy overflow-hidden text-white">
      <div className="galaxy-stars" aria-hidden />
      <div className="galaxy-milkyway" aria-hidden />
      <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6 md:pb-24 md:pt-12">{children}</div>
    </section>
  );
}

function Slide({ e, active, total }: { e: BaiVietNoiBat; active: boolean; total: number }) {
  const sk = e.su_kien;
  return (
    <article
      aria-hidden={!active}
      aria-roledescription="slide"
      aria-label={`${e.Hang} / ${total}`}
      // Mọi slide chồng lên cùng một ô lưới để banner giữ chiều cao ổn định khi lướt
      className={cn(
        "col-start-1 row-start-1 grid items-center gap-6 transition-all duration-700 ease-out md:grid-cols-[1.15fr_1fr] md:gap-10",
        active ? "visible translate-x-0 opacity-100" : "invisible translate-x-6 opacity-0",
      )}
    >
      <div className="order-2 min-w-0 md:order-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-accent-foreground shadow-[0_0_24px_rgb(247_168_27/0.55)]">
            <Flame className="h-3.5 w-3.5" /> Nổi bật #{e.Hang}
          </span>
          <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold backdrop-blur">
            {NHAN_LOAI_BAI_DANG[e.LoaiBaiDang]}
          </span>
          {sk?.TrangThaiDienRa === "DangDienRa" && (
            <span className="rounded-full bg-success px-3 py-1 text-xs font-bold text-success-foreground">
              Đang diễn ra
            </span>
          )}
        </div>

        <h2 className="mt-4 line-clamp-3 text-2xl leading-tight sm:text-4xl">{e.TieuDe}</h2>
        {e.NoiDung && (
          <p className="mt-3 line-clamp-2 max-w-xl text-sm font-medium text-white/75 sm:text-base">
            {vanBanThuan(e.NoiDung)}
          </p>
        )}

        <ul className="mt-5 space-y-2 text-sm font-semibold text-white/90">
          <li className="flex items-start gap-2">
            <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            {sk ? formatKhoangThoiGian(sk.ThoiGianBatDau, sk.ThoiGianKetThuc) : `Đăng ${formatDateTime(e.NgayDang)}`}
          </li>
          {sk?.DiaDiem && (
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              <span className="line-clamp-1">{sk.DiaDiem}</span>
            </li>
          )}
          {e.cau_lac_bo && (
            <li className="flex items-start gap-2">
              <Users className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              <span className="line-clamp-1">{e.cau_lac_bo.TenCLB}</span>
            </li>
          )}
        </ul>

        <div className="mt-6 flex flex-wrap gap-3">
          {e.cau_lac_bo && (
            <Button
              asChild
              size="lg"
              tabIndex={active ? 0 : -1}
              className="rounded-xl bg-white font-extrabold text-primary hover:bg-white/90"
            >
              <Link to="/bai-viet/$id" params={{ id: String(e.MaBaiDang) }}>
                Xem chi tiết
              </Link>
            </Button>
          )}
          {sk && (
            <div className="[&_button]:h-11 [&_button]:px-5">
              <FavoriteButton maBaiDang={e.MaBaiDang} />
            </div>
          )}
        </div>

        <dl className="mt-5 flex flex-wrap gap-x-5 gap-y-1 text-xs font-bold text-white/75">
          <ChiSo icon={Eye} so={e.LuotXem} nhan="lượt xem" />
          <ChiSo icon={MessageCircle} so={e.LuotBinhLuan} nhan="bình luận" />
          {sk && <ChiSo icon={Heart} so={e.LuotYeuThich} nhan="lượt yêu thích" />}
        </dl>
      </div>

      <div className="order-1 md:order-2">
        <div className="relative mx-auto aspect-[16/10] w-full max-w-lg">
          <div className="absolute -inset-3 rounded-[2rem] bg-gradient-to-br from-accent/50 via-white/10 to-[#2f4a9e]/60 blur-2xl" />
          <div className="relative h-full overflow-hidden rounded-3xl border border-white/20 bg-white/10 shadow-2xl">
            {e.AnhBia ? (
              <img src={e.AnhBia} alt={e.TieuDe} className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full place-items-center p-6 text-center">
                <div>
                  <img src={logo.url} alt="" className="mx-auto h-20 w-auto opacity-90" />
                  <p className="mt-3 text-lg font-extrabold">{e.cau_lac_bo?.TenCLB}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function ChiSo({ icon: Icon, so, nhan }: { icon: typeof Eye; so: number; nhan: string }) {
  return (
    <div className="inline-flex items-center gap-1.5">
      <Icon className="h-3.5 w-3.5 text-accent" aria-hidden />
      <dt className="sr-only">{nhan}</dt>
      <dd>
        {so.toLocaleString("vi-VN")} <span aria-hidden>{nhan}</span>
      </dd>
    </div>
  );
}

/** Hiển thị khi chưa có bài viết nào. */
function IntroSlide() {
  return (
    <div className="grid items-center gap-8 md:grid-cols-[1fr_auto]">
      <div>
        <p className="text-sm font-bold uppercase tracking-widest text-accent">Học viện Ngân hàng</p>
        <h1 className="mt-2 text-3xl leading-tight sm:text-5xl">
          Tìm câu lạc bộ <span className="text-accent">dành cho bạn</span>
        </h1>
        <p className="mt-4 max-w-xl font-medium text-white/80">
          Tra cứu câu lạc bộ, liên chi đoàn, liên chi hội và đội nhóm. Theo dõi hoạt động, lưu sự
          kiện yêu thích vào lịch cá nhân.
        </p>
        <Button
          asChild
          size="lg"
          className="mt-6 bg-accent font-extrabold text-accent-foreground hover:bg-accent/90"
        >
          <Link to="/cau-lac-bo">
            <Search className="h-5 w-5" /> Tìm câu lạc bộ
          </Link>
        </Button>
      </div>
      <img src={logo.url} alt="Logo BAV" className="mx-auto hidden h-52 w-auto drop-shadow-xl md:block" />
    </div>
  );
}

function BannerSkeleton() {
  return (
    <div className="grid items-center gap-8 md:grid-cols-[1.15fr_1fr]">
      <div className="space-y-4">
        <Skeleton className="h-6 w-32 bg-white/15" />
        <Skeleton className="h-10 w-full bg-white/15" />
        <Skeleton className="h-10 w-3/4 bg-white/15" />
        <Skeleton className="h-5 w-1/2 bg-white/15" />
        <Skeleton className="h-11 w-48 bg-white/15" />
      </div>
      <Skeleton className="aspect-[16/10] w-full rounded-3xl bg-white/15" />
    </div>
  );
}

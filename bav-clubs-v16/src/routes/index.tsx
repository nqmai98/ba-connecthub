import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Compass, Network, Search } from "lucide-react";
import logo from "@/assets/bav-logo.png.asset.json";
import {
  NHAN_KHOI,
  useCauLacBo,
  useSuKien,
  type CauLacBo,
  type KhoiToChuc,
  type NhomToChuc,
} from "@/lib/data";
import { DON_VI_MAC_DINH, khoiCuaCLB, maNhomCuaCLB, useSoDoToChuc } from "@/lib/so-do-to-chuc";
import { ClubCard, Empty, EventCard, GridSkeleton } from "@/components/common";
import { HotEventsBanner } from "@/components/student/HotEventsBanner";
import { ClubSearchBox } from "@/components/student/Filters";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BAV CLUBS – Câu lạc bộ & sự kiện Học viện Ngân hàng" },
      {
        name: "description",
        content:
          "Khám phá câu lạc bộ, liên chi đoàn, đội nhóm và sự kiện sắp diễn ra tại Học viện Ngân hàng.",
      },
      { property: "og:title", content: "BAV CLUBS – Câu lạc bộ & sự kiện Học viện Ngân hàng" },
      {
        property: "og:description",
        content: "Khám phá câu lạc bộ, đội nhóm và sự kiện sắp diễn ra tại Học viện Ngân hàng.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const { data: dsNhom } = useSoDoToChuc();
  const { data: clubs, isLoading } = useCauLacBo();
  const { data: suKien, isLoading: evLoading } = useSuKien({ sapDienRa: true });
  const dangHoatDong = (clubs ?? []).filter((c) => c.TrangThaiHoatDong !== "NgungHoatDong");
  const noiBat = dangHoatDong.filter((c) => c.NoiBat).slice(0, 6);

  return (
    <main>
      <HotEventsBanner />

      <div className="mx-auto max-w-7xl space-y-12 px-3 py-8 sm:px-6 sm:py-10">
        <GioiThieu soCLB={dangHoatDong.length} soSuKien={suKien?.length ?? 0} />

        {/* Tìm kiếm + khám phá theo sơ đồ tổ chức Đoàn – Hội */}
        <section className="rounded-3xl border border-white/70 bg-card/85 p-4 shadow-[0_18px_50px_-24px_rgb(31_35_95/0.55)] backdrop-blur sm:p-6">
          <ClubSearchBox />
          <h2 className="mb-3 mt-5 text-base text-foreground">Khám phá theo tổ chức</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {(Object.keys(NHAN_KHOI) as KhoiToChuc[]).map((k) => (
              <KhoiCard
                key={k}
                khoi={k}
                nhom={dsNhom.filter((n) => n.Khoi === k)}
                clubs={dangHoatDong.map((c) => ({ ...c, MaNhom: maNhomCuaCLB(c, dsNhom) }))}
              />
            ))}
          </div>
        </section>

        <section>
          <SectionHeader title="CLB nổi bật" to="/cau-lac-bo" />
          {isLoading ? (
            <GridSkeleton />
          ) : noiBat.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {noiBat.map((c) => (
                <ClubCard key={c.MaCLB} club={c} />
              ))}
            </div>
          ) : (
            <Empty text="Chưa có câu lạc bộ nổi bật" />
          )}
        </section>

        <section>
          <SectionHeader title="Sự kiện sắp diễn ra" to="/su-kien" />
          {evLoading ? (
            <GridSkeleton n={3} />
          ) : suKien?.length ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {suKien.slice(0, 6).map((e) => (
                <EventCard key={e.MaBaiDang} suKien={e} />
              ))}
            </div>
          ) : (
            <Empty text="Chưa có sự kiện sắp diễn ra" />
          )}
        </section>
      </div>
    </main>
  );
}

function SectionHeader({ title, to }: { title: ReactNode; to: "/cau-lac-bo" | "/su-kien" }) {
  return (
    <div className="mb-4 flex items-end justify-between">
      <h2 className="flex items-center gap-3 text-xl sm:text-2xl">
        <span className="h-7 w-1.5 rounded-full bg-gradient-to-b from-accent to-primary" />
        {title}
      </h2>
      <Link to={to} className="text-sm font-bold text-primary hover:underline">
        Xem tất cả
      </Link>
    </div>
  );
}

/** Một khối cấp 1 (Đoàn Thanh niên / Hội Sinh viên) kèm các đơn vị cấp 2. */
function KhoiCard({
  khoi,
  nhom,
  clubs,
}: {
  khoi: KhoiToChuc;
  nhom: NhomToChuc[];
  clubs: CauLacBo[];
}) {
  const maNhom = new Set(nhom.map((n) => n.MaNhom));
  // Tổng theo khối (ô "Đơn vị trực thuộc"), gồm cả CLB chưa xếp được vào ô xanh nào
  const tong = clubs.filter((c) => khoiCuaCLB(c, DON_VI_MAC_DINH) === khoi).length;
  return (
    <div className="rounded-2xl border bg-card p-4">
      <Link
        to="/cau-lac-bo"
        search={{ khoi }}
        className="flex items-center justify-between gap-2 rounded-xl bg-primary px-4 py-2.5 text-primary-foreground transition hover:bg-primary-dark"
      >
        <span className="font-extrabold">{NHAN_KHOI[khoi]}</span>
        <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-bold">{tong} CLB, đội nhóm</span>
      </Link>
      <div className="mt-3 flex flex-wrap gap-2">
        {nhom.map((n) => (
          <Link
            key={n.MaNhom}
            to="/cau-lac-bo"
            search={{ khoi, nhom: n.MaNhom }}
            className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-sm font-bold text-primary transition hover:-translate-y-0.5 hover:border-primary hover:bg-secondary"
          >
            {n.TenNhom}
            <span className="rounded-full bg-secondary px-1.5 text-xs text-secondary-foreground">
              {clubs.filter((c) => maNhomCuaCLB(c, DON_VI_MAC_DINH) === n.MaNhom).length}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

/** Giới thiệu vai trò và mục tiêu của BAV CLUBS. */
function GioiThieu({ soCLB, soSuKien }: { soCLB: number; soSuKien: number }) {
  const truCot = [
    {
      icon: Search,
      ten: "Tìm kiếm & tra cứu",
      moTa: "Thông tin câu lạc bộ, đội nhóm và hoạt động sinh viên ở cùng một nơi.",
    },
    {
      icon: Network,
      ten: "Kết nối thống nhất",
      moTa: "Thu hẹp khoảng cách giữa sinh viên và các tổ chức trong Học viện.",
    },
    {
      icon: Compass,
      ten: "Khám phá & phát triển",
      moTa: "Tìm môi trường phù hợp để học hỏi, giao lưu và trải nghiệm.",
    },
  ];
  return (
    <section
      aria-labelledby="gioi-thieu"
      className="relative -mt-14 grid items-start gap-6 rounded-3xl border border-white/70 bg-card p-6 shadow-[0_18px_50px_-24px_rgb(31_35_95/0.55)] sm:-mt-16 sm:p-8 lg:grid-cols-[1.25fr_1fr] lg:gap-10"
    >
      <div>
        <div className="flex items-center gap-3">
          <img src={logo.url} alt="" className="h-12 w-auto" />
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-accent-foreground/70">
              Giới thiệu
            </p>
            <h2 id="gioi-thieu" className="text-2xl text-primary sm:text-3xl">
              Về BAV CLUBS
            </h2>
          </div>
        </div>
        <p className="mt-5 leading-relaxed text-foreground/85">
          BAV CLUBS hướng tới xây dựng một nền tảng trực tuyến tập trung, giúp sinh viên Học viện
          Ngân hàng dễ dàng tìm kiếm, tra cứu và tiếp cận thông tin về các câu lạc bộ, đội nhóm và
          hoạt động sinh viên.
        </p>
        <p className="mt-3 leading-relaxed text-foreground/85">
          Thông qua việc kết nối thông tin trên một hệ thống thống nhất, BAV CLUBS mong muốn thu hẹp
          khoảng cách giữa sinh viên và các tổ chức, tạo điều kiện để mỗi cá nhân khám phá sở thích,
          phát triển năng lực và tìm kiếm môi trường phù hợp để học hỏi, giao lưu và trải nghiệm.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <div className="rounded-2xl bg-secondary px-5 py-3">
            <div className="text-2xl font-extrabold text-primary">{soCLB}</div>
            <div className="text-xs font-bold text-muted-foreground">CLB & đội nhóm</div>
          </div>
          <div className="rounded-2xl bg-accent/20 px-5 py-3">
            <div className="text-2xl font-extrabold text-primary">{soSuKien}</div>
            <div className="text-xs font-bold text-muted-foreground">Sự kiện sắp diễn ra</div>
          </div>
        </div>
      </div>
      <ul className="space-y-3">
        {truCot.map(({ icon: Icon, ten, moTa }) => (
          <li key={ten} className="flex gap-4 rounded-2xl border p-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Icon className="h-5 w-5" />
            </span>
            <span>
              <span className="block font-extrabold text-primary">{ten}</span>
              <span className="mt-0.5 block text-sm text-muted-foreground">{moTa}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

import { useNavigate } from "@tanstack/react-router";
import { Bell, BellRing, CalendarCheck, FileCheck2, Info } from "lucide-react";
import {
  formatDateTime,
  useDanhDauDaDoc,
  useThongBao,
  useCauLacBo,
  type LoaiThongBao,
  type ThongBaoCuaToi,
} from "@/lib/data";
import { Empty, GridSkeleton, Page } from "@/components/common";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Trang danh sách thông báo dùng chung cho khu Sinh viên (/thong-bao) và Quản trị (/admin/thong-bao). */

/**
 * Thông báo trong CSDL gồm TieuDe (nhãn ngắn, VD "Bài đăng mới chờ duyệt") và NoiDung (chi tiết).
 * Thông báo cũ chuyển từ lược đồ trước có TieuDe = NoiDung nên trước đây bị hiện lặp 2 lần.
 * Hàm này trả về: nhãn (chỉ khi khác nội dung) + nội dung chính tách phần trong ngoặc kép.
 */
/**
 * Tách tiêu đề bài trong ngoặc kép theo đúng các mẫu câu trigger CSDL tạo ra
 * (tiêu đề hoặc lý do từ chối có thể chứa dấu ngoặc kép nên không tách tham lam).
 */
export function trichTieuDe(chu: string): { truoc: string; tieuDe: string; sau: string } | null {
  const mau = [
    /^(.*?vừa gửi bài )"(.+)"( chờ duyệt.*)$/s,
    /^(Bài )"(.+?)"( (?:đã được duyệt|bị từ chối).*)$/s,
    /^(.*?)"(.+)"(.*)$/s,
  ];
  for (const re of mau) {
    const m = chu.match(re);
    if (m) return { truoc: m[1]!, tieuDe: m[2]!.trim(), sau: m[3]! };
  }
  return null;
}

/** Đường dẫn của thông báo có thể kèm tham số (VD "/admin/clb?capLai=..."): tách thành to + search. */
export function diemDenThongBao(duongDan: string) {
  const [to, qs] = duongDan.split("?");
  return { to: to || "/", search: Object.fromEntries(new URLSearchParams(qs ?? "")) } as { to: string; search: Record<string, string> };
}

export function phanTichThongBao(n: Pick<ThongBaoCuaToi, "TieuDe" | "NoiDung">) {
  const chuan = (x: string) => x.replace(/\s+/g, " ").trim().toLowerCase();
  const chinh = (n.NoiDung || n.TieuDe).trim();
  const nhan = chuan(n.TieuDe) && !chuan(chinh).includes(chuan(n.TieuDe)) ? n.TieuDe : null;
  const m = trichTieuDe(chinh);
  return m
    ? { nhan, truoc: m.truoc.trim(), trich: m.tieuDe, sau: m.sau.trim().replace(/^[.,:]\s*/, "") }
    : { nhan, truoc: chinh, trich: null as string | null, sau: "" };
}

const ICON: Record<LoaiThongBao, typeof Bell> = {
  DuyetBaiDang: FileCheck2,
  CLBCapNhat: BellRing,
  YeuCauCapNhat: CalendarCheck,
  HeThong: Info,
};

/* ------------------------------ Ảnh thu nhỏ của thông báo ------------------------------ */
type AnhThongBao = { src: string; kieu: "bai" | "clb" } | null;

/** Tiêu đề bài viết nhắc tới trong thông báo: phần trong ngoặc kép, hoặc sau "mới: ". */
function tieuDeBaiTrong(n: ThongBaoCuaToi) {
  const nd = n.NoiDung || n.TieuDe;
  return trichTieuDe(nd)?.tieuDe ?? nd.match(/mới:\s*(.+)$/s)?.[1]?.trim() ?? null;
}

/**
 * Thông báo trong CSDL không lưu mã bài / mã CLB, nên ảnh thu nhỏ được suy ra từ nội dung:
 *  - có tiêu đề bài -> ảnh bìa của bài đó (đúng CLB nếu xác định được CLB);
 *  - không có ảnh bìa / không tìm thấy bài -> logo CLB gây ra thông báo (tên CLB có trong nội dung);
 *  - không xác định được gì -> biểu tượng theo loại thông báo.
 */
export function useAnhThongBao(ds: ThongBaoCuaToi[] | undefined) {
  const { data: clubs } = useCauLacBo();
  const tieuDe = Array.from(
    new Set((ds ?? []).map(tieuDeBaiTrong).filter((t): t is string => !!t)),
  ).slice(0, 100);
  const bai = useQuery({
    queryKey: ["anh-thong-bao", tieuDe],
    enabled: tieuDe.length > 0,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("bai_dang")
        .select("MaBaiDang, MaCLB, TieuDe, AnhBia")
        .in("TieuDe", tieuDe);
      return data ?? [];
    },
  });

  const map = new Map<number, AnhThongBao>();
  // Tên dài trước để "CLB Tài chính" không bị nhận nhầm khi có "CLB Tài chính Quốc tế"
  const clbTheoDoDai = [...(clubs ?? [])].sort((a, b) => b.TenCLB.length - a.TenCLB.length);
  for (const n of ds ?? []) {
    const chu = `${n.TieuDe} ${n.NoiDung}`;
    const maCLBTuLink = n.DuongDan?.match(/^\/cau-lac-bo\/(\d+)/)?.[1];
    const clb =
      (maCLBTuLink && clubs?.find((c) => c.MaCLB === Number(maCLBTuLink))) ||
      clbTheoDoDai.find((c) => chu.includes(c.TenCLB));
    const t = tieuDeBaiTrong(n);
    const maCLB = clb ? clb.MaCLB : null;
    const b = t
      ? (bai.data ?? []).find((x) => x.TieuDe === t && (maCLB === null || x.MaCLB === maCLB))
      : undefined;
    const logo = clb?.LogoCLB ?? (b && clubs?.find((c) => c.MaCLB === b.MaCLB)?.LogoCLB) ?? null;
    map.set(
      n.MaThongBao,
      b?.AnhBia ? { src: b.AnhBia, kieu: "bai" } : logo ? { src: logo, kieu: "clb" } : null,
    );
  }
  return map;
}

/** Ảnh thu nhỏ đứng đầu mỗi thông báo, kèm biểu tượng loại thông báo ở góc. */
export function AnhThuNho({ n, anh, nho = false }: { n: ThongBaoCuaToi; anh: AnhThongBao | undefined; nho?: boolean }) {
  const Icon = ICON[n.LoaiThongBao] ?? Bell;
  const kt = nho ? "h-11 w-11" : "h-14 w-14";
  return (
    <span className={cn("relative shrink-0", kt)}>
      {anh ? (
        <img
          src={anh.src}
          alt=""
          loading="lazy"
          className={cn(
            "h-full w-full border bg-muted object-cover",
            anh.kieu === "clb" ? "rounded-full" : "rounded-xl",
          )}
        />
      ) : (
        <span className="grid h-full w-full place-items-center rounded-xl bg-secondary text-primary">
          <Icon className="h-5 w-5" />
        </span>
      )}
      {anh && (
        <span
          className={cn(
            "absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full ring-2 ring-card",
            n.DaDoc ? "bg-muted text-muted-foreground" : "bg-accent text-accent-foreground",
          )}
        >
          <Icon className="h-3 w-3" />
        </span>
      )}
    </span>
  );
}

export function ThongBaoList() {
  const { data, isLoading } = useThongBao();
  const anhThongBao = useAnhThongBao(data);
  const danhDau = useDanhDauDaDoc();
  const navigate = useNavigate();

  const open = async (n: ThongBaoCuaToi) => {
    if (!n.DaDoc) await danhDau.mutateAsync(n.MaThongBao);
    if (n.DuongDan) navigate(diemDenThongBao(n.DuongDan) as never);
  };

  return (
    <Page
      title="Thông báo"
      actions={
        data?.some((n) => !n.DaDoc) ? (
          <Button variant="outline" onClick={() => danhDau.mutate(undefined)}>
            Đánh dấu đã đọc tất cả
          </Button>
        ) : undefined
      }
    >
      {isLoading ? (
        <GridSkeleton n={3} />
      ) : data?.length ? (
        <div className="space-y-2">
          {data.map((n) => {
            return (
              <button
                key={n.MaThongBao}
                onClick={() => open(n)}
                className={cn(
                  "flex w-full items-center gap-4 rounded-xl border bg-card p-4 text-left transition hover:border-primary hover:shadow-sm",
                  !n.DaDoc && "border-l-4 border-l-accent bg-accent/5",
                )}
              >
                <AnhThuNho n={n} anh={anhThongBao.get(n.MaThongBao)} />
                {!n.DaDoc && (
                  <span className="order-last mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-destructive" aria-label="Chưa đọc" />
                )}
                <span className="block min-w-0 flex-1">
                  <NoiDungThongBao n={n} />
                  <span className="mt-1.5 block text-xs font-semibold text-muted-foreground">
                    {formatDateTime(n.ThoiGianTao)}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <Empty text="Bạn chưa có thông báo nào" />
      )}
    </Page>
  );
}

/** Nội dung một thông báo: nhãn ngắn, câu mô tả, tiêu đề bài viết tách riêng một dòng – không lặp chữ. */
export function NoiDungThongBao({ n, gon = false }: { n: ThongBaoCuaToi; gon?: boolean }) {
  const t = phanTichThongBao(n);
  return (
    <span className="block min-w-0">
      {t.nhan && (
        <span className={cn("block text-xs font-extrabold uppercase tracking-wide", n.DaDoc ? "text-muted-foreground" : "text-primary")}>
          {t.nhan}
        </span>
      )}
      <span className={cn("block text-sm", t.nhan && "mt-0.5", !n.DaDoc && !t.trich && "font-bold", gon && "line-clamp-2")}>
        {t.truoc}
        {t.sau && ` ${t.sau}`}
      </span>
      {t.trich && (
        <span className={cn("mt-0.5 block text-sm", gon ? "line-clamp-1" : "line-clamp-2", !n.DaDoc && "font-bold")}>
          “{t.trich}”
        </span>
      )}
    </span>
  );
}

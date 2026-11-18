import { useNavigate } from "@tanstack/react-router";
import { Bell, BellRing, CalendarCheck, FileCheck2, Info } from "lucide-react";
import {
  formatDateTime,
  useDanhDauDaDoc,
  useThongBao,
  type LoaiThongBao,
  type ThongBaoCuaToi,
} from "@/lib/data";
import { Empty, GridSkeleton, Page } from "@/components/common";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Trang danh sách thông báo dùng chung cho khu Sinh viên (/thong-bao) và Quản trị (/admin/thong-bao). */

/**
 * Thông báo trong CSDL gồm TieuDe (nhãn ngắn, VD "Bài đăng mới chờ duyệt") và NoiDung (chi tiết).
 * Thông báo cũ chuyển từ lược đồ trước có TieuDe = NoiDung nên trước đây bị hiện lặp 2 lần.
 * Hàm này trả về: nhãn (chỉ khi khác nội dung) + nội dung chính tách phần trong ngoặc kép.
 */
export function phanTichThongBao(n: Pick<ThongBaoCuaToi, "TieuDe" | "NoiDung">) {
  const chuan = (x: string) => x.replace(/\s+/g, " ").trim().toLowerCase();
  const chinh = (n.NoiDung || n.TieuDe).trim();
  const nhan = chuan(n.TieuDe) && !chuan(chinh).includes(chuan(n.TieuDe)) ? n.TieuDe : null;
  const m = chinh.match(/^(.*?)"(.+)"(.*)$/s);
  return m
    ? { nhan, truoc: m[1]!.trim(), trich: m[2]!.trim(), sau: m[3]!.trim().replace(/^[.,:]\s*/, "") }
    : { nhan, truoc: chinh, trich: null as string | null, sau: "" };
}

const ICON: Record<LoaiThongBao, typeof Bell> = {
  DuyetBaiDang: FileCheck2,
  CLBCapNhat: BellRing,
  YeuCauCapNhat: CalendarCheck,
  HeThong: Info,
};

export function ThongBaoList() {
  const { data, isLoading } = useThongBao();
  const danhDau = useDanhDauDaDoc();
  const navigate = useNavigate();

  const open = async (n: ThongBaoCuaToi) => {
    if (!n.DaDoc) await danhDau.mutateAsync(n.MaThongBao);
    if (n.DuongDan) navigate({ to: n.DuongDan });
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
            const Icon = ICON[n.LoaiThongBao] ?? Bell;
            return (
              <button
                key={n.MaThongBao}
                onClick={() => open(n)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-xl border bg-card p-4 text-left transition hover:border-primary hover:shadow-sm",
                  !n.DaDoc && "border-l-4 border-l-accent bg-accent/5",
                )}
              >
                <Icon
                  className={cn(
                    "mt-0.5 h-5 w-5 shrink-0",
                    n.DaDoc ? "text-muted-foreground" : "text-accent",
                  )}
                />
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

import { useState } from "react";
import { MessageCircle, Send, Trash2 } from "lucide-react";
import { useAuth, NHAN_VAI_TRO, type TenVaiTro } from "@/lib/auth";
import {
  formatDateTime,
  useBinhLuan,
  useGuiBinhLuan,
  useXoaBinhLuan,
  type BinhLuan,
} from "@/lib/data";
import { ConfirmDialog } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

const TOI_DA = 1000;

/**
 * Bình luận dưới bài viết (bảng binh_luan, migration 0009).
 * - Ai cũng đọc được bình luận của bài đã duyệt.
 * - Phải đăng nhập mới gửi được; tài khoản bị khóa bị CSDL chặn.
 * - Người viết, Đại diện CLB của bài và Quản trị viên xóa được (CSDL kiểm tra quyền).
 */
export function KhuBinhLuan({ maBaiDang, choPhepGui }: { maBaiDang: number; choPhepGui: boolean }) {
  const { maNguoiDung, requireLogin, biKhoa } = useAuth();
  const { data, isLoading, isError } = useBinhLuan(maBaiDang);
  const gui = useGuiBinhLuan(maBaiDang);
  const xoa = useXoaBinhLuan(maBaiDang);
  const [noiDung, setNoiDung] = useState("");
  const [canXoa, setCanXoa] = useState<BinhLuan | null>(null);
  const ds = data ?? [];
  const rong = !noiDung.trim();

  // CSDL chưa có chức năng bình luận (chưa chạy migration 0009): ẩn khu bình luận
  if (isError) return null;

  return (
    <section aria-labelledby="binh-luan" className="mt-8 rounded-3xl border bg-card p-5 sm:p-8">
      <h2 id="binh-luan" className="flex items-center gap-2 text-lg">
        <MessageCircle className="h-5 w-5 text-primary" />
        Bình luận
        {ds.length > 0 && (
          <span className="text-sm font-bold text-muted-foreground">({ds.length})</span>
        )}
      </h2>

      {choPhepGui &&
        (maNguoiDung ? (
          <form
            className="mt-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (rong || gui.isPending) return;
              gui.mutate(noiDung, { onSuccess: () => setNoiDung("") });
            }}
          >
            <Label htmlFor="noi-dung-binh-luan">Viết bình luận</Label>
            <Textarea
              id="noi-dung-binh-luan"
              className="mt-1.5 min-h-[88px]"
              value={noiDung}
              maxLength={TOI_DA}
              disabled={biKhoa}
              onChange={(e) => setNoiDung(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey))
                  e.currentTarget.form?.requestSubmit();
              }}
            />
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="text-xs font-semibold text-muted-foreground">
                {biKhoa
                  ? "Tài khoản đang bị khóa nên không bình luận được."
                  : `${noiDung.length}/${TOI_DA} ký tự`}
              </span>
              <Button
                type="submit"
                size="sm"
                className="font-bold"
                disabled={rong || gui.isPending || biKhoa}
              >
                <Send className="h-4 w-4" />
                {gui.isPending ? "Đang gửi…" : "Gửi bình luận"}
              </Button>
            </div>
          </form>
        ) : (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-secondary p-4">
            <span className="text-sm font-semibold">
              Đăng nhập bằng email trường để tham gia bình luận.
            </span>
            <Button size="sm" className="font-bold" onClick={requireLogin}>
              Đăng nhập để bình luận
            </Button>
          </div>
        ))}

      <div className="mt-6">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : ds.length === 0 ? (
          <p className="text-sm font-semibold text-muted-foreground">
            {choPhepGui
              ? "Chưa có bình luận nào. Hãy là người đầu tiên chia sẻ ý kiến."
              : "Chưa có bình luận nào."}
          </p>
        ) : (
          <ul className="divide-y">
            {ds.map((b) => (
              <li key={b.MaBinhLuan} className="flex gap-3 py-4 first:pt-0">
                <span
                  aria-hidden
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-sm font-extrabold text-primary-foreground"
                >
                  {b.HoTen.trim().split(/\s+/).pop()?.[0]?.toUpperCase() ?? "?"}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-bold">{b.HoTen}</span>
                    {b.VaiTro !== "SinhVien" && (
                      <span className="rounded-full bg-secondary px-2 text-xs font-bold text-secondary-foreground">
                        {NHAN_VAI_TRO[b.VaiTro as TenVaiTro] ?? b.VaiTro}
                      </span>
                    )}
                    <span className="text-xs font-semibold text-muted-foreground">
                      {formatDateTime(b.ThoiGianTao)}
                    </span>
                  </div>
                  <p className="mt-1 whitespace-pre-line break-words text-sm leading-relaxed">
                    {b.NoiDung}
                  </p>
                </div>
                {b.CoTheXoa && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                    aria-label={`Xóa bình luận của ${b.HoTen}`}
                    title="Xóa bình luận"
                    onClick={() => setCanXoa(b)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={!!canXoa}
        onOpenChange={(o) => !o && setCanXoa(null)}
        title={
          canXoa?.CuaToi ? "Xóa bình luận của bạn?" : `Xóa bình luận của ${canXoa?.HoTen ?? ""}?`
        }
        description="Bình luận sẽ bị xóa vĩnh viễn và không khôi phục được."
        confirmText="Xóa bình luận"
        destructive
        onConfirm={() => canXoa && xoa.mutate(canXoa.MaBinhLuan)}
      />
    </section>
  );
}

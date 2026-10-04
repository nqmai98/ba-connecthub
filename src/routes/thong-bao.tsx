import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { formatDateTime, useNotifications } from "@/lib/data";
import { Empty, GridSkeleton, Page, RoleGate } from "@/components/common";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/thong-bao")({
  head: () => ({
    meta: [
      { title: "Thông báo – BA CLUBS" },
      { name: "description", content: "Thông báo mới từ các câu lạc bộ và hệ thống." },
      { property: "og:title", content: "Thông báo – BA CLUBS" },
      { property: "og:description", content: "Thông báo mới từ các câu lạc bộ và hệ thống." },
    ],
  }),
  component: () => <RoleGate><Notifs /></RoleGate>,
});

function Notifs() {
  const { data, isLoading } = useNotifications();
  const { userId } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const markAll = async () => {
    const { error } = await supabase.from("notifications").update({ is_read: true }).eq("user_id", userId!).eq("is_read", false);
    if (error) { toast.error("Không cập nhật được thông báo"); return; }
    toast.success("Đã đánh dấu tất cả là đã đọc");
    qc.invalidateQueries({ queryKey: ["notifications"] });
  };
  const open = async (n: { id: string; link: string | null; is_read: boolean }) => {
    if (!n.is_read) {
      await supabase.from("notifications").update({ is_read: true }).eq("id", n.id);
      qc.invalidateQueries({ queryKey: ["notifications"] });
    }
    if (n.link) navigate({ to: n.link });
  };
  return (
    <Page title="Thông báo" actions={data?.some((n) => !n.is_read) && <Button variant="outline" onClick={markAll}>Đánh dấu đã đọc tất cả</Button>}>
      {isLoading ? <GridSkeleton n={3} /> : data?.length ? (
        <div className="space-y-2">
          {data.map((n) => (
            <button key={n.id} onClick={() => open(n)} className={cn("flex w-full items-start gap-3 rounded-xl border bg-card p-4 text-left hover:border-primary", !n.is_read && "border-l-4 border-l-accent")}>
              <Bell className={cn("mt-0.5 h-5 w-5 shrink-0", n.is_read ? "text-muted-foreground" : "text-accent")} />
              <div className="min-w-0">
                <p className={cn("text-sm", !n.is_read && "font-bold")}>{n.content}</p>
                <p className="mt-1 text-xs font-semibold text-muted-foreground">{formatDateTime(n.created_at)}</p>
              </div>
            </button>
          ))}
        </div>
      ) : <Empty text="Bạn chưa có thông báo nào" />}
    </Page>
  );
}

import { type ReactNode } from "react";
import { Link, Navigate } from "@tanstack/react-router";
import { Calendar, MapPin, Star, Users, Inbox } from "lucide-react";
import { useAuth, type Role } from "@/lib/auth";
import { STATUS_LABEL, formatDateTime, type Club, type Post, useFavorites, useFollows, useToggleFavorite, useToggleFollow } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function Page({ title, subtitle, actions, children }: { title: string; subtitle?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <main className="mx-auto max-w-7xl px-3 py-6 sm:px-6 sm:py-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl text-foreground sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-1 text-sm font-medium text-muted-foreground">{subtitle}</p>}
        </div>
        {actions}
      </div>
      {children}
    </main>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded-2xl border bg-card p-5 shadow-[var(--shadow-soft)]", className)}>{children}</div>;
}

export function Empty({ text, action }: { text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed bg-card px-6 py-12 text-center">
      <Inbox className="h-10 w-10 text-muted-foreground/60" />
      <p className="font-semibold text-muted-foreground">{text}</p>
      {action}
    </div>
  );
}

export function GridSkeleton({ n = 6 }: { n?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: n }).map((_, i) => (
        <Skeleton key={i} className="h-48 rounded-2xl" />
      ))}
    </div>
  );
}

export function StatusBadge({ status }: { status: Post["status"] }) {
  const cls = {
    pending: "bg-warning text-warning-foreground",
    approved: "bg-success text-success-foreground",
    rejected: "bg-destructive text-destructive-foreground",
  }[status];
  return <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-bold", cls)}>{STATUS_LABEL[status]}</span>;
}

export function ClubLogo({ club, size = 56 }: { club: Pick<Club, "name" | "logo_url">; size?: number }) {
  if (club.logo_url)
    return <img src={club.logo_url} alt={club.name} style={{ width: size, height: size }} className="shrink-0 rounded-xl border object-cover" />;
  const initials = club.name.replace(/^CLB\s*/i, "").split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  return (
    <div style={{ width: size, height: size }} className="grid shrink-0 place-items-center rounded-xl bg-primary text-lg font-extrabold text-primary-foreground">
      {initials}
    </div>
  );
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "Xác nhận",
  onConfirm,
  destructive,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description?: string;
  confirmText?: string;
  onConfirm: () => void;
  destructive?: boolean;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Hủy</AlertDialogCancel>
          <AlertDialogAction
            className={destructive ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
            onClick={onConfirm}
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function FollowButton({ clubId, className }: { clubId: string; className?: string }) {
  const { userId, requireLogin } = useAuth();
  const { data: follows } = useFollows();
  const toggle = useToggleFollow();
  const [confirm, setConfirm] = useState(false);
  const following = follows?.has(clubId);
  return (
    <>
      <Button
        size="sm"
        variant={following ? "outline" : "default"}
        className={cn(!following && "bg-accent font-bold text-accent-foreground hover:bg-accent/90", "font-bold", className)}
        disabled={toggle.isPending}
        onClick={() => {
          if (!userId) return requireLogin();
          if (following) setConfirm(true);
          else toggle.mutate({ clubId, follow: true });
        }}
      >
        <Users className="h-4 w-4" />
        {following ? "Đang theo dõi" : "Theo dõi"}
      </Button>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Bỏ theo dõi"
        description="Bạn có chắc chắn muốn bỏ theo dõi câu lạc bộ này?"
        confirmText="Bỏ theo dõi"
        destructive
        onConfirm={() => toggle.mutate({ clubId, follow: false })}
      />
    </>
  );
}

export function FavoriteButton({ postId }: { postId: string }) {
  const { userId, requireLogin } = useAuth();
  const { data: favs } = useFavorites();
  const toggle = useToggleFavorite();
  const [confirm, setConfirm] = useState(false);
  const fav = favs?.some((p) => p.id === postId);
  return (
    <>
      <Button
        size="sm"
        variant="outline"
        aria-label={fav ? "Bỏ yêu thích" : "Yêu thích"}
        className={cn("font-bold", fav && "border-accent bg-accent/15")}
        disabled={toggle.isPending}
        onClick={() => {
          if (!userId) return requireLogin();
          if (fav) setConfirm(true);
          else toggle.mutate({ postId, fav: true });
        }}
      >
        <Star className={cn("h-4 w-4", fav && "fill-accent text-accent")} />
        {fav ? "Đã yêu thích" : "Yêu thích"}
      </Button>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Bỏ yêu thích sự kiện"
        description="Sự kiện sẽ bị xóa khỏi lịch cá nhân của bạn. Bạn có chắc chắn?"
        confirmText="Bỏ yêu thích"
        destructive
        onConfirm={() => toggle.mutate({ postId, fav: false })}
      />
    </>
  );
}

export function ClubCard({ club }: { club: Club }) {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <ClubLogo club={club} />
        <div className="min-w-0">
          <h3 className="line-clamp-2 text-base leading-snug">{club.name}</h3>
          <span className="mt-1 inline-block rounded-full bg-secondary px-2 py-0.5 text-xs font-bold text-secondary-foreground">
            {club.categories?.name ?? "Khác"}
          </span>
        </div>
      </div>
      <p className="line-clamp-2 flex-1 text-sm text-muted-foreground">{club.short_intro || club.description}</p>
      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm" variant="outline" className="font-bold">
          <Link to="/cau-lac-bo/$id" params={{ id: club.id }}>Xem chi tiết</Link>
        </Button>
        <FollowButton clubId={club.id} />
      </div>
    </Card>
  );
}

export function EventCard({ post }: { post: Post }) {
  return (
    <Card className="flex flex-col gap-3 p-0 overflow-hidden">
      {post.image_url && <img src={post.image_url} alt={post.title} className="h-40 w-full object-cover" loading="lazy" />}
      <div className="flex flex-1 flex-col gap-2 p-5 pt-4">
        {post.clubs && (
          <Link to="/cau-lac-bo/$id" params={{ id: post.clubs.id }} className="text-xs font-bold text-primary hover:underline">
            {post.clubs.name}
          </Link>
        )}
        <h3 className="text-base leading-snug">{post.title}</h3>
        <div className="space-y-1 text-sm font-semibold text-muted-foreground">
          <div className="flex items-center gap-2"><Calendar className="h-4 w-4 shrink-0 text-accent" />{formatDateTime(post.event_time)}</div>
          {post.location && <div className="flex items-center gap-2"><MapPin className="h-4 w-4 shrink-0 text-accent" />{post.location}</div>}
        </div>
        <div className="mt-auto pt-2"><FavoriteButton postId={post.id} /></div>
      </div>
    </Card>
  );
}

export function RoleGate({ roles, children }: { roles?: Role[]; children: ReactNode }) {
  const { ready, userId, roles: mine } = useAuth();
  if (!ready)
    return (
      <main className="mx-auto max-w-7xl space-y-4 px-3 py-8 sm:px-6">
        <Skeleton className="h-10 w-64" />
        <GridSkeleton n={3} />
      </main>
    );
  if (!userId) return <Navigate to="/dang-nhap" />;
  if (roles && !roles.some((r) => mine.includes(r)))
    return (
      <main className="mx-auto max-w-xl px-4 py-16">
        <Empty text="Bạn không có quyền truy cập trang này." action={<Button asChild><Link to="/">Về trang chủ</Link></Button>} />
      </main>
    );
  return <>{children}</>;
}

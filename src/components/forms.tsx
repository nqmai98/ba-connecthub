import { useState } from "react";
import { toast } from "sonner";
import { ImagePlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { uploadImage, useCategories, type Club, type Post } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/common";
import { cn } from "@/lib/utils";

function ImageField({ label, value, onChange }: { label: string; value: string | null; onChange: (v: string) => void }) {
  const { userId } = useAuth();
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex items-center gap-3">
        {value ? <img src={value} alt="" className="h-20 w-28 rounded-xl border object-cover" /> : <div className="grid h-20 w-28 place-items-center rounded-xl border border-dashed text-muted-foreground"><ImagePlus className="h-6 w-6" /></div>}
        <label className="cursor-pointer rounded-xl border px-3 py-2 text-sm font-bold hover:bg-muted">
          {busy ? "Đang tải..." : "Chọn ảnh"}
          <input type="file" accept="image/*" className="hidden" disabled={busy} onChange={async (e) => {
            const f = e.target.files?.[0]; if (!f || !userId) return;
            setBusy(true);
            try { onChange(await uploadImage(f, userId)); toast.success("Đã tải ảnh lên"); }
            catch (err) { toast.error((err as Error).message || "Tải ảnh thất bại"); }
            finally { setBusy(false); e.target.value = ""; }
          }} />
        </label>
      </div>
    </div>
  );
}

const toLocal = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");

export function PostForm({ clubId, initial, onDone, onCancel }: { clubId: string; initial?: Post; onDone: () => void; onCancel: () => void }) {
  const [f, setF] = useState({
    type: initial?.type ?? ("news" as Post["type"]),
    title: initial?.title ?? "",
    content: initial?.content ?? "",
    image_url: initial?.image_url ?? null,
    event_time: toLocal(initial?.event_time ?? null),
    location: initial?.location ?? "",
  });
  const [errs, setErrs] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const submit = async () => {
    const e: Record<string, boolean> = {
      title: !f.title.trim(),
      content: !f.content.trim(),
      event_time: f.type === "event" && !f.event_time,
      location: f.type === "event" && !f.location.trim(),
    };
    setErrs(e);
    if (Object.values(e).some(Boolean)) { toast.error("Vui lòng điền đầy đủ các trường bắt buộc"); return; }
    setBusy(true);
    const row = {
      type: f.type,
      title: f.title.trim().slice(0, 200),
      content: f.content.trim().slice(0, 10000),
      image_url: f.image_url,
      event_time: f.type === "event" ? new Date(f.event_time).toISOString() : null,
      location: f.type === "event" ? f.location.trim().slice(0, 200) : null,
      status: "pending" as const,
      reject_reason: null,
    };
    const r = initial
      ? await supabase.from("posts").update({ ...row, updated_at: new Date().toISOString() }).eq("id", initial.id)
      : await supabase.from("posts").insert({ ...row, club_id: clubId });
    setBusy(false);
    if (r.error) { toast.error("Gửi bài thất bại: " + r.error.message); return; }
    toast.success("Gửi bài thành công, bài đăng đang chờ duyệt");
    onDone();
  };

  const err = (k: string) => (errs[k] ? "border-destructive ring-1 ring-destructive" : "");
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Loại bài</Label>
        <div className="flex gap-2">
          {(["news", "event"] as const).map((t) => (
            <button key={t} type="button" onClick={() => setF({ ...f, type: t })} className={cn("rounded-xl border px-4 py-2 text-sm font-bold", f.type === t ? "bg-primary text-primary-foreground" : "bg-card")}>
              {t === "news" ? "Tin tức" : "Sự kiện"}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-1.5"><Label>Tiêu đề *</Label><Input className={err("title")} maxLength={200} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
      <div className="space-y-1.5"><Label>Nội dung *</Label><Textarea className={err("content")} rows={7} maxLength={10000} value={f.content} onChange={(e) => setF({ ...f, content: e.target.value })} /></div>
      {f.type === "event" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5"><Label>Thời gian *</Label><Input className={err("event_time")} type="datetime-local" value={f.event_time} onChange={(e) => setF({ ...f, event_time: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Địa điểm *</Label><Input className={err("location")} maxLength={200} value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} /></div>
        </div>
      )}
      <ImageField label="Hình ảnh" value={f.image_url} onChange={(v) => setF({ ...f, image_url: v })} />
      {Object.values(errs).some(Boolean) && <p className="text-sm font-semibold text-destructive">Các trường đánh dấu đỏ là bắt buộc.</p>}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => setConfirmCancel(true)}>Hủy</Button>
        <Button disabled={busy} onClick={submit} className="bg-accent font-bold text-accent-foreground hover:bg-accent/90">{busy ? "Đang gửi..." : "Gửi duyệt"}</Button>
      </div>
      <ConfirmDialog open={confirmCancel} onOpenChange={setConfirmCancel} title="Hủy bài đăng?" description="Nội dung bạn đã nhập sẽ không được lưu." confirmText="Hủy bài" destructive onConfirm={onCancel} />
    </div>
  );
}

export type ClubDraft = Omit<Club, "id" | "categories"> & { id?: string };
export const emptyClub: ClubDraft = { name: "", category_id: null, short_intro: "", description: "", founded_year: null, departments: "", achievements: "", contact_email: "", contact_info: "", logo_url: null, cover_url: null, is_featured: false, is_active: true };

export function ClubForm({ initial, onSaved, admin }: { initial: ClubDraft; onSaved: () => void; admin?: boolean }) {
  const { data: cats } = useCategories();
  const [f, setF] = useState<ClubDraft>(initial);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof ClubDraft, v: unknown) => setF({ ...f, [k]: v });
  const save = async () => {
    if (!f.name.trim()) { toast.error("Vui lòng nhập tên CLB"); return; }
    setBusy(true);
    const { id, ...row } = f;
    const payload = { ...row, name: row.name.trim() };
    if (!admin) { delete (payload as Partial<ClubDraft>).is_active; delete (payload as Partial<ClubDraft>).is_featured; }
    const r = id ? await supabase.from("clubs").update(payload).eq("id", id) : await supabase.from("clubs").insert(payload);
    setBusy(false);
    if (r.error) { toast.error("Lưu thất bại: " + r.error.message); return; }
    toast.success("Đã lưu thông tin CLB");
    onSaved();
  };
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5"><Label>Tên CLB *</Label><Input maxLength={150} value={f.name} onChange={(e) => set("name", e.target.value)} /></div>
        <div className="space-y-1.5">
          <Label>Lĩnh vực</Label>
          <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={f.category_id ?? ""} onChange={(e) => set("category_id", e.target.value || null)}>
            <option value="">-- Chọn --</option>
            {cats?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="space-y-1.5"><Label>Năm thành lập</Label><Input type="number" value={f.founded_year ?? ""} onChange={(e) => set("founded_year", e.target.value ? Number(e.target.value) : null)} /></div>
        <div className="space-y-1.5"><Label>Email liên hệ</Label><Input maxLength={255} value={f.contact_email} onChange={(e) => set("contact_email", e.target.value)} /></div>
      </div>
      <div className="space-y-1.5"><Label>Giới thiệu ngắn</Label><Input maxLength={300} value={f.short_intro} onChange={(e) => set("short_intro", e.target.value)} /></div>
      <div className="space-y-1.5"><Label>Giới thiệu chi tiết</Label><Textarea rows={5} maxLength={5000} value={f.description} onChange={(e) => set("description", e.target.value)} /></div>
      <div className="space-y-1.5"><Label>Ban chuyên môn</Label><Textarea rows={2} maxLength={2000} value={f.departments} onChange={(e) => set("departments", e.target.value)} /></div>
      <div className="space-y-1.5"><Label>Thành tích nổi bật</Label><Textarea rows={3} maxLength={3000} value={f.achievements} onChange={(e) => set("achievements", e.target.value)} /></div>
      <div className="space-y-1.5"><Label>Thông tin liên hệ khác</Label><Input maxLength={500} value={f.contact_info} onChange={(e) => set("contact_info", e.target.value)} /></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <ImageField label="Logo" value={f.logo_url} onChange={(v) => set("logo_url", v)} />
        <ImageField label="Ảnh minh họa" value={f.cover_url} onChange={(v) => set("cover_url", v)} />
      </div>
      {admin && (
        <div className="flex flex-wrap gap-5 text-sm font-semibold">
          <label className="flex items-center gap-2"><input type="checkbox" checked={f.is_active} onChange={(e) => set("is_active", e.target.checked)} /> Hiển thị công khai</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={f.is_featured} onChange={(e) => set("is_featured", e.target.checked)} /> CLB nổi bật</label>
        </div>
      )}
      <div className="flex justify-end"><Button disabled={busy} onClick={save} className="bg-primary font-bold">{busy ? "Đang lưu..." : "Lưu thay đổi"}</Button></div>
    </div>
  );
}

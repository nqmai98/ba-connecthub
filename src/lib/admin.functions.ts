import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const schema = z.object({
  clubId: z.string().uuid(),
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(72),
  fullName: z.string().trim().min(1).max(100),
});

export const createClubAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => schema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Bạn không có quyền thực hiện thao tác này");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email.toLowerCase(),
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName },
      app_metadata: { created_by_admin: true, club_id: data.clubId },
    });
    if (error || !created.user)
      throw new Error(error?.message.includes("registered") ? "Email này đã có tài khoản" : "Tạo tài khoản thất bại (email phải có đuôi @hvnh.edu.vn hoặc @clb.baclubs.local)");
    const uid = created.user.id;
    await supabaseAdmin.from("user_roles").upsert({ user_id: uid, role: "club_rep" }, { onConflict: "user_id,role" });
    await supabaseAdmin.from("user_roles").delete().eq("user_id", uid).eq("role", "student");
    const { error: e2 } = await supabaseAdmin.from("club_reps").upsert({ user_id: uid, club_id: data.clubId }, { onConflict: "user_id,club_id" });
    if (e2) throw new Error("Đã tạo tài khoản nhưng gán CLB thất bại: " + e2.message);
    return { ok: true };
  });

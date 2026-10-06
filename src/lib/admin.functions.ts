import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { USERNAME_HINT, USERNAME_REGEX, usernameToEmail } from "@/lib/club-account";

const schema = z.object({
  // Có clubId: cấp tài khoản cho CLB đã tồn tại. Không có: tạo CLB mới từ clubName.
  clubId: z.string().uuid().optional(),
  clubName: z.string().trim().min(2, "Vui lòng nhập tên đầy đủ CLB").max(150),
  username: z.string().trim().toLowerCase().regex(USERNAME_REGEX, "Username không hợp lệ: " + USERNAME_HINT),
  password: z.string().min(8, "Mật khẩu tối thiểu 8 ký tự").max(72),
});

export const createClubAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => schema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Bạn không có quyền thực hiện thao tác này");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const taken = await supabaseAdmin.from("profiles").select("id").eq("username", data.username).maybeSingle();
    if (taken.data) throw new Error("Username này đã tồn tại");

    let clubId = data.clubId;
    let createdClub = false;
    if (clubId) {
      const c = await supabaseAdmin.from("clubs").select("id").eq("id", clubId).maybeSingle();
      if (!c.data) throw new Error("Không tìm thấy câu lạc bộ");
    } else {
      const dup = await supabaseAdmin.from("clubs").select("id").eq("name", data.clubName).maybeSingle();
      if (dup.data) throw new Error("Đã có CLB trùng tên. Hãy cấp tài khoản từ danh sách CLB bên dưới");
      const ins = await supabaseAdmin.from("clubs").insert({ name: data.clubName }).select("id").single();
      if (ins.error || !ins.data) throw new Error("Tạo CLB thất bại: " + (ins.error?.message ?? ""));
      clubId = ins.data.id;
      createdClub = true;
    }

    const { error } = await supabaseAdmin.auth.admin.createUser({
      email: usernameToEmail(data.username),
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.clubName, username: data.username },
      app_metadata: { created_by_admin: true, club_id: clubId },
    });
    if (error) {
      // Không để lại CLB "mồ côi" nếu tạo tài khoản thất bại
      if (createdClub && clubId) await supabaseAdmin.from("clubs").delete().eq("id", clubId);
      const m = error.message.toLowerCase();
      if (m.includes("registered") || m.includes("already")) throw new Error("Username này đã tồn tại");
      if (m.includes("invalid") && m.includes("email"))
        throw new Error("Hệ thống từ chối email nội bộ của username. Hãy đổi CLUB_EMAIL_DOMAIN trong src/lib/club-account.ts sang tên miền hợp lệ");
      throw new Error("Tạo tài khoản thất bại: " + error.message);
    }
    return { ok: true as const, clubId: clubId! };
  });

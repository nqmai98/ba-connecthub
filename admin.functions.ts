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

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: usernameToEmail(data.username),
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.clubName },
    });
    const removeClubIfNew = async () => {
      if (createdClub && clubId) await supabaseAdmin.from("clubs").delete().eq("id", clubId);
    };
    if (error || !created?.user) {
      await removeClubIfNew();
      const m = (error?.message ?? "").toLowerCase();
      if (m.includes("registered") || m.includes("already")) throw new Error("Username này đã tồn tại");
      throw new Error("Tạo tài khoản thất bại: " + (error?.message ?? "không rõ nguyên nhân"));
    }

    // Gán vai trò CLB sau khi user đã tồn tại (trigger chỉ tạo profile + vai trò student)
    const uid = created.user.id;
    const steps = [
      await supabaseAdmin.from("profiles").update({ username: data.username, full_name: data.clubName }).eq("id", uid),
      await supabaseAdmin.from("user_roles").insert({ user_id: uid, role: "club_rep" }),
      await supabaseAdmin.from("club_reps").insert({ user_id: uid, club_id: clubId! }),
      await supabaseAdmin.from("user_roles").delete().eq("user_id", uid).eq("role", "student"),
    ];
    const failed = steps.find((s) => s.error);
    if (failed?.error) {
      // Hoàn tác để không để lại tài khoản dở dang
      await supabaseAdmin.from("club_reps").delete().eq("user_id", uid);
      await supabaseAdmin.from("user_roles").delete().eq("user_id", uid);
      await supabaseAdmin.from("profiles").delete().eq("id", uid);
      await supabaseAdmin.auth.admin.deleteUser(uid);
      await removeClubIfNew();
      throw new Error("Gán quyền cho tài khoản CLB thất bại: " + failed.error.message);
    }
    return { ok: true as const, clubId: clubId! };
  });

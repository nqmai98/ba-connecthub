import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { USERNAME_HINT, USERNAME_REGEX, usernameToEmail } from "@/lib/club-account";

const schema = z.object({
  // Có maCLB: cấp tài khoản cho CLB đã tồn tại. Không có: tạo CLB mới từ clubName.
  maCLB: z.number().int().positive().optional(),
  clubName: z.string().trim().min(2, "Vui lòng nhập tên đầy đủ CLB").max(255),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(USERNAME_REGEX, "Username không hợp lệ: " + USERNAME_HINT),
  password: z.string().min(8, "Mật khẩu tối thiểu 8 ký tự").max(72),
  emailLienHe: z
    .string()
    .trim()
    .toLowerCase()
    .email("Email liên hệ không hợp lệ")
    .max(255)
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export const createClubAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => schema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("la_quan_tri_vien", {
      _ma_nguoi_dung: context.userId,
    });
    if (!isAdmin) throw new Error("Bạn không có quyền thực hiện thao tác này");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const taken = await supabaseAdmin
      .from("nguoi_dung")
      .select("MaNguoiDung")
      .eq("TenDangNhap", data.username)
      .maybeSingle();
    if (taken.data) throw new Error("Username này đã tồn tại");

    let maCLB = data.maCLB;
    let createdClub = false;
    if (maCLB) {
      const c = await supabaseAdmin
        .from("cau_lac_bo")
        .select("MaCLB")
        .eq("MaCLB", maCLB)
        .maybeSingle();
      if (!c.data) throw new Error("Không tìm thấy câu lạc bộ");
      // Quan hệ 1–1: một CLB chỉ có một tài khoản đại diện
      const daCo = await supabaseAdmin
        .from("nguoi_dung")
        .select("MaNguoiDung")
        .eq("MaCLB", maCLB)
        .maybeSingle();
      if (daCo.data) throw new Error("Câu lạc bộ này đã có tài khoản đại diện");
    } else {
      const dup = await supabaseAdmin
        .from("cau_lac_bo")
        .select("MaCLB")
        .eq("TenCLB", data.clubName)
        .maybeSingle();
      if (dup.data)
        throw new Error("Đã có CLB trùng tên. Hãy cấp tài khoản từ danh sách CLB bên dưới");

      // MaLinhVuc NOT NULL: CLB mới tạo nhanh được gán lĩnh vực "Khác", Quản trị viên sửa lại sau
      const lv = await supabaseAdmin
        .from("linh_vuc")
        .select("MaLinhVuc")
        .eq("TenLinhVuc", "Khác")
        .maybeSingle();
      let maLinhVuc = lv.data?.MaLinhVuc;
      if (!maLinhVuc) {
        const tao = await supabaseAdmin
          .from("linh_vuc")
          .insert({ TenLinhVuc: "Khác" })
          .select("MaLinhVuc")
          .single();
        if (tao.error || !tao.data) throw new Error("Không tạo được lĩnh vực mặc định");
        maLinhVuc = tao.data.MaLinhVuc;
      }

      const ins = await supabaseAdmin
        .from("cau_lac_bo")
        .insert({ TenCLB: data.clubName, MaLinhVuc: maLinhVuc })
        .select("MaCLB")
        .single();
      if (ins.error || !ins.data)
        throw new Error("Tạo CLB thất bại: " + (ins.error?.message ?? ""));
      maCLB = ins.data.MaCLB;
      createdClub = true;
    }

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: usernameToEmail(data.username),
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.clubName },
    });

    const removeClubIfNew = async () => {
      if (createdClub && maCLB) await supabaseAdmin.from("cau_lac_bo").delete().eq("MaCLB", maCLB);
    };
    if (error || !created?.user) {
      await removeClubIfNew();
      const m = (error?.message ?? "").toLowerCase();
      if (m.includes("registered") || m.includes("already"))
        throw new Error("Username này đã tồn tại");
      throw new Error("Tạo tài khoản thất bại: " + (error?.message ?? "không rõ nguyên nhân"));
    }

    // Trigger chỉ tạo nguoi_dung với vai trò SinhVien; gán vai trò và CLB sau khi user tồn tại
    const uid = created.user.id;
    const vaiTro = await supabaseAdmin
      .from("vai_tro")
      .select("MaVaiTro")
      .eq("TenVaiTro", "DaiDienCLB")
      .maybeSingle();
    if (!vaiTro.data) {
      await supabaseAdmin.auth.admin.deleteUser(uid);
      await removeClubIfNew();
      throw new Error("Thiếu vai trò DaiDienCLB trong bảng vai_tro");
    }

    const capNhat = await supabaseAdmin
      .from("nguoi_dung")
      .update({
        TenDangNhap: data.username,
        HoTen: data.clubName,
        MaVaiTro: vaiTro.data.MaVaiTro,
        MaCLB: maCLB!,
      })
      .eq("MaNguoiDung", uid);

    if (capNhat.error) {
      // Hoàn tác để không để lại tài khoản dở dang
      await supabaseAdmin.from("nguoi_dung").delete().eq("MaNguoiDung", uid);
      await supabaseAdmin.auth.admin.deleteUser(uid);
      await removeClubIfNew();
      throw new Error("Gán quyền cho tài khoản CLB thất bại: " + capNhat.error.message);
    }
    if (data.emailLienHe) {
      await supabaseAdmin.from("cau_lac_bo").update({ EmailLienHe: data.emailLienHe }).eq("MaCLB", maCLB!);
    }
    return { ok: true as const, maCLB: maCLB! };
  });

/**
 * Xóa hồ sơ CLB: xóa bản ghi cau_lac_bo (ON DELETE CASCADE kéo theo bai_dang, su_kien,
 * kiem_duyet, theo_doi_clb, yeu_thich_su_kien, yeu_cau_cap_nhat) và xóa luôn tài khoản
 * đại diện của CLB đó.
 */
export const deleteClub = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ maCLB: z.number().int().positive() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("la_quan_tri_vien", {
      _ma_nguoi_dung: context.userId,
    });
    if (!isAdmin) throw new Error("Bạn không có quyền thực hiện thao tác này");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const club = await supabaseAdmin
      .from("cau_lac_bo")
      .select("MaCLB")
      .eq("MaCLB", data.maCLB)
      .maybeSingle();
    if (!club.data) throw new Error("Không tìm thấy câu lạc bộ (có thể đã được xóa)");

    const rep = await supabaseAdmin
      .from("nguoi_dung")
      .select("MaNguoiDung, MaVaiTro, vai_tro(TenVaiTro)")
      .eq("MaCLB", data.maCLB)
      .maybeSingle();

    const repRow = rep.data as unknown as {
      MaNguoiDung: string;
      vai_tro: { TenVaiTro: string } | null;
    } | null;
    const xoaTaiKhoan =
      repRow && repRow.vai_tro?.TenVaiTro !== "QuanTriVien" ? repRow.MaNguoiDung : null;

    // bai_dang."MaNguoiTao" là ON DELETE SET NULL, nhưng kiem_duyet."MaQuanTriVien" là
    // ON DELETE RESTRICT: xoá CLB trước để mọi bản ghi phụ thuộc biến mất.
    const del = await supabaseAdmin.from("cau_lac_bo").delete().eq("MaCLB", data.maCLB);
    if (del.error) throw new Error("Xóa CLB thất bại: " + del.error.message);

    if (xoaTaiKhoan) {
      await supabaseAdmin.from("nguoi_nhan_thong_bao").delete().eq("MaNguoiDung", xoaTaiKhoan);
      await supabaseAdmin.from("theo_doi_clb").delete().eq("MaNguoiDung", xoaTaiKhoan);
      await supabaseAdmin.from("yeu_thich_su_kien").delete().eq("MaNguoiDung", xoaTaiKhoan);
      await supabaseAdmin.from("nhat_ky_hoat_dong").delete().eq("MaNguoiDung", xoaTaiKhoan);
      await supabaseAdmin.from("nguoi_dung").delete().eq("MaNguoiDung", xoaTaiKhoan);
      await supabaseAdmin.auth.admin.deleteUser(xoaTaiKhoan);
    }
    return { ok: true as const, removedAccounts: xoaTaiKhoan ? 1 : 0 };
  });

/**
 * Xóa tài khoản người dùng khỏi BAV CLUBS (chỉ Quản trị viên):
 *  - Xóa bản ghi trong hệ thống đăng nhập (auth.users); nguoi_dung và dữ liệu cá nhân đi kèm
 *    (theo dõi CLB, yêu thích sự kiện, thông báo, nhật ký) bị xóa theo nhờ ON DELETE CASCADE.
 *  - KHÔNG ảnh hưởng tài khoản Google của sinh viên: nếu họ đăng nhập lại bằng Google sẽ được
 *    tạo một tài khoản Sinh viên mới, trống. Muốn chặn hẳn thì dùng "Khóa" thay vì xóa.
 *  - Không cho xóa chính mình và không cho xóa Quản trị viên (lịch sử kiểm duyệt gắn với họ).
 *  - Xóa tài khoản Đại diện CLB: CLB vẫn giữ nguyên, chỉ chuyển sang "chưa có tài khoản".
 */
export const deleteUserAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ maNguoiDung: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("la_quan_tri_vien", {
      _ma_nguoi_dung: context.userId,
    });
    if (!isAdmin) throw new Error("Bạn không có quyền thực hiện thao tác này");
    if (data.maNguoiDung === context.userId) throw new Error("Không thể tự xóa tài khoản của chính mình");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const u = await supabaseAdmin
      .from("nguoi_dung")
      .select("MaNguoiDung, vai_tro(TenVaiTro)")
      .eq("MaNguoiDung", data.maNguoiDung)
      .maybeSingle();
    const row = u.data as unknown as { vai_tro: { TenVaiTro: string } | null } | null;
    if (!row) throw new Error("Không tìm thấy tài khoản (có thể đã được xóa)");
    if (row.vai_tro?.TenVaiTro === "QuanTriVien")
      throw new Error("Không thể xóa tài khoản Quản trị viên. Hãy đổi vai trò hoặc khóa tài khoản.");

    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.maNguoiDung);
    if (error) throw new Error("Xóa tài khoản thất bại: " + error.message);
    // Phòng trường hợp bản ghi nguoi_dung chưa bị xóa theo (không có cascade)
    await supabaseAdmin.from("nguoi_dung").delete().eq("MaNguoiDung", data.maNguoiDung);
    return { ok: true as const };
  });

/* ------------------------------ Cấp lại mật khẩu tài khoản CLB ------------------------------ */

/** Quản trị viên đặt mật khẩu mới cho tài khoản đại diện của một CLB. */
export const resetClubPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        maCLB: z.number().int().positive(),
        password: z.string().min(8, "Mật khẩu tối thiểu 8 ký tự").max(72),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("la_quan_tri_vien", {
      _ma_nguoi_dung: context.userId,
    });
    if (!isAdmin) throw new Error("Bạn không có quyền thực hiện thao tác này");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const tk = await supabaseAdmin
      .from("nguoi_dung")
      .select("MaNguoiDung, TenDangNhap")
      .eq("MaCLB", data.maCLB)
      .maybeSingle();
    if (!tk.data) throw new Error("CLB này chưa có tài khoản đại diện");

    const { error } = await supabaseAdmin.auth.admin.updateUserById(tk.data.MaNguoiDung, {
      password: data.password,
    });
    if (error) throw new Error("Cấp lại mật khẩu thất bại: " + error.message);
    return { ok: true as const, username: tk.data.TenDangNhap };
  });

/**
 * Đại diện CLB quên mật khẩu (chưa đăng nhập): gửi yêu cầu cấp lại tới tất cả Quản trị viên
 * dưới dạng thông báo. Bấm vào thông báo sẽ mở hộp thoại cấp lại mật khẩu ở trang Quản lý CLB.
 */
export const requestClubPasswordReset = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        username: z.string().trim().toLowerCase().min(3, "Vui lòng nhập tên tài khoản").max(64),
        clubName: z.string().trim().min(2, "Vui lòng nhập tên CLB").max(255),
        email: z.string().trim().toLowerCase().email("Email không hợp lệ").max(255),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const tk = await supabaseAdmin
      .from("nguoi_dung")
      .select("MaNguoiDung, MaCLB, cau_lac_bo!nguoi_dung_MaCLB_fkey(TenCLB, EmailLienHe)")
      .eq("TenDangNhap", data.username)
      .not("MaCLB", "is", null)
      .maybeSingle();
    if (tk.error) throw new Error("Lỗi tra cứu tài khoản: " + tk.error.message);
    if (!tk.data) throw new Error("Không tìm thấy tài khoản CLB với tên tài khoản này");
    const clbTk = tk.data.cau_lac_bo as
      | { TenCLB: string; EmailLienHe: string | null }
      | { TenCLB: string; EmailLienHe: string | null }[]
      | null;
    const emailDk = (Array.isArray(clbTk) ? clbTk[0]?.EmailLienHe : clbTk?.EmailLienHe)?.trim().toLowerCase();
    if (emailDk && emailDk !== data.email)
      throw new Error("Email không khớp với email liên hệ đã đăng ký của CLB");

    const duongDan = `/admin/clb?capLai=${encodeURIComponent(data.username)}&email=${encodeURIComponent(data.email)}`;

    // Chống gửi lặp: mỗi tài khoản chỉ gửi 1 yêu cầu trong 10 phút
    const truoc = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const lap = await supabaseAdmin
      .from("thong_bao")
      .select("MaThongBao")
      .like("DuongDan", `/admin/clb?capLai=${encodeURIComponent(data.username)}&%`)
      .gte("ThoiGianTao", truoc)
      .limit(1);
    if (lap.data?.length) return { ok: true as const };

    const vaiTro = await supabaseAdmin
      .from("vai_tro")
      .select("MaVaiTro")
      .eq("TenVaiTro", "QuanTriVien")
      .maybeSingle();
    const admins = vaiTro.data
      ? await supabaseAdmin.from("nguoi_dung").select("MaNguoiDung").eq("MaVaiTro", vaiTro.data.MaVaiTro)
      : null;
    if (!admins?.data?.length) throw new Error("Hệ thống chưa có Quản trị viên để nhận yêu cầu");

    const cl = tk.data.cau_lac_bo as { TenCLB: string } | { TenCLB: string }[] | null;
    const tenThat = (Array.isArray(cl) ? cl[0]?.TenCLB : cl?.TenCLB) ?? data.clubName;

    const tb = await supabaseAdmin
      .from("thong_bao")
      .insert({
        TieuDe: "Yêu cầu cấp lại mật khẩu",
        NoiDung: `${tenThat} (tài khoản ${data.username}) yêu cầu cấp lại mật khẩu. Tên CLB khai báo: ${data.clubName}. Email nhận mật khẩu: ${data.email}`,
        LoaiThongBao: "HeThong",
        DuongDan: duongDan,
      })
      .select("MaThongBao")
      .single();
    if (tb.error || !tb.data) throw new Error("Gửi yêu cầu thất bại, vui lòng thử lại");

    const nn = await supabaseAdmin.from("nguoi_nhan_thong_bao").insert(
      admins.data.map((a) => ({ MaNguoiDung: a.MaNguoiDung, MaThongBao: tb.data.MaThongBao })),
    );
    if (nn.error) throw new Error("Gửi yêu cầu thất bại, vui lòng thử lại");
    return { ok: true as const };
  });

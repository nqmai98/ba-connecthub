/**
 * Tài khoản đăng nhập của Đại diện CLB do Quản trị viên cấp, không dùng email trường.
 * Supabase Auth bắt buộc phải có email nên username được ghép với một tên miền nội bộ
 * (không gửi thư thật). Giá trị này phải khớp với điều kiện trong trigger
 * public.xu_ly_nguoi_dung_moi() ở drizzle/migrations.
 */
export const CLUB_EMAIL_DOMAIN = "@clb.baclubs.local";

/** 3–30 ký tự, bắt đầu bằng chữ thường, chỉ gồm chữ thường / số / . _ - */
export const USERNAME_REGEX = /^[a-z][a-z0-9._-]{2,29}$/;

export const USERNAME_HINT =
  "3–30 ký tự, bắt đầu bằng chữ thường, chỉ gồm chữ thường, số và các ký tự . _ -";

/** Username của CLB -> email nội bộ dùng cho Supabase Auth. */
export function usernameToEmail(username: string) {
  return username.trim().toLowerCase() + CLUB_EMAIL_DOMAIN;
}

/** true nếu là email nội bộ của tài khoản CLB (không phải email thật, không hiển thị). */
export function laEmailNoiBo(email: string | null | undefined) {
  return !!email && email.trim().toLowerCase().endsWith(CLUB_EMAIL_DOMAIN);
}

/** Email nội bộ -> username, trả về chính nó nếu không phải tài khoản CLB. */
export function emailToUsername(email: string) {
  const e = email.trim().toLowerCase();
  return e.endsWith(CLUB_EMAIL_DOMAIN) ? e.slice(0, -CLUB_EMAIL_DOMAIN.length) : e;
}

/**
 * Ô "Tên đăng nhập" ở cổng CLB / Quản trị nhận cả hai dạng:
 * Quản trị viên nhập email trường, Đại diện CLB nhập username.
 */
export function loginIdToEmail(loginId: string) {
  const id = loginId.trim().toLowerCase();
  return id.includes("@") ? id : usernameToEmail(id);
}

// Tài khoản CLB đăng nhập bằng username. Supabase Auth bắt buộc có email nên
// username được ánh xạ sang một email nội bộ (không gửi thư, người dùng không thấy).
export const CLUB_EMAIL_DOMAIN = "clb.baclubs.local";
export const USERNAME_REGEX = /^[a-z0-9][a-z0-9._-]{2,29}$/;
export const USERNAME_HINT = "3–30 ký tự, chỉ gồm chữ thường không dấu, số, dấu . _ -";

export const usernameToEmail = (username: string) => `${username.trim().toLowerCase()}@${CLUB_EMAIL_DOMAIN}`;

/** Ô đăng nhập: có "@" thì coi là email (admin), ngược lại là username CLB. */
export const loginIdToEmail = (id: string) => (id.includes("@") ? id.trim() : usernameToEmail(id));

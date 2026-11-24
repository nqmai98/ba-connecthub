/**
 * Gửi email tự động từ máy chủ qua kết nối Gmail (Lovable Connectors → Gmail).
 * Kết nối Gmail tạo sẵn biến môi trường GOOGLE_MAIL_API_KEY; LOVABLE_API_KEY do Lovable Cloud quản lý.
 * Thư được gửi từ chính tài khoản Gmail đã ủy quyền khi kết nối.
 */
const GATEWAY = "https://connector-gateway.lovable.dev/google_mail/gmail/v1/users/me/messages/send";

/** Base64 cho chuỗi UTF-8 (chạy được cả Node lẫn môi trường Worker, không cần Buffer). */
function base64Utf8(s: string) {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

export function daCauHinhEmail() {
  return !!process.env["LOVABLE_API_KEY"] && !!process.env["GOOGLE_MAIL_API_KEY"];
}

export async function guiEmail({ to, subject, text }: { to: string; subject: string; text: string }) {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const gmailKey = process.env["GOOGLE_MAIL_API_KEY"];
  if (!lovableKey || !gmailKey)
    throw new Error("Chưa kết nối Gmail cho dự án nên chưa gửi email tự động được");

  // Thư dạng RFC 2822, tiêu đề và nội dung mã hóa UTF-8 để giữ dấu tiếng Việt
  const tho = [
    `To: ${to}`,
    `Subject: =?UTF-8?B?${base64Utf8(subject)}?=`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    base64Utf8(text),
  ].join("\r\n");
  const raw = base64Utf8(tho).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": gmailKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw }),
  });
  if (!res.ok) {
    const chiTiet = await res.text().catch(() => "");
    throw new Error(`Gửi email thất bại (${res.status}) ${chiTiet.slice(0, 200)}`);
  }
}

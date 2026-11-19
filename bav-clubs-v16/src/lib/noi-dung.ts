/**
 * Nội dung bài đăng (cột bai_dang.NoiDung, kiểu text).
 * - Bài mới soạn bằng trình soạn thảo được lưu dưới dạng HTML (có định dạng + nhiều ảnh chèn giữa bài).
 * - Bài cũ là văn bản thuần (xuống dòng bằng \n) – vẫn hiển thị bình thường.
 * Mọi HTML đều được lọc theo danh sách thẻ/thuộc tính cho phép trước khi lưu và trước khi hiển thị,
 * để không ai chèn được mã độc (script, onclick, iframe...) vào trang của sinh viên.
 */

/** Có phải nội dung HTML do trình soạn thảo tạo ra không. */
export function laHtml(s: string | null | undefined) {
  return !!s && /<\/?(p|h[1-6]|ul|ol|li|strong|em|b|i|u|s|br|img|figure|blockquote|a|div|span)\b/i.test(s);
}

const THE_CHO_PHEP = new Set([
  "P", "BR", "H2", "H3", "STRONG", "B", "EM", "I", "U", "S", "STRIKE",
  "UL", "OL", "LI", "BLOCKQUOTE", "A", "IMG", "FIGURE", "FIGCAPTION", "HR", "SPAN", "DIV",
]);
const CANH_LE = new Set(["left", "center", "right", "justify"]);
const URL_AN_TOAN = /^(https?:|mailto:)/i;

/** Lọc HTML theo danh sách cho phép (chạy trên trình duyệt). */
export function lamSachHtml(html: string): string {
  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    // Phía máy chủ: không render HTML thô, chỉ trả về văn bản
    return vanBanThuan(html).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
  }
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const goc = doc.body.firstElementChild as HTMLElement;

  const duyet = (el: Element) => {
    for (const con of Array.from(el.children)) {
      const ten = con.tagName;
      if (!THE_CHO_PHEP.has(ten)) {
        // Thẻ không cho phép: bỏ hẳn nếu là thẻ nguy hiểm, còn lại giữ phần chữ bên trong
        if (["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "FORM", "INPUT", "BUTTON", "SVG", "MATH"].includes(ten)) {
          con.remove();
        } else {
          duyet(con);
          con.replaceWith(...Array.from(con.childNodes));
        }
        continue;
      }
      // Giữ lại đúng các thuộc tính cần thiết
      const canhLe = (con as HTMLElement).style?.textAlign;
      for (const attr of Array.from(con.attributes)) {
        const ok =
          (ten === "A" && attr.name === "href" && URL_AN_TOAN.test(attr.value)) ||
          (ten === "IMG" && attr.name === "src" && /^https?:/i.test(attr.value)) ||
          (ten === "IMG" && attr.name === "alt");
        if (!ok) con.removeAttribute(attr.name);
      }
      if (canhLe && CANH_LE.has(canhLe)) (con as HTMLElement).style.textAlign = canhLe;
      if (ten === "A") {
        con.setAttribute("target", "_blank");
        con.setAttribute("rel", "noopener noreferrer nofollow");
      }
      if (ten === "IMG") {
        if (!con.getAttribute("src")) {
          con.remove();
          continue;
        }
        con.setAttribute("loading", "lazy");
      }
      duyet(con);
    }
  };
  duyet(goc);
  return goc.innerHTML;
}

/** Chuyển nội dung (HTML hoặc văn bản) thành văn bản thuần – dùng cho đoạn trích, tìm kiếm. */
export function vanBanThuan(s: string | null | undefined): string {
  if (!s) return "";
  if (!laHtml(s)) return s;
  return s
    .replace(/<(br|\/p|\/h[1-6]|\/li|\/blockquote|\/div|\/figure)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Danh sách link ảnh chèn trong bài (để làm ảnh bìa dự phòng, đếm số ảnh...). */
export function anhTrongBai(s: string | null | undefined): string[] {
  if (!s || !laHtml(s)) return [];
  return Array.from(s.matchAll(/<img[^>]+src="([^"]+)"/gi), (m) => m[1]!.replace(/&amp;/g, "&"));
}

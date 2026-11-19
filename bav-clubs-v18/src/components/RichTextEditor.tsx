import { useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Minus,
  Pilcrow,
  Quote,
  Redo2,
  RemoveFormatting,
  Strikethrough,
  Underline,
  Undo2,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { uploadImage } from "@/lib/data";
import { laHtml, lamSachHtml, vanBanThuan } from "@/lib/noi-dung";
import { cn } from "@/lib/utils";

const escapeHtml = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** Văn bản thuần của bài cũ -> các đoạn <p> để mở được trong trình soạn thảo. */
function vanBanSangHtml(s: string) {
  if (!s) return "";
  if (laHtml(s)) return lamSachHtml(s);
  return s
    .split(/\n{2,}/)
    .map((doan) => `<p>${escapeHtml(doan).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

/**
 * Trình soạn thảo nội dung bài đăng kiểu Word: định dạng chữ, tiêu đề, danh sách, trích dẫn,
 * căn lề, liên kết và chèn NHIỀU ẢNH xen giữa nội dung (giống một trang tin).
 * Không dùng thư viện ngoài: dựa trên contentEditable + document.execCommand của trình duyệt.
 * Giá trị trả ra là HTML đã được lọc an toàn (xem lib/noi-dung.ts).
 */
export function RichTextEditor({
  value,
  onChange,
  loi = false,
  placeholder = "Viết nội dung bài đăng...",
}: {
  value: string;
  onChange: (html: string) => void;
  loi?: boolean;
  placeholder?: string;
}) {
  const { maNguoiDung } = useAuth();
  const ref = useRef<HTMLDivElement>(null);
  const htmlCuoi = useRef<string>("");
  const vungChon = useRef<Range | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [dangTai, setDangTai] = useState(0);
  const [soChu, setSoChu] = useState(0);
  const [, setTick] = useState(0); // vẽ lại thanh công cụ khi con trỏ đổi vị trí

  // Nạp giá trị ban đầu / khi giá trị bị thay từ bên ngoài
  useEffect(() => {
    const el = ref.current;
    if (!el || value === htmlCuoi.current) return;
    el.innerHTML = vanBanSangHtml(value);
    htmlCuoi.current = value;
    setSoChu(vanBanThuan(el.innerHTML).replace(/\s+/g, " ").trim().split(" ").filter(Boolean).length);
  }, [value]);

  useEffect(() => {
    try {
      document.execCommand("defaultParagraphSeparator", false, "p");
    } catch {
      /* trình duyệt cũ */
    }
    const capNhat = () => setTick((t) => t + 1);
    document.addEventListener("selectionchange", capNhat);
    return () => document.removeEventListener("selectionchange", capNhat);
  }, []);

  const phatThayDoi = () => {
    const el = ref.current;
    if (!el) return;
    const html = el.innerHTML.trim() === "<br>" ? "" : el.innerHTML;
    htmlCuoi.current = html;
    setSoChu(vanBanThuan(html).replace(/\s+/g, " ").trim().split(" ").filter(Boolean).length);
    onChange(html);
  };

  const luuVungChon = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount && ref.current?.contains(sel.anchorNode)) vungChon.current = sel.getRangeAt(0);
  };
  const khoiPhucVungChon = () => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    const sel = window.getSelection();
    if (sel && vungChon.current) {
      sel.removeAllRanges();
      sel.addRange(vungChon.current);
    }
  };

  const lenh = (cmd: string, arg?: string) => {
    khoiPhucVungChon();
    document.execCommand(cmd, false, arg);
    phatThayDoi();
    luuVungChon();
  };
  const dangBat = (cmd: string) => {
    if (typeof document === "undefined") return false;
    try {
      return document.queryCommandState(cmd);
    } catch {
      return false;
    }
  };
  const khoiHienTai = () => {
    if (typeof document === "undefined") return "";
    try {
      return String(document.queryCommandValue("formatBlock")).toLowerCase().replace(/[<>]/g, "");
    } catch {
      return "";
    }
  };

  const chenAnh = async (files: File[]) => {
    const anh = files.filter((f) => f.type.startsWith("image/"));
    if (!anh.length || !maNguoiDung) return;
    setDangTai((n) => n + anh.length);
    for (const f of anh) {
      try {
        const url = await uploadImage(f, maNguoiDung);
        khoiPhucVungChon();
        document.execCommand(
          "insertHTML",
          false,
          `<figure><img src="${escapeHtml(url)}" alt=""></figure><p><br></p>`,
        );
        phatThayDoi();
        luuVungChon();
      } catch (e) {
        toast.error(`Tải ảnh "${f.name}" thất bại: ${(e as Error).message}`);
      } finally {
        setDangTai((n) => n - 1);
      }
    }
  };

  const chenLink = () => {
    luuVungChon();
    const url = window.prompt("Nhập đường dẫn (bắt đầu bằng https://)", "https://");
    if (!url || !/^(https?:\/\/|mailto:)/i.test(url.trim())) return;
    lenh("createLink", url.trim());
  };

  const khoi = khoiHienTai();

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border bg-card focus-within:ring-2 focus-within:ring-ring",
        loi && "border-destructive ring-1 ring-destructive",
      )}
    >
      {/* Thanh công cụ */}
      <div
        className="flex flex-wrap items-center gap-0.5 border-b bg-muted/50 p-1.5"
        onMouseDown={(e) => {
          // Giữ nguyên vùng chọn trong ô soạn thảo khi bấm nút
          if ((e.target as HTMLElement).closest("button")) e.preventDefault();
        }}
      >
        <Nut tieuDe="Hoàn tác (Ctrl+Z)" onClick={() => lenh("undo")}><Undo2 /></Nut>
        <Nut tieuDe="Làm lại (Ctrl+Y)" onClick={() => lenh("redo")}><Redo2 /></Nut>
        <Vach />
        <Nut tieuDe="Đoạn văn" bat={khoi === "p" || khoi === "div" || khoi === ""} onClick={() => lenh("formatBlock", "<p>")}><Pilcrow /></Nut>
        <Nut tieuDe="Tiêu đề lớn" bat={khoi === "h2"} onClick={() => lenh("formatBlock", "<h2>")}><Heading2 /></Nut>
        <Nut tieuDe="Tiêu đề nhỏ" bat={khoi === "h3"} onClick={() => lenh("formatBlock", "<h3>")}><Heading3 /></Nut>
        <Vach />
        <Nut tieuDe="In đậm (Ctrl+B)" bat={dangBat("bold")} onClick={() => lenh("bold")}><Bold /></Nut>
        <Nut tieuDe="In nghiêng (Ctrl+I)" bat={dangBat("italic")} onClick={() => lenh("italic")}><Italic /></Nut>
        <Nut tieuDe="Gạch chân (Ctrl+U)" bat={dangBat("underline")} onClick={() => lenh("underline")}><Underline /></Nut>
        <Nut tieuDe="Gạch ngang" bat={dangBat("strikeThrough")} onClick={() => lenh("strikeThrough")}><Strikethrough /></Nut>
        <Vach />
        <Nut tieuDe="Danh sách chấm" bat={dangBat("insertUnorderedList")} onClick={() => lenh("insertUnorderedList")}><List /></Nut>
        <Nut tieuDe="Danh sách số" bat={dangBat("insertOrderedList")} onClick={() => lenh("insertOrderedList")}><ListOrdered /></Nut>
        <Nut tieuDe="Trích dẫn" bat={khoi === "blockquote"} onClick={() => lenh("formatBlock", "<blockquote>")}><Quote /></Nut>
        <Nut tieuDe="Đường kẻ ngang" onClick={() => lenh("insertHorizontalRule")}><Minus /></Nut>
        <Vach />
        <Nut tieuDe="Căn trái" bat={dangBat("justifyLeft")} onClick={() => lenh("justifyLeft")}><AlignLeft /></Nut>
        <Nut tieuDe="Căn giữa" bat={dangBat("justifyCenter")} onClick={() => lenh("justifyCenter")}><AlignCenter /></Nut>
        <Nut tieuDe="Căn phải" bat={dangBat("justifyRight")} onClick={() => lenh("justifyRight")}><AlignRight /></Nut>
        <Nut tieuDe="Căn đều" bat={dangBat("justifyFull")} onClick={() => lenh("justifyFull")}><AlignJustify /></Nut>
        <Vach />
        <Nut tieuDe="Chèn liên kết" onClick={chenLink}><Link2 /></Nut>
        <Nut tieuDe="Xóa định dạng" onClick={() => lenh("removeFormat")}><RemoveFormatting /></Nut>
        <Vach />
        <button
          type="button"
          title="Chèn ảnh vào vị trí con trỏ (chọn được nhiều ảnh)"
          disabled={dangTai > 0}
          onClick={() => {
            luuVungChon();
            fileRef.current?.click();
          }}
          className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-2.5 text-xs font-bold text-primary-foreground hover:bg-primary-dark disabled:opacity-60"
        >
          {dangTai > 0 ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          {dangTai > 0 ? `Đang tải ${dangTai} ảnh...` : "Chèn ảnh"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            chenAnh(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />
      </div>

      {/* Vùng soạn thảo */}
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label="Nội dung bài đăng"
        data-placeholder={placeholder}
        onInput={phatThayDoi}
        onKeyUp={luuVungChon}
        onMouseUp={luuVungChon}
        onBlur={() => {
          luuVungChon();
          // Lọc lại HTML khi rời ô soạn thảo (phòng trường hợp dán nội dung lạ)
          const el = ref.current;
          if (!el) return;
          const sach = lamSachHtml(el.innerHTML);
          if (sach !== el.innerHTML) {
            el.innerHTML = sach;
            phatThayDoi();
          }
        }}
        onPaste={(e) => {
          const anh = Array.from(e.clipboardData.files).filter((f) => f.type.startsWith("image/"));
          if (anh.length) {
            e.preventDefault();
            luuVungChon();
            chenAnh(anh);
            return;
          }
          const html = e.clipboardData.getData("text/html");
          if (html) {
            e.preventDefault();
            document.execCommand("insertHTML", false, lamSachHtml(html));
            phatThayDoi();
          }
        }}
        onDrop={(e) => {
          const anh = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
          if (!anh.length) return;
          e.preventDefault();
          const range = document.caretRangeFromPoint?.(e.clientX, e.clientY);
          if (range) vungChon.current = range;
          chenAnh(anh);
        }}
        className="noi-dung-bai min-h-[320px] max-h-[70vh] overflow-y-auto px-4 py-3 text-[15px] outline-none empty:before:pointer-events-none empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)]"
      />
      <div className="flex justify-between border-t bg-muted/30 px-3 py-1.5 text-xs font-semibold text-muted-foreground">
        <span>Mẹo: dán hoặc kéo thả ảnh trực tiếp vào bài · Ctrl+B / Ctrl+I / Ctrl+U</span>
        <span>{soChu} từ</span>
      </div>
    </div>
  );
}

function Nut({
  tieuDe,
  onClick,
  bat = false,
  children,
}: {
  tieuDe: string;
  onClick: () => void;
  bat?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={tieuDe}
      aria-label={tieuDe}
      aria-pressed={bat}
      onClick={onClick}
      className={cn(
        "grid h-8 w-8 place-items-center rounded-md text-foreground/75 transition hover:bg-background hover:text-primary [&_svg]:h-4 [&_svg]:w-4",
        bat && "bg-background text-primary shadow-sm ring-1 ring-border",
      )}
    >
      {children}
    </button>
  );
}

const Vach = () => <span className="mx-1 h-5 w-px bg-border" aria-hidden />;

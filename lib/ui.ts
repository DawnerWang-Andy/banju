// 全局轻提示（客户端）
let holder: HTMLDivElement | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;

export function toast(msg: string) {
  if (typeof document === "undefined") return;
  if (!holder) {
    holder = document.createElement("div");
    holder.className = "toast";
    document.body.appendChild(holder);
  }
  holder.textContent = msg;
  holder.classList.add("show");
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => holder?.classList.remove("show"), 1900);
}

export const NEED_LOGIN = "NEED_LOGIN";
export const NEED_LOGIN_MSG = "登录后即可盖赏、互评与发布";

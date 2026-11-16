// 输入校验：所有长度/枚举/格式一律服务端重做，不信前端
export const POST_TYPES = ["PHILOSOPHY", "JOKE", "MEME", "ESSAY"] as const;
export const STANCES = ["RESONATE", "ADMIRE", "DOUBT", "PUNCH", "EXTEND"] as const;
export const REPORT_REASONS = ["obscene", "violent", "political", "spam", "other"] as const;

export const TYPE_LABEL: Record<string, string> = {
  PHILOSOPHY: "思",
  JOKE: "噱",
  MEME: "梗",
  ESSAY: "记",
};
export const STANCE_LABEL: Record<string, string> = {
  RESONATE: "共鸣",
  ADMIRE: "拍案",
  DOUBT: "存疑",
  PUNCH: "补刀",
  EXTEND: "续写",
};

/** 可见字符计数（换行不计，用于发布页；随笔按 \n 分行仍计入） */
const len = (s: string) => s.trim().length;

export function validPost(content: string, type: string): string | null {
  if (!(POST_TYPES as readonly string[]).includes(type)) return "类型不对";
  const max = type === "ESSAY" ? 500 : 300;
  const t = content.trim();
  if (t.length < 5) return "至少写 5 个字";
  if (t.length > max) return `超出 ${max} 字上限`;
  return null;
}

export function validReview(content: string, stance: string): string | null {
  if (!(STANCES as readonly string[]).includes(stance)) return "选择一个立场";
  const t = content.trim();
  if (t.length < 2) return "评语至少 2 个字";
  if (t.length > 60) return "评语不超过 60 字";
  return null;
}

export function validPoint(content: string): string | null {
  const t = content.trim();
  if (t.length < 5) return "论据至少 5 个字";
  if (t.length > 300) return "论据不超过 300 字";
  return null;
}

export function validMessage(content: string): string | null {
  const t = content.trim();
  if (t.length < 1) return "写点什么再送";
  if (t.length > 500) return "一条消息不超过 500 字";
  return null;
}

export function validTopicForm(title: string, pro: string, con: string): string | null {
  const t = title.trim();
  if (t.length < 4) return "辩题再具体一点（≥4 字）";
  if (t.length > 50) return "辩题不超过 50 字";
  if (pro.trim().length > 10 || con.trim().length > 10) return "立场名不超过 10 字";
  return null;
}

export function validRegister(username: string, penName: string, password: string): string | null {
  if (!/^[A-Za-z0-9_]{3,20}$/.test(username)) return "用户名限 3-20 位字母、数字或下划线";
  const p = penName.trim();
  if (p.length < 1 || p.length > 20) return "笔名 1-20 字";
  if (password.length < 6 || password.length > 64) return "密码至少 6 位";
  return null;
}

export function validProfileEdit(penName: string): string | null {
  const p = penName.trim();
  if (p.length < 1 || p.length > 20) return "笔名 1-20 字";
  return null;
}

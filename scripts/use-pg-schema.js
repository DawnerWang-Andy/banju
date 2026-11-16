// 把 prisma/schema.prisma 的 provider 从 sqlite 切到 postgresql（仅生产构建时运行）
// 其余模型定义两库通用，不需要第二份 schema。
const fs = require("fs");
const path = require("path");
const file = path.join(__dirname, "../prisma/schema.prisma");
let s = fs.readFileSync(file, "utf8");
if (!s.includes('provider = "sqlite"')) {
  console.log("schema 已是非 sqlite，跳过");
  process.exit(0);
}
s = s.replace('provider = "sqlite"', 'provider = "postgresql"');
fs.writeFileSync(file, s);
console.log("schema 已切换为 postgresql（记得构建后不要回写仓库；git 里保持 sqlite 版）");

// 幂等创建/重置管理员账号（上线后用，避免管理员用户名被抢注）
// 用法：OWNER_USERNAME=xxx OWNER_PASSWORD=yyy npm run owner
//   OWNER_USERNAME 缺省时取 ADMIN_USERNAMES 的第一个
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

(async () => {
  const u =
    process.env.OWNER_USERNAME ||
    (process.env.ADMIN_USERNAMES || "").split(",")[0].trim();
  const pw = process.env.OWNER_PASSWORD;
  if (!u || !pw) {
    console.error("缺少环境变量：OWNER_USERNAME / OWNER_PASSWORD");
    process.exit(1);
  }
  const p = new PrismaClient();
  const hash = await bcrypt.hash(pw, 10);
  await p.user.upsert({
    where: { username: u },
    create: {
      username: u,
      penName: process.env.OWNER_PENNAME || "站主",
      passwordHash: hash,
      role: "ADMIN",
    },
    update: { passwordHash: hash, role: "ADMIN", banned: false },
  });
  console.log("管理员账号已就绪:", u);
  await p.$disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

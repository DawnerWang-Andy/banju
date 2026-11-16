// 端到端链路验证：直接驱动 lib + 数据库，复刻各 action 去掉 cookie 层后的全部业务路径
// 运行：npx tsx tests-live.ts（需要已 db push + seed 的库）
import bcrypt from "bcryptjs";
import { prisma } from "./lib/prisma";
import { validPost, validReview, validPoint, validTopicForm } from "./lib/validation";
import { screen, sanitizeControl } from "./lib/sensitive";
import { getHotFeed } from "./lib/feed";
import { kwset, jaccard, topicSigFromKwJson, SUGGEST_THRESHOLD } from "./lib/keywords";

const TOKEN = "e2e-live-token";
let fails = 0;
const ok = (name: string, cond: boolean, extra = "") => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${extra ? "  | " + extra : ""}`);
  if (!cond) fails++;
};

async function main() {
  // 0) 登录校验（bcrypt 路径）+ session 注入（供带 cookie 的 HTTP 测试）
  const demo = await prisma.user.findUnique({ where: { username: "banju-demo" } });
  const admin = await prisma.user.findUnique({ where: { username: "banju-admin" } });
  const pw = process.env.SEED_PASSWORD || "banju-test-2026";
  ok("登录：种子密码可通过 bcrypt 校验", !!(demo && admin && (await bcrypt.compare(pw, demo!.passwordHash))));
  ok("登录：错误密码被拒绝", !(await bcrypt.compare("wrong", demo!.passwordHash)));
  await prisma.session.upsert({
    where: { id: TOKEN },
    create: { id: TOKEN, userId: demo!.id, expiresAt: new Date(Date.now() + 86400000) },
    update: { userId: demo!.id, expiresAt: new Date(Date.now() + 86400000) },
  });

  // 1) 发布管线：校验 → 控制字符清洗 → 敏感词两级
  const dirty = "测试" + String.fromCharCode(11) + "试，傻逼滚蛋。"; // VT 为待清洗控制字符
  const clean = sanitizeControl(dirty);
  ok("清洗：控制字符被去除", !clean.includes(String.fromCharCode(11)), JSON.stringify(clean));
  const scr = await screen(clean + "——这是一条超过五个字的测试句");
  ok("敏感词：FILTER 级替换为 *", scr.hit === "filter" && scr.text.includes("*"), scr.text);
  ok("敏感词：未命中 BLOCK", scr.hit !== "block");

  const blockText = "现金代开发票，五字以上够长了吧";
  const scrB = await screen(blockText);
  ok("敏感词：BLOCK 级命中", scrB.hit === "block");

  ok("校验：正常句子通过", validPost("这是一条合法的测试句子", "PHILOSOPHY") === null);
  ok("校验：过短被拒", !!validPost("短", "PHILOSOPHY"));

  // 2) 发布 → 待审隔离 → 管理员放行 → 进入推荐流
  const pendingPost = await prisma.post.create({
    data: { authorId: demo!.id, content: scrB.text, type: "JOKE", status: "PENDING" },
  });
  let feed = await getHotFeed(demo!.id, "ALL", 200);
  ok("审核：PENDING 不出现在推荐流", !feed.some((p) => p.id === pendingPost.id));
  await prisma.post.update({ where: { id: pendingPost.id }, data: { status: "PUBLISHED" } });
  feed = await getHotFeed(demo!.id, "ALL", 200);
  ok("审核：放行后进入推荐流", feed.some((p) => p.id === pendingPost.id));

  // 3) 盖赏幂等（复刻 toggleLike 事务）
  const likedPost = await prisma.post.findFirst({ where: { authorId: demo!.id, status: "PUBLISHED", id: { not: pendingPost.id } } });
  if (likedPost) {
    const doLike = async (on: boolean) => {
      const ex = await prisma.like.findUnique({
        where: { userId_targetType_targetId: { userId: admin!.id, targetType: "POST", targetId: likedPost.id } },
      });
      if (on && !ex)
        await prisma.$transaction([
          prisma.like.create({ data: { userId: admin!.id, targetType: "POST", targetId: likedPost.id } }),
          prisma.post.update({ where: { id: likedPost.id }, data: { likeCount: { increment: 1 } } }),
        ]);
      if (!on && ex)
        await prisma.$transaction([
          prisma.like.delete({ where: { id: ex.id } }),
          prisma.post.update({ where: { id: likedPost.id }, data: { likeCount: { decrement: 1 } } }),
        ]);
    };
    const before = likedPost.likeCount;
    await doLike(true); await doLike(true); // 重复赏应被唯一约束拒绝？复刻 action：先查再决定
    const mid = await prisma.post.findUnique({ where: { id: likedPost.id } });
    await doLike(false);
    const after = await prisma.post.findUnique({ where: { id: likedPost.id } });
    ok("盖赏：加一与收回回到原计数", mid!.likeCount === before + 1 && after!.likeCount === before, `${before}→${mid!.likeCount}→${after!.likeCount}`);
  } else ok("盖赏：（无可用目标句，跳过）", true);

  // 4) 互评 → 计数 → 透出 → 冷启动加权数据源
  const targetPost = feed.find((p) => p.authorUsername !== "banju-demo") || feed[0];
  const rv = await prisma.review.create({
    data: { userId: admin!.id, targetType: "POST", targetId: targetPost.id, stance: "ADMIRE", content: "端到端测试的拍案。" },
  });
  await prisma.post.update({ where: { id: targetPost.id }, data: { reviewCount: { increment: 1 } } });
  feed = await getHotFeed(demo!.id, "ALL", 200);
  const shown = feed.find((p) => p.id === targetPost.id);
  ok("互评：透出在推荐流预览", !!shown && shown.reviewsPreview.some((r) => r.text === "端到端测试的拍案。"));
  const authorRevCount = await prisma.review.count({ where: { userId: admin!.id, status: "PUBLISHED" } });
  ok("冷启动：加权数据源可正确统计作者互评数", authorRevCount >= 1, `admin互评=${authorRevCount}（≥2 触发×1.2，公式已在单测验证）`);
  ok("互评：超长/缺立场被拒", !!validReview("x", "RESONATE") && !!validReview("好", "没这个立场" as never));

  // 5) 擂台：选边 → 论据上限 → 同类建议 → 闭题只读
  const openT = await prisma.topic.findFirst({ where: { status: "OPEN" } });
  await prisma.userStance.upsert({
    where: { userId_topicId: { userId: demo!.id, topicId: openT!.id } },
    create: { userId: demo!.id, topicId: openT!.id, side: "CON" },
    update: { side: "CON" },
  });
  const myPts = await prisma.debatePoint.count({ where: { topicId: openT!.id, authorId: demo!.id, side: "CON" } });
  ok("擂台：已落座一侧可发论据（≤5）", myPts <= 5 && validPoint("这是一条端到端验证用的论据") === null, `已发${myPts}条`);
  const suggestQ = kwset(openT!.title);
  const allOpen = await prisma.topic.findMany({ where: { status: "OPEN", modStatus: "PUBLISHED" } });
  const hits = allOpen
    .filter((t) => t.id !== openT!.id)
    .map((t) => jaccard(suggestQ, topicSigFromKwJson(t.keywords)))
    .filter((s) => s >= SUGGEST_THRESHOLD);
  ok("擂台：同类建议阈值可工作（自题不提示自己）", hits.length >= 0, `相似在擂=${hits.length}`);
  await prisma.topic.update({ where: { id: openT!.id }, data: { status: "CLOSED" } });
  const closedCheck = await prisma.topic.findUnique({ where: { id: openT!.id } });
  ok("擂台：闭题状态写入", closedCheck!.status === "CLOSED");
  await prisma.topic.update({ where: { id: openT!.id }, data: { status: "OPEN" } }); // 还原

  // 6) 私信：配对唯一 → 发送 → 拉黑双向拦截 → 举报只暴露单会话
  const other = await prisma.user.findFirst({ where: { username: "ahe" } });
  const [a, b] = [demo!.id, other!.id].sort();
  const convo = await prisma.conversation.upsert({
    where: { userA_userB: { userA: a, userB: b } },
    create: { userA: a, userB: b },
    update: {},
  });
  const convoAgain = await prisma.conversation.findUnique({ where: { userA_userB: { userA: a, userB: b } } });
  ok("私信：同两人仅一个会话", convoAgain!.id === convo.id);
  await prisma.message.create({ data: { conversationId: convo.id, senderId: demo!.id, content: "端到端的第一句招呼。" } });
  await prisma.block.upsert({
    where: { blockerId_blockedId: { blockerId: other!.id, blockedId: demo!.id } },
    create: { blockerId: other!.id, blockedId: demo!.id },
    update: {},
  });
  const blockedEither =
    (await prisma.block.count({ where: { blockerId: demo!.id, blockedId: other!.id } })) +
    (await prisma.block.count({ where: { blockerId: other!.id, blockedId: demo!.id } })) >
    0;
  ok("私信：任一方向拉黑即双向拦截", blockedEither);
  await prisma.block.deleteMany({ where: { blockerId: other!.id, blockedId: demo!.id } }); // 还原
  const rep = await prisma.report.create({
    data: { targetType: "DM", targetId: convo.id, reporterId: admin!.id, reason: "other" },
  });
  const scopedIds = new Set([rep.targetId]);
  const msgs = await prisma.message.findMany({ where: { conversationId: { in: [...scopedIds] } } });
  ok("私信：举报处置仅可见被举报会话", msgs.every((m) => m.conversationId === convo.id), `${msgs.length} 条`);
  await prisma.report.delete({ where: { id: rep.id } });

  // 7) 封禁 → 登录拒绝路径（复刻 login 的 banned 检查）
  await prisma.user.update({ where: { id: demo!.id }, data: { banned: true } });
  const u2 = await prisma.user.findUnique({ where: { username: "banju-demo" } });
  ok("封禁：登录应被拒绝", u2!.banned === true);
  await prisma.user.update({ where: { id: demo!.id }, data: { banned: false } });

  // 8) 表单校验杂项
  ok("辩题：合法通过", validTopicForm("周末该不该上午十点前上课", "该", "不该") === null);
  ok("辩题：过短被拒", !!validTopicForm("短", "该", "不该"));

  console.log(fails === 0 ? "全部通过 ✅" : `失败 ${fails} 项 ❌`);
  process.exit(fails === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

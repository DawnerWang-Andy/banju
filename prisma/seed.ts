// 种子数据：npm run db:seed（密码统一读 SEED_PASSWORD，上线后立即改）
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { topicKwJson } from "../lib/keywords";

const prisma = new PrismaClient();
const PW = process.env.SEED_PASSWORD || "banju-test-2026";

const TYPE_MAP: Record<string, string> = { si: "PHILOSOPHY", xue: "JOKE", meme: "MEME", ji: "ESSAY" };

async function main() {
  const hash = await bcrypt.hash(PW, 10);
  const mk = async (username: string, penName: string, role = "USER") =>
    prisma.user.upsert({
      where: { username },
      create: { username, penName, passwordHash: hash, role },
      update: { penName, role },
    });

  const admin = await mk("banju-admin", "站印人", "ADMIN");
  const me = await mk("banju-demo", "半句用户", "USER");
  const authors = {
    阿禾: await mk("ahe", "阿禾"),
    枕书: await mk("zhenshu", "枕书"),
    小满: await mk("xiaoman", "小满"),
    不闲: await mk("buxian", "不闲"),
    长明: await mk("changming", "长明"),
    早八战神: await mk("zao8", "早八战神"),
    已读: await mk("yidu", "已读"),
    无用: await mk("wuyong", "无用"),
    二楼靠窗: await mk("erkeng", "二楼靠窗"),
    延毕预备役: await mk("yanbi", "延毕预备役"),
    无名之朴: await mk("wuming", "无名之朴"),
    拾光: await mk("shiguang", "拾光"),
    露营地不存在: await mk("yeYe", "露营地不存在"),
    渡船: await mk("duchuan", "渡船"),
  } as Record<string, { id: string }>;

  if ((await prisma.post.count()) === 0) {
    const seedPosts: [string, string, string, number][] = [
      ["ji", "阿禾", "晚自习出来，银杏黄了半条街。其实早黄了，只是今天我才抬头。", 88],
      ["si", "枕书", "我们把「下次一定」说得那么认真，好像真有一个下次在门口等着。", 64],
      ["meme", "小满", "质疑父母，理解父母，成为那个在家庭群里转发养生文章的人。", 57],
      ["xue", "不闲", "我的运动计划坚持了三十天。日历上的。", 52],
      ["si", "长明", "便利店的关东煮在冒热气。热气也算一种挽留。", 47],
      ["xue", "早八战神", "闹钟响第一遍，我以为是世界末日；响第二遍，我确认了——是。", 44],
      ["meme", "已读", "「人生是旷野不是轨道。」可旷野里它也没信号啊。", 40],
      ["si", "无用", "成年是把「随便」从礼貌，说成了事实。", 38],
      ["si", "二楼靠窗", "图书馆的灯替很多人亮过，却从不点名。", 36],
      ["ji", "阿禾", "给外婆打电话，她永远先问吃了吗。\n我知道她想问的是：你还记得这里吗。", 91],
      ["xue", "延毕预备役", "导师说这个课题「很有潜力」。后来我才懂，潜力就是遥遥无期的客气话。", 33],
      ["si", "无名之朴", "我们总把「来日方长」，当成「来日一定方长」。", 30],
      ["ji", "拾光", "夜市有人卖荧光棒，光跟着人一晃一晃，夜就实在了半分。", 29],
      ["meme", "露营地不存在", "早八的我已读乱回，是成年人新的礼貌。", 26],
      ["si", "渡船", "故乡是那个你回去了，才发现它也在长大的地方。", 24],
      ["xue", "不闲", "减肥第一周，瘦了。指钱包。", 22],
      ["ji", "拾光", "食堂阿姨问「要辣吗」，我说要。她手抖那一下，我们都没看见，但都记得。", 19],
      ["si", "枕书", "写下这半句的时候熄了灯。黑暗大概只是白天在憋气。", 12],
      ["ji", "半句用户", "把课间的十分钟用来抬头，是我这个学期最划算的投资。", 3],
      ["si", "半句用户", "写下这行字的时候，食堂正好熄了灯。黑暗大概只是白天在憋气——我把它改了一字，送给自己。", 5],
    ];
    for (const [t, who, text, likes] of seedPosts) {
      const author = who === "半句用户" ? me : authors[who];
      const p = await prisma.post.create({
        data: { authorId: author.id, content: text, type: TYPE_MAP[t], likeCount: 0, createdAt: new Date(Date.now() - Math.floor(Math.random() * 4 * 86400000)) },
      });
      void likes;
      void p;
    }
    // 热门互评（不同立场）
    const hot1 = await prisma.post.findFirst({ where: { content: { contains: "银杏" } } });
    const hot2 = await prisma.post.findFirst({ where: { content: { contains: "外婆" } } });
    const r1 = await prisma.post.findFirst({ where: { content: { contains: "下次一定" } } });
    if (hot1 && authors["拾光"]) {
      await prisma.review.createMany({
        data: [
          { userId: authors["拾光"].id, targetType: "POST", targetId: hot1.id, stance: "RESONATE", content: "“今天我才抬头”是整句的腰。" },
          { userId: authors["无用"].id, targetType: "POST", targetId: hot1.id, stance: "DOUBT", content: "稍嫌文人腔，下次抬头可以早一秒。" },
        ],
      });
    }
    if (hot2 && authors["二楼靠窗"]) {
      await prisma.review.createMany({
        data: [
          { userId: authors["二楼靠窗"].id, targetType: "POST", targetId: hot2.id, stance: "RESONATE", content: "想把这条改一个字，发给我姥姥。" },
          { userId: authors["枕书"].id, targetType: "POST", targetId: hot2.id, stance: "ADMIRE", content: "两问之间隔着一根电话线，写不出第二个人。" },
        ],
      });
    }
    if (r1 && authors["阿禾"]) {
      await prisma.review.create({
        data: { userId: authors["阿禾"].id, targetType: "POST", targetId: r1.id, stance: "ADMIRE", content: "“在门口等着”这个意象，要抄走。" },
      });
    }
  }

  if ((await prisma.topic.count()) === 0) {
    const mkTopic = async (who: { id: string }, title: string, intro: string, pro: string, con: string, points: [string, string, string, number][], closed = false) => {
      const t = await prisma.topic.create({
        data: {
          creatorId: who.id, title, intro, proLabel: pro, conLabel: con,
          status: closed ? "CLOSED" : "OPEN",
          keywords: topicKwJson(title, intro, pro, con),
        },
      });
      for (const [sideKey, authorName, text, likes] of points) {
        const author = authorName === "半句用户" ? me : authors[authorName];
        if (!author) continue;
        const pt = await prisma.debatePoint.create({
          data: { topicId: t.id, authorId: author.id, side: sideKey, content: text, likeCount: likes },
        });
        void pt;
      }
      return t;
    };
    await mkTopic(authors["枕书"] as { id: string }, "短视频是加深还是削薄了阅读", "刷完一条三分钟的名著解读，你觉得你懂了，还是更想读了？", "加深", "削薄", [
      ["PRO", "二楼靠窗", "三分钟精读是入场券。没有这张券，很多人一辈子不进剧院。", 45],
      ["PRO", "已读", "我能把一本名著的解说看完再翻原书，这本身就是阅读训练。", 18],
      ["CON", "无名之朴", "倍速都嫌慢的人，谈不上三十万字的耐心。它喂养的是「我知道」，不是「我懂得」。", 55],
      ["CON", "长明", "看完解读的满足感会提前兑现，剩下的求知欲就被抵消了。", 27],
    ]);
    await mkTopic(authors["延毕预备役"] as { id: string }, "大学专业该选热爱还是就业", "开放日那天，招生老师说的话和学长说的不一样。", "热爱", "就业", [
      ["PRO", "小满", "选就业的人，四年后就业市场早已变天；热爱至少能撑过挂科的那些夜。", 31],
      ["CON", "无用", "热爱可以工作后再培养，房租不能。", 39],
    ]);
    await mkTopic(authors["早八战神"] as { id: string }, "课堂该不该收手机", "上次收上去之后，后排安静了，但也没人抬头。", "该收", "不该收", [
      ["PRO", "阿禾", "收的是手机吗，是把注意力还给黑板的一次机会。", 22],
      ["CON", "拾光", "手机不在手里，思绪一样会溜走；管不住课堂的东西，别怪口袋。", 26],
    ], true);
  }

  if ((await prisma.sensitiveWord.count()) === 0) {
    const BLOCK = ["办证刻章", "枪支弹药", "毒品交易", "裸聊", "博彩网站", "洗钱", "作弊神器", "代开发票", "翻墙软件", "偷拍直播"];
    const FILTER = ["傻逼", "滚蛋", "王八", "废物", "白痴", "去死", "混蛋", "脑残", "畜生", "贱人"];
    await prisma.sensitiveWord.createMany({
      data: [
        ...BLOCK.map((w) => ({ word: w, level: "BLOCK", addedBy: admin.id })),
        ...FILTER.map((w) => ({ word: w, level: "FILTER", addedBy: admin.id })),
      ],
    });
  }

  if ((await prisma.conversation.count()) === 0 && authors["二楼靠窗"]) {
    const [a, b] = [me.id, authors["二楼靠窗"].id].sort();
    const convo = await prisma.conversation.create({ data: { userA: a, userB: b } });
    await prisma.message.createMany({
      data: [
        { conversationId: convo.id, senderId: b, content: "「图书馆的灯」是你写的吧，我盯着看了三遍。" },
        { conversationId: convo.id, senderId: a, content: "是我，做题的时候随手记的。" },
        { conversationId: convo.id, senderId: b, content: "二楼靠窗的视角最懂它。你下次写完，我想当第一个读者。" },
        { conversationId: convo.id, senderId: b, content: "不免费，可以用一句换一句。" },
      ],
    });
    await prisma.conversation.update({ where: { id: convo.id }, data: { lastMessageAt: new Date() } });
  }

  console.log("种子完成：admin=banju-admin / demo=banju-demo / 密码见 SEED_PASSWORD");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

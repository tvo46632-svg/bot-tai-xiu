const { Client, GatewayIntentBits, Partials, EmbedBuilder } = require("discord.js");
const { Low, JSONFile } = require("lowdb");
const path = require("path");

// Setup DB với lowdb
const file = path.join(__dirname, "db.json");
const adapter = new JSONFile(file);
const db = new Low(adapter);

async function initDB() {
  await db.read();
  db.data ||= { users: {}, daily: {}, boctham: {} };
  await db.write();
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

const PREFIX = "!";
const EMOJIS_BAUCUA = ["🦀", "🐟", "🫎", "🦐", "🐔", "🍐"];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function delay(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

async function updateUser(userId, data) {
  db.data.users[userId] ||= { money: 0, xu: 0 };
  Object.assign(db.data.users[userId], data);
  await db.write();
}

async function getUser(userId) {
  db.data.users[userId] ||= { money: 0, xu: 0 };
  await db.write();
  return db.data.users[userId];
}

async function addMoney(userId, amount) {
  const user = await getUser(userId);
  user.money += amount;
  await db.write();
}

async function addXu(userId, amount) {
  const user = await getUser(userId);
  user.xu += amount;
  await db.write();
}

async function subMoney(userId, amount) {
  const user = await getUser(userId);
  user.money -= amount;
  if (user.money < 0) user.money = 0;
  await db.write();
}

async function subXu(userId, amount) {
  const user = await getUser(userId);
  user.xu -= amount;
  if (user.xu < 0) user.xu = 0;
  await db.write();
}

// --- Các lệnh ---

async function cmdDiemdanh(message) {
  const userId = message.author.id;
  await db.read();
  const today = new Date().toISOString().slice(0, 10);

  if (db.data.daily[userId] === today) {
    const embed = new EmbedBuilder()
      .setColor("#ff0000")
      .setTitle("⚠️ Điểm danh thất bại")
      .setDescription("Bạn đã điểm danh hôm nay rồi!");
    message.reply({ embeds: [embed] });
    return;
  }

  // Tỷ lệ nhận xu
  const rand = Math.random() * 100;
  let xu = 0;
  if (rand <= 50) xu = 1000;
  else if (rand <= 75) xu = 2000;
  else if (rand <= 90) xu = 2500;
  else if (rand <= 98) xu = 3000;
  else if (rand <= 100) xu = 3200;

  db.data.daily[userId] = today;
  await addXu(userId, xu);
  await db.write();

  const embed = new EmbedBuilder()
    .setColor("#00ff00")
    .setTitle("✅ Điểm danh thành công")
    .setDescription(`Bạn nhận được **${xu.toLocaleString()} xu** ngày hôm nay!`)
    .setFooter({ text: "Chúc bạn may mắn!" })
    .setTimestamp();
  message.reply({ embeds: [embed] });
}

async function cmdTien(message) {
  const user = await getUser(message.author.id);
  const embed = new EmbedBuilder()
    .setColor("#00bfff")
    .setTitle(`💰 Số dư của ${message.author.username}`)
    .addFields(
      { name: "Tiền", value: user.money.toLocaleString(), inline: true },
      { name: "Xu", value: user.xu.toLocaleString(), inline: true }
    )
    .setTimestamp();
  message.reply({ embeds: [embed] });
}

async function cmdChuyentien(message, args) {
  if (args.length < 2) {
    const embed = new EmbedBuilder()
      .setColor("#ff4500")
      .setTitle("❌ Lỗi cú pháp")
      .setDescription("Cách dùng: `!chuyentien @user số_tiền`");
    message.reply({ embeds: [embed] });
    return;
  }
  const target = message.mentions.users.first();
  if (!target) {
    const embed = new EmbedBuilder()
      .setColor("#ff4500")
      .setTitle("❌ Lỗi")
      .setDescription("Bạn phải tag người nhận tiền!");
    message.reply({ embeds: [embed] });
    return;
  }
  const amount = parseInt(args[1]);
  if (isNaN(amount) || amount <= 0) {
    const embed = new EmbedBuilder()
      .setColor("#ff4500")
      .setTitle("❌ Lỗi")
      .setDescription("Số tiền không hợp lệ!");
    message.reply({ embeds: [embed] });
    return;
  }

  const sender = await getUser(message.author.id);
  if (sender.money < amount) {
    const embed = new EmbedBuilder()
      .setColor("#ff4500")
      .setTitle("❌ Lỗi")
      .setDescription("Bạn không đủ tiền để chuyển!");
    message.reply({ embeds: [embed] });
    return;
  }

  await subMoney(message.author.id, amount);
  await addMoney(target.id, amount);

  const embed = new EmbedBuilder()
    .setColor("#00ff00")
    .setTitle("✅ Chuyển tiền thành công")
    .setDescription(`Bạn đã chuyển **${amount.toLocaleString()} tiền** cho ${target.username}.`)
    .setTimestamp();

  message.reply({ embeds: [embed] });
}

async function cmdTungxu(message, args) {
  if (args.length < 1) {
    const embed = new EmbedBuilder()
      .setColor("#ff4500")
      .setTitle("❌ Lỗi cú pháp")
      .setDescription("Cách dùng: `!tungxu số_xu_cược`");
    message.reply({ embeds: [embed] });
    return;
  }
  const bet = parseInt(args[0]);
  if (isNaN(bet) || bet <= 0) {
    const embed = new EmbedBuilder()
      .setColor("#ff4500")
      .setTitle("❌ Lỗi")
      .setDescription("Số xu cược không hợp lệ!");
    message.reply({ embeds: [embed] });
    return;
  }
  const user = await getUser(message.author.id);
  if (user.xu < bet) {
    const embed = new EmbedBuilder()
      .setColor("#ff4500")
      .setTitle("❌ Lỗi")
      .setDescription("Bạn không đủ xu để cược!");
    message.reply({ embeds: [embed] });
    return;
  }
  await subXu(message.author.id, bet);
  await delay(2000);

  const result = Math.random() < 0.5 ? "ngửa" : "sấp";
  const win = Math.random() < 0.5;
  if (win) {
    const winAmount = bet * 2;
    await addXu(message.author.id, winAmount);

    const embed = new EmbedBuilder()
      .setColor("#00ff00")
      .setTitle("🎉 Bạn thắng tung xu!")
      .setDescription(`Kết quả: **${result}**\nBạn nhận được **${winAmount.toLocaleString()} xu**!`)
      .setTimestamp();

    message.reply({ embeds: [embed] });
  } else {
    const embed = new EmbedBuilder()
      .setColor("#ff0000")
      .setTitle("😞 Bạn thua tung xu")
      .setDescription(`Kết quả: **${result}**\nBạn mất **${bet.toLocaleString()} xu**.`)
      .setTimestamp();

    message.reply({ embeds: [embed] });
  }
}

async function cmdTaixiu(message, args) {
  if (args.length < 2) {
    const embed = new EmbedBuilder()
      .setColor("#ff4500")
      .setTitle("❌ Lỗi cú pháp")
      .setDescription("Cách dùng: `!taixiu số_tiền cược [chẵn/lẻ/tài/xỉu]`");
    message.reply({ embeds: [embed] });
    return;
  }
  const bet = parseInt(args[0]);
  const choice = args[1].toLowerCase();
  if (isNaN(bet) || bet <= 0) {
    const embed = new EmbedBuilder()
      .setColor("#ff4500")
      .setTitle("❌ Lỗi")
      .setDescription("Số tiền cược không hợp lệ!");
    message.reply({ embeds: [embed] });
    return;
  }
  if (!["chẵn", "lẻ", "tài", "xỉu"].includes(choice)) {
    const embed = new EmbedBuilder()
      .setColor("#ff4500")
      .setTitle("❌ Lỗi")
      .setDescription("Lựa chọn phải là chẵn, lẻ, tài hoặc xỉu!");
    message.reply({ embeds: [embed] });
    return;
  }

  const user = await getUser(message.author.id);
  if (user.money < bet) {
    const embed = new EmbedBuilder()
      .setColor("#ff4500")
      .setTitle("❌ Lỗi")
      .setDescription("Bạn không đủ tiền để cược!");
    message.reply({ embeds: [embed] });
    return;
  }
  await subMoney(message.author.id, bet);
  await delay(2000);

  const dice = [randomInt(1, 6), randomInt(1, 6), randomInt(1, 6)];
  const sum = dice.reduce((a, b) => a + b, 0);
  let resultStr = `🎲 Kết quả xí ngầu: **${dice.join(", ")}** (Tổng: ${sum})\n`;

  let win = false;
  if (choice === "chẵn" && sum % 2 === 0) win = true;
  else if (choice === "lẻ" && sum % 2 === 1) win = true;
  else if (choice === "tài" && sum >= 11) win = true;
  else if (choice === "xỉu" && sum <= 10) win = true;

  if (win) {
    const winAmount = bet * 2;
    await addMoney(message.author.id, winAmount);

    const embed = new EmbedBuilder()
      .setColor("#00ff00")
      .setTitle("🎉 Bạn thắng Tài Xỉu!")
      .setDescription(resultStr + `Bạn nhận được **${winAmount.toLocaleString()} tiền**!`)
      .setTimestamp();

    message.reply({ embeds: [embed] });
  } else {
    const embed = new EmbedBuilder()
      .setColor("#ff0000")
      .setTitle("😞 Bạn thua Tài Xỉu")
      .setDescription(resultStr + `Bạn mất **${bet.toLocaleString()} tiền**.`)
      .setTimestamp();

    message.reply({ embeds: [embed] });
  }
}

let baucuaSession = null;

async function cmdBaucua(message) {
  if (baucuaSession) {
    const embed = new EmbedBuilder()
      .setColor("#ff4500")
      .setTitle("⚠️ Đang có phiên Bầu Cua khác")
      .setDescription("Vui lòng đợi phiên hiện tại kết thúc!");
    message.reply({ embeds: [embed] });
    return;
  }
  baucuaSession = {
    channelId: message.channel.id,
    bets: {}, // userId: { emoji: tiền }
    timeout: null,
  };
  const msg = await message.channel.send({
    content: `🎲 Bầu cua bắt đầu! React vào icon bên dưới để đặt cược.\n${EMOJIS_BAUCUA.join(" ")}\n⏳ Bạn có 10 giây để đặt cược!`,
  });

  for (const emoji of EMOJIS_BAUCUA) {
    await msg.react(emoji);
  }

  baucuaSession.msg = msg;
  baucuaSession.timeout = setTimeout(async () => {
    await db.read();
    const results = [];
    for (let i = 0; i < 3; i++) {
      results.push(EMOJIS_BAUCUA[randomInt(0, EMOJIS_BAUCUA.length - 1)]);
    }

    const summary = {};
    for (const userId in baucuaSession.bets) {
      const bets = baucuaSession.bets[userId];
      let totalWin = 0;
      let totalLost = 0;
      for (const [emoji, amount] of Object.entries(bets)) {
        if (results.includes(emoji)) {
          const count = results.filter((r) => r === emoji).length;
          totalWin += amount * count;
        } else {
          totalLost += amount;
        }
      }
      summary[userId] = totalWin - totalLost;
    }

    for (const userId in summary) {
      if (summary[userId] > 0) await addMoney(userId, summary[userId]);
      else await subMoney(userId, -summary[userId]);
    }

    let resultText = `🎉 Kết quả bầu cua: ${results.join(" ")}\n\n`;
    for (const userId in summary) {
      const user = await client.users.fetch(userId);
      if (summary[userId] > 0) {
        resultText += `✅ **${user.username}** thắng **${summary[userId].toLocaleString()} tiền**\n`;
      } else {
        resultText += `❌ **${user.username}** thua **${(-summary[userId]).toLocaleString()} tiền**\n`;
      }
    }

    const embed = new EmbedBuilder()
      .setColor("#00ff00")
      .setTitle("🎲 Kết quả Bầu Cua")
      .setDescription(resultText)
      .setTimestamp();

    await baucuaSession.msg.reply({ embeds: [embed] });
    baucuaSession = null;
  }, 10_000);
}

// Xử lý vote bầu cua
client.on("messageReactionAdd", async (reaction, user) => {
  if (user.bot) return;
  if (!baucuaSession) return;
  if (reaction.message.id !== baucuaSession.msg.id) return;
  const emoji = reaction.emoji.name;

  if (!EMOJIS_BAUCUA.includes(emoji)) return;
  await db.read();
  const userData = baucuaSession.bets[user.id] || {};
  const betAmount = 500; // Mặc định 500 tiền
  const userDb = await getUser(user.id);

  if (userDb.money < betAmount) {
    reaction.users.remove(user.id);
    try {
      await user.send("⚠️ Bạn không đủ tiền để đặt cược 500 tiền!");
    } catch {}
    return;
  }

  // Trừ tiền ngay khi đặt cược
  await subMoney(user.id, betAmount);

  userData[emoji] = (userData[emoji] || 0) + betAmount;
  baucuaSession.bets[user.id] = userData;
  await db.write();

  try {
    await user.send(`✅ Bạn đã đặt cược **${betAmount.toLocaleString()} tiền** vào ${emoji}`);
  } catch {}
});

// Bốc thăm trúng thưởng
async function cmdBoctham(message) {
  await db.read();
  const userId = message.author.id;

  db.data.boctham[userId] ||= { lastDate: "", count: 0, money: 0 };
  const userBoctham = db.data.boctham[userId];
  const today = new Date().toISOString().slice(0, 10);

  if (userBoctham.lastDate !== today) {
    userBoctham.count = 3;
    userBoctham.lastDate = today;
  }

  if (userBoctham.count <= 0) {
    const embed = new EmbedBuilder()
      .setColor("#ff0000")
      .setTitle("❌ Hết lượt bốc thăm")
      .setDescription("Bạn đã hết lượt bốc thăm hôm nay!");
    message.reply({ embeds: [embed] });
    return;
  }

  const user = await getUser(userId);
  if (user.money < 200) {
    const embed = new EmbedBuilder()
      .setColor("#ff0000")
      .setTitle("❌ Tiền không đủ")
      .setDescription("Bạn cần ít nhất 200 tiền để bốc thăm!");
    message.reply({ embeds: [embed] });
    return;
  }

  await subMoney(userId, 200);

  const rand = Math.random() * 100;
  let reward = 0;
  if (rand <= 40) reward = 50 - 100;
  else if (rand <= 70) reward = 300 - 100;
  else if (rand <= 90) reward = 600 + 300;
  else if (rand <= 98) reward = -1000 + 1500;
  else reward = 4000;

  await addMoney(userId, reward);
  userBoctham.count--;
  await db.write();

  const embed = new EmbedBuilder()
    .setColor("#00ff00")
    .setTitle("🎉 Bốc thăm trúng thưởng")
    .setDescription(`Bạn nhận được **${reward.toLocaleString()} tiền**.\nLượt còn lại: **${userBoctham.count}**`)
    .setTimestamp();

  message.reply({ embeds: [embed] });
}

// Lệnh help
async function cmdHelp(message) {
  const embed = new EmbedBuilder()
    .setColor("#1e90ff")
    .setTitle("📖 HƯỚNG DẪN BOT CASINO")
    .setDescription(`
💰 **TIỀN & CƠ BẢN**
• \`!tien\` – Xem số xu hiện có
• \`!diemdanh\` – Điểm danh (reset mỗi ngày lúc **06:00 sáng**)
• \`!chuyentien @user <tiền>\` – Chuyển xu cho người khác

🎁 **TỶ LỆ ĐIỂM DANH**
• 50% → +1000 xu
• 25% → +2000 xu
• 15% → +2500 xu
• 8%  → +3000 xu
• 2%  → +3200 xu

🪙 **TUNG XU**
• \`!tungxu <tiền>\` (ngửa/sấp)
• Thắng: + tiền đặt
• Thua: - tiền đặt
• Cooldown: 10 giây

🎲 **TÀI XỈU**
• \`!taixiu <tiền> <tai/xiu>\`
• Tỷ lệ: 50 / 50
• Thắng: + tiền đặt
• Thua: - tiền đặt

🦀🐟🍐 **BẦU – CUA – TÔM – CÁ – NGỰA (CHUNG BÀN)**
• \`!baucua\`
• Mở bàn 15 giây, cược 500 tiền/react
• Xổ 3 con
• Trúng 1 con → ăn x1 tiền
• Trúng 2–3 con → ăn x2 / x3
• Trật → mất tiền đặt

🎁 **BỐC THĂM TRÚNG THƯỞNG**
• \`!boctham\`
• 40% + 50 hoặc - 100
• 30% +300 hoặc -100
• 20% +600 hoặc + 300
• 8% -1000 hoặc + 1500
• 2% còn lại thì +4000

⏳ **LƯU Ý**
• Một số lệnh có cooldown
`);

  message.reply({ embeds: [embed] });
}

// Main
client.on("ready", async () => {
  await initDB();
  console.log(`Logged in as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  switch (command) {
    case "diemdanh":
      await cmdDiemdanh(message);
      break;
    case "tien":
      await cmdTien(message);
      break;
    case "chuyentien":
      await cmdChuyentien(message, args);
      break;
    case "tungxu":
      await cmdTungxu(message, args);
      break;
    case "taixiu":
      await cmdTaixiu(message, args);
      break;
    case "baucua":
      await cmdBaucua(message);
      break;
    case "boctham":
      await cmdBoctham(message);
      break;
    case "help":
      await cmdHelp(message);
      break;
    default:
      {
        const embed = new EmbedBuilder()
          .setColor("#ff0000")
          .setTitle("❌ Lệnh không tồn tại")
          .setDescription("Dùng `!help` để xem danh sách lệnh.");
        message.reply({ embeds: [embed] });
      }
  }
});

client.login(process.env.TOKEN);

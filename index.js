const { Client, GatewayIntentBits, Partials, MessageEmbed } = require("discord.js");
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
    message.reply("Bạn đã điểm danh hôm nay rồi!");
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

  message.reply(`Điểm danh thành công! Bạn nhận được ${xu} xu.`);
}

async function cmdTien(message) {
  const user = await getUser(message.author.id);
  message.reply(`Bạn có ${user.money} tiền và ${user.xu} xu.`);
}

async function cmdChuyentien(message, args) {
  if (args.length < 2) {
    message.reply("Cách dùng: !chuyentien @user số_tiền");
    return;
  }
  const target = message.mentions.users.first();
  if (!target) {
    message.reply("Bạn phải tag người nhận tiền!");
    return;
  }
  const amount = parseInt(args[1]);
  if (isNaN(amount) || amount <= 0) {
    message.reply("Số tiền không hợp lệ!");
    return;
  }

  const sender = await getUser(message.author.id);
  if (sender.money < amount) {
    message.reply("Bạn không đủ tiền để chuyển!");
    return;
  }

  await subMoney(message.author.id, amount);
  await addMoney(target.id, amount);
  message.reply(`Bạn đã chuyển ${amount} tiền cho ${target.username}.`);
}

async function cmdTungxu(message, args) {
  if (args.length < 1) {
    message.reply("Cách dùng: !tungxu số_xu_cược");
    return;
  }
  const bet = parseInt(args[0]);
  if (isNaN(bet) || bet <= 0) {
    message.reply("Số xu cược không hợp lệ!");
    return;
  }
  const user = await getUser(message.author.id);
  if (user.xu < bet) {
    message.reply("Bạn không đủ xu để cược!");
    return;
  }
  await subXu(message.author.id, bet);
  await delay(2000);

  const result = Math.random() < 0.5 ? "ngửa" : "sấp";
  // Bot random tung xu
  const win = Math.random() < 0.5;
  if (win) {
    const winAmount = bet * 2;
    await addXu(message.author.id, winAmount);
    message.reply(`Kết quả: ${result}. Bạn thắng và nhận ${winAmount} xu!`);
  } else {
    message.reply(`Kết quả: ${result}. Bạn thua mất ${bet} xu.`);
  }
}

async function cmdTaixiu(message, args) {
  if (args.length < 2) {
    message.reply("Cách dùng: !taixiu số_tiền cược [chẵn/lẻ/tài/xỉu]");
    return;
  }
  const bet = parseInt(args[0]);
  const choice = args[1].toLowerCase();
  if (isNaN(bet) || bet <= 0) {
    message.reply("Số tiền cược không hợp lệ!");
    return;
  }
  if (!["chẵn", "lẻ", "tài", "xỉu"].includes(choice)) {
    message.reply("Lựa chọn phải là chẵn, lẻ, tài hoặc xỉu!");
    return;
  }

  const user = await getUser(message.author.id);
  if (user.money < bet) {
    message.reply("Bạn không đủ tiền để cược!");
    return;
  }
  await subMoney(message.author.id, bet);
  await delay(2000);

  // Xí ngầu 3 viên 1-6
  const dice = [randomInt(1, 6), randomInt(1, 6), randomInt(1, 6)];
  const sum = dice.reduce((a, b) => a + b, 0);
  let resultStr = `Kết quả xí ngầu: ${dice.join(", ")} (Tổng: ${sum})\n`;

  let win = false;
  if (choice === "chẵn" && sum % 2 === 0) win = true;
  else if (choice === "lẻ" && sum % 2 === 1) win = true;
  else if (choice === "tài" && sum >= 11) win = true;
  else if (choice === "xỉu" && sum <= 10) win = true;

  if (win) {
    const winAmount = bet * 2;
    await addMoney(message.author.id, winAmount);
    message.reply(resultStr + `Bạn thắng và nhận ${winAmount} tiền!`);
  } else {
    message.reply(resultStr + `Bạn thua mất ${bet} tiền.`);
  }
}

let baucuaSession = null;

async function cmdBaucua(message) {
  if (baucuaSession) {
    message.reply("Đang có phiên bầu cua khác, vui lòng đợi.");
    return;
  }
  baucuaSession = {
    channelId: message.channel.id,
    bets: {}, // userId: { emoji: tiền }
    timeout: null,
  };
  message.channel.send(
    `Bầu cua bắt đầu! React vào icon bên dưới để đặt cược.\n${EMOJIS_BAUCUA
      .map((e) => e)
      .join(" ")}\nBạn có 10 giây để đặt cược!`
  ).then(async (msg) => {
    for (const emoji of EMOJIS_BAUCUA) {
      await msg.react(emoji);
    }

    baucuaSession.msg = msg;
    baucuaSession.timeout = setTimeout(async () => {
      await db.read();
      // Tính kết quả
      const results = [];
      for (let i = 0; i < 3; i++) {
        results.push(EMOJIS_BAUCUA[randomInt(0, EMOJIS_BAUCUA.length - 1)]);
      }

      // Tính tiền thắng thua
      const summary = {};
      for (const userId in baucuaSession.bets) {
        const bets = baucuaSession.bets[userId];
        let winCount = 0;
        let totalBet = 0;
        for (const [emoji, amount] of Object.entries(bets)) {
          totalBet += amount;
          if (results.includes(emoji)) {
            const count = results.filter((r) => r === emoji).length;
            winCount += count;
            if (!summary[userId]) summary[userId] = 0;
            summary[userId] += amount * count;
          } else {
            if (!summary[userId]) summary[userId] = 0;
            summary[userId] -= amount;
          }
        }
      }

      // Cập nhật tiền
      for (const userId in summary) {
        if (summary[userId] > 0) await addMoney(userId, summary[userId]);
        else await subMoney(userId, -summary[userId]);
      }

      let resultText = `Kết quả bầu cua: ${results.join(" ")}\n\n`;
      for (const userId in summary) {
        const user = await client.users.fetch(userId);
        if (summary[userId] > 0) {
          resultText += `${user.username} thắng ${summary[userId]} tiền\n`;
        } else {
          resultText += `${user.username} thua ${-summary[userId]} tiền\n`;
        }
      }

      await baucuaSession.msg.reply(resultText);
      baucuaSession = null;
    }, 10_000);
  });
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
    user.send("Bạn không đủ tiền để đặt cược 500 tiền!");
    return;
  }

  // Trừ tiền ngay khi đặt cược
  await subMoney(user.id, betAmount);

  userData[emoji] = (userData[emoji] || 0) + betAmount;
  baucuaSession.bets[user.id] = userData;
  await db.write();

  user.send(`Bạn đã đặt cược ${betAmount} tiền vào ${emoji}`);
});

// Đơn giản phần xì dách và solo chỉ làm mẫu
// Bạn có thể tự phát triển thêm

// Bốc thăm trúng thưởng
async function cmdBoctham(message) {
  await db.read();
  const userId = message.author.id;
  const now = Date.now();

  db.data.boctham[userId] ||= { lastDate: 0, count: 0, money: 0 };

  const userBoctham = db.data.boctham[userId];
  const today = new Date().toISOString().slice(0, 10);

  if (userBoctham.lastDate !== today) {
    userBoctham.count = 3;
    userBoctham.lastDate = today;
  }
  if (userBoctham.count <= 0) {
    message.reply("Bạn đã hết lượt bốc thăm hôm nay!");
    return;
  }

  const user = await getUser(userId);
  if (user.money < 200) {
    message.reply("Bạn cần 200 tiền để bốc thăm!");
    return;
  }
  await subMoney(userId, 200);

  // Xác suất trúng thưởng
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

  message.reply(`Bạn bốc thăm được ${reward} tiền. Lượt còn lại: ${userBoctham.count}`);
}

// Lệnh help
async function cmdHelp(message) {
  await message.reply(`
📖 **HƯỚNG DẪN BOT CASINO**  

━━━━━━━━━━━━━━━━━━
💰 **TIỀN & CƠ BẢN**
• !tien – Xem số xu hiện có
• !diemdanh – Điểm danh (reset mỗi ngày lúc **06:00 sáng**)
• !chuyentien @user <tiền> – Chuyển xu cho người khác

🎁 **TỶ LỆ ĐIỂM DANH**
• 50% → +1000 xu
• 25% → +2000 xu
• 15% → +2500 xu
• 8%  → +3000 xu
• 2%  → +3200 xu

━━━━━━━━━━━━━━━━━━
🪙 **TUNG XU**
• !xu <tiền> <ngua/sap>
• Thắng: + tiền đặt
• Thua: - tiền đặt
• Cooldown: 10 giây

━━━━━━━━━━━━━━━━━━
🎲 **TÀI XỈU**
• !taixiu <tiền> <tai/xiu>
• Tỷ lệ: 50 / 50
• Thắng: + tiền đặt
• Thua: - tiền đặt

━━━━━━━━━━━━━━━━━━
🦀🐟🍐 **BẦU – CUA – TÔM – CÁ – NGỰA (CHUNG BÀN)**
• !baucua <tiền> <bau/cua/tom/ca/ngua>
• Mỗi người đặt 1 lần / ván
• Mở bàn 15 giây
• Xổ 3 con
• Trúng 1 con → ăn x1 tiền
• Trúng 2–3 con → ăn x2 / x3
• Trật → mất tiền đặt

━━━━━━━━━━━━━━━━━━
⚪⚫ **TRẮNG – ĐEN (PVP)**
• !trangden <tiền> <trang/den>
• Nhiều người cùng chơi
• Sau 10 giây mở kết quả
• BÊN THUA → tiền CHUYỂN cho bên thắng
• Bot không ăn tiền

🃏 **XÌ DÁCH (BLACKJACK)**
• !xidach <tiền> – Bắt đầu ván
• !hit – Rút thêm bài
• !stand – Dừng & so bài
• Thắng: + tiền cược
• Thua: - tiền cược
• Không chơi 2 ván cùng lúc

🎁 **BỐC THĂM TRÚNG THƯỞNG**
• !boctham
• 40% + 50 hoặc - 100
• 30% +300 hoặc -100
• 20% +600 hoặc + 300
• 8% -1000 hoặc + 1500
• 2% còn lại thì +4000

⏳ **LƯU Ý**
• Một số lệnh có cooldown
`);
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
      message.reply("Lệnh không tồn tại! Dùng !help để xem danh sách lệnh.");
  }
});

client.login(process.env.TOKEN);

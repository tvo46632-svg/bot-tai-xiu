// ================================================
//                  DISCORD CASINO BOT
//        FULL VERSION — ~960+ LINES OF CODE
// ================================================

// ---------------- IMPORT MODULES ----------------
const {
    Client,
    GatewayIntentBits,
    Partials,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const { Low, JSONFile } = require("lowdb");
const path = require("path");

// ---------------- DATABASE SETUP ----------------

// Path to JSON database file
const dbFile = path.join(__dirname, "db.json");

// Adapter for lowdb
const adapter = new JSONFile(dbFile);

// Database instance
const db = new Low(adapter);

// Initialize database with default structure
async function initDB() {
    await db.read();
    db.data ||= { users: {}, daily: {}, boctham: {} };
    await db.write();
}

// ---------------- CREATE CLIENT ----------------

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

// ---------------- GLOBAL VARIABLES ----------------

const PREFIX = "!"; // command prefix
const EMOJIS_BAUCUA = ["🐟","🦀","🐘","🐒","🐓","🦞"];

// Utility functions
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function delay(ms) {
    return new Promise((res) => setTimeout(res, ms));
}

// ---------------- USER DATA FUNCTIONS ----------------

// Get or create user
async function getUser(userId) {
    db.data.users[userId] ||= { money: 0, xu: 0 };
    await db.write();
    return db.data.users[userId];
}

// Add money
async function addMoney(userId, amount) {
    const user = await getUser(userId);
    user.money += amount;
    await db.write();
}

// Subtract money
async function subMoney(userId, amount) {
    const user = await getUser(userId);
    user.money -= amount;
    if (user.money < 0) user.money = 0;
    await db.write();
}

// Add xu
async function addXu(userId, amount) {
    const user = await getUser(userId);
    user.xu += amount;
    await db.write();
}

// Subtract xu
async function subXu(userId, amount) {
    const user = await getUser(userId);
    user.xu -= amount;
    if (user.xu < 0) user.xu = 0;
    await db.write();
}
// Lấy số xu hiện tại
async function getUserCoins(userId) {
    await db.read();
    db.data.users[userId] ||= { money: 0, xu: 0, debt: 0 };
    return db.data.users[userId].xu || 0;
}

// Set số xu
async function setUserCoins(userId, amount) {
    await db.read();
    db.data.users[userId] ||= { money: 0, xu: 0, debt: 0 };
    db.data.users[userId].xu = amount;
    await db.write();
}

// Lấy nợ (debt)
async function getUserDebt(userId) {
    await db.read();
    db.data.users[userId] ||= { money: 0, xu: 0, debt: 0 };
    return db.data.users[userId].debt || 0;
}

// Set nợ (debt)
async function setUserDebt(userId, amount) {
    await db.read();
    db.data.users[userId] ||= { money: 0, xu: 0, debt: 0 };
    db.data.users[userId].debt = amount;
    await db.write();
}

// ===================== COMMANDS =====================

// =====================
//         ĐIỂM DANH
// =====================
async function cmdDiemdanh(message) {

    const userId = message.author.id;

    await db.read();

    const today = new Date().toISOString().slice(0, 10);

    if (db.data.daily[userId] === today) {
        message.reply("Bạn đã điểm danh hôm nay rồi!");
        return;
    }

    const rand = Math.random() * 100;

    let xuReward = 0;

    if (rand <= 50) xuReward = 1000;
    else if (rand <= 75) xuReward = 2000;
    else if (rand <= 90) xuReward = 2500;
    else if (rand <= 98) xuReward = 3000;
    else xuReward = 3200;

    db.data.daily[userId] = today;

    await addXu(userId, xuReward);

    message.reply(`🎉 Điểm danh thành công! Bạn nhận được ${xuReward} xu.`);
}

// =====================
//         XEM TIỀN + NỢ 
// =====================
async function cmdTien(message) {
    const userId = message.author.id;
    await db.read(); // Đọc dữ liệu từ DB
    db.data.users[userId] ||= { money: 0, xu: 0, debt: 0 }; // Khởi tạo nếu chưa có dữ liệu người dùng

    const user = db.data.users[userId];
    const currentMoney = user.money || 0; // Tiền
    const currentXu = user.xu || 0;       // Xu
    const userDebt = user.debt || 0;       // Nợ

    // Trả về số tiền và xu hiện tại của người dùng
    let replyText = `💰 Hiện tại bạn có **${currentMoney} tiền** và **${currentXu} xu**.`;
    if (userDebt > 0) {
        replyText += `\n⚠️ Bạn đang nợ bot **${userDebt} xu**.`;
    }

    message.reply(replyText); // Chỉ gọi 1 lần
}

// =====================
// =====================
// 1. ĐỔI XU → TIỀN (Chờ 4s)
// =====================
async function cmdDoixu(message, args) {
    if (args.length < 1) {
        return message.reply("❗ Cách dùng: !doixu <số_xu>");
    }

    const xuAmount = parseInt(args[0]);
    if (isNaN(xuAmount) || xuAmount <= 0) {
        return message.reply("❌ Số xu không hợp lệ!");
    }

    const user = await getUser(message.author.id);
    if (user.xu < xuAmount) {
        return message.reply("❌ Bạn không đủ xu!");
    }

    let moneyOut = 0;
    // Logic tính toán tiền nhận được
    if (xuAmount === 100) moneyOut = 50;
    else if (xuAmount === 200) moneyOut = 150;
    else if (xuAmount === 500) moneyOut = 450;
    else if (xuAmount === 1000) moneyOut = 900;
    else if (xuAmount >= 2000) moneyOut = Math.floor(xuAmount * 0.9);
    else {
        return message.reply("❗ Chỉ hỗ trợ đổi: 100, 200, 500, 1000 hoặc trên 2000 xu!");
    }

    // Gửi thông báo bắt đầu
    const msg = await message.reply("⏳ Đang xử lý: **XU ➔ TIỀN**... [0%]");
    
    // Tạo hiệu ứng chạy % ảo cho vui mắt (Tổng 4 giây)
    await sleep(2000);
    await msg.edit("⏳ Đang chuyển đổi dữ liệu... [50%]");
    await sleep(2000);

    // Thực hiện trừ xu cộng tiền trong Database
    await subXu(message.author.id, xuAmount);
    await addMoney(message.author.id, moneyOut);

    // Hoàn tất
    await msg.edit(
        `✅ **GIAO DỊCH HOÀN TẤT**\n🔁 Đã đổi: **${xuAmount.toLocaleString()} xu**\n💰 Nhận: **${moneyOut.toLocaleString()} tiền**`
    );
}

// =====================
// 2. ĐỔI TIỀN → XU (Chờ 3s)
// =====================
async function cmdDoitien(message, args) {
    if (args.length < 1) {
        return message.reply("❗ Cách dùng: !doitien <số_tiền>");
    }

    const moneyAmount = parseInt(args[0]);
    if (isNaN(moneyAmount) || moneyAmount <= 0) {
        return message.reply("❌ Số tiền không hợp lệ!");
    }

    const user = await getUser(message.author.id);
    if (user.money < moneyAmount) {
        return message.reply("❌ Bạn không đủ tiền!");
    }

    // Giả sử tỉ lệ đổi ngược lại là 1:1 (hoặc tùy bạn chỉnh)
    const xuOut = moneyAmount;

    // Gửi thông báo bắt đầu
    const msg = await message.reply("⏳ Đang xử lý: **TIỀN ➔ XU**... [0%]");
    
    // Hiệu ứng chờ 3 giây
    await sleep(1500);
    await msg.edit("⏳ Đang nạp xu vào tài khoản... [60%]");
    await sleep(1500);

    // Thực hiện trừ tiền cộng xu trong Database
    await subMoney(message.author.id, moneyAmount);
    await addXu(message.author.id, xuOut);

    // Hoàn tất
    await msg.edit(
        `✅ **GIAO DỊCH HOÀN TẤT**\n🔁 Đã đổi: **${moneyAmount.toLocaleString()} tiền**\n💎 Nhận: **${xuOut.toLocaleString()} xu**`
    );
}
// =====================
// TUNG XU (v2 cải tiến) với hoạt ảnh
// =====================
async function cmdTungxu(message, args) {
    if (args.length < 2) {
        message.reply("❗ Cách dùng: !tungxu <số_xu> <ngửa/sấp>");
        return;
    }

    const betXu = parseInt(args[0]);
    let userChoice = args[1].toLowerCase(); // ngửa hoặc sấp

    // Chuyển viết tắt sang đầy đủ
    if (userChoice === "n") userChoice = "ngửa";
    if (userChoice === "s") userChoice = "sấp";

    if (isNaN(betXu) || betXu <= 0) {
        message.reply("❌ Số xu không hợp lệ!");
        return;
    }

    if (!["ngửa", "sấp"].includes(userChoice)) {
        message.reply("❌ Chọn: ngửa / sấp (hoặc n / s)");
        return;
    }

    const user = await getUser(message.author.id);

    if (user.xu < betXu) {
        message.reply("❌ Bạn không đủ xu để cược!");
        return;
    }

    await subXu(message.author.id, betXu);

    // Gửi thông báo cho người chơi về việc "tung xu"
    const loadingMessage = await message.reply("🪙 Đang tung xu...");

    // Hiệu ứng "tung xu" - thay đổi emoji liên tục
    const emojis = ["🪙", "🎰", "🎲", "🪙", "🎰"];
    for (let i = 0; i < 5; i++) {
        await delay(500); // Delay để tạo hiệu ứng chuyển động
        const randomEmoji = emojis[randomInt(0, emojis.length - 1)];
        await loadingMessage.edit(`🪙 Đang tung xu... ${randomEmoji}`);
    }

    // Quay xu
    await delay(1000); // Thêm chút delay trước khi công bố kết quả
    const result = Math.random() < 0.5 ? "ngửa" : "sấp";

    // Xử lý kết quả
    if (result === userChoice) {
        const rewardXu = betXu * 2;
        await addXu(message.author.id, rewardXu);
        message.reply(`🪙 Kết quả: ${result.toUpperCase()}! Bạn thắng và nhận ${rewardXu} xu.`);
    } else {
        message.reply(`🪙 Kết quả: ${result.toUpperCase()}! Bạn thua và mất ${betXu} xu.`);
    }
}
// =====================
//         TÀI XỈU
// =====================
async function cmdTaixiu(message, args) {

    if (args.length < 2) {
        message.reply("❗ Cách dùng: !taixiu <tiền> <chẵn/lẻ/tài/xỉu>");
        return;
    }

    const betMoney = parseInt(args[0]);
    const userChoice = args[1].toLowerCase();

    if (isNaN(betMoney) || betMoney <= 0) {
        message.reply("❌ Số tiền cược không hợp lệ!");
        return;
    }

    if (!["chẵn", "lẻ", "tài", "xỉu"].includes(userChoice)) {
        message.reply("❌ Chọn: chẵn / lẻ / tài / xỉu");
        return;
    }

    const user = await getUser(message.author.id);

    if (user.money < betMoney) {
        message.reply("❌ Bạn không đủ tiền!");
        return;
    }

    await subMoney(message.author.id, betMoney);

    await delay(2000);

    const values = [
        randomInt(1, 6),
        randomInt(1, 6),
        randomInt(1, 6),
    ];

    const sum = values[0] + values[1] + values[2];

    let didWin = false;

    if (userChoice === "chẵn" && sum % 2 === 0) didWin = true;
    if (userChoice === "lẻ" && sum % 2 === 1) didWin = true;
    if (userChoice === "tài" && sum >= 11) didWin = true;
    if (userChoice === "xỉu" && sum <= 10) didWin = true;

    if (didWin) {
        const moneyGain = betMoney * 2;
        await addMoney(message.author.id, moneyGain);
        message.reply(
            `🎲 Kết quả: ${values.join(" | ")} (Tổng: ${sum})\n` +
            `✅ Bạn thắng và nhận ${moneyGain} tiền!`
        );
    } else {
        message.reply(
            `🎲 Kết quả: ${values.join(" | ")} (Tổng: ${sum})\n` +
            `❌ Bạn thua và mất ${betMoney} tiền!`
        );
    }
}

// =====================
// BẦU CUA CÓ HIỆU ỨNG "SỐC DĨA" + TUỲ Ý TIỀN
// =====================

let baucuaSession = null;
let userBetAmounts = {}; // Lưu số tiền cược từng người
const BAUCUA_EMOJIS = ["🦀", "🐟", "🫎", "🦐", "🐔", "🍐"]; // Các con trong game

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Command !baucua <số tiền>
async function cmdBaucua(message, args) {
    try {
        if (baucuaSession) {
            message.reply("⚠️ Đang có phiên bầu cua khác. Vui lòng đợi!");
            return;
        }

        baucuaSession = {
            channelId: message.channel.id,
            bets: {}, // { userId: { emoji: amount } }
            msg: null
        };
        userBetAmounts = {};

        // Lấy số tiền đặt của người khởi tạo
        let starterBet = 200;
        if (args.length > 0) {
            const bet = parseInt(args[0]);
            if (!isNaN(bet) && bet > 0) starterBet = bet;
        }

        const starterUserDb = await getUser(message.author.id);
        if (starterUserDb.money < starterBet) {
            message.reply(`❌ Bạn không đủ tiền để đặt ${starterBet} tiền!`);
            baucuaSession = null;
            return;
        }

        userBetAmounts[message.author.id] = starterBet;

        const betMessage = await message.channel.send(
            `🎯 **Bầu cua bắt đầu!**\n` +
            `1️⃣ ${message.author.username} đã đặt ${starterBet} tiền sẵn.\n` +
            `2️⃣ Người khác DM bot: !datcu <số tiền> hoặc react mặc định 200 tiền\n` +
            `3️⃣ React vào con muốn cược trong 10 giây:\n` +
            `${BAUCUA_EMOJIS.join(" ")}`
        );

        for (const emoji of BAUCUA_EMOJIS) await betMessage.react(emoji);
        baucuaSession.msg = betMessage;

        // Animation "sốc dĩa" 10 giây
        const start = Date.now();
        while (Date.now() - start < 10000) {
            const tempResults = [];
            for (let i = 0; i < 3; i++)
                tempResults.push(BAUCUA_EMOJIS[randomInt(0, BAUCUA_EMOJIS.length - 1)]);
            await betMessage.edit(`🎲 **Bầu cua đang lắc dĩa!**\n${tempResults.join(" ")}`);
            await delay(700);
        }

        // Quay kết quả thật
        await db.read();
        const results = [];
        for (let i = 0; i < 3; i++)
            results.push(BAUCUA_EMOJIS[randomInt(0, BAUCUA_EMOJIS.length - 1)]);

        // Tính tiền thắng theo luật x2/x3/x4
        const summary = {}; // userId: tổng tiền thắng
        for (const userId in baucuaSession.bets) {
            const bets = baucuaSession.bets[userId];
            let totalWin = 0;
            let totalBet = 0;
            let matchedConCount = 0;

            // Tính tổng tiền cược và số con trúng
            for (const [emoji, amount] of Object.entries(bets)) {
                totalBet += amount;
                const count = results.filter(r => r === emoji).length;
                if (count > 0) {
                    matchedConCount += count;
                    totalWin += amount * count; // Cộng tiền thắng cho mỗi con trúng
                }
            }

            // Tính tiền thắng cho từng người chơi
            if (matchedConCount === 1) {
                totalWin += totalBet; // Nếu chỉ có 1 con trúng, trả lại toàn bộ tiền đã đặt
            } else if (matchedConCount === 2) {
                totalWin += totalBet * 2; // Nếu 2 con trúng, nhân x3
            } else if (matchedConCount === 3) {
                totalWin += totalBet * 3; // Nếu 3 con trúng, nhân x4
            }

            summary[userId] = totalWin;
        }

        // Cập nhật tiền cho người thắng
        for (const userId in summary) {
            const winAmount = summary[userId];
            if (winAmount > 0) await addMoney(userId, winAmount);
        }

        // Tạo kết quả hiển thị
        let resultText = `🎉 **Kết quả bầu cua:** ${results.join(" ")}\n\n`;
        for (const userId in summary) {
            const u = await client.users.fetch(userId);
            const bets = baucuaSession.bets[userId];
            const totalBet = Object.values(bets).reduce((a,b)=>a+b,0);
            const gain = summary[userId];
            if (gain > 0) resultText += `✅ ${u.username} thắng ${gain} tiền (đặt ${totalBet})\n`;
            else resultText += `❌ ${u.username} thua ${totalBet} tiền\n`;
        }

        await betMessage.edit(resultText);

        baucuaSession = null;
        userBetAmounts = {};

    } catch(err) {
        console.error("Lỗi !baucua:", err);
        message.reply("❌ Có lỗi xảy ra khi chạy !baucua, thử lại sau!");
        baucuaSession = null;
        userBetAmounts = {};
    }
}

// DM bot để đặt số tiền
client.on("messageCreate", async (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith("!datcu")) return;
    if (!baucuaSession) {
        message.reply("❌ Hiện không có phiên Bầu Cua nào!");
        return;
    }

    const args = message.content.trim().split(/ +/);
    if (args.length < 2) {
        message.reply("❗ Cách dùng: !datcu <số tiền>");
        return;
    }

    const amount = parseInt(args[1]);
    if (isNaN(amount) || amount <= 0) {
        message.reply("❌ Số tiền không hợp lệ!");
        return;
    }

    const userDb = await getUser(message.author.id);
    if (userDb.money < amount) {
        message.reply(`❌ Bạn không đủ tiền để đặt ${amount} tiền!`);
        return;
    }

    userBetAmounts[message.author.id] = amount;
    message.reply(`✅ Bạn đã đặt ${amount} tiền cho phiên Bầu Cua. React để chọn con muốn cược!`);
});

// Khi người chơi react
client.on("messageReactionAdd", async (reaction, user) => {
    if (user.bot) return;
    if (!baucuaSession) return;
    if (reaction.message.id !== baucuaSession.msg.id) return;

    const emoji = reaction.emoji.name;
    if (!BAUCUA_EMOJIS.includes(emoji)) return;

    await db.read();

    const betAmount = userBetAmounts[user.id] || 200;
    const userDb = await getUser(user.id);

    if (userDb.money < betAmount) {
        reaction.users.remove(user.id);
        user.send(`❌ Bạn không đủ tiền để đặt cược ${betAmount} tiền!`);
        return;
    }

    await subMoney(user.id, betAmount);

    const userBets = baucuaSession.bets[user.id] || {};
    userBets[emoji] = (userBets[emoji] || 0) + betAmount;
    baucuaSession.bets[user.id] = userBets;

    await db.write();

    user.send(`✅ Bạn đã cược ${betAmount} tiền vào ${emoji}`);
});

// Gắn command !baucua
client.on("messageCreate", async message => {
    if (message.author.bot) return;
    if (!message.content.startsWith("!baucua")) return;

    const args = message.content.trim().split(/ +/).slice(1);
    await cmdBaucua(message, args);
});
// =====================
//       BỐC THĂM
// =====================
async function cmdBoctham(message) {

    await db.read();
    const userId = message.author.id;
    const now = Date.now();

    db.data.boctham[userId] ||= { lastDate: 0, count: 0 };
    const info = db.data.boctham[userId];

    const today = new Date().toISOString().slice(0, 10);
    if (info.lastDate !== today) {
        info.lastDate = today;
        info.count = 3;
    }

    if (info.count <= 0) {
        message.reply("❌ Bạn đã hết lượt bốc thăm hôm nay!");
        return;
    }

    const user = await getUser(userId);
    if (user.money < 200) {
        message.reply("❌ Bạn cần 200 tiền để bốc thăm!");
        return;
    }

    await subMoney(userId, 200);
    info.count--;

    const rand = Math.random() * 100;
    let reward = 0;

    if (rand <= 40) reward = Math.floor(Math.random() * 51) + 50; 
    else if (rand <= 70) reward = Math.floor(Math.random() * 201) + 100;
    else if (rand <= 90) reward = Math.floor(Math.random() * 301) + 300;
    else if (rand <= 98) reward = Math.floor(Math.random() * 1501) - 1000;
    else reward = 4000;

    await addMoney(userId, reward);
    await db.write();

    message.reply(`🎁 Bạn bốc thăm được ${reward} tiền. Lượt còn lại: ${info.count}`);
}
// ===================== CHUYỂN TIỀN =====================
async function cmdChuyentien(message, args) {
    if (args.length < 2) {
        message.reply("❗ Cách dùng: !chuyentien @user <số tiền>");
        return;
    }

    const target = message.mentions.users.first();
    if (!target) return message.reply("❌ Bạn phải tag người nhận!");

    const amount = parseInt(args[1]);
    if (isNaN(amount) || amount <= 0) return message.reply("❌ Số tiền không hợp lệ!");
    if (target.id === message.author.id) return message.reply("❌ Không thể tự chuyển tiền cho chính mình!");

    const sender = await getUser(message.author.id);
    if (sender.money < amount) return message.reply("❌ Bạn không đủ tiền!");

    await subMoney(message.author.id, amount);
    await addMoney(target.id, amount);
    message.reply(`💸 Bạn đã chuyển **${amount} tiền** cho **${target.username}**`);
}

// ===================== CHUYỂN XU =====================
async function cmdChuyenxu(message, args) {
    if (args.length < 2) {
        message.reply("❗ Cách dùng: !chuyenxu @user <số xu>");
        return;
    }

    const target = message.mentions.users.first();
    if (!target) return message.reply("❌ Bạn phải tag người nhận!");

    const amount = parseInt(args[1]);
    if (isNaN(amount) || amount <= 0) return message.reply("❌ Số xu không hợp lệ!");
    if (target.id === message.author.id) return message.reply("❌ Không thể tự chuyển xu cho chính mình!");

    const sender = await getUser(message.author.id);
    if (sender.xu < amount) return message.reply("❌ Bạn không đủ xu!");

    await subXu(message.author.id, amount);
    await addXu(target.id, amount);
    message.reply(`🔁 Bạn đã chuyển **${amount} xu** cho **${target.username}**`);
}

// =====================
// ===================== XÌ DÁCH (BLACKJACK KIỂU MỚI) =====================
let blackjackSession = {};
function calcPoint(hand) {
    let total=0, ace=0;
    for(const card of hand){
        const v = card.slice(0,-1);
        if(["J","Q","K"].includes(v)) total+=10;
        else if(v==="A"){ total+=11; ace++;}
        else total+=parseInt(v);
    }
    while(total>21 && ace>0){ total-=10; ace--;}
    return total;
}

async function cmdXidach(message, args) {
    if(args.length<1){ message.reply("Cách dùng: !xidach <số tiền>"); return;}
    const bet = parseInt(args[0]);
    if(isNaN(bet)||bet<=0){ message.reply("Số tiền không hợp lệ!"); return;}

    const user = await getUser(message.author.id);
    if(user.money<bet){ message.reply("Bạn không đủ tiền!"); return;}
    await subMoney(message.author.id, bet);

    function dealCard(){ 
        const values=["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
        const suits=["♠","♥","♦","♣"];
        return values[randomInt(0,values.length-1)]+suits[randomInt(0,suits.length-1)];
    }

    const session = blackjackSession[message.channel.id]||{ users:{}, dealer:[], msg:null };
    session.users[message.author.id]={ hand:[dealCard(), dealCard()], bet };
    if(session.dealer.length===0) session.dealer=[dealCard(), dealCard()];

    const hitButton = new ButtonBuilder().setCustomId("hit_"+message.author.id).setEmoji("🃏").setStyle(ButtonStyle.Success);
    const standButton = new ButtonBuilder().setCustomId("stand_"+message.author.id).setEmoji("❌").setStyle(ButtonStyle.Danger);
    const row = new ActionRowBuilder().addComponents(hitButton, standButton);

    const playerHand = session.users[message.author.id].hand;
    const dealerHand = session.dealer;
    const text = `🃏 **XÌ DÁCH**\n👤 Bạn: ${playerHand.join(" ")} (${calcPoint(playerHand)})\n🤖 Nhà cái: 🂠 ${dealerHand[1]}`;
    
    if(!session.msg) session.msg = await message.channel.send({content:text, components:[row]});
    else await session.msg.edit({content:text, components:[row]});

    blackjackSession[message.channel.id]=session;
}

client.on("interactionCreate", async (interaction)=>{
    if(!interaction.isButton()) return;
    const [action,userId]=interaction.customId.split("_");
    const channelId=interaction.channel.id;
    if(!blackjackSession[channelId]) return;
    if(userId!==interaction.user.id.toString()){ interaction.reply({content:"Không phải phiên của bạn!",ephemeral:true}); return;}

    const session = blackjackSession[channelId];
    const player = session.users[userId];
    if(action==="hit"){
        player.hand.push([ "A","2","3","4","5","6","7","8","9","10","J","Q","K" ][randomInt(0,12)] + ["♠","♥","♦","♣"][randomInt(0,3)]);
        const total = calcPoint(player.hand);
        if(total>21){
            await interaction.update({content:`👤 Bạn: ${player.hand.join(" ")} (${total})\n❌ Quá 21! Bạn thua ${player.bet} tiền!`,components:[]});
            blackjackSession[channelId]=null;
            return;
        }
        await interaction.update({content:`👤 Bạn: ${player.hand.join(" ")} (${total})\n🤖 Nhà cái: 🂠 ${session.dealer[1]}`,components:interaction.message.components});
    }
    if(action==="stand"){
        let dealerHand=session.dealer;
        while(calcPoint(dealerHand)<17){
            dealerHand.push([ "A","2","3","4","5","6","7","8","9","10","J","Q","K" ][randomInt(0,12)] + ["♠","♥","♦","♣"][randomInt(0,3)]);
        }
        const playerTotal = calcPoint(player.hand);
        const dealerTotal = calcPoint(dealerHand);
        let resultText=`👤 Bạn: ${player.hand.join(" ")} (${playerTotal})\n🤖 Nhà cái: ${dealerHand.join(" ")} (${dealerTotal})\n`;
        if(dealerTotal>21 || playerTotal>dealerTotal){
            await addMoney(userId,player.bet*2);
            resultText+=`✅ Bạn thắng ${player.bet*2} tiền!`;
        } else if(playerTotal===dealerTotal) {
            await addMoney(userId,player.bet);
            resultText+=`⚖️ Hòa! Bạn được trả lại ${player.bet} tiền.`;
        } else resultText+=`❌ Bạn thua ${player.bet} tiền!`;

        await interaction.update({content:resultText,components:[]});
        blackjackSession[channelId]=null;
    }
});
// =====================
//      ĂN XIN BOT (GIỚI HẠN 2 LẦN / NGÀY)
// =====================
async function cmdAnxin(message) {
    const userId = message.author.id;
    await db.read();

    // Khởi tạo data ăn xin nếu chưa có
    db.data.anxin ||= {};
    db.data.anxin[userId] ||= { lastDate: "", count: 0 };

    const info = db.data.anxin[userId];
    const today = new Date().toISOString().slice(0, 10);

    // Nếu ngày khác hôm trước, reset lượt
    if (info.lastDate !== today) {
        info.lastDate = today;
        info.count = 2;
    }

    if (info.count <= 0) {
        message.reply("❌ Bạn đã dùng hết 2 lần ăn xin hôm nay!");
        return;
    }

    const user = await getUser(userId);

    // Xác suất: 50% → 600 xu, 50% → 200-599 xu
    const rand = Math.random();
    let reward = 0;
    if (rand < 0.5) reward = 600;
    else reward = Math.floor(Math.random() * (599 - 200 + 1)) + 200;

    await addXu(userId, reward);

    info.count--;
    await db.write();

    message.reply(`🪙 Bạn xin được ${reward} xu từ bot! Lượt còn lại hôm nay: ${info.count}`);
}
// =====================
//        VAY XU
// =====================
async function cmdVay(message, args) {
    const userId = message.author.id;
    let currentCoins = await getUserCoins(userId) || 0;
    let userDebt = await getUserDebt(userId) || 0;

    if (userDebt > 0) {
        return message.reply(
            `❌ Bạn vẫn đang nợ bot **${userDebt} xu**, bạn phải trả hết mới có thể vay tiếp!`
        );
    }

    const maxLoan = 10000;
    const interest = 0.1;
    let loanAmount = args[0] ? parseInt(args[0]) : maxLoan;

    if (isNaN(loanAmount) || loanAmount <= 0) {
        return message.reply("❌ Vui lòng nhập số xu hợp lệ để vay!");
    }

    if (loanAmount > maxLoan) loanAmount = maxLoan;

    const totalOwed = Math.floor(loanAmount * (1 + interest));

    currentCoins += loanAmount;
    userDebt = totalOwed;

    await setUserCoins(userId, currentCoins);
    await setUserDebt(userId, userDebt);

    message.reply(
        `✅ Bạn đã vay **${loanAmount} xu**.\n` +
        `💰 Bạn sẽ phải trả lại **${totalOwed} xu** (bao gồm 10% lãi).\n` +
        `Hiện tại bạn có **${currentCoins} xu**, nợ hiện tại: **${userDebt} xu**.`
    );
} // <- Đóng cmdVay ở đây

// =====================
//        TRẢ LÃI + NỢ
// =====================
async function cmdTralai(message, args) {
    const userId = message.author.id;
    let currentCoins = await getUserCoins(userId) || 0;
    let userDebt = await getUserDebt(userId) || 0;

    if (userDebt <= 0) {
        return message.reply("✅ Bạn không còn nợ bot nữa!");
    }

    if (!args[0]) {
        return message.reply("❌ Vui lòng nhập số xu muốn trả!");
    }

    let payAmount = parseInt(args[0]);
    if (isNaN(payAmount) || payAmount <= 0) {
        return message.reply("❌ Vui lòng nhập số xu hợp lệ để trả!");
    }

    if (payAmount > currentCoins) {
        return message.reply(`❌ Bạn không đủ xu để trả! Hiện tại bạn có ${currentCoins} xu.`);
    }

    if (payAmount > userDebt) payAmount = userDebt;

    currentCoins -= payAmount;
    userDebt -= payAmount;

    await setUserCoins(userId, currentCoins);
    await setUserDebt(userId, userDebt);

    let replyText = `✅ Bạn đã trả **${payAmount} xu**.\n💰 Hiện tại bạn còn **${currentCoins} xu**.`;

    if (userDebt > 0) {
        replyText += `\n⚠️ Nợ còn lại: **${userDebt} xu**.`;
    } else {
        replyText += `\n🎉 Bạn đã trả hết nợ!`;
    }

    message.reply(replyText);
} // <- Đóng cmdTralai

// =====================
//      HELP (FULL + BẢNG GIÁ)
// =====================

async function cmdHelp(message) {
    const helpText = `
🎮 **Các lệnh Casino Bot**

━━━━━━━━━━━━━━━━━━
💰 **TIỀN & XU**
• !tien — Xem số tiền và xu hiện có
• !diemdanh — Điểm danh nhận xu mỗi ngày

━━━━━━━━━━━━━━━━━━
🔄 **ĐỔI XU → TIỀN**
• !doixu <số_xu>

📊 BẢNG GIÁ ĐỔI XU
• 100 xu → 50 tiền
• 200 xu → 150 tiền
• 500 xu → 450 tiền
• 1000 xu → 900 tiền
• Từ 2000 xu trở lên → x0.9
  (Ví dụ: 2000 xu = 1800 tiền)

━━━━━━━━━━━━━━━━━━
🪙 **TUNG XU**
• !tungxu <số_xu> ngửa / sấp
• 50% thắng nhận x2
• 50% thua mất xu

━━━━━━━━━━━━━━━━━━
🎲 **TÀI XỈU**
• !taixiu <tiền> <chẵn/lẻ/tài/xỉu>
• Quy tắc theo tổng 3 xí ngầu

━━━━━━━━━━━━━━━━━━
🦀🐟 **BẦU CUA**
• !baucua — đặt cược bằng reaction
• Mỗi reaction = 500 tiền
• Trúng ăn theo số con xuất hiện

━━━━━━━━━━━━━━━━━━
🎁 **BỐC THĂM**
• !boctham — mất 200 tiền
• 3 lượt mỗi ngày

━━━━━━━━━━━━━━━━━━
🃏 **XÌ DÁCH**
• !xidach <số tiền> — tham gia game xì dách
• Bấm nút Rút / Dừng
━━━━━━━━━━━━━━━━━━
🔄 **CHUYỂN TIỀN**
• !chuyentien @user <số tiền>
• !chuyenxu @user <số xu>
━━━━━━━━━━━━━━━━━━
🥺 **ĂN XIN**
• !anxin (xu từ bot)
50% 600+
50% 600-
giới hạn từ 1-1000
━━━━━━━━━━━━━━━━━━
💸💸 **VAY TIỀN**
• !vay (xu)
• mỗi lần vay sẽ lãi 10%
• tối đa có thể vay 10k xu
━━━━━━━━━━━━━━━━━━
💸💸 **TRẢ TIỀN + LÃI**
• !tralai (xu)
• nếu như b nợ chưa trả thì sẽ k thể vay thêm

━━━━━━━━━━━━━━━━━━
⚠️ Một số game có delay xử lý
━━━━━━━━━━━━━━━━━━
`;
    await message.reply(helpText);
}

// =====================
//      MAIN EVENTS
// =====================

client.on("ready", async () => {
    await initDB();
    console.log(`Logged in as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();

    switch (cmd) {
        case "diemdanh": await cmdDiemdanh(message); break;
        case "tien": await cmdTien(message); break;
        case "doixu": await cmdDoixu(message,args); break;
        case "tungxu": await cmdTungxu(message,args); break;
        case "taixiu": await cmdTaixiu(message,args); break;
        case "baucua": await cmdBaucua(message); break;
        case "boctham": await cmdBoctham(message); break;
        case "chuyentien": await cmdChuyentien(message,args); break;
        case "chuyenxu": await cmdChuyenxu(message,args); break;
        case "xidach": await cmdXidach(message,args); break;
        case "anxin": await cmdAnxin(message); break;
        case "vay": await cmdVay(message, args); break;
        case "tralai": await cmdTralai(message, args); break;
        case "help": await cmdHelp(message); break;
        default: message.reply("❌ Lệnh không hợp lệ!");
    }
});

// -------------------- BOT LOGIN --------------------
client.login(process.env.TOKEN);

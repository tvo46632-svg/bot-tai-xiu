// ================================================
//                  DISCORD CASINO BOT
//        FULL VERSION — ~960+ LINES OF CODE
// ================================================

// ---------------- IMPORT MODULES ----------------
const {
    Client,
    GatewayIntentBits,
    Partials,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");
let baucuaSession = null;
const BAUCUA_EMOJIS = ["🦀", "🐟", "🫎", "🦐", "🐔", "🍐"];
const { SlashCommandBuilder } = require('discord.js');
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
//      ĐIỂM DANH JACKPOT (ANIMATION MƯỢT)
// =====================
async function cmdDiemdanh(message) {
    const userId = message.author.id;
    await db.read();

    const today = new Date().toISOString().slice(0, 10);

    // 1. Kiểm tra điểm danh
    if (db.data.daily[userId] === today) {
        return message.reply("❌ Bạn đã điểm danh hôm nay rồi!");
    }

    // 2. Tính toán kết quả trước (nhưng chưa hiện)
    const rand = Math.random() * 100;
    let xuReward = 0;
    if (rand <= 50) xuReward = 1000;
    else if (rand <= 75) xuReward = 2000;
    else if (rand <= 90) xuReward = 2500;
    else if (rand <= 98) xuReward = 3000;
    else xuReward = 3200;

    // Danh sách các số ảo để nhảy
    const fakeNumbers = ["1,000", "2,500", "3,200", "500", "1,200", "2,000", "3,000", "800"];

    // 3. Gửi tin nhắn bắt đầu
    const msg = await message.reply("🎰 **MÁY QUAY THƯỞNG ĐANG CHẠY...** 🎰");

    // 4. Vòng lặp nhảy số liên tục (Animation)
    for (let i = 0; i < 6; i++) {
        // Lấy ngẫu nhiên một số trong mảng fakeNumbers để hiển thị ảo
        const randomFake = fakeNumbers[Math.floor(Math.random() * fakeNumbers.length)];
        
        // Tạo thanh progress bar chạy ảo
        const progress = "▓".repeat(i + 1) + "░".repeat(5 - i);
        
        await msg.edit(`🎰 **JACKPOT SPINNING** 🎰\n━━━━━━━━━━━━━━━━━━\n> **[ 🎰 ${randomFake} 🎰 ]**\n━━━━━━━━━━━━━━━━━━\n\`${progress}\` *Đang khớp số...*`);
        
        // Tốc độ nhảy (400ms là mức an toàn nhất để không bị Discord chặn)
        await new Promise(res => setTimeout(res, 400));
    }

    // 5. Lưu dữ liệu
    db.data.daily[userId] = today;
    await addXu(userId, xuReward);

    // 6. Hiển thị kết quả cuối cùng
    const isJackpot = xuReward >= 3000;
    const finalHeader = isJackpot ? "🎊 🔥 **SIÊU CẤP JACKPOT** 🔥 🎊" : "✅ **ĐIỂM DANH THÀNH CÔNG**";
    
    await msg.edit(`${finalHeader}\n━━━━━━━━━━━━━━━━━━\n👤 Người chơi: **${message.author.username}**\n💰 Nhận được: **${xuReward.toLocaleString()} xu**\n━━━━━━━━━━━━━━━━━━\n*Số dư mới của bạn đã được cập nhật!*`);
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
// 1. Phải đảm bảo có hàm tạo độ trễ này
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ==========================================
// 2. HÀM XỬ LÝ ĐỔI TIỀN CHÍNH
// ==========================================
async function handleExchange(message, amount, type) {
    try {
        if (!amount || isNaN(amount) || amount <= 0) {
            return message.reply("❌ Số lượng không hợp lệ!");
        }

        const user = await getUser(message.author.id);
        if (!user) return message.reply("❌ Không tìm thấy dữ liệu người dùng!");

        // --- TRƯỜNG HỢP: ĐỔI XU -> TIỀN ---
        if (type === "xu") {
            if (user.xu < amount) return message.reply(`❌ Bạn không đủ xu! (Hiện có: ${user.xu.toLocaleString()})`);
            
            let phi = amount < 5000 ? 0 : (amount < 20000 ? 0.20 : 0.35);
            const moneyOut = Math.floor(amount * (1 - phi));

            const msg = await message.reply(`⏳ Đang xử lý: **Xu ➔ Tiền** (Phí ${phi * 100}%)...`);
            await sleep(2000);
            await msg.edit("⏳ Đang xác nhận giao dịch... [50%]");
            await sleep(2000);

            await subXu(message.author.id, amount);
            await addMoney(message.author.id, moneyOut);

            const finalMsg = `✅ **THÀNH CÔNG**\n🔁 Đã đổi: **${amount.toLocaleString()} xu**\n💰 Nhận: **${moneyOut.toLocaleString()} tiền**\n*(Tin nhắn tự xóa sau 5s)*`;
            
            return await msg.edit(finalMsg).then(m => {
                setTimeout(() => {
                    m.delete().catch(() => {}); 
                    message.delete().catch(() => {}); 
                }, 5000);
            });
        }

        // --- TRƯỜNG HỢP: ĐỔI TIỀN -> XU ---
        if (type === "tien" || type === "tiền") {
            if (user.money < amount) return message.reply(`❌ Bạn không đủ tiền! (Hiện có: ${user.money.toLocaleString()})`);

            const msg = await message.reply("⏳ Đang xử lý: **Tiền ➔ Xu**...");
            await sleep(1500);
            await msg.edit("⏳ Đang nạp xu vào ví... [60%]");
            await sleep(1500);

            await subMoney(message.author.id, amount);
            await addXu(message.author.id, amount);

            const finalMsg = `✅ **THÀNH CÔNG**\n🔁 Đã đổi: **${amount.toLocaleString()} tiền**\n💎 Nhận: **${amount.toLocaleString()} xu**\n*(Tin nhắn tự xóa sau 5s)*`;
            
            return await msg.edit(finalMsg).then(m => {
                setTimeout(() => {
                    m.delete().catch(() => {}); 
                    message.delete().catch(() => {});
                }, 5000);
            });
        }
    } catch (e) {
        console.error("Lỗi tại handleExchange:", e);
    }
}

// ==========================================
// 3. CÁC HÀM GỌI LỆNH (COMMANDS)
// ==========================================
async function cmdDoi(message, args) {
    if (args.length < 2) return message.reply("❗ Cách dùng: `!doi <số_lượng> <xu/tiền>`");
    await handleExchange(message, parseInt(args[0]), args[1].toLowerCase());
}

async function cmdDoixu(message, args) {
    if (args.length < 1) return message.reply("❗ Cách dùng: `!doixu <số_xu>`");
    await handleExchange(message, parseInt(args[0]), "xu");
}

async function cmdDoitien(message, args) {
    if (args.length < 1) return message.reply("❗ Cách dùng: `!doitien <số_tiền>`");
    await handleExchange(message, parseInt(args[0]), "tien");
}
// 1. Khai báo lệnh Slash
const doiCommand = new SlashCommandBuilder()
    .setName('doi')
    .setDescription('Đổi Xu/Tiền ở chế độ ẩn (Chỉ bạn thấy)')
    .addIntegerOption(option => 
        option.setName('amount').setDescription('Số lượng').setRequired(true))
    .addStringOption(option =>
        option.setName('type').setDescription('Loại').setRequired(true)
            .addChoices({ name: 'Xu sang Tiền', value: 'xu' }, { name: 'Tiền sang Xu', value: 'tien' }));

// 2. Sự kiện Ready (Đăng ký lệnh và Online)
client.on("ready", async () => {
    try {
        await initDB(); // Khởi tạo database
        
        // Dòng này cực kỳ quan trọng để lệnh /doi hiện lên Discord
        await client.application.commands.set([doiCommand]); 
        
        console.log(`✅ Bot đã online: ${client.user.tag}`);
    } catch (e) {
        console.error("Lỗi khi khởi động:", e);
    }
});

// 3. Xử lý Slash Command (Lệnh gạch chéo)
client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'doi') {
        const amount = interaction.options.getInteger('amount');
        const type = interaction.options.getString('type');

        // Phản hồi ẩn (chỉ người dùng thấy)
        await interaction.deferReply({ ephemeral: true });

        try {
            const user = await getUser(interaction.user.id);
            if (!user) return interaction.editReply("❌ Bạn chưa có dữ liệu!");

            if (type === 'xu') {
                if (user.xu < amount) return interaction.editReply("❌ Không đủ xu!");
                let phi = amount < 5000 ? 0 : (amount < 20000 ? 0.20 : 0.35);
                const moneyOut = Math.floor(amount * (1 - phi));
                
                await subXu(interaction.user.id, amount);
                await addMoney(interaction.user.id, moneyOut);
                await interaction.editReply(`✅ Thành công! Đã đổi **${amount} xu** lấy **${moneyOut} tiền**.`);
            } else {
                if (user.money < amount) return interaction.editReply("❌ Không đủ tiền!");
                await subMoney(interaction.user.id, amount);
                await addXu(interaction.user.id, amount);
                await interaction.editReply(`✅ Thành công! Đã đổi **${amount} tiền** lấy **${amount} xu**.`);
            }
        } catch (err) {
            console.error(err);
            await interaction.editReply("❌ Lỗi hệ thống!");
        }
    }
});
// =====================
//      TUNG XU
// =====================

async function cmdTungxu(message, args) {
    if (args.length < 2) {
        return message.reply("### ❗ Cách dùng: `!tungxu <số_xu> <n/s>`");
    }

    const betXu = parseInt(args[0]);
    let userChoice = args[1].toLowerCase();

    if (userChoice === "n" || userChoice === "ngửa") userChoice = "ngửa";
    if (userChoice === "s" || userChoice === "sấp") userChoice = "sấp";

    if (isNaN(betXu) || betXu <= 0) return message.reply("> ❌ Số xu không hợp lệ!");
    if (!["ngửa", "sấp"].includes(userChoice)) return message.reply("> ❌ Chọn: `ngửa` (n) hoặc `sấp` (s)!");

    const user = await getUser(message.author.id);
    if (user.xu < betXu) return message.reply("> ❌ Bạn không đủ xu để cược!");

    await subXu(message.author.id, betXu);

    const EMOTE_NGUA = "🏛️"; 
    const EMOTE_SAP = "🟡";  

    // Tin nhắn ban đầu nhỏ gọn
    const msg = await message.reply(`> 🪙 **${message.author.username}** đang búng xu...`);

    const spinFrames = [EMOTE_SAP, "➖", EMOTE_NGUA, "➖", EMOTE_SAP, "✨"]; 
    
    for (let i = 0; i < spinFrames.length; i++) {
        await new Promise(res => setTimeout(res, 300)); 
        // Dùng định dạng nhỏ gọn
        await msg.edit(`### ✨ Đang xoay... ${spinFrames[i]}`);
    }

    const result = Math.random() < 0.5 ? "ngửa" : "sấp";
    const resultEmoji = (result === "ngửa") ? EMOTE_NGUA : EMOTE_SAP;

    await new Promise(res => setTimeout(res, 500));

    if (result === userChoice) {
        const rewardXu = betXu * 2;
        await addXu(message.author.id, rewardXu);
        
        // Kết quả trình bày gọn gàng trong Blockquote
        return await msg.edit(`### 🪙 KẾT QUẢ: ${resultEmoji}\n> 🎉 **Thắng:** +${rewardXu.toLocaleString()} xu`);
    } else {
        return await msg.edit(`### 🪙 KẾT QUẢ: ${resultEmoji}\n> 💸 **Thua:** -${betXu.toLocaleString()} xu`);
    }
}
// =====================
//      TÀI XỈU
// =====================
async function cmdTaixiu(message) {
    const userId = message.author.id;
    
    // 1. Kiểm tra nợ trước khi chơi (tích hợp từ yêu cầu trước của bạn)
    const userDebt = await getUserDebt(userId) || 0;
    if (userDebt > 0) {
        return message.reply(`### 🚫 Truy cập bị chặn\n> Bạn đang nợ **${userDebt.toLocaleString()} xu**. Hãy trả nợ trước khi tham gia sòng bạc!`);
    }

    // 2. Tạo các nút bấm lựa chọn
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('tx_tai').setLabel('TÀI (11-18)').setStyle(ButtonStyle.Danger).setEmoji('🔴'),
        new ButtonBuilder().setCustomId('tx_xiu').setLabel('XỈU (3-10)').setStyle(ButtonStyle.Primary).setEmoji('🔵'),
        new ButtonBuilder().setCustomId('tx_chan').setLabel('CHẴN').setStyle(ButtonStyle.Secondary).setEmoji('2️⃣'),
        new ButtonBuilder().setCustomId('tx_le').setLabel('LẺ').setStyle(ButtonStyle.Secondary).setEmoji('1️⃣')
    );

    const mainMsg = await message.reply({
        content: `### 🎲 SÒNG BẠC TÀI XỈU\n> Vui lòng chọn cửa đặt cược bên dưới!\n> *Lưu ý: Cược tối thiểu 300 - Tối đa 10,000*`,
        components: [row]
    });

    // 3. Thu thập lựa chọn cửa cược
    const filter = i => i.user.id === userId;
    const collector = mainMsg.createMessageComponentCollector({ filter, time: 30000 });

    collector.on('collect', async i => {
        const choiceMap = { 'tx_tai': 'tài', 'tx_xiu': 'xỉu', 'tx_chan': 'chẵn', 'tx_le': 'lẻ' };
        const userChoice = choiceMap[i.customId];

        // 4. Yêu cầu nhập số tiền cược
        await i.update({ content: `### 💸 ĐẶT CƯỢC: ${userChoice.toUpperCase()}\n> Vui lòng nhập số tiền muốn cược (300 - 10,000):`, components: [] });

        const moneyFilter = m => m.author.id === userId && !isNaN(m.content);
        const moneyCollector = message.channel.createMessageCollector({ filter: moneyFilter, time: 20000, max: 1 });

        moneyCollector.on('collect', async m => {
            const betMoney = parseInt(m.content);
            
            // Xóa tin nhắn nhập tiền của người dùng cho gọn
            if (m.deletable) m.delete().catch(() => {});

            // Kiểm tra điều kiện tiền cược
            if (betMoney < 300 || betMoney > 10000) 
                return mainMsg.edit(`> ❌ Tiền cược không hợp lệ (300 - 10,000). Vui lòng thử lại lệnh!`);

            const user = await getUser(userId);
            if (user.money < betMoney) 
                return mainMsg.edit(`> ❌ Bạn không đủ tiền! Bạn chỉ còn **${user.money.toLocaleString()}** tiền.`);

            // Bắt đầu ván đấu
            await subMoney(userId, betMoney);
            
            // 5. Animation Xóc Đĩa
            const xocFrames = ["🎲 ▬ ▬ ▬", "▬ 🎲 ▬ ▬", "▬ ▬ 🎲 ▬", "▬ ▬ ▬ 🎲"];
            for (let j = 0; j < 6; j++) {
                await mainMsg.edit(`### 🎲 ĐANG XÓC ĐĨA...\n> **[ ${xocFrames[j % 4]} ]**`);
                await new Promise(res => setTimeout(res, 400));
            }

            // 6. Tính toán kết quả
            const d1 = Math.floor(Math.random() * 6) + 1;
            const d2 = Math.floor(Math.random() * 6) + 1;
            const d3 = Math.floor(Math.random() * 6) + 1;
            const sum = d1 + d2 + d3;
            const diceEmojis = ["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];

            let win = false;
            if (userChoice === "tài" && sum >= 11) win = true;
            if (userChoice === "xỉu" && sum <= 10) win = true;
            if (userChoice === "chẵn" && sum % 2 === 0) win = true;
            if (userChoice === "lẻ" && sum % 2 === 1) win = true;

            // 7. Hiển thị kết quả
            const resultMsg = `### 🎲 KẾT QUẢ: ${diceEmojis[d1]} ${diceEmojis[d2]} ${diceEmojis[d3]} (${sum})`;
            if (win) {
                const gain = betMoney * 2;
                await addMoney(userId, gain);
                await mainMsg.edit(`${resultMsg}\n> ✅ Chúc mừng! Bạn chọn **${userChoice}** và thắng **+${gain.toLocaleString()}** tiền.`);
            } else {
                await mainMsg.edit(`${resultMsg}\n> ❌ Rất tiếc! Bạn chọn **${userChoice}** và đã mất **-${betMoney.toLocaleString()}** tiền.`);
            }
        });
    });

    collector.on('end', collected => {
        if (collected.size === 0) mainMsg.edit({ content: "> ⏳ Đã hết thời gian lựa chọn.", components: [] }).catch(() => {});
    });
}
// =====================
// BẦU CUA CÓ HIỆU ỨNG "SỐC DĨA" + TUỲ Ý TIỀN
// =====================
async function cmdBaucua(message, args = []) {
    try {
        if (typeof baucuaSession === 'undefined' || typeof BAUCUA_EMOJIS === 'undefined') {
            return console.log("Lỗi: Hãy khai báo baucuaSession và BAUCUA_EMOJIS ở đầu file!");
        }

        if (baucuaSession) {
            const msgErr = await message.reply("⚠️ Đang có phiên bầu cua khác, vui lòng đợi!");
            setTimeout(() => { msgErr.delete().catch(() => {}); message.delete().catch(() => {}); }, 5000);
            return;
        }

        // 1. LẤY MỨC CƯỢC (Mặc định 200 hoặc theo lệnh)
        let baseBet = 200;
        if (args.length > 0) {
            const bet = parseInt(args[0]);
            if (!isNaN(bet) && bet > 0) baseBet = bet;
        }

        // 2. KIỂM TRA TIỀN NGƯỜI TẠO (Nếu thiếu báo lỗi và xóa sau 5s)
        const baseUserDb = await getUser(message.author.id);
        if (!baseUserDb || baseUserDb.money < baseBet) {
            const msgErr = await message.reply(`❌ Bạn không đủ tiền để cược mức ${baseBet.toLocaleString()}! (Ví của bạn: ${baseUserDb?.money || 0})`);
            // Xóa tin nhắn báo lỗi và tin nhắn lệnh sau 5 giây
            setTimeout(() => { 
                msgErr.delete().catch(() => {}); 
                message.delete().catch(() => {}); 
            }, 5000);
            return;
        }

        baucuaSession = { channelId: message.channel.id, bets: {}, isCancelled: false };

        const betMessage = await message.channel.send(
            `🎯 **Bầu cua bắt đầu!**\n` +
            `👤 **${message.author.username}** đặt mức: **${baseBet.toLocaleString()}** / con.\n` +
            `👉 React để chọn (Tối đa 2 con). 0đ không được chơi.\n` +
            `🎲 **Đang xóc dĩa...**`
        );

        for (const emoji of BAUCUA_EMOJIS) await betMessage.react(emoji).catch(() => {});

        const filter = (reaction, user) => BAUCUA_EMOJIS.includes(reaction.emoji.name) && !user.bot;
        const collector = betMessage.createReactionCollector({ filter, time: 10000 });

        collector.on('collect', async (reaction, user) => {
            if (!baucuaSession || baucuaSession.isCancelled) return;
            const emoji = reaction.emoji.name;
            const userId = user.id;

            // KIỂM TRA TIỀN NGƯỜI VOTE (Nếu thiếu gỡ reaction ngay)
            const uDb = await getUser(userId);
            if (!uDb || uDb.money < baseBet) {
                return reaction.users.remove(userId).catch(() => {}); 
            }

            if (!baucuaSession.bets[userId]) baucuaSession.bets[userId] = {};
            const userCurrentBets = Object.keys(baucuaSession.bets[userId]);

            // HỦY BÀN NẾU QUÁ 2 CON
            if (!userCurrentBets.includes(emoji) && userCurrentBets.length >= 2) {
                baucuaSession.isCancelled = true;
                collector.stop();
                for (const uid in baucuaSession.bets) {
                    if (uid !== userId) {
                        const refund = Object.values(baucuaSession.bets[uid]).reduce((a, b) => a + b, 0);
                        await addMoney(uid, refund);
                    }
                }
                await betMessage.edit(`🚫 **BÀN BỊ HỦY!**\n**${user.username}** đặt con thứ 3. Tiền bị tịch thu, người khác được hoàn tiền.`).catch(() => {});
                
                // Xóa tin nhắn hủy bàn sau 10s để dọn dẹp
                setTimeout(() => { betMessage.delete().catch(() => {}); message.delete().catch(() => {}); }, 10000);
                baucuaSession = null;
                return;
            }

            if (!userCurrentBets.includes(emoji)) {
                baucuaSession.bets[userId][emoji] = baseBet; 
                await addMoney(userId, -baseBet);
            }
        });

        // 3. ANIMATION XÓC DĨA (Chạy liên tục 10s)
        const startAnim = Date.now();
        while (Date.now() - startAnim < 10000) {
            if (!baucuaSession || baucuaSession.isCancelled) break;
            const temp = [];
            for (let i = 0; i < 3; i++) temp.push(BAUCUA_EMOJIS[Math.floor(Math.random() * 6)]);
            await betMessage.edit(
                `🎯 **Bầu cua bắt đầu!** (Mức cược: **${baseBet.toLocaleString()}**)\n` +
                `🎲 **Đang xóc dĩa...**\n` +
                `> ${temp.join(" ")}\n` +
                `⏱️ Thời gian còn lại: ${Math.ceil((10000 - (Date.now() - startAnim)) / 1000)} giây`
            ).catch(() => {});
            await new Promise(res => setTimeout(res, 1500));
        }

        if (!baucuaSession || baucuaSession.isCancelled) return;

        // 4. KẾT QUẢ THẬT & TÍNH TIỀN ĐỘC LẬP
        const finalResults = [];
        for (let i = 0; i < 3; i++) finalResults.push(BAUCUA_EMOJIS[Math.floor(Math.random() * 6)]);

        const summaryText = [];
        for (const userId in baucuaSession.bets) {
            const uBets = baucuaSession.bets[userId];
            let totalWinForUser = 0;
            let totalBetForUser = 0;

            for (const [emoji, amount] of Object.entries(uBets)) {
                totalBetForUser += amount;
                const matchCount = finalResults.filter(r => r === emoji).length;
                if (matchCount > 0) {
                    totalWinForUser += amount + (amount * matchCount);
                }
            }

            if (totalWinForUser > 0) await addMoney(userId, totalWinForUser);
            
            const u = await client.users.fetch(userId).catch(() => ({ username: "Người chơi" }));
            if (totalWinForUser > 0) {
                summaryText.push(`✅ **${u.username}** thắng **+${totalWinForUser.toLocaleString()}** (Cược ${totalBetForUser})`);
            } else {
                summaryText.push(`❌ **${u.username}** thua **-${totalBetForUser.toLocaleString()}**`);
            }
        }

        // 5. HIỂN THỊ KẾT QUẢ & DỌN DẸP SAU 30S
        let resTxt = `🎉 **Kết quả:** ${finalResults.join(" ")}\n\n` + 
                     (summaryText.length > 0 ? summaryText.join("\n") : "Không có ai đặt cược!");

        await betMessage.edit(resTxt).catch(() => {});
        baucuaSession = null;

        // Xóa tin nhắn bàn cược sau 30 giây kết thúc
        setTimeout(() => { 
            betMessage.delete().catch(() => {}); 
            message.delete().catch(() => {}); 
        }, 30000);

    } catch (err) {
        console.error("Lỗi Bầu Cua:", err);
        baucuaSession = null;
    }
}
// =====================
//      BỐC THĂM MAY MẮN
// =====================
async function cmdBoctham(message) {
    await db.read();
    const userId = message.author.id;
    db.data.boctham[userId] ||= { lastDate: 0, count: 0 };
    const info = db.data.boctham[userId];

    const today = new Date().toISOString().slice(0, 10);
    if (info.lastDate !== today) { info.lastDate = today; info.count = 3; }
    if (info.count <= 0) return message.reply("> ❌ Bạn đã hết lượt bốc thăm hôm nay!");

    const user = await getUser(userId);
    if (user.money < 200) return message.reply("> ❌ Cần **200 tiền** để bốc thăm!");

    await subMoney(userId, 200);
    info.count--;

    // 1. Tính toán phần thưởng
    const rand = Math.random() * 100;
    let reward = 0;
    if (rand <= 40) reward = Math.floor(Math.random() * 51) + 50; 
    else if (rand <= 70) reward = Math.floor(Math.random() * 501) + 100;
    else if (rand <= 90) reward = Math.floor(Math.random() * 501) + 500;
    else if (rand <= 98) reward = Math.floor(Math.random() * 1501) - 1000;
    else reward = 4000;

    // 2. Phân loại Tier
    let tier = { name: "GỖ", emoji: "🪵", color: "🟫" };
    if (reward < 0) tier = { name: "RÁC", emoji: "🗑️", color: "🥀" };
    else if (reward === 4000) tier = { name: "THẦN THOẠI", emoji: "🌟", color: "👑" };
    else if (reward >= 1000) tier = { name: "KIM CƯƠNG", emoji: "💎", color: "🔹" };
    else if (reward >= 500) tier = { name: "VÀNG", emoji: "🟡", color: "🥇" };
    else if (reward >= 200) tier = { name: "SẮT", emoji: "⚪", color: "🥈" };

    // 3. Animation
    const msg = await message.reply("### 🎁 Đang mở hộp quà may mắn...");
    const allTiers = ["⚪ SẮT", "🟡 VÀNG", "💎 KIM CƯƠNG", "👑 THẦN THOẠI"];
    for (let i = 0; i < 3; i++) {
        await new Promise(res => setTimeout(res, 500));
        await msg.edit(`### 🎁 Đang bốc thăm...\n> ✨ Đang tìm thấy: **${allTiers[Math.floor(Math.random() * allTiers.length)]}**`);
    }

    await addMoney(userId, reward);
    await db.write();

    const statusText = reward >= 0 ? `Nhận: **+${reward.toLocaleString()}**` : `Mất: **${reward.toLocaleString()}**`;
    return await msg.edit(`### ${tier.emoji} HỘP QUÀ ${tier.name} ${tier.emoji}\n> ${tier.color} ${statusText} tiền\n> 🎫 Còn lại: \`${info.count}\` lượt`);
}
// ===================== CHUYỂN TIỀN =====================

async function cmdChuyentien(message, args) {
    const userId = message.author.id;
    
    // 1. Kiểm tra nợ trước tiên
    const userDebt = await getUserDebt(userId) || 0;
    if (userDebt > 0) {
        return message.reply(`### 🚫 Giao dịch bị khóa\n> Bạn đang nợ bot **${userDebt.toLocaleString()} xu**. Hãy dùng lệnh \`!tralai\` để trả nợ trước!`);
    }

    const target = message.mentions.users.first();
    const amount = parseInt(args[1]);

    // 2. Kiểm tra đầu vào
    if (!target || isNaN(amount) || amount <= 0) 
        return message.reply("> ❗ HD: `!chuyentien @user <số tiền>`");
    
    if (target.id === userId) 
        return message.reply("> ❌ Bạn không thể tự chuyển tiền cho chính mình!");

    const senderData = await getUser(userId);
    if (senderData.money < amount) 
        return message.reply("> ❌ Bạn không đủ tiền trong tài khoản!");

    // 3. Tính toán phí 5%
    const fee = Math.floor(amount * 0.05);
    const netAmount = amount - fee;

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('confirm_transfer').setLabel('Nhận tiền').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('cancel_transfer').setLabel('Từ chối').setStyle(ButtonStyle.Danger)
    );

    const mainMsg = await message.reply({
        content: `### 💸 Yêu cầu chuyển tiền\n> 👤 **Gửi:** ${message.author.username} ➔ **Nhận:** ${target.username}\n> 💰 **Thực nhận:** \`${netAmount.toLocaleString()}\` (Phí 5%: ${fee})\n> ⏳ *Hết hạn sau 60s.*`,
        components: [row]
    });

    // 4. Collector: Cho phép cả 2 nhấn nút
    const filter = i => (i.customId === 'confirm_transfer' || i.customId === 'cancel_transfer') && (i.user.id === target.id || i.user.id === userId);
    const collector = mainMsg.createMessageComponentCollector({ filter, time: 60000 });

    collector.on('collect', async i => {
        if (i.customId === 'confirm_transfer') {
            const finalCheck = await getUser(userId);
            if (finalCheck.money < amount) return i.update({ content: "> ❌ Người gửi không còn đủ tiền!", components: [] });

            await subMoney(userId, amount);
            await addMoney(target.id, netAmount);

            await i.update({
                content: `### ✅ Giao dịch thành công\n> 💸 **${target.username}** đã nhận **${netAmount.toLocaleString()}** tiền từ **${message.author.username}**.`,
                components: []
            });
        } else {
            await i.update({ content: `> ❌ Giao dịch đã bị hủy bởi **${i.user.username}**.`, components: [] });
        }
        collector.stop();
    });

    collector.on('end', collected => {
        if (collected.size === 0) mainMsg.edit({ content: "> ⏳ Giao dịch đã hết hạn.", components: [] }).catch(() => {});
    });
}
// ===================== CHUYỂN XU =====================
async function cmdChuyenxu(message, args) {
    const userId = message.author.id;

    // 1. Kiểm tra nợ
    const userDebt = await getUserDebt(userId) || 0;
    if (userDebt > 0) {
        return message.reply(`### 🚫 Giao dịch bị khóa\n> Bạn không thể chuyển xu khi đang nợ (**${userDebt.toLocaleString()} xu**).`);
    }

    const target = message.mentions.users.first();
    const amount = parseInt(args[1]);

    // 2. Kiểm tra đầu vào
    if (!target || isNaN(amount) || amount <= 0) 
        return message.reply("> ### ❗ HD: `!chuyenxu @user <số xu>`");
    
    if (target.id === userId) 
        return message.reply("> ❌ Không thể tự chuyển cho chính mình!");

    const senderData = await getUser(userId);
    if (senderData.xu < amount) 
        return message.reply("> ❌ Bạn không đủ xu!");

    // 3. Tính toán phí 7%
    const fee = Math.floor(amount * 0.07);
    const netXu = amount - fee;

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('confirm_xu').setLabel('Nhận Xu').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('cancel_xu').setLabel('Từ chối').setStyle(ButtonStyle.Danger)
    );

    const mainMsg = await message.reply({
        content: `### 🔁 Yêu cầu chuyển Xu\n> 👤 **Gửi:** ${message.author.username} ➔ **Nhận:** ${target.username}\n> 💰 **Thực nhận:** \`${netXu.toLocaleString()}\` xu (Phí 7%: ${fee})\n> ⏳ *Hết hạn sau 60s.*`,
        components: [row]
    });

    // 4. Collector: Cho phép cả 2 nhấn nút
    const filter = i => (i.customId === 'confirm_xu' || i.customId === 'cancel_xu') && (i.user.id === target.id || i.user.id === userId);
    const collector = mainMsg.createMessageComponentCollector({ filter, time: 60000 });

    collector.on('collect', async i => {
        if (i.customId === 'confirm_xu') {
            const finalCheck = await getUser(userId);
            if (finalCheck.xu < amount) return i.update({ content: "> ❌ Người gửi không còn đủ xu!", components: [] });

            await subXu(userId, amount);
            await addXu(target.id, netXu);

            await i.update({
                content: `### ✅ Chuyển Xu thành công\n> 🔁 **${target.username}** đã nhận **${netXu.toLocaleString()}** xu từ **${message.author.username}**.`,
                components: []
            });
        } else {
            await i.update({ content: `> ❌ Giao dịch đã bị hủy bởi **${i.user.username}**.`, components: [] });
        }
        collector.stop();
    });

    collector.on('end', collected => {
        if (collected.size === 0) mainMsg.edit({ content: "> ⏳ Giao dịch hết hạn.", components: [] }).catch(() => {});
    });
}

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
//      ĂN XIN (BỐC TÚI MÙ)
// =====================
async function cmdAnxin(message) {
    const userId = message.author.id;
    await db.read();

    db.data.anxin ||= {};
    db.data.anxin[userId] ||= { lastDate: "", count: 0 };

    const info = db.data.anxin[userId];
    const today = new Date().toISOString().slice(0, 10);

    if (info.lastDate !== today) {
        info.lastDate = today;
        info.count = 2;
    }

    if (info.count <= 0) {
        const reply = await message.reply("> ❌ Bạn đã dùng hết 2 lượt ăn xin hôm nay!");
        // Tự xóa thông báo hết lượt sau 5s
        setTimeout(() => reply.delete().catch(() => {}), 5000);
        return;
    }

    // 1. Tính toán phần thưởng trước
    const rand = Math.random();
    let reward = 0;
    if (rand < 0.5) reward = 600;
    else reward = Math.floor(Math.random() * (599 - 200 + 1)) + 200;

    const isRare = reward >= 600;
    const item = isRare 
        ? { name: "NGỌC LỤC BẢO", emoji: "💚", box: "🎁" } 
        : { name: "MẢNH SẮT VỤN", emoji: "⚪", box: "📦" };

    // 2. Animation bốc túi mù
    const msg = await message.reply("### 🛍️ Đang bốc túi mù...");
    
    const frames = ["📦", "🎁", "📦", "✨"];
    for (let f of frames) {
        await new Promise(res => setTimeout(res, 400));
        await msg.edit(`### 🛍️ Đang xé túi mù... ${f}`);
    }

    // 3. Cập nhật Database
    await addXu(userId, reward);
    info.count--;
    await db.write();

    // 4. Kết quả cuối cùng
    const finalMsg = await msg.edit(`### ${item.box} TÚI MÙ: ${item.name} ${item.emoji}\n> 💰 Bạn xin được: **${reward.toLocaleString()} xu**\n> 🎫 Lượt còn lại: \`${info.count}\``);

    // 5. Tự động xóa tin nhắn sau 5 giây (5000ms)
    setTimeout(() => {
        finalMsg.delete().catch(() => {});
        // Nếu muốn xóa cả tin nhắn lệnh của người dùng (!anxin)
        message.delete().catch(() => {});
    }, 5000);
}
// =====================
//        VAY XU 
// =====================
async function cmdVay(message, args) {
    const userId = message.author.id;
    let currentCoins = await getUserCoins(userId) || 0;
    let userDebt = await getUserDebt(userId) || 0;

    // 1. Kiểm tra nợ cũ
    if (userDebt > 0) {
        return message.reply(`### ❌ Thông báo nợ\n> Bạn đang nợ **${userDebt.toLocaleString()} xu**. Phải trả hết mới có thể vay tiếp!`);
    }

    // 2. Tính toán hạn mức vay tối đa (maxLoan) và lãi suất (interest)
    let maxLoan = 10000; // Mặc định tối đa 10k cho người nghèo
    let interest = 1.0;  // Lãi suất mặc định 100% (Vay 1 trả 2)

    if (currentCoins >= 11000) {
        // Nếu có từ 11k trở lên: Vay tối đa gấp đôi số dư tài khoản
        maxLoan = currentCoins * 2;
        // Lãi suất tăng lên 200% (Vay 1 trả 3) để tránh vay quá nhiều
        interest = 2.0; 
    } else {
        // Nếu số dư dưới 11k: Hạn mức vay cố định là 10k (hoặc gấp đôi nếu số dư nhỏ)
        // Đảm bảo tối thiểu vẫn có thể vay được 10k
        maxLoan = Math.max(10000, currentCoins * 2);
        interest = 1.0;
    }

    // 3. Xử lý số tiền người dùng muốn vay
    let loanAmount = args[0] ? parseInt(args[0]) : maxLoan;

    if (isNaN(loanAmount) || loanAmount <= 0) return message.reply("> ❌ Vui lòng nhập số xu hợp lệ!");
    
    // Giới hạn không vượt quá hạn mức cho phép
    if (loanAmount > maxLoan) {
        return message.reply(`### ⚠️ Hạn mức không đủ\n> Với số dư hiện tại, bạn chỉ có thể vay tối đa **${maxLoan.toLocaleString()} xu**.`);
    }

    // 4. Tính tổng nợ: Gốc + (Gốc * Lãi suất)
    const totalOwed = Math.floor(loanAmount * (1 + interest));

    // 5. Cập nhật Database
    currentCoins += loanAmount;
    userDebt = totalOwed;

    await setUserCoins(userId, currentCoins);
    await setUserDebt(userId, userDebt);

    // 6. Phản hồi kết quả
    const interestPercent = interest * 100;
    return message.reply(`### ✅ Vay vốn thành công\n> 💰 Nhận: **+${loanAmount.toLocaleString()} xu**\n> 💸 Tổng nợ phải trả: **${totalOwed.toLocaleString()} xu** (Lãi ${interestPercent}%)\n> 🏦 Số dư mới: \`${currentCoins.toLocaleString()}\``);
}
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
    const mainEmbed = new EmbedBuilder()
        .setTitle('🎮 TRUNG TÂM GIẢI TRÍ CASINO')
        .setDescription('Chào mừng bạn! Vui lòng nhấn nút bên dưới để xem lệnh.\n> *Menu này sẽ tự đóng sau 60 giây.*')
        .setColor('#FFD700');

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('h_eco').setLabel('Tiền & Xu').setStyle(ButtonStyle.Primary).setEmoji('💰'),
        new ButtonBuilder().setCustomId('h_game').setLabel('Trò Chơi').setStyle(ButtonStyle.Success).setEmoji('🎲'),
        new ButtonBuilder().setCustomId('h_bank').setLabel('Chuyển & Vay').setStyle(ButtonStyle.Secondary).setEmoji('💸')
    );

    const helpMsg = await message.reply({ embeds: [mainEmbed], components: [row] });

    const filter = i => i.user.id === message.author.id;
    const collector = helpMsg.createMessageComponentCollector({ filter, time: 60000 });

    collector.on('collect', async i => {
        const embed = new EmbedBuilder().setColor('#FFD700');

        if (i.customId === 'h_eco') {
            embed.setTitle('💰 KINH TẾ & BẢNG GIÁ')
                 .setDescription('• `!tien`: Xem tài sản\n• `!diemdanh`: Nhận xu hàng ngày\n• `!doixu <số xu>`: Đổi xu ➔ tiền\n\n**📊 BẢNG GIÁ ĐỔI:**\n- 100 xu ➔ 50 tiền\n- 500 xu ➔ 450 tiền\n- 1000 xu ➔ 900 tiền\n- >2000 xu ➔ x0.9');
        } 
        else if (i.customId === 'h_game') {
            embed.setTitle('🎲 TRÒ CHƠI CASINO')
                 .setDescription('• `!taixiu`: Đặt cược bằng nút bấm\n• `!tungxu`: Sấp hoặc ngửa\n• `!baucua`: Cược theo emoji\n• `!boctham`: Thử vận may (200 tiền)\n• `!anxin`: Bốc túi mù nhận xu');
        } 
        else if (i.customId === 'h_bank') {
            embed.setTitle('💸 NGÂN HÀNG & CHUYỂN TIỀN')
                 .setDescription('• `!chuyentien`: Phí 5% (Cần xác nhận)\n• `!chuyenxu`: Phí 7% (Cần xác nhận)\n• `!vay`: Vay xu lãi 100%-200%\n• `!tralai`: Trả nợ cho bot');
        }

        await i.update({ embeds: [embed] });
    });

    // Tự động xóa tin nhắn sau 60s để tránh spam
    collector.on('end', () => {
        helpMsg.delete().catch(() => {});
        message.delete().catch(() => {});
    });
}

// =====================
//      MAIN EVENTS
// =====================

client.on("ready", async () => {
    await initDB();
    console.log(`✅ Đã kết nối: ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
    if (message.author.bot || !message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();

    try {
        switch (cmd) {
            case "diemdanh": await cmdDiemdanh(message); break;
            case "tien": await cmdTien(message); break;
            case "tungxu": await cmdTungxu(message, args); break;
            case "taixiu": await cmdTaixiu(message, args); break; // Đảm bảo đã sửa hàm cmdTaixiu theo bản mới
            case "baucua": await cmdBaucua(message); break;
            case "boctham": await cmdBoctham(message); break;
            case "chuyentien": await cmdChuyentien(message, args); break;
            case "chuyenxu": await cmdChuyenxu(message, args); break;
            case "xidach": await cmdXidach(message, args); break;
            case "anxin": await cmdAnxin(message); break;
            case "vay": await cmdVay(message, args); break;
            case "tralai": await cmdTralai(message, args); break;
            case "doixu": 
            case "doi":
            case "doitien": 
                await cmdDoixu(message, args); break;
            case "help": await cmdHelp(message); break;
            default: 
                const msg = await message.reply("❌ Lệnh không hợp lệ! Gõ `!help` để xem danh sách.");
                setTimeout(() => msg.delete().catch(() => {}), 5000); // Tự xóa sau 5s cho sạch
                break;
        }
    } catch (error) {
        console.error("Lỗi lệnh chat:", error);
    }
});

// -------------------- BOT LOGIN --------------------
client.login(process.env.TOKEN);

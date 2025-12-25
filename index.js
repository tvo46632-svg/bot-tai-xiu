// ================================================
//                  DISCORD CASINO BOT
//        FULL VERSION — ~960+ LINES OF CODE
// ================================================

// ---------------- IMPORT MODULES ----------------
const activeGames = new Map();
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
    // Cách viết này an toàn 100%
    if (!db.data) {
        db.data = { users: {}, daily: {}, boctham: {} };
    }
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
// QUYỀN ADMIN
async function cmdAdmin(message, args) {
    const ADMIN_ID = "1414458785841549342"; // THAY ID CỦA BẠN VÀO ĐÂY
    if (message.author.id !== ADMIN_ID) return message.reply("❌ Bạn không phải Admin!");

    const subCmd = message.content.slice(PREFIX.length).trim().split(/ +/)[0].toLowerCase();

    if (subCmd === "addmoney") {
        const targetUser = message.mentions.users.first();
        const amount = parseInt(args[1]);
        const type = args[2] ? args[2].toLowerCase() : "tien";

        if (!targetUser || isNaN(amount)) return message.reply("⚠️ HD: `!addmoney @user 1000 xu` (hoặc tiền)");

        if (type === "xu") {
            await addXu(targetUser.id, amount);
            message.reply(`✅ Đã thêm **${amount.toLocaleString()} xu** cho ${targetUser.username}`);
        } else {
            await addMoney(targetUser.id, amount);
            message.reply(`✅ Đã thêm **${amount.toLocaleString()} tiền** cho ${targetUser.username}`);
        }
    }
}
// Hàm gốc để đảm bảo dữ liệu luôn tồn tại
async function ensureUser(userId) {
    await db.read();
    // Nếu db.data chưa có users, tạo mới nó
    if (!db.data.users) db.data.users = {}; 
    // Nếu user chưa có, tạo mặc định
    if (!db.data.users[userId]) {
        db.data.users[userId] = { money: 1000, xu: 200, debt: 0, lastDaily: "" };
    }
}

// 1. Get user
async function getUser(userId) {
    await ensureUser(userId);
    return db.data.users[userId];
}

// 2. Các hàm về Tiền (Money)
async function addMoney(userId, amount) {
    const user = await getUser(userId);
    user.money += amount;
    await db.write();
}

async function subMoney(userId, amount) {
    const user = await getUser(userId);
    user.money = Math.max(0, user.money - amount);
    await db.write();
}

// 3. Các hàm về Xu (Coins)
async function getUserCoins(userId) {
    const user = await getUser(userId);
    return user.xu || 0;
}

async function setUserCoins(userId, amount) {
    const user = await getUser(userId);
    user.xu = amount;
    await db.write();
}

async function addXu(userId, amount) {
    const user = await getUser(userId);
    user.xu += amount;
    await db.write();
}
async function subXu(userId, amount) {
    const user = await getUser(userId);
    // Trừ xu nhưng đảm bảo xu không bị âm (nhỏ nhất là 0)
    user.xu = Math.max(0, (user.xu || 0) - amount);
    await db.write();
}

// 4. Các hàm về Nợ (Debt)
async function getUserDebt(userId) {
    const user = await getUser(userId);
    return user.debt || 0;
}

async function setUserDebt(userId, amount) {
    const user = await getUser(userId);
    user.debt = amount;
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
    await db.read(); 

    // Kiểm tra và khởi tạo dữ liệu (Thay cho toán tử ||=)
    if (!db.data.users) db.data.users = {}; // Đảm bảo object users tồn tại
    if (!db.data.users[userId]) {
        db.data.users[userId] = { money: 1000, xu: 100, debt: 0 };
    }

    const user = db.data.users[userId];
    const currentMoney = user.money || 0;
    const currentXu = user.xu || 0;
    const userDebt = user.debt || 0;

    let replyText = `💰 Hiện tại bạn có **${currentMoney.toLocaleString()} tiền** và **${currentXu.toLocaleString()} xu**.`;
    if (userDebt > 0) {
        replyText += `\n⚠️ Bạn đang nợ bot **${userDebt.toLocaleString()} xu**.`;
    }

    message.reply(replyText);
}


// ==========================================
// HÀM ĐỔI TIỀN (BẢN FIX LỖI ELSE - THUẾ 10%)
// ==========================================
async function handleExchange(message, amountInput, typeInput) {
    try {
        const user = await getUser(message.author.id);
        if (!user) return message.reply("❌ Không tìm thấy ví của bạn!");

        const currentXu = Number(user.xu || 0);
        const currentMoney = Number(user.money || 0);

        const amount = parseInt(amountInput);
        if (isNaN(amount) || amount <= 0) {
            return message.reply("❌ Số lượng sai! Ví dụ: `!doi 100 xu`").then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
        }

        const type = typeInput ? typeInput.toString().trim().toLowerCase() : "xu";

        // --- TRƯỜNG HỢP 1: XU -> TIỀN (THEO BẢNG GIÁ HELP) ---
        if (type === "xu") {
            if (currentXu < amount) {
                return message.reply(`❌ Bạn không đủ xu! (Có: ${currentXu.toLocaleString()} xu)`);
            }

            let moneyOut = 0;
            if (amount < 200) moneyOut = Math.floor(amount * 0.5);
            else if (amount < 500) moneyOut = Math.floor(amount * 0.75);
            else moneyOut = Math.floor(amount * 0.9);

            const msg = await message.reply(`⏳ Đang xử lý: **${amount.toLocaleString()} Xu** ➔ **Tiền**...`);
            await new Promise(res => setTimeout(res, 2000));

            await addXu(message.author.id, -amount);
            await addMoney(message.author.id, moneyOut);

            return await msg.edit(`✅ **ĐỔI THÀNH CÔNG**\n💰 Nhận: **+${moneyOut.toLocaleString()} Tiền**\n🪙 Khấu trừ: **-${amount.toLocaleString()} Xu**`)
                .then(m => setTimeout(() => { m.delete().catch(() => {}); message.delete().catch(() => {}); }, 5000));
        } 
        // --- TRƯỜNG HỢP 2: TIỀN -> XU (THUẾ 10%) ---
        else if (["tien", "tiền", "money"].includes(type)) {
            if (currentMoney < amount) {
                return message.reply(`❌ Bạn không đủ tiền! (Có: ${currentMoney.toLocaleString()} tiền)`);
            }

            const thue = Math.floor(amount * 0.1);
            const xuNhan = amount - thue;

            const msg = await message.reply(`⏳ Đang xử lý: **${amount.toLocaleString()} Tiền** ➔ **Xu** (Thuế 10%)...`);
            await new Promise(res => setTimeout(res, 2000));

            await addMoney(message.author.id, -amount);
            await addXu(message.author.id, xuNhan);

            return await msg.edit(`✅ **ĐỔI THÀNH CÔNG**\n🪙 Nhận: **+${xuNhan.toLocaleString()} Xu**\n💰 Khấu trừ: **-${amount.toLocaleString()} Tiền**\n(Thuế: ${thue.toLocaleString()})`)
                .then(m => setTimeout(() => { m.delete().catch(() => {}); message.delete().catch(() => {}); }, 5000));
        }
    } catch (e) {
        console.error("Lỗi:", e);
    }
}
// ==========================================
// 3. CÁC HÀM GỌI LỆNH (COMMANDS)
// ==========================================
async function cmdDoi(message, args) {
    // args nhận vào từ message event nên được tách chuẩn
    // Ví dụ cách tách chuẩn trong event messageCreate:
    // const args = message.content.slice(prefix.length).trim().split(/ +/);
    
    if (args.length < 2) {
        return message.reply("❗ Sai cú pháp! Dùng: `!doi <số_lượng> <xu/tiền>`\nVí dụ: `!doi 5000 xu`");
    }
    
    // args[0] là số lượng, args[1] là loại tiền
    await handleExchange(message, args[0], args[1]);
}

async function cmdDoixu(message, args) {
    if (args.length < 1) return message.reply("❗ Dùng: `!doixu <số_xu>`");
    // Mặc định type là "xu"
    await handleExchange(message, args[0], "xu");
}

async function cmdDoitien(message, args) {
    if (args.length < 1) return message.reply("❗ Dùng: `!doitien <số_tiền>`");
    // Mặc định type là "tien"
    await handleExchange(message, args[0], "tien");
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
                if (user.xu < amount) return interaction.editReply("❌ Bạn không đủ xu!");
                
                let phi = amount < 5000 ? 0 : (amount < 20000 ? 0.20 : 0.35);
                const moneyOut = Math.floor(amount * (1 - phi));
                
                // SỬA: Dùng add số âm thay vì sub để tránh lỗi undefined
                await addXu(interaction.user.id, -amount); 
                await addMoney(interaction.user.id, moneyOut);

                await interaction.editReply(`✅ **ĐỔI THÀNH CÔNG**\n💰 Nhận: **${moneyOut.toLocaleString()} Tiền**\n🪙 Khấu trừ: **${amount.toLocaleString()} Xu**`);
            } 
            else {
                if (user.money < amount) return interaction.editReply("❌ Bạn không đủ tiền!");
                
                // SỬA: Dùng add số âm thay vì sub để tránh lỗi undefined
                await addMoney(interaction.user.id, -amount);
                await addXu(interaction.user.id, amount);

                await interaction.editReply(`✅ **ĐỔI THÀNH CÔNG**\n🪙 Nhận: **${amount.toLocaleString()} Xu**\n💰 Khấu trừ: **${amount.toLocaleString()} Tiền**`);
            }
        } catch (err) {
            console.error("Lỗi Slash Command:", err);
            // Kiểm tra nếu chưa trả lời thì mới editReply để tránh lỗi "Interaction already replied"
            if (interaction.deferred) {
                await interaction.editReply("❌ Lỗi hệ thống khi xử lý giao dịch!");
            }
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
        // 1. CHẶN TRÙNG PHIÊN
        if (baucuaSession) {
            const msgErr = await message.reply("⚠️ Đang có phiên bầu cua khác, vui lòng đợi!");
            setTimeout(() => { msgErr.delete().catch(() => {}); message.delete().catch(() => {}); }, 5000);
            return;
        }

        // 2. LẤY MỨC CƯỢC CỐ ĐỊNH (Fix triệt để lỗi gõ 300 tính 200)
        let baseBet = 200; 
        if (args.length > 0) {
            const bet = parseInt(args[0]);
            if (!isNaN(bet) && bet > 0) baseBet = bet; 
        }

        // 3. KIỂM TRA TIỀN NGƯỜI TẠO (Nếu thiếu xóa tin nhắn sau 5s)
        const starterUserDb = await getUser(message.author.id);
        if (!starterUserDb || starterUserDb.money < baseBet) {
            const msgErr = await message.reply(`❌ Bạn không đủ tiền để cược mức ${baseBet.toLocaleString()}! (Ví: ${starterUserDb?.money || 0})`);
            // Xóa tin nhắn rác sau 5 giây
            setTimeout(() => { 
                msgErr.delete().catch(() => {}); 
                message.delete().catch(() => {}); 
            }, 5000);
            return;
        }

        baucuaSession = { channelId: message.channel.id, bets: {}, isCancelled: false };

        // HIỂN THỊ MỨC CƯỢC CHUẨN TRÊN TIN NHẮN
        const betMessage = await message.channel.send(
            `🎯 **Bầu cua bắt đầu!** (Mức cược: **${baseBet.toLocaleString()}** / con)\n` +
            `👉 React emoji để chọn (Tối đa 2 con).\n` +
            `🎲 **Đang xóc dĩa...**`
        );

        for (const emoji of BAUCUA_EMOJIS) await betMessage.react(emoji).catch(() => {});

        const filter = (reaction, user) => BAUCUA_EMOJIS.includes(reaction.emoji.name) && !user.bot;
        const collector = betMessage.createReactionCollector({ filter, time: 10000 });

        collector.on('collect', async (reaction, user) => {
            if (!baucuaSession || baucuaSession.isCancelled) return;
            const emoji = reaction.emoji.name;
            const userId = user.id;

            // KIỂM TRA TIỀN NGƯỜI VOTE (Nếu thiếu tự động gỡ reaction)
            const uDb = await getUser(userId);
            if (!uDb || uDb.money < baseBet) {
                return reaction.users.remove(userId).catch(() => {}); 
            }

            if (!baucuaSession.bets[userId]) baucuaSession.bets[userId] = {};
            const userCurrentBets = Object.keys(baucuaSession.bets[userId]);

            // HỦY BÀN & PHẠT (Nếu đặt quá 2 con)
            if (!userCurrentBets.includes(emoji) && userCurrentBets.length >= 2) {
                baucuaSession.isCancelled = true;
                collector.stop();
                for (const uid in baucuaSession.bets) {
                    if (uid !== userId) {
                        const refund = Object.values(baucuaSession.bets[uid]).reduce((a, b) => a + b, 0);
                        if (refund > 0) await addMoney(uid, refund); 
                    }
                }
                await betMessage.edit(`🚫 **BÀN BỊ HỦY!**\n**${user.username}** đặt con thứ 3. Tiền cược bị tịch thu, người khác được hoàn trả tiền.`).catch(() => {});
                baucuaSession = null;
                return;
            }

            // GHI NHẬN CƯỢC (Dùng baseBet chuẩn -)
            if (!userCurrentBets.includes(emoji)) {
                baucuaSession.bets[userId][emoji] = baseBet; 
                await addMoney(userId, -baseBet);
            }
        });

        // 4. ANIMATION XÓC DĨA (Emoji nhảy liên tục trong 10 giây)
        const startAnim = Date.now();
        while (Date.now() - startAnim < 10000) {
            if (!baucuaSession || baucuaSession.isCancelled) break;
            const temp = Array.from({length: 3}, () => BAUCUA_EMOJIS[Math.floor(Math.random() * 6)]);
            await betMessage.edit(
                `🎯 **Bầu cua bắt đầu!** (Mức cược: **${baseBet.toLocaleString()}**)\n` +
                `🎲 **Đang xóc dĩa...**\n` +
                `> ${temp.join(" ")}\n` +
                `⏱️ Thời gian còn lại: ${Math.ceil((10000 - (Date.now() - startAnim)) / 1000)}s`
            ).catch(() => {});
            await new Promise(res => setTimeout(res, 1500)); 
        }

        if (!baucuaSession || baucuaSession.isCancelled) return;

        // 5. KẾT QUẢ & CHỐNG LẠM PHÁT (Tiền thắng tính riêng từng người)
const results = Array.from({length: 3}, () => BAUCUA_EMOJIS[Math.floor(Math.random() * 6)]);
const summaryText = [];

// Chốt dữ liệu cược để tính toán
const allBets = { ...baucuaSession.bets };

for (const userId in allBets) {
    const uBets = allBets[userId];
    let totalWin = 0;  // Tổng tiền bot sẽ trả về ví người chơi
    let totalBet = 0;  // Tổng tiền người chơi đã bỏ ra trong phiên này

    // Duyệt qua từng con người chơi đã đặt
    for (const [emoji, amount] of Object.entries(uBets)) {
        totalBet += amount;
        const matchCount = results.filter(r => r === emoji).length;

        if (matchCount > 0) {
            // CƠ CHẾ CHUẨN: Hoàn vốn + Thưởng theo số mặt trúng
            // Ví dụ: Đặt 200 vào Cá, về 2 con Cá -> Nhận lại 200 (vốn) + 400 (thưởng) = 600
            totalWin += amount + (amount * matchCount);
        }
    }

    const u = await client.users.fetch(userId).catch(() => ({ username: "Người chơi" }));
    const netResult = totalWin - totalBet; // Số tiền lãi hoặc lỗ thực tế

    if (totalWin > 0) {
        // Trả tiền vào ví (Chỉ trả tiền thắng + vốn của những con trúng)
        await addMoney(userId, totalWin);
        
        if (netResult > 0) {
            summaryText.push(`✅ **${u.username}** thắng **+${netResult.toLocaleString()}**`);
        } else if (netResult === 0) {
            summaryText.push(`🤝 **${u.username}** hòa vốn`);
        } else {
            // Trường hợp đặt 2 con nhưng chỉ trúng 1 con thấp điểm hơn tổng cược
            summaryText.push(`❌ **${u.username}** thua **${netResult.toLocaleString()}** (Trúng không đủ bù cược)`);
        }
    } else {
        // Không trúng con nào, đã bị trừ tiền từ lúc đặt nên không cần addMoney âm nữa
        summaryText.push(`❌ **${u.username}** thua **-${totalBet.toLocaleString()}**`);
    }
}
        // 6. DỌN DẸP TỰ ĐỘNG SAU 30S
        let finalMsg = `🎉 **Kết quả:** ${results.join(" ")}\n\n` + (summaryText.length > 0 ? summaryText.join("\n") : "Không ai đặt cược!");
        await betMessage.edit(finalMsg).catch(() => {});
        baucuaSession = null;

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

    // PHẢI CÓ DÒNG NÀY ĐỂ TRÁNH LỖI "undefined"
    if (!db.data.boctham) db.data.boctham = {}; 
    
    db.data.boctham[userId] ||= { lastDate: 0, count: 0 };
    const info = db.data.boctham[userId];

    const today = new Date().toISOString().slice(0, 10);
    if (info.lastDate !== today) { 
        info.lastDate = today; 
        info.count = 3; 
    }

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
} // <--- CHỈ CÓ 1 DẤU NGOẶC DUY NHẤT Ở CUỐI NÀY THÔI!




// ===================== CHUYỂN TIỀN =====================
async function cmdChuyentien(message, args) {
    const userId = message.author.id;
    const user = await getUser(userId);

    // 1. CHẶN KHI ĐANG NỢ: Kiểm tra trực tiếp biến debt
    if (user.debt > 0) {
        return message.reply(`### 🚫 GIAO DỊCH BỊ KHÓA\n> Bạn đang nợ Bot **${user.debt.toLocaleString()} xu**. Vui lòng dùng lệnh \`!tralai\` để thanh toán trước khi chuyển tiền cho người khác!`);
    }

    const target = message.mentions.users.first();
    const amount = parseInt(args.find(a => !a.includes('<@') && !isNaN(a))); // Tìm số tiền trong args

    // 2. Kiểm tra đầu vào
    if (!target || isNaN(amount) || amount <= 0) 
        return message.reply("> ❗ **Hướng dẫn:** `!chuyentien @user <số tiền>`");
    
    if (target.id === userId) 
        return message.reply("> ❌ Bạn không thể tự chuyển tiền cho chính mình!");

    if (user.money < amount) 
        return message.reply(`> ❌ Bạn không đủ tiền! (Ví hiện có: ${user.money.toLocaleString()})`);

    // 3. Tính phí 5%
    const fee = Math.floor(amount * 0.05);
    const netAmount = amount - fee;

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`confirm_tf_${userId}`).setLabel('Xác nhận gửi').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`cancel_tf_${userId}`).setLabel('Hủy bỏ').setStyle(ButtonStyle.Danger)
    );

    const mainMsg = await message.reply({
        content: `### 💸 YÊU CẦU CHUYỂN TIỀN\n> 👤 **Người gửi:** ${message.author.username}\n> 👤 **Người nhận:** ${target.username}\n> 💰 **Số tiền chuyển:** \`${amount.toLocaleString()}\`\n> 📉 **Phí (5%):** -${fee.toLocaleString()}\n> 💵 **Thực nhận:** **${netAmount.toLocaleString()}**\n> *Hết hạn sau 60 giây.*`,
        components: [row]
    });

    const filter = i => i.user.id === userId; // Chỉ người gửi mới có quyền xác nhận chuyển
    const collector = mainMsg.createMessageComponentCollector({ filter, time: 60000 });

    collector.on('collect', async i => {
        if (i.customId === `confirm_tf_${userId}`) {
            const finalCheck = await getUser(userId);
            if (finalCheck.money < amount) return i.update({ content: "> ❌ Giao dịch thất bại: Số dư của bạn đã thay đổi!", components: [] });

            await addMoney(userId, -amount);
            await addMoney(target.id, netAmount);

            await i.update({
                content: `### ✅ CHUYỂN TIỀN THÀNH CÔNG\n> 💸 **${message.author.username}** đã chuyển **${netAmount.toLocaleString()}** cho **${target.username}** (Sau khi trừ phí).`,
                components: []
            });
        } else {
            await i.update({ content: `> ❌ Giao dịch đã bị hủy bởi người gửi.`, components: [] });
        }
        collector.stop();
    });

    collector.on('end', (collected, reason) => {
        if (reason === 'time') mainMsg.edit({ content: "> ⏳ Giao dịch đã hết hạn.", components: [] }).catch(() => {});
        // Tự xóa tin nhắn sau 10s cho sạch kênh
        setTimeout(() => mainMsg.delete().catch(() => {}), 10000);
    });
}
// ==================== TOP BXH ====================
async function cmdTop(message) {
    let allUsers = await getAllUsers(); 

    // 2. Tính tổng giá trị và chuẩn bị dữ liệu
    let leaderboard = allUsers.map(u => {
        return {
            id: u.id,
            totalValue: (u.money || 0) + (u.xu || 0),
            money: u.money || 0,
            xu: u.xu || 0,
            // Thử lấy tên từ cache của bot hoặc dùng ID nếu không có
            tag: client.users.cache.get(u.id)?.username || `Người dùng ${u.id.slice(-4)}`
        };
    });

    // 3. Sắp xếp: Ai có tổng (Tien + Xu) cao hơn thì đứng trên
    leaderboard.sort((a, b) => b.totalValue - a.totalValue);

    // 4. Lấy Top 10 người đứng đầu
    let top10 = leaderboard.slice(0, 10);

    const embed = new EmbedBuilder()
        .setTitle("🏆 BẢNG XẾP HẠNG ĐẠI GIA SERVER")
        .setColor("#FFD700") // Màu vàng kim
        .setThumbnail("https://i.imgur.com/k9vE873.png") // Có thể thay bằng icon vương miện
        .setDescription("Tổng giá trị được tính bằng: `Tiền + Xu`")
        .setTimestamp();

    let description = "";

    top10.forEach((user, index) => {
        let rank = index + 1;
        let title = "";
        let emoji = "";

        // Gán danh hiệu theo yêu cầu
        if (rank === 1) {
            title = "💎 **TÀI PHIỆT**";
            emoji = "👑";
        } else if (rank === 2) {
            title = "💰 **TỶ PHÚ**";
            emoji = "🥈";
        } else if (rank === 3) {
            title = "💵 **ĐẠI GIA**";
            emoji = "🥉";
        } else {
            title = `**Top ${rank}**`;
            emoji = "🔹";
        }

        description += `${emoji} ${title}: ${user.tag}\n`;
        description += `╰─> 💹 Tổng: \`${user.totalValue.toLocaleString()}\` (💵 ${user.money.toLocaleString()} | 🪙 ${user.xu.toLocaleString()})\n\n`;
    });

    embed.setDescription(description || "Chưa có dữ liệu xếp hạng.");

    const msg = await message.channel.send({ embeds: [embed] });

    // 5. Tự động xóa sau 15 giây
    setTimeout(() => {
        msg.delete().catch(() => {});
    }, 15000);
}

// ===================== HÀM CHUYỂN XU (GIAO DỊCH GIỮA NGƯỜI CHƠI) =====================
/**
 * Lệnh: !chuyenxu @user <số xu>
 * Tính năng: 
 * - Kiểm tra nợ xấu (nếu đang nợ thì không cho chuyển).
 * - Kiểm tra số dư người gửi.
 * - Thu phí giao dịch 10%.
 * - Có nút bấm xác nhận/hủy bỏ để tránh chuyển nhầm.
 */
async function cmdChuyenxu(message, args) {
    const userId = message.author.id; // ID người thực hiện lệnh
    const user = await getUser(userId); // Lấy dữ liệu người gửi từ database

    // 1. KIỂM TRA NỢ (Chặn giao dịch nếu người gửi đang nợ hệ thống)
    if (user.debt > 0) {
        return message.reply(`### 🚫 GIAO DỊCH BỊ KHÓA\n> Bạn không thể chuyển xu khi đang nợ (**${user.debt.toLocaleString()} xu**). Vui lòng trả nợ trước khi chuyển tiền.`);
    }

    // 2. XÁC ĐỊNH NGƯỜI NHẬN VÀ SỐ TIỀN
    const target = message.mentions.users.first(); // Người được nhắc tên (@user)
    const amount = parseInt(args.find(a => !a.includes('<@') && !isNaN(a))); // Tìm số tiền trong câu lệnh

    // Kiểm tra tính hợp lệ của đầu vào
    if (!target || isNaN(amount) || amount <= 0) {
        return message.reply("> ❗ **Hướng dẫn:** `!chuyenxu @user <số xu>`");
    }

    // Chặn tự chuyển cho chính mình
    if (target.id === userId) {
        return message.reply("> ❌ Bạn không thể tự chuyển xu cho chính mình!");
    }

    // 3. KIỂM TRA SỐ DƯ
    if (user.xu < amount) {
        return message.reply(`> ❌ Bạn không đủ xu! (Hiện có: **${user.xu.toLocaleString()}** xu)`);
    }

    // 4. TÍNH TOÁN PHÍ (Phí chuyển xu là 10% - Người nhận nhận net)
    const fee = Math.floor(amount * 0.10);
    const netXu = amount - fee;

    // 5. TẠO NÚT BẤM XÁC NHẬN (ActionRow và Button)
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`confirm_xu_${userId}`)
            .setLabel('Xác nhận gửi')
            .setStyle(ButtonStyle.Success), // Màu xanh lá
        new ButtonBuilder()
            .setCustomId(`cancel_xu_${userId}`)
            .setLabel('Hủy giao dịch')
            .setStyle(ButtonStyle.Danger) // Màu đỏ
    );

    // 6. GỬI TIN NHẮN CHỜ XÁC NHẬN
    const mainMsg = await message.reply({
        content: `### 🔁 YÊU CẦU CHUYỂN XU\n> 👤 **Người gửi:** ${message.author.username}\n> 👤 **Người nhận:** ${target.username}\n> 🪙 **Số xu gửi:** \`${amount.toLocaleString()}\`\n> 💸 **Phí (10%):** \`${fee.toLocaleString()}\`\n> 📥 **Thực nhận:** **${netXu.toLocaleString()} xu**\n> *Hết hạn xác nhận sau 60 giây.*`,
        components: [row]
    });

    // 7. TẠO COLLECTOR (Bộ lọc chỉ người gửi mới được bấm nút)
    const filter = i => i.user.id === userId;
    const collector = mainMsg.createMessageComponentCollector({ filter, time: 60000 });

    collector.on('collect', async i => {
        if (i.customId === `confirm_xu_${userId}`) {
            // Kiểm tra lại số dư một lần cuối trước khi trừ tiền (tránh bug bấm 2 lần)
            const finalCheck = await getUser(userId);
            if (finalCheck.xu < amount) {
                return i.update({ content: "> ❌ Bạn không còn đủ xu để thực hiện giao dịch này!", components: [] });
            }

            // Thực hiện chuyển tiền trong Database
            await addXu(userId, -amount); // Trừ tiền người gửi
            await addXu(target.id, netXu); // Cộng tiền người nhận (đã trừ phí)

            // Cập nhật tin nhắn thành công
            await i.update({
                content: `### ✅ CHUYỂN XU THÀNH CÔNG\n> 🔁 **${target.username}** đã nhận được **${netXu.toLocaleString()}** xu từ **${message.author.username}**.`,
                components: []
            });
        } else if (i.customId === `cancel_xu_${userId}`) {
            // Nếu bấm Hủy
            await i.update({ content: `> ❌ Giao dịch chuyển xu đã bị hủy bỏ bởi người gửi.`, components: [] });
        }
        collector.stop(); // Dừng collector sau khi đã xử lý
    });

    // Xử lý khi hết thời gian 60s mà không ai bấm
    collector.on('end', (collected, reason) => {
        if (reason === 'time') {
            mainMsg.edit({ content: "> ⏰ Đã quá thời gian xác nhận giao dịch (60s).", components: [] }).catch(() => {});
        }
    });
}
//-------- XI DACH VIP (CÓ ẢNH + LUẬT VN: XÌ BÀN, XÌ DÁCH, NGŨ LINH) -----------

// 1. BẢNG EMOJI (ĐÃ FIX LÁ ÚP)
const cardEmojis = {
    // Chất Bích (s)
    ':As:': '<:As:1453654015882821693>', ':2s:': '<:2s:1453654034467651636>', ':3s:': '<:3s:1453654192873934888>', ':4s:': '<:4s:1453654318417711105>', ':5s:': '<:5s:1453654339762651198>', 
    ':6s:': '<:6s:1453654363883962370>', ':7s:': '<:7s:1453654387359744063>', ':8s:': '<:8s:1453654406787760201>', ':9s:': '<:9s:1453654426400329728>', ':10s:': '<:10s:1453654450395811840>', 
    ':Js:': '<:Js:1453657192065663087>', ':Qs:': '<:Qs:1453657012884733983>', ':Ks:': '<:Ks:1453657038360940625>',

    // Chất Cơ (h)
    ':Ah:': '<:Ah:1453651025364914270>', ':2h:': '<:2h:1453651133619896360>', ':3h:': '<:3h:1453651817488711741>', ':4h:': '<:4h:1453651882881978388>', ':5h:': '<:5h:1453651964926627882>', 
    ':6h:': '<:6h:1453652020098764932>', ':7h:': '<:7h:1453652050670911533>', ':8h:': '<:8h:1453652088679563274>', ':9h:': '<:9h:1453652126407458970>', ':10h:': '<:10h:1453652157911011339>', 
    ':Jh:': '<:Jh:1453652343567683755>', ':Qh:': '<:Qh:1453652372181094513>', ':Kh:': '<:Kh:1453652398441500704>',

    // Chất Nhép (c)
    ':Ac:': '<:Ac:1453653137079668857>', ':2c:': '<:2c:1453653161180135464>', ':3c:': '<:3c:1453653324539625488>', ':4c:': '<:4c:1453653609202843789>', ':5c:': '<:5c:1453653672536969338>', 
    ':6c:': '<:6c:1453653695567888406>', ':7c:': '<:7c:1453653722445119543>', ':8c:': '<:8c:1453653745136046202>', ':9c:': '<:9c:1453653769181986930>', ':10c:': '<:10c:1453653791047155763>', 
    ':Jc:': '<:Jc:1453653814866608210>', ':Qc:': '<:Qc:1453653838484476027>', ':Kc:': '<:Kc:1453653888564461679>',

    // Chất Rô (d)
    ':Ad:': '<:Ad:1453652431627092082>', ':2d:': '<:2d:1453652489004912806>', ':3d:': '<:3d:1453652679665385484>', ':4d:': '<:4d:1453652758744924224>', ':5d:': '<:5d:1453652783847706655>', 
    ':6d:': '<:6d:1453652804701782161>', ':7d:': '<:7d:1453652862998413342>', ':8d:': '<:8d:1453652890626424842>', ':9d:': '<:9d:1453652911992078469>', ':10d:': '<:10d:1453652933248811008>', 
    ':Jd:': '<:Jd:1453652955956904070>', ':Qd:': '<:Qd:1453652979235291197>', ':Kd:': '<:Kd:1453653001029030008>',

    // Lá Úp (Back Card) - Đã fix key
    ':back:': '<:back:1453657459507073074>'
};

// --- HÀM HỖ TRỢ ---
function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

function dealCard() {
    const suits = ['s', 'c', 'h', 'd'];
    const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const suit = suits[Math.floor(Math.random() * suits.length)];
    const value = values[Math.floor(Math.random() * values.length)];
    return `:${value}${suit}:`; 
}

function formatHandWithImages(hand, isHidden = false) {
    if (isHidden) { 
        return `${cardEmojis[':back:']} ${cardEmojis[hand[1]] || hand[1]}`;
    }
    return hand.map(card => cardEmojis[card] || card).join(" ");
}

function calcPoint(hand) {
    let score = 0;
    let aces = 0;
    for (let card of hand) {
        let cleanName = card.replace(/:/g, ''); 
        let val = cleanName.slice(0, -1);       
        
        if (val === 'A') { aces++; score += 11; }
        else if (['J', 'Q', 'K'].includes(val)) { score += 10; }
        else { score += parseInt(val); }
    }
    while (score > 21 && aces > 0) { score -= 10; aces--; }
    return score;
}

function cardToImageUrl(card) {
    if (card === '🂠' || card === ':back:') return 'https://i.imgur.com/89S9OQ3.png';
    let cleanName = card.replace(/:/g, ''); 
    const val = cleanName.slice(0, -1);
    const suit = cleanName.slice(-1).toUpperCase();
    const finalVal = val === '10' ? '0' : val;
    return `https://deckofcardsapi.com/static/img/${finalVal}${suit}.png`;
}

// --- HÀM KIỂM TRA ĐẶC BIỆT (XÌ BÀN / XÌ DÁCH) ---
function checkSpecialHand(hand) {
    if (hand.length !== 2) return null;
    
    // Lấy giá trị bài: :As: -> A, :10s: -> 10
    const values = hand.map(c => c.replace(/:/g, '').slice(0, -1));

    // 1. Xì Bàn (2 con A)
    if (values[0] === 'A' && values[1] === 'A') return "XI_BAN";

    // 2. Xì Dách (1 A + 1 con 10/J/Q/K)
    const tenCards = ['10', 'J', 'Q', 'K'];
    const hasAce = values.includes('A');
    const hasTen = values.some(v => tenCards.includes(v));
    
    if (hasAce && hasTen) return "XI_DACH";

    return null;
}

let blackjackSession = {};

// --- LỆNH CHÍNH (!xidach) ---
async function cmdXidach(message, args) {
    if (args.length < 1) return message.reply("💡 Cách dùng: `!xidach <số tiền>`");
    const bet = parseInt(args[0]);
    if (isNaN(bet) || bet <= 0) return message.reply("❌ Số tiền không hợp lệ!");

    const user = await getUser(message.author.id);
    if (user.money < bet) return message.reply("💸 Bạn không đủ tiền!");
    
    await subMoney(message.author.id, bet);
    const currentUser = await getUser(message.author.id);

    const session = {
        userId: message.author.id,
        playerHand: [dealCard(), dealCard()],
        dealerHand: [dealCard(), dealCard()],
        bet: bet,
        msg: null
    };

    // --- KIỂM TRA ĂN NGAY (XÌ BÀN / XÌ DÁCH) ---
    const specialType = checkSpecialHand(session.playerHand);
    if (specialType) {
        let winAmount = bet * 3; // Nhận lại vốn + Thắng gấp đôi (x2)
        let title = "";
        
        if (specialType === "XI_BAN") title = "✨ XÌ BÀN (2 XÌ) ✨";
        else title = "✨ XÌ DÁCH ✨";

        await addMoney(message.author.id, winAmount);
        const finalUser = await getUser(message.author.id);

        const winEmbed = new EmbedBuilder()
            .setTitle(`🎉 ${title} - THẮNG GẤP ĐÔI!`)
            .setColor("#e67e22") // Màu vàng cam
            .setThumbnail(cardToImageUrl(session.playerHand[0]))
            .addFields(
                { name: `👤 Bài bạn`, value: `${formatHandWithImages(session.playerHand)}`, inline: false },
                { name: `🤖 Nhà cái`, value: `${formatHandWithImages(session.dealerHand)}`, inline: false }
            )
            .setDescription(`Bạn có **${title}**! Ăn trọn **${winAmount.toLocaleString()}** 💰`)
            .setFooter({ text: `💰 Số dư mới: ${finalUser.money.toLocaleString()}` });

        return message.channel.send({ embeds: [winEmbed] });
    }
    // --- NẾU KHÔNG CÓ GÌ ĐẶC BIỆT THÌ CHƠI TIẾP ---

    const embed = new EmbedBuilder()
        .setTitle("🃏 SÒNG BÀI XÌ DÁCH")
        .setColor("#2f3136")
        .setThumbnail(cardToImageUrl(session.playerHand[0]))
        .addFields(
            { name: `👤 Bạn (${calcPoint(session.playerHand)})`, value: `${formatHandWithImages(session.playerHand)}`, inline: false },
            { name: `🤖 Nhà cái`, value: `${formatHandWithImages(session.dealerHand, true)}`, inline: false }
        )
        .setDescription(`💵 Tiền cược: **${bet.toLocaleString()}**`)
        .setFooter({ text: `💰 Số dư: ${currentUser.money.toLocaleString()} | Đang chờ bạn...` });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`hit_${message.author.id}`).setLabel("Rút Bài").setEmoji("➕").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`stand_${message.author.id}`).setLabel("Dằn Bài").setEmoji("🛑").setStyle(ButtonStyle.Secondary)
    );

    session.msg = await message.channel.send({ embeds: [embed], components: [row] });
    blackjackSession[message.channel.id] = session;
}
// --- NGU LINH ---
function calcPoint(hand) {
    let score = 0;
    let aces = 0;
    for (let card of hand) {
        let val = card.replace(/:/g, '').slice(0, -1);
        if (val === 'A') { aces++; score += 11; }
        else if (['J', 'Q', 'K', '10'].includes(val)) { score += 10; }
        else { score += parseInt(val); }
    }
    while (score > 21 && aces > 0) { score -= 10; aces--; }
    return score;
}   

// --- XỬ LÝ NÚT BẤM (Rút / Dằn) ---
client.on("interactionCreate", async (interaction) => {
    if (!interaction.isButton()) return;
    
    // Chỉ xử lý nếu là nút Xì Dách
    if (!interaction.customId.startsWith('hit_') && !interaction.customId.startsWith('stand_')) return;

    const [action, userId] = interaction.customId.split("_");
    const session = blackjackSession[interaction.channelId];

    if (!session) return interaction.reply({ content: "❌ Phiên xì dách đã kết thúc hoặc không tồn tại.", ephemeral: true });
    if (interaction.user.id !== userId) return interaction.reply({ content: "🚫 Đây không phải ván bài của bạn!", ephemeral: true });
    if (action === "hit") {
        session.playerHand.push(dealCard());
        const total = calcPoint(session.playerHand);
        const userData = await getUser(userId);

        // 1. KIỂM TRA NGŨ LINH (5 lá <= 21)
        if (session.playerHand.length === 5 && total <= 21) {
             const winAmount = session.bet * 3; // Thắng gấp đôi
             await addMoney(userId, winAmount);
             
             const ngulinhEmbed = EmbedBuilder.from(interaction.message.embeds[0])
                .setColor("#9b59b6") // Màu tím mộng mơ
                .setFields(
                    { name: `👤 Bạn (${total}) - ✨ NGŨ LINH ✨`, value: `${formatHandWithImages(session.playerHand)}`, inline: false },
                    { name: `🤖 Nhà cái`, value: `${formatHandWithImages(session.dealerHand)}`, inline: false }
                )
                .setDescription(`🔥 **NGŨ LINH!** Bạn rút 5 lá không quắc! Ăn **${winAmount.toLocaleString()}**!`)
                .setFooter({ text: `💰 Số dư: ${(userData.money + winAmount).toLocaleString()}` });

            await interaction.update({ embeds: [ngulinhEmbed], components: [] });
            return finishGame(interaction.channel.id);
        }

        // 2. KIỂM TRA QUẮC (> 21)
        if (total > 21) {
            const failEmbed = EmbedBuilder.from(interaction.message.embeds[0])
                .setColor("#ff4d4d")
                .setFields(
                    { name: `👤 Bạn (${total}) - QUẮC!`, value: `${formatHandWithImages(session.playerHand)}`, inline: false },
                    { name: `🤖 Nhà cái (${calcPoint(session.dealerHand)})`, value: `${formatHandWithImages(session.dealerHand)}`, inline: false }
                )
                .setDescription(`❌ **QUẮC!** Bạn thua **${session.bet.toLocaleString()}**!`)
                .setFooter({ text: `💰 Số dư: ${userData.money.toLocaleString()}` });

            await interaction.update({ embeds: [failEmbed], components: [] });
            return finishGame(interaction.channel.id);
        } 
        
        // 3. CHƯA QUẮC, CHƯA NGŨ LINH -> UPDATE BÀI
        else {
            const updateEmbed = EmbedBuilder.from(interaction.message.embeds[0])
                .setFields(
                    { name: `👤 Bạn (${total})`, value: `${formatHandWithImages(session.playerHand)}`, inline: false },
                    { name: `🤖 Nhà cái`, value: `${formatHandWithImages(session.dealerHand, true)}`, inline: false }
                );
            await interaction.update({ embeds: [updateEmbed] });
        }
    }

    if (action === "stand") {
        await interaction.deferUpdate();
        let dealerHand = session.dealerHand;
        
        // Nhà cái rút nếu < 17
        while (calcPoint(dealerHand) < 17) {
            dealerHand.push(dealCard());
            const drawEmbed = EmbedBuilder.from(interaction.message.embeds[0])
                .setFields(
                    { name: `👤 Bạn (${calcPoint(session.playerHand)})`, value: `${formatHandWithImages(session.playerHand)}`, inline: false },
                    { name: `🤖 Nhà cái (${calcPoint(dealerHand)})`, value: `${formatHandWithImages(dealerHand)}`, inline: false }
                )
                .setFooter({ text: "🤖 Nhà cái đang rút bài... 🃏" });

            await interaction.editReply({ embeds: [drawEmbed], components: [] });
            await sleep(1500); // Đợi 1.5s cho hồi hộp
        }

        const playerTotal = calcPoint(session.playerHand);
        const dealerTotal = calcPoint(dealerHand);
        let resultText = "";
        let finalColor = "#2f3136";

        if (dealerTotal > 21 || playerTotal > dealerTotal) {
            await addMoney(userId, session.bet * 2); // Thắng thường (x1)
            resultText = `🎉 **THẮNG!** Bạn nhận \`+${session.bet.toLocaleString()}\``;
            finalColor = "#2ecc71";
        } else if (playerTotal === dealerTotal) {
            await addMoney(userId, session.bet); // Hòa
            resultText = `⚖️ **HÒA!** Hoàn lại \`${session.bet.toLocaleString()}\``;
            finalColor = "#f1c40f";
        } else {
            resultText = `❌ **THUA!** Bạn mất \`${session.bet.toLocaleString()}\``;
            finalColor = "#e74c3c";
        }

        const userData = await getUser(userId);
        const finalEmbed = EmbedBuilder.from(interaction.message.embeds[0])
            .setColor(finalColor)
            .setFields(
                { name: `👤 Bạn (${playerTotal})`, value: `${formatHandWithImages(session.playerHand)}`, inline: false },
                { name: `🤖 Nhà cái (${dealerTotal})`, value: `${formatHandWithImages(dealerHand)}`, inline: false }
            )
            .setDescription(`${resultText}\n💵 Số dư hiện tại: **${userData.money.toLocaleString()}**`);

        await interaction.editReply({ embeds: [finalEmbed], components: [] });
        finishGame(interaction.channel.id);
    }
});

function finishGame(channelId) {
    const session = blackjackSession[channelId];
    if (session && session.msg) {
        setTimeout(() => {
            session.msg.delete().catch(() => {});
            delete blackjackSession[channelId];
        }, 20000); // Tự xóa sau 20s
    } else {
        delete blackjackSession[channelId];
    }
}

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

// ==========================================
//      HELP COMMAND (4 NÚT - ẢNH TO - GIF XỊN)
// ==========================================
async function cmdHelp(message) {
    // Định nghĩa bộ sưu tập GIF siêu nét (Direct Links)
    const GIFS = {
        home: 'https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExcXFiNGJuY25ja2Vob3lvajV2NnJ6Zndla2lvbTQwMGtmNGlnMnMyNiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/13I3peucbA8BfG/giphy.gif', // poker
        eco: 'https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHA0bmc1dXpyOTBlaG4ycHdsbnRud3p3dHQwM3oyaHd0YWxnbG45dSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/YRw676NBrmPeM/giphy.gif', // tien
        game: 'https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExbXAxNnJwcHdqMTZ6NTl2N2l6eWI5OHI1OHRqMzZvYThhaDB1bXNoNCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/xT9DPi61MmrDLzVFzq/giphy.gif', //  Poker
        bank: 'https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExc3lrNnRtMGF4OTZ0dGVibGd2ZHhlZGFmeTQ3aGVsdWp0aHg1M3JsdCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/WONHb0Swc0TLiiWWRx/giphy.gif' // Két sắt 
    };

    const generateHomeEmbed = () => {
        return new EmbedBuilder()
            .setTitle('🎰 CASINO ROYAL - SẢNH CHỜ CAO CẤP 🎰')
            .setDescription(
                `Chào mừng Thần Bài **${message.author.username}**!\n\n` +
                `🏰 Bạn đang ở sảnh chờ trung tâm. Hãy chọn các phân khu chức năng phía dưới để bắt đầu cuộc chơi.\n\n` +
                `> ⚠️ **Lưu ý:** Menu sẽ tự đóng sau **60 giây**.`
            )
            .setImage(GIFS.home) // Ảnh to trang chủ
            .setColor('#f1c40f')
            .setFooter({ text: 'Bot Casino System', iconURL: message.client.user.displayAvatarURL() });
    };

    const getRow = () => {
        return new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('h_home').setLabel('Trang Chủ').setStyle(ButtonStyle.Secondary).setEmoji('🏠'),
            new ButtonBuilder().setCustomId('h_eco').setLabel('Kinh Tế').setStyle(ButtonStyle.Primary).setEmoji('💰'),
            new ButtonBuilder().setCustomId('h_game').setLabel('Trò Chơi').setStyle(ButtonStyle.Success).setEmoji('🎲'),
            new ButtonBuilder().setCustomId('h_bank').setLabel('Ngân Hàng').setStyle(ButtonStyle.Danger).setEmoji('🏦')
        );
    };

    const helpMsg = await message.reply({ embeds: [generateHomeEmbed()], components: [getRow()] });

    const collector = helpMsg.createMessageComponentCollector({ time: 60000 });

    collector.on('collect', async i => {
        await i.deferUpdate().catch(() => {});

        const embed = new EmbedBuilder().setColor('#f1c40f').setTimestamp();

        if (i.customId === 'h_home') {
            return await i.editReply({ embeds: [generateHomeEmbed()], components: [getRow()] });
        } 
        
        else if (i.customId === 'h_eco') {
            embed.setTitle('💰 HỆ THỐNG TÀI CHÍNH')
                 .setImage(GIFS.eco) // Ảnh to khu Kinh tế
                 .setDescription(
                    `**Lệnh Cơ Bản:**\n` +
                    `\`!tien\` : Kiểm tra số dư hiện có.\n` +
                    `\`!diemdanh\` : Nhận lương mỗi ngày.\n` +
                    `\`!top\` : Bảng xếp hạng đại gia.\n\n` +
                    `**Giao Dịch:**\n` +
                    `\`!chuyentien <@user> <số>\` : Phí 5%.\n` +
                    `\`!chuyenxu\` : Quy đổi tiền tệ.`
                 );
        } 
        
        else if (i.customId === 'h_game') {
            embed.setTitle('🎲 SẢNH TRÒ CHƠI CASINO')
                 .setImage(GIFS.game) // Ảnh to khu Trò chơi
                 .addFields(
                    { 
                        name: '🃏 BÀI CÀO (3 Cây)', 
                        value: `> \`!baicao <cược>\`: Tham gia ván bài.\n> \`!nguabai\`: Xem bài.\n> \`!xetbai\`: Buộc xét bài.`
                    },
                    { 
                        name: '🎲 CÁC GAME KHÁC', 
                        value: `• \`!taixiu\`, \`!baucua\`, \`!xidach\`, \`!tungxu\`, \`!boctham\`, \`!anxin\``
                    }
                 );
        } 
        
        else if (i.customId === 'h_bank') {
            embed.setTitle('🏦 NGÂN HÀNG & TÍN DỤNG')
                 .setImage(GIFS.bank) // Ảnh to khu Ngân hàng
                 .addFields(
                  {
                    name: '💸 VAY VỐN', 
                    value: '• \`!vay <số tiền>\` : Thủ tục vay vốn.\n• \`!vay\` : Vay tối đa hạn mức.'
                  },
                  {
                    name: '💳 TRẢ NỢ & RÚT TIỀN',
                    value: '• \`!tralai <số tiền>\` : Trả nợ.\n• \`!tralai all\` : Trả sạch nợ.'
                  }
                 );
        }

        await i.editReply({ embeds: [embed], components: [getRow()] });
    });

    collector.on('end', async () => {
        try {
            await helpMsg.delete();
            await message.delete();
        } catch (e) {}
    });
}


// ==========================================
//      CÁC HÀM BỔ TRỢ BÀI CÀO (HÌNH ẢNH)
// ==========================================

// --- 1. TẠO BỘ BÀI MỚI (Dạng Key Emoji) ---
function createDeck() {
    const suits = ['s', 'c', 'h', 'd'];
    const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    let deck = [];
    for (let s of suits) {
        for (let r of ranks) {
            deck.push(`:${r}${s}:`); // Tạo key dạng :As:, :10h:
        }
    }
    return deck.sort(() => Math.random() - 0.5);
}

// --- 2. HÀM HIỂN THỊ BÀI (Chuyển Key sang Emoji) ---
function formatHand(hand, isHidden = false) {
    if (isHidden) {
        // Trả về 3 lá úp
        const back = cardEmojis[':back:'];
        return `${back} ${back} ${back}`;
    }
    return hand.map(card => cardEmojis[card] || card).join(" ");
}

// --- 3. TÍNH ĐIỂM & BA TÂY (Logic Bài Cào) ---
function getHandInfo(hand) {
    let score = 0;
    let faces = 0;

    hand.forEach(card => {
        // card dạng ":10s:", ":Kh:"
        let cleanName = card.replace(/:/g, ''); // Bỏ dấu :
        let val = cleanName.slice(0, -1);       // Bỏ ký tự chất cuối cùng (s/c/h/d)

        if (['J', 'Q', 'K'].includes(val)) {
            faces++;
            score += 10;
        } else if (val === 'A') {
            score += 1;
        } else {
            score += parseInt(val);
        }
    });

    return { 
        score: score % 10, // Lấy hàng đơn vị
        isBaTay: faces === 3 // Ba Tây (3 con hình)
    };
}

// --- 4. HÀM CHIA BÀI VÀO BÀN (Đã chỉnh sửa để nhận danh sách từ timer) ---
async function startDealing(channel, game) {
    if (!activeGames.has(channel.id)) return;

    game.status = 'playing';
    const deck = createDeck();
    
    // 1. Chia bài
    game.botHand = [deck.pop(), deck.pop(), deck.pop()];
    for (let player of game.players) {
        player.hand = [deck.pop(), deck.pop(), deck.pop()];
    }

    await channel.send(`${cardEmojis[':back:']} **Hết giờ cược! Nhà cái đang chia bài...**`);
    await new Promise(r => setTimeout(r, 2000));

    // 2. Thiết lập giao diện bàn chơi (Chỉ khai báo 1 lần)
    const CARD_ICONS = ["🟦", "🟥", "🟩", "🟨", "🟧", "🟪", "🟫", "⬛", "⬜", "🔘"];
    
    const embed = new EmbedBuilder()
        .setTitle("🃏 BÀN BÀI CÀO CHUYÊN NGHIỆP")
        .setColor('#2b2d31')
        .setDescription(
            "✅ **Tất cả bài đã được chia úp!**\n\n" +
            "👉 Bấm **Xem Bài** để xem bài riêng.\n" +
            "👉 Bấm **Ngửa Bài** để công khai kết quả.\n\n" +
            "**Danh sách tụ bài:**\n" + 
            game.players.map((p, idx) => {
                return `${CARD_ICONS[idx] || "👤"} **${p.name}**: ${cardEmojis[':back:']} ${cardEmojis[':back:']} ${cardEmojis[':back:']}`;
            }).join('\n')
        )
        .setFooter({ text: "⚠️ Bạn có 60 giây để Ngửa Bài!" });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('view_hand').setLabel('Xem Bài').setStyle(ButtonStyle.Secondary).setEmoji('👀'),
        new ButtonBuilder().setCustomId('flip_hand').setLabel('Ngửa Bài').setStyle(ButtonStyle.Success).setEmoji('🖐️')
    );

    // 3. Gửi bàn chơi
    game.tableMsg = await channel.send({ embeds: [embed], components: [row] });

    // 4. Bộ đếm tự động (Thay thế cho cái 5 phút cũ)
    game.autoFlipTimer = setTimeout(async () => {
        const checkGame = activeGames.get(channel.id);
        if (checkGame && checkGame.status === 'playing') {
            checkGame.players.forEach(p => p.revealed = true);
            await channel.send("⏰ **Hết giờ!** Nhà cái tự động thu bài và tổng kết.");
            await finishBaicao(channel, checkGame); 
        }
    }, 60000); // 60 giây tự lật
}
// --- [MỚI] 6. HÀM TẠO GAME & ĐẾM NGƯỢC (Dùng hàm này trong lệnh chat) ---
async function startGameWithTimer(interaction, betAmount) {
    const channelId = interaction.channelId;

    // Kiểm tra nếu đang có ván chơi
    if (activeGames.has(channelId)) {
        return interaction.reply({ content: "🚫 Đang có một ván bài diễn ra ở kênh này!", ephemeral: true });
    }

    // 1. Trừ tiền người tạo (Host) trước
    const hostData = await getUser(interaction.user.id);
    if (!hostData || hostData.money < betAmount) {
        return interaction.reply({ content: "💸 Bạn không đủ tiền để tạo sòng!", ephemeral: true });
    }
    hostData.money -= betAmount;
    await db.write();

   // 2. Khởi tạo dữ liệu Game
const game = {
    type: 'baicao', // Đã thêm
    bet: betAmount,
    players: [],
    status: 'joining', 
    revealMsgs: [],    
    botHand: [],
    tableMsg: null
};

    // Thêm Host vào danh sách (Đảm bảo lưu ID đúng để đối chiếu sau này)
game.players.push({
    id: interaction.user.id, // ID này dùng để check khi bấm Ngửa bài
    name: interaction.user.username,
    hand: [],
    revealed: false
});

    activeGames.set(channelId, game);

    // 3. Gửi Embed mời gọi (Đếm ngược 30s)
    const joinRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('join_baicao').setLabel('Tham Gia Ngay').setStyle(ButtonStyle.Primary).setEmoji('💰')
    );

    const inviteEmbed = new EmbedBuilder()
        .setTitle("🎲 SÒNG BÀI CÀO ĐANG MỞ!")
        .setDescription(
            `Chủ sòng: **${interaction.user.username}**\n` +
            `💰 Mức cược: **${betAmount.toLocaleString()}**\n\n` +
            `⏱️ **Ván bài sẽ bắt đầu trong 30 giây nữa...**\n` +
            `Người tham gia: \n1. **${interaction.user.username}**`
        )
        .setColor("#00ff00");

    const msg = await interaction.reply({ embeds: [inviteEmbed], components: [joinRow], fetchReply: true });

    // 4. LOGIC ĐẾM NGƯỢC (30s -> 15s -> Start)
    
    // --- Mốc 1: Sau 15 giây, sửa tin nhắn báo còn 15s ---
    setTimeout(async () => {
        // Kiểm tra nếu game bị hủy hoặc đã start rồi thì thôi
        const currentGame = activeGames.get(channelId);
        if (!currentGame || currentGame.status !== 'joining') return;

        // Cập nhật danh sách người chơi hiện tại
        const currentList = currentGame.players.map((p, idx) => `${idx + 1}. **${p.name}**`).join('\n');
        
        const updateEmbed = EmbedBuilder.from(inviteEmbed)
            .setDescription(
                `Chủ sòng: **${interaction.user.username}**\n` +
                `💰 Mức cược: **${betAmount.toLocaleString()}**\n\n` +
                `⏳ **NHANH TAY LÊN! CÒN 15 GIÂY!**\n` +
                `Người tham gia: \n${currentList}`
            )
            .setColor("#FFA500"); // Đổi màu cam cảnh báo

        await interaction.editReply({ embeds: [updateEmbed] }).catch(() => {});
    }, 15000); // 15 giây

    // --- Mốc 2: Sau 30 giây (Hết giờ) -> BẮT ĐẦU ---
    setTimeout(async () => {
        const currentGame = activeGames.get(channelId);
        // Nếu game không còn hoặc trạng thái sai thì dừng
        if (!currentGame || currentGame.status !== 'joining') return;

        // Xóa nút "Tham Gia" để không ai vào nữa
        await interaction.editReply({ components: [] }).catch(() => {});

        // Kiểm tra số lượng người chơi
        // VÌ HOST ĐÃ ĐƯỢC ADD NGAY TỪ ĐẦU, NÊN LUÔN CÓ ÍT NHẤT 1 NGƯỜI
        if (currentGame.players.length >= 1) {
            // Có người (hoặc chỉ mình Host) -> Bắt đầu chia bài
            await startDealing(interaction.channel, currentGame);
        } else {
            // Trường hợp hy hữu lỗi không có ai (thường không xảy ra vì đã add host)
            activeGames.delete(channelId);
            await interaction.followUp("❌ Có lỗi xảy ra, ván bài bị hủy.");
        }
    }, 30000); // 30 giây
}

// =====================
//      XỬ LÝ NÚT BẤM
// =====================
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    const game = activeGames.get(interaction.channelId);
    if (!game) {
        return interaction.reply({ content: "⚠️ Ván bài này đã kết thúc hoặc không tồn tại.", ephemeral: true });
    }

    // --- XỬ LÝ RIÊNG CHO BÀI CÀO ---
    if (game.type === 'baicao') {
        if (interaction.customId === 'join_baicao') {
            if (game.status !== 'joining') return interaction.reply({ content: "🚫 Sòng đã bắt đầu!", ephemeral: true });
            
            if (game.players.find(p => p.id === interaction.user.id)) {
                return interaction.reply({ content: "⚠️ Bạn đã ở trong sòng rồi!", ephemeral: true });
            }

            const pData = await getUser(interaction.user.id);
            if (!pData || pData.money < game.bet) return interaction.reply({ content: "💸 Bạn không đủ tiền!", ephemeral: true });

            pData.money -= game.bet;
            game.players.push({ id: interaction.user.id, name: interaction.user.username, hand: [], revealed: false });
            await db.write();

            const playerList = game.players.map((p, idx) => `${idx + 1}. **${p.name}**`).join('\n');
            const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
                .setDescription(`Sòng bài cào của **${game.hostName || "Nhà cái"}**\nMức cược: **${game.bet.toLocaleString()}**\n\nNgười tham gia:\n${playerList}`);
            
            await interaction.message.edit({ embeds: [updatedEmbed] });
            return interaction.reply({ content: `✅ Bạn đã tham gia!`, ephemeral: true });
        }

        if (game.status !== 'playing') {
            return interaction.reply({ content: "⏳ Vui lòng đợi nhà cái chia bài xong!", ephemeral: true });
        }

        const player = game.players.find(p => p.id === interaction.user.id);
        if (!player) return interaction.reply({ content: "❌ Bạn không tham gia ván này!", ephemeral: true });

        if (interaction.customId === 'view_hand') {
            const handVisual = formatHand(player.hand, false);
            const pInfo = getHandInfo(player.hand);
            const scoreText = pInfo.isBaTay ? "🔥 **BA TÂY**" : `**${pInfo.score}** nút`;
            return interaction.reply({ content: `👀 Bài của bạn: ${handVisual}\n👉 Điểm: ${scoreText}`, ephemeral: true });
        }

        if (interaction.customId === 'flip_hand') {
            if (player.revealed) return interaction.reply({ content: "⚠️ Bạn đã ngửa bài rồi!", ephemeral: true });
            player.revealed = true;
            await interaction.reply({ content: `🔓 **${player.name}** đã hạ bài!` });

            if (game.players.every(p => p.revealed)) {
                await finishBaicao(interaction.channel, game);
            }
        }
    }

    // --- XỬ LÝ CHO XÌ DÁCH ---
    if (game.type === 'xidach') {
        if (game.status !== 'playing') return;

        const player = game.players.find(p => p.id === interaction.user.id);
        if (!player) return interaction.reply({ content: "🚫 Bạn không có trong ván bài này!", ephemeral: true });

        if (interaction.customId === 'view_hand') {
            const handVisual = formatHand(player.hand, false);
            const pInfo = getHandInfo(player.hand);
            const scoreText = pInfo.isBaTay ? "🔥 **BA TÂY**" : `**${pInfo.score}** nút`;

            return interaction.reply({ 
                content: `👀 **Bài của bạn:** ${handVisual}\n👉 Điểm: ${scoreText}`, 
                ephemeral: true 
            });
        }

        if (interaction.customId === 'flip_hand') {
            if (player.revealed) return interaction.reply({ content: "⚠️ Bạn đã ngửa bài rồi!", ephemeral: true });
            
            player.revealed = true;
            await interaction.reply({ content: `⏳ **${player.name}** đang chuẩn bị ngửa bài...` });
            await new Promise(r => setTimeout(r, 1500));

            const handVisual = formatHand(player.hand, false);
            const msg = await interaction.editReply(`🔓 **${player.name}** đã hạ bài: ${handVisual}`);
            
            if (!game.revealMsgs) game.revealMsgs = [];
            game.revealMsgs.push(msg);

            const pInfo = getHandInfo(player.hand);
            const scoreText = pInfo.isBaTay ? "Ba Tây" : `${pInfo.score} nút`;
            await interaction.followUp({ 
                content: `㊙️ Bạn hạ bài **${scoreText}**. Chờ những người khác nhé!`, 
                ephemeral: true 
            });

            if (game.players.every(p => p.revealed)) {
                activeGames.delete(interaction.channelId);
                if (game.tableMsg) await game.tableMsg.delete().catch(() => {});
                if (game.revealMsgs) {
                    for (const m of game.revealMsgs) await m.delete().catch(() => {});
                }

                const botHandVisual = formatHand(game.botHand, false);
                const bInfo = getHandInfo(game.botHand);
                const bScoreText = bInfo.isBaTay ? "🔥 **BA TÂY**" : `**${bInfo.score}** nút`;

                let summaryList = "";
                for (let p of game.players) {
                    const result = solveGame(p, game.botHand, game.bet);
                    const pDB = await getUser(p.id);
                    if (pDB) {
                        pDB.money += result.receive;
                        summaryList += `👤 **${p.name}**: ${result.msg}\n💰 Ví: **${pDB.money.toLocaleString()}**\n\n`;
                    }
                }
                await db.write();

                const finalEmbed = new EmbedBuilder()
                    .setTitle("🏁 KẾT QUẢ VÁN BÀI")
                    .setColor("#FFD700")
                    .setDescription(`🏰 **NHÀ CÁI (BOT):** ${botHandVisual}\n👉 Kết quả: ${bScoreText}\n──────────────────────────\n${summaryList}`)
                    .setTimestamp();

                await interaction.channel.send({ embeds: [finalEmbed] });
            }
        }
    }
}); // <--- ĐÓNG client.on('interactionCreate') TẠI ĐÂY

// =====================
// HÀM KHỞI TẠO LỆNH !BAICAO (Tách ra ngoài)
// =====================
async function handleBaiCaoCommand(message, args) {
    const betAmount = parseInt(args[0]);
    if (isNaN(betAmount) || betAmount <= 0) return message.reply("❌ Vui lòng nhập số tiền cược hợp lệ!");

    const userData = await getUser(message.author.id);
    if (!userData || userData.money < betAmount) return message.reply("❌ Bạn không đủ tiền!");
    if (activeGames.has(message.channel.id)) return message.reply("❌ Đang có ván bài diễn ra ở kênh này!");

    const gameState = { 
        type: 'baicao',
        bet: betAmount, 
        players: [], 
        status: 'joining', 
        botHand: [],
        hostName: message.author.username,
        ownerId: message.author.id,
        tableMsg: null,
        revealMsgs: [] 
    };

    userData.money -= betAmount;
    gameState.players.push({ id: message.author.id, name: message.author.username, hand: [], revealed: false });
    await db.write();
    activeGames.set(message.channel.id, gameState);

    const embed = new EmbedBuilder()
        .setTitle("🃏 SÒNG BÀI CÀO - TỐI ĐA 10 NGƯỜI")
        .setDescription(`💰 Mức cược: **${betAmount.toLocaleString()}**\n⏳ Chờ người tham gia: **30 giây**\n\n**Người tham gia:**\n1. ${message.author.username}`)
        .setColor('#00FF00');

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('join_baicao').setLabel('Tham gia').setStyle(ButtonStyle.Success)
    );

    gameState.tableMsg = await message.channel.send({ embeds: [embed], components: [row] });

    setTimeout(() => {
        if (gameState.tableMsg) gameState.tableMsg.edit({ components: [] }).catch(() => {});
        const game = activeGames.get(message.channel.id);
        if (game && game.status === 'joining') {
            if (game.players.length >= 1) startDealing(message.channel, game);
            else activeGames.delete(message.channel.id);
        }
    }, 30000);
}

// =====================
// HÀM KẾT THÚC BÀI CÀO (Tách ra ngoài)
// =====================
async function finishBaicao(channel, game) {
    if (game.isFinishing) return;
    game.isFinishing = true; 
    
    if (game.autoFlipTimer) clearTimeout(game.autoFlipTimer);

    if (game.tableMsg) await game.tableMsg.delete().catch(() => {});
    if (game.revealMsgs) {
        for (const m of game.revealMsgs) await m.delete().catch(() => {});
    }

    const bInfo = getHandInfo(game.botHand);
    const botHandVisual = formatHand(game.botHand, false);
    const bScoreText = bInfo.isBaTay ? "🔥 **BA TÂY**" : `**${bInfo.score}** nút`;

    let summaryList = "";
    for (let p of game.players) {
        const result = solveGame(p, game.botHand, game.bet);
        const pDB = await getUser(p.id);
        
        if (pDB) {
            pDB.money += result.receive;
            summaryList += `👤 **${p.name}**\n└ Kết quả: ${result.msg}\n💰 Ví: **${pDB.money.toLocaleString()}**\n\n`;
        }
    }
    await db.write();
    activeGames.delete(channel.id);

    const finalEmbed = new EmbedBuilder()
        .setTitle("🏁 KẾT QUẢ VÁN BÀI CÀO")
        .setColor("#FFD700")
        .addFields(
            { name: "🏰 NHÀ CÁI (BOT)", value: `🃏 Bài: ${botHandVisual}\n📊 Điểm: ${bScoreText}` },
            { name: "📝 CHI TIẾT", value: summaryList || "Không có người chơi" }
        )
        .setTimestamp();

    await channel.send({ embeds: [finalEmbed] });
}

    // 2. BẢNG KẾT QUẢ SIÊU ĐẸP
    const finalEmbed = new EmbedBuilder()
        .setTitle("🏁 KẾT QUẢ VÁN BÀI CÀO")
        .setColor("#FFD700")
        .setThumbnail("https://i.imgur.com/89S9OQ3.png")
        .addFields(
            { 
                name: "🏰 NHÀ CÁI (BOT)", 
                value: `🃏 Bài: ${botHandVisual}\n📊 Điểm: ${bScoreText}`, 
                inline: false 
            },
            { 
                name: "📝 CHI TIẾT TỪNG TỤ", 
                value: summaryList || "Không có người chơi", 
                inline: false 
            }
        )
        .setFooter({ text: `💵 Mức cược: ${game.bet.toLocaleString()} | Sòng bài uy tín 100%` })
        .setTimestamp();

    await channel.send({ embeds: [finalEmbed] });
}
    //=====================
    // Hàm tính kết quả
    //=====================
    function solveGame(player, botHand, bet) {
    const pInfo = getHandInfo(player.hand);
    const bInfo = getHandInfo(botHand);

    let win = false;
    let tie = false;

    // So sánh Ba Tây
    if (pInfo.isBaTay && !bInfo.isBaTay) win = true;
    else if (!pInfo.isBaTay && bInfo.isBaTay) win = false;
    else if (pInfo.isBaTay && bInfo.isBaTay) tie = true;
    else {
        // So điểm
        if (pInfo.score > bInfo.score) win = true;
        else if (pInfo.score < bInfo.score) win = false;
        else tie = true;
    }

    // Định dạng hiển thị tiền thắng/thua
    if (tie) {
        return { 
            receive: bet, 
            msg: `⚪ **Hòa** (Hoàn lại **${bet.toLocaleString()}**)` 
        };
    }
    if (win) {
        return { 
            receive: bet * 2, 
            msg: `🟢 **Thắng** (+\`${bet.toLocaleString()}\`)` 
        };
    }
    return { 
        receive: 0, 
        msg: `🔴 **Thua** (-\`${bet.toLocaleString()}\`)` 
    };
} // KẾT THÚC HÀM solveGame
    
// =====================
//      MAIN EVENTS 
// =====================
client.on("messageCreate", async (message) => {
    if (message.author.bot || !message.content.startsWith(PREFIX)) return;
    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();

    try {
        switch (cmd) {
            case "diemdanh": await cmdDiemdanh(message); break;
            case "tien": await cmdTien(message); break;
            case "doi": await handleExchange(message, args[0], args[1]); break;
            case "doixu": await handleExchange(message, args[0], "xu"); break;
            case "doitien": await handleExchange(message, args[0], "tien"); break;
            case "tralai": await cmdTralai(message, args); break;
            case "boctham": await cmdBoctham(message);  break;
            case "anxin": await cmdAnxin(message); break;
            case "vay": await cmdVay(message, args); break;
            case "xidach": await cmdXidach(message, args); break;
            case "chuyentien": await cmdChuyentien(message, args); break;
            case "chuyenxu": await cmdChuyenxu(message, args); break;
            case "baicao": await handleBaiCaoCommand(message, args);  break;
            case "nguabai": await handleNguaBaiCommand(message); break;
            case "xetbai":  await handleXetBaiCommand(message); break;
            case "top": await cmdTop(message); break;
                
            case "addmoney": 
            case "reset": 
                if (typeof cmdAdmin !== 'undefined') await cmdAdmin(message, args); 
                break; 
            case "tungxu": if(typeof cmdTungxu !== 'undefined') await cmdTungxu(message, args); break;
            case "taixiu": if(typeof cmdTaixiu !== 'undefined') await cmdTaixiu(message, args); break;
            case "baucua": if(typeof cmdBaucua !== 'undefined') await cmdBaucua(message, args); break;
            case "help": await cmdHelp(message); break;
        }
    } catch (error) {
        console.error("Lỗi lệnh chat:", error);
    }
});


// -------------------- BOT LOGIN --------------------
client.login(process.env.TOKEN);

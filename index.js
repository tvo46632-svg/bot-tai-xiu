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

// ===================== CHUYỂN XU =====================
async function cmdChuyenxu(message, args) {
    const userId = message.author.id;
    const user = await getUser(userId);

    // CHẶN KHI ĐANG NỢ
    if (user.debt > 0) {
        return message.reply(`### 🚫 GIAO DỊCH BỊ KHÓA\n> Bạn không thể chuyển xu khi đang nợ (**${user.debt.toLocaleString()} xu**).`);
    }

    const target = message.mentions.users.first();
    const amount = parseInt(args.find(a => !a.includes('<@') && !isNaN(a)));

    if (!target || isNaN(amount) || amount <= 0) 
        return message.reply("> ❗ **Hướng dẫn:** `!chuyenxu @user <số xu>`");

    if (user.xu < amount) 
        return message.reply(`> ❌ Bạn không đủ xu! (Hiện có: ${user.xu.toLocaleString()})`);

    // Phí chuyển xu 10%
    const fee = Math.floor(amount * 0.10);
    const netXu = amount - fee;

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`confirm_xu_${userId}`).setLabel('Xác nhận gửi xu').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`cancel_xu_${userId}`).setLabel('Hủy').setStyle(ButtonStyle.Danger)
    );

    const mainMsg = await message.reply({
        content: `### 🔁 YÊU CẦU CHUYỂN XU\n> 👤 **Người gửi:** ${message.author.username}\n> 👤 **Người nhận:** ${target.username}\n> 🪙 **Thực nhận:** **${netXu.toLocaleString()} xu** (Phí 10%)\n> *Hết hạn sau 60s.*`,
        components: [row]
    });

    const collector = mainMsg.createMessageComponentCollector({ filter: i => i.user.id === userId, time: 60000 });

    collector.on('collect', async i => {
        if (i.customId === `confirm_xu_${userId}`) {
            const finalCheck = await getUser(userId);
            if (finalCheck.xu < amount) return i.update({ content: "> ❌ Bạn không còn đủ xu để thực hiện!", components: [] });

            await addXu(userId, -amount);
            await addXu(target.id, netXu);

            await i.update({
                content: `### ✅ CHUYỂN XU THÀNH CÔNG\n> 🔁 **${target.username}** đã nhận được **${netXu.toLocaleString()}** xu từ **${message.author.username}**.`,
                components: []
            });
        } else {
            await i.update({ content: `> ❌ Giao dịch chuyển xu đã bị hủy.`, components: [] });
        }
        collector.stop();
    });

    collector.on('end', () => {
        setTimeout(() => mainMsg.delete().catch(() => {}), 10000);
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

// ==========================================
//      HELP COMMAND (BẢN ỔN ĐỊNH - NO LAG)
// ==========================================
async function cmdHelp(message) {
    // --- HÀM TẠO EMBED GỐC (TRANG CHỦ) ---
    const generateHomeEmbed = () => {
        return new EmbedBuilder()
            .setTitle('🎰 SÒNG BẠC MACAO & CASINO ROYAL 🎰')
            .setDescription(
                `Chào mừng **${message.author.username}** và các dân chơi!\n` +
                `Vui lòng chọn danh mục bên dưới để xem hướng dẫn chi tiết.\n\n` +
                `> ⚠️ **Lưu ý:** Menu này sẽ tự đóng sau **60 giây**.`
            )
            .setImage('https://img.pikbest.com/origin/10/14/49/86dpIkbEsTcqF.jpg') 
            .setColor('#FFD700')
            .setFooter({ text: 'Bot Casino System', iconURL: message.client.user.displayAvatarURL() })
            .setTimestamp();
    };

    // --- HÀM TẠO NÚT BẤM ---
    const getRow = () => {
        return new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('h_home').setLabel('Trang Chủ').setStyle(ButtonStyle.Secondary).setEmoji('🏠'),
            new ButtonBuilder().setCustomId('h_eco').setLabel('Kinh Tế').setStyle(ButtonStyle.Primary).setEmoji('💰'),
            new ButtonBuilder().setCustomId('h_game').setLabel('Trò Chơi').setStyle(ButtonStyle.Success).setEmoji('🎲'),
            new ButtonBuilder().setCustomId('h_bank').setLabel('Ngân Hàng').setStyle(ButtonStyle.Danger).setEmoji('🏦')
        );
    };

    // Gửi tin nhắn Help ban đầu
    const helpMsg = await message.reply({ 
        embeds: [generateHomeEmbed()], 
        components: [getRow()] 
    });

    // --- XỬ LÝ SỰ KIỆN BẤM NÚT ---
    const collector = helpMsg.createMessageComponentCollector({ 
        time: 60000 // Tồn tại 60 giây
    });

    collector.on('collect', async i => {
        // Tạo Embed mới dựa trên nút bấm
        const embed = new EmbedBuilder().setColor('#FFD700').setTimestamp();

        if (i.customId === 'h_home') {
             await i.update({ embeds: [generateHomeEmbed()], components: [getRow()] });
             return;
        } 
        
        else if (i.customId === 'h_eco') {
            embed.setTitle('💰 HỆ THỐNG TÀI CHÍNH')
                 .setThumbnail('https://cdn-icons-png.flaticon.com/512/2485/2485519.png')
                 .setDescription(
                    `**Lệnh Cơ Bản:**\n` +
                    `\`!tien\` : Kiểm tra số dư.\n` +
                    `\`!diemdanh\` : Nhận lương hàng ngày.\n` +
                    `\`!top\` : Bảng xếp hạng.\n\n` +
                    `**Giao Dịch:**\n` +
                    `\`!chuyentien <@user> <số>\` : Phí 5%.\n` +
                    `\`!chuyenxu\` : Quy đổi tiền tệ.`
                 );
        } 
        
        else if (i.customId === 'h_game') {
            embed.setTitle('🎲 SẢNH TRÒ CHƠI CASINO')
                 .setThumbnail('https://cdn-icons-png.flaticon.com/512/1067/1067357.png')
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
                 .setThumbnail('https://cdn-icons-png.flaticon.com/512/2830/2830284.png')
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

        // Cập nhật ngay lập tức không delay
        await i.update({ embeds: [embed], components: [getRow()] });
    });

    collector.on('end', async () => {
        // Tự động xóa sau 60s cho sạch box chat
        try {
            await helpMsg.delete();
            await message.delete();
        } catch (e) {
            // Chống lỗi nếu tin nhắn đã bị xóa trước đó
        }
    });
}
// ==========================================
//      CÁC HÀM BỔ TRỢ BÀI CÀO (FULL FIX)
// ==========================================

// --- 1. HÀM CHIA BÀI ---
async function startDealing(channel, game) {
    game.status = 'playing';
    const deck = createDeck();
    
    // Chia bài cho Bot (Ẩn)
    game.botHand = [deck.pop(), deck.pop(), deck.pop()];

    channel.send("🎴 **Nhà cái đang bắt đầu chia bài...**");

    // Hiệu ứng chia bài từng người
    for (let player of game.players) {
        player.hand = [deck.pop(), deck.pop(), deck.pop()];
        const dealMsg = await channel.send(`... 🃏 Đang phát bài cho **${player.name}**`);
        await new Promise(r => setTimeout(r, 1200));
        await dealMsg.delete().catch(() => {});
    }

    // Gửi bàn bài công khai
    const embed = new EmbedBuilder()
        .setTitle("🃏 BÀN BÀI CÀO CHUYÊN NGHIỆP")
        .setDescription(
            "✅ **Tất cả bài đã được chia úp!**\n\n" +
            "👉 Bấm **Xem Bài** để xem bài riêng.\n" +
            "👉 Bấm **Ngửa Bài** để công khai kết quả.\n\n" +
            "**Danh sách tụ bài:**\n" + 
            game.players.map(p => `👤 **${p.name}**: 🎴 🎴 🎴`).join('\n')
        )
        .setColor('#2b2d31')
        .setFooter({ text: "Lưu ý: Nút Ngửa Bài sẽ delay 2 giây." });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('view_hand').setLabel('Xem Bài').setStyle(ButtonStyle.Secondary).setEmoji('👀'),
        new ButtonBuilder().setCustomId('flip_hand').setLabel('Ngửa Bài').setStyle(ButtonStyle.Primary).setEmoji('🖐️')
    );

    await channel.send({ embeds: [embed], components: [row] });

    // Dọn dẹp sòng sau 5 phút nếu bị treo
    setTimeout(() => {
        if (activeGames.has(channel.id)) activeGames.delete(channel.id);
    }, 300000); 
}

// --- 2. TẠO BỘ BÀI ---
function createDeck() {
    const suits = ['♠️', '♣️', '♦️', '♥️'];
    const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    let deck = [];
    for (let s of suits) {
        for (let r of ranks) deck.push(`[${r}${s}]`);
    }
    return deck.sort(() => Math.random() - 0.5);
}

// --- 3. PHÂN TÍCH BÀI ---
function getHandInfo(hand) {
    let score = 0, faces = 0;
    hand.forEach(card => {
        const rank = card.replace(/[\[\]♠️♣️♦️♥️]/g, '');
        if (['J', 'Q', 'K'].includes(rank)) { faces++; score += 10; }
        else if (rank === 'A') score += 1;
        else score += parseInt(rank);
    });
    return { score: score % 10, isBaTay: faces === 3 };
}

// --- 4. SO BÀI & TÍNH TIỀN ---
function solveGame(player, botHand, bet) {
    const p = getHandInfo(player.hand);
    const b = getHandInfo(botHand);
    if (p.isBaTay) {
        if (b.isBaTay) return { receive: bet, msg: "Hòa (Cùng Ba Tây) - Hoàn tiền" };
        const total = (bet * 2) + (bet * 0.2);
        return { receive: total, msg: `🔥 **BA TÂY!** Thắng +20% (Nhận: ${total.toLocaleString()})` };
    }
    if (b.isBaTay) return { receive: 0, msg: `Thua (Bot có Ba Tây - Bạn ${p.score} nút)` };
    if (p.score > b.score) return { receive: bet * 2, msg: `Thắng! (${p.score} nút vs Bot ${b.score} nút)` };
    if (p.score === b.score) return { receive: bet, msg: `Hòa! (${p.score} nút) - Hoàn cược` };
    return { receive: 0, msg: `Thua! (${p.score} nút vs Bot ${b.score} nút)` };
}

// =====================
//     XỬ LÝ NÚT BẤM
// =====================
client.on("interactionCreate", async (interaction) => {
    if (!interaction.isButton()) return;
    const game = activeGames.get(interaction.channelId);
    if (!game) return;

    // NÚT THAM GIA
    if (interaction.customId === 'join_baicao') {
        if (game.status !== 'joining') return interaction.reply({ content: "Ván bài đã bắt đầu!", ephemeral: true });
       const pData = await getUser(interaction.user.id);
        if (!pData || pData.money < game.bet) return interaction.reply({ content: "Bạn không đủ tiền!", ephemeral: true });
        if (game.players.find(p => p.id === interaction.user.id)) return interaction.reply({ content: "Bạn đã vào sòng rồi!", ephemeral: true });
        if (game.players.length >= 10) return interaction.reply({ content: "Sòng đầy!", ephemeral: true });

        pData.money -= game.bet;
        await db.write();
        game.players.push({ id: interaction.user.id, name: interaction.user.username, hand: [], revealed: false });

        const newEmbed = EmbedBuilder.from(interaction.message.embeds[0])
            .setDescription(`💰 Mức cược: **${game.bet.toLocaleString()}**\n\n**Người tham gia:**\n${game.players.map((p, idx) => `${idx + 1}. ${p.name}`).join('\n')}`);
        
        await interaction.message.edit({ embeds: [newEmbed] });
        return interaction.reply({ content: `✅ Đã tham gia cược ${game.bet}`, ephemeral: true });
    }

    // NÚT XEM & NGỬA BÀI
    if (game.status !== 'playing') return;
    const player = game.players.find(p => p.id === interaction.user.id);
    if (!player) return interaction.reply({ content: "Bạn không ở trong ván này!", ephemeral: true });

    if (interaction.customId === 'view_hand') {
        return interaction.reply({ content: `🃏 Bài của bạn là: **${player.hand.join(' ')}**`, ephemeral: true });
    }

   if (interaction.customId === 'flip_hand') {
        // 1. Kiểm tra nếu đã lật rồi thì không cho lật nữa
        if (player.revealed) return interaction.reply({ content: "Bạn đã ngửa bài rồi!", ephemeral: true });
        
        // 2. QUAN TRỌNG: Khóa trạng thái ngay lập tức trước khi đợi 2 giây
        player.revealed = true; 
        
        // 3. Thông báo cho cả sòng biết người này đang lật
        await interaction.reply({ content: `⏳ **${player.name}** đang chuẩn bị ngửa bài...` });
        
        // 4. Delay 2 giây như yêu cầu
        await new Promise(r => setTimeout(r, 2000));

        // 5. Tính toán kết quả và cộng tiền
        const result = solveGame(player, game.botHand, game.bet);
        const pDB = await getUser(player.id);
        
        if (pDB) {
            pDB.money += result.receive;
            await db.write();
        }

        // 6. Sửa lại tin nhắn chờ thành kết quả bài thực tế
        await interaction.editReply(`🎴 **${player.name}** lật bài: ${player.hand.join(' ')}\n➜ **Kết quả:** ${result.msg}`);

        // 7. Kiểm tra kết thúc ván (Xóa game nếu mọi người đã lật hết)
        if (game.players.every(p => p.revealed)) {
    activeGames.delete(interaction.channelId);
    // Hiện thêm bài của Bot để minh bạch
    await interaction.channel.send(`🎴 **Nhà cái (Bot) hạ bài:** ${game.botHand.join(' ')}\n🏁 **Ván bài kết thúc!** Mọi người có thể mở ván mới.`);
            }
} // Đóng if (flip_hand)
}); // Đóng client.on
// =====================
// ham khoi tao nut !baicao
// =====================
async function handleBaiCaoCommand(message, args) {
    const betAmount = parseInt(args[0]);
    if (isNaN(betAmount) || betAmount <= 0) return message.reply("❌ Vui lòng nhập số tiền cược hợp lệ!");

    const userData = await getUser(message.author.id);
    if (!userData || userData.money < betAmount) return message.reply("❌ Bạn không đủ tiền!");
    if (activeGames.has(message.channel.id)) return message.reply("❌ Đang có ván bài diễn ra ở kênh này!");

    const gameState = { 
        bet: betAmount, 
        players: [], 
        status: 'joining', 
        botHand: [],
        ownerId: message.author.id 
    };

    // Chủ sòng tham gia luôn
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

    const msg = await message.channel.send({ embeds: [embed], components: [row] });

    setTimeout(() => {
        msg.edit({ components: [] }).catch(() => {});
        const game = activeGames.get(message.channel.id);
        if (game && game.status === 'joining') {
            if (game.players.length >= 1) startDealing(message.channel, game);
            else activeGames.delete(message.channel.id);
        }
    }, 30000);
}
// =====================
// ham khoi tao xetbai    
// ======================
async function handleXetBaiCommand(message) {
    const game = activeGames.get(message.channel.id);
    if (!game || game.status !== 'playing') return;

    const unrevealed = game.players.filter(p => !p.revealed);
    if (unrevealed.length === 0) return message.reply("Mọi người đã ngửa bài hết rồi!");

    // Chọn ngẫu nhiên 1 người trong số những người chưa ngửa bài
    const target = unrevealed[Math.floor(Math.random() * unrevealed.length)];
    target.revealed = true;

    const result = solveGame(target, game.botHand, game.bet);
    const pDB = await getUser(target.id);
    pDB.money += result.receive;
    await db.write();

    message.channel.send(`🎲 **Bot xét bài ngẫu nhiên:**\n👤 **${target.name}**: ${target.hand.join(' ')}\n➜ **Kết quả:** ${result.msg}`);

    // Kiểm tra ván đấu kết thúc
    if (game.players.every(p => p.revealed)) {
        activeGames.delete(message.channel.id);
        message.channel.send("🏁 Ván bài đã kết thúc sau khi xét bài!");
    }
}
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


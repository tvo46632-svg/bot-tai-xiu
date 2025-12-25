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
// Hàm lấy toàn bộ danh sách user để làm bảng xếp hạng
async function getAllUsers() {
    await db.read();
    // Chuyển Object users thành một mảng các User kèm theo ID để dễ xử lý
    return Object.entries(db.data.users).map(([id, data]) => {
        return {
            id: id,
            money: data.money || 0,
            xu: data.xu || 0,
            debt: data.debt || 0
        };
    });
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
// 1. BẢNG CHUYỂN ĐỔI (Đã sửa Key để khớp với dạng 9h, 8s, Ad...)
const cardEmojis = {
    // Chất Bích (s)
    'As': '<:As:1453654015882821693>', '2s': '<:2s:1453654034467651636>', '3s': '<:3s:1453654192873934888>', '4s': '<:4s:1453654318417711105>', '5s': '<:5s:1453654339762651198>', 
    '6s': '<:6s:1453654363883962370>', '7s': '<:7s:1453654387359744063>', '8s': '<:8s:1453654406787760201>', '9s': '<:9s:1453654426400329728>', '10s': '<:10s:1453654450395811840>', 
    'Js': '<:Js:1453657192065663087>', 'Qs': '<:Qs:1453657012884733983>', 'Ks': '<:Ks:1453657038360940625>',

    // Chất Cơ (h)
    'Ah': '<:Ah:1453651025364914270>', '2h': '<:2h:1453651133619896360>', '3h': '<:3h:1453651817488711741>', '4h': '<:4h:1453651882881978388>', '5h': '<:5h:1453651964926627882>', 
    '6h': '<:6h:1453652020098764932>', '7h': '<:7h:1453652050670911533>', '8h': '<:8h:1453652088679563274>', '9h': '<:9h:1453652126407458970>', '10h': '<:10h:1453652157911011339>', 
    'Jh': '<:Jh:1453652343567683755>', 'Qh': '<:Qh:1453652372181094513>', 'Kh': '<:Kh:1453652398441500704>',

    // Chất Nhép/Chuồn (c)
    'Ac': '<:Ac:1453653137079668857>', '2c': '<:2c:1453653161180135464>', '3c': '<:3c:1453653324539625488>', '4c': '<:4c:1453653609202843789>', '5c': '<:5c:1453653672536969338>', 
    '6c': '<:6c:1453653695567888406>', '7c': '<:7c:1453653722445119543>', '8c': '<:8c:1453653745136046202>', '9c': '<:9c:1453653769181986930>', '10c': '<:10c:1453653791047155763>', 
    'Jc': '<:Jc:1453653814866608210>', 'Qc': '<:Qc:1453653838484476027>', 'Kc': '<:Kc:1453653888564461679>',

    // Chất Rô (d)
    'Ad': '<:Ad:1453652431627092082>', '2d': '<:2d:1453652489004912806>', '3d': '<:3d:1453652679665385484>', '4d': '<:4d:1453652758744924224>', '5d': '<:5d:1453652783847706655>', 
    '6d': '<:6d:1453652804701782161>', '7d': '<:7d:1453652862998413342>', '8d': '<:8d:1453652890626424842>', '9d': '<:9d:1453652911992078469>', '10d': '<:10d:1453652933248811008>', 
    'Jd': '<:Jd:1453652955956904070>', 'Qd': '<:Qd:1453652979235291197>', 'Kd': '<:Kd:1453653001029030008>',

    '🂠': '<:back:1453657459507073074>'
};

// 2. Hàm Format để hiển thị Emoji
function formatHandWithImages(hand, isHidden = false) {
    if (isHidden) { 
        return `${cardEmojis['🂠']} ${cardEmojis[hand[1]] || hand[1]}`;
    }
    return hand.map(card => cardEmojis[card] || card).join(" ");
}

// 3. Hàm tính điểm (Sửa logic để hiểu dạng 9h, 10s...)
function calcPoint(hand) {
    let score = 0;
    let aces = 0;
    for (let card of hand) {
        let val = card.slice(0, -1); // Lấy phần số (bỏ chữ s,h,c,d cuối)
        if (val === 'A') { aces++; score += 11; }
        else if (['J', 'Q', 'K'].includes(val)) { score += 10; }
        else { score += parseInt(val); }
    }
    while (score > 21 && aces > 0) { score -= 10; aces--; }
    return score;
}

// 4. Hàm chia bài (Trả về dạng 9h, 8s để khớp bảng Emoji)
function dealCard() {
    const suits = ['s', 'c', 'h', 'd'];
    const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const suit = suits[Math.floor(Math.random() * suits.length)];
    const value = values[Math.floor(Math.random() * values.length)];
    return value + suit;
}

// 5. Hàm lấy URL ảnh lá bài (Thumbnail)
function cardToImageUrl(card) {
    if (card === '🂠') return 'https://i.imgur.com/89S9OQ3.png';
    const val = card.slice(0, -1);
    const suit = card.slice(-1).toUpperCase();
    const finalVal = val === '10' ? '0' : val;
    return `https://deckofcardsapi.com/static/img/${finalVal}${suit}.png`;
}

// ====== LỆNH CHÍNH ======
let blackjackSession = {};

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

// ====== XỬ LÝ NÚT BẤM ======
client.on("interactionCreate", async (interaction) => {
    if (!interaction.isButton()) return;
    const [action, userId] = interaction.customId.split("_");
    const session = blackjackSession[interaction.channel.id];

    if (interaction.customId.startsWith('h_')) return; 
    if (!session || session.userId !== interaction.user.id) {
        return interaction.reply({ content: "❌ Không phải phiên của bạn!", ephemeral: true });
    }

    if (action === "hit") {
        session.playerHand.push(dealCard());
        const total = calcPoint(session.playerHand);
        const userData = await getUser(userId);

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
        } else {
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
        
        while (calcPoint(dealerHand) < 17) {
            dealerHand.push(dealCard());
            const drawEmbed = EmbedBuilder.from(interaction.message.embeds[0])
                .setFields(
                    { name: `👤 Bạn (${calcPoint(session.playerHand)})`, value: `${formatHandWithImages(session.playerHand)}`, inline: false },
                    { name: `🤖 Nhà cái (${calcPoint(dealerHand)})`, value: `${formatHandWithImages(dealerHand)}`, inline: false }
                )
                .setFooter({ text: "🤖 Nhà cái đang rút bài... 🃏" });

            await interaction.editReply({ embeds: [drawEmbed], components: [] });
            await sleep(1500);
        }

        const playerTotal = calcPoint(session.playerHand);
        const dealerTotal = calcPoint(dealerHand);
        let resultText = "";
        let finalColor = "#2f3136";

        if (dealerTotal > 21 || playerTotal > dealerTotal) {
            await addMoney(userId, session.bet * 2);
            resultText = `🎉 **THẮNG!** Bạn nhận \`+${session.bet.toLocaleString()}\``;
            finalColor = "#2ecc71";
        } else if (playerTotal === dealerTotal) {
            await addMoney(userId, session.bet);
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
        }, 20000);
    } else {
        delete blackjackSession[channelId];
    }
}

function finishGame(channelId) {
    const session = blackjackSession[channelId];
    if (session && session.msg) {
        setTimeout(() => {
            session.msg.delete().catch(() => {});
            delete blackjackSession[channelId];
        }, 20000);
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
    // ĐỊNH NGHĨA 10 ICON MÀU SẮC
    const CARD_ICONS = ["🟦", "🟥", "🟩", "🟨", "🟧", "🟪", "🟫", "⬛", "⬜", "🔘"];

    // Gửi bàn bài công khai
    const embed = new EmbedBuilder()
        .setTitle("🃏 BÀN BÀI CÀO CHUYÊN NGHIỆP")
        .setDescription(
            "✅ **Tất cả bài đã được chia úp!**\n\n" +
            "👉 Bấm **Xem Bài** để xem bài riêng.\n" +
            "👉 Bấm **Ngửa Bài** để công khai kết quả.\n\n" +
            "**Danh sách tụ bài:**\n" + 
           game.players.map((p, idx) => `${CARD_ICONS[idx] || "👤"} **${p.name}**: 🎴 🎴 🎴`).join('\n')
        )
        .setColor('#2b2d31')
        .setFooter({ text: "Lưu ý: Nút Ngửa Bài sẽ delay 2 giây." });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('view_hand').setLabel('Xem Bài').setStyle(ButtonStyle.Secondary).setEmoji('👀'),
        new ButtonBuilder().setCustomId('flip_hand').setLabel('Ngửa Bài').setStyle(ButtonStyle.Primary).setEmoji('🖐️')
    );

    game.tableMsg = await channel.send({ embeds: [embed], components: [row] });

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
        if (b.isBaTay) return { receive: bet, msg: `Hòa (Cùng Ba Tây) - Hoàn lại **${bet.toLocaleString()}** tiền` };
        const total = (bet * 2) + (bet * 0.2);
        return { receive: total, msg: `🔥 **BA TÂY!** Thắng rực rỡ (Nhận: **${total.toLocaleString()}** tiền)` };
    }
    
    if (b.isBaTay) return { receive: 0, msg: `Thua (Bot có Ba Tây - Bạn ${p.score} nút). Mất **${bet.toLocaleString()}** tiền` };
    
    if (p.score > b.score) {
        const winAmount = bet * 2;
        return { receive: winAmount, msg: `Thắng! (${p.score} nút vs Bot ${b.score} nút). Nhận: **${winAmount.toLocaleString()}** tiền` };
    }
    
    if (p.score === b.score) return { receive: bet, msg: `Hòa! (${p.score} nút) - Hoàn lại **${bet.toLocaleString()}** tiền` };
    
    return { receive: 0, msg: `Thua! (${p.score} nút vs Bot ${b.score} nút). Mất **${bet.toLocaleString()}** tiền` };
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
    // Kiểm tra nếu người chơi này đã lật bài trước đó rồi thì không cho lật nữa
    if (player.revealed) return interaction.reply({ content: "Bạn đã ngửa bài rồi!", ephemeral: true });
    
    // Đánh dấu trạng thái người chơi này đã lật bài
    player.revealed = true; 
    
    // Gửi phản hồi tạm thời để báo hiệu bot đang xử lý (tạo hiệu ứng hồi hộp)
    await interaction.reply({ content: `⏳ **${player.name}** đang chuẩn bị ngửa bài...` });
    
    // Tạm dừng 2 giây trước khi hiện bài (tạo độ trễ giống như ngoài đời)
    await new Promise(r => setTimeout(r, 2000));

    // Cập nhật tin nhắn công khai: Chỉ hiện bộ bài, không hiện thắng/thua để giữ bí mật bài Bot
    await interaction.editReply(`🎴 **${player.name}** đã hạ bài: **${player.hand.join(' ')}**\n*(Kết quả sẽ có khi ván bài kết thúc)*`);
    
    // Lưu tin nhắn vừa gửi vào mảng revealMsgs để tí nữa xóa sạch khi kết thúc ván
    game.revealMsgs.push(await interaction.fetchReply());

    // Gửi một thông báo RIÊNG (chỉ người bấm mới thấy) để họ biết số nút của mình
    const pInfo = getHandInfo(player.hand);
    const pScoreText = pInfo.isBaTay ? "Ba Tây" : `${pInfo.score} nút`;
    await interaction.followUp({ 
        content: `㊙️ **Xem bài riêng:** Bài của bạn là **${pScoreText}**. Đợi mọi người lật hết nhé!`, 
        ephemeral: true 
    });

    // --- KIỂM TRA KẾT THÚC VÁN ---
    // Nếu tất cả người chơi trong sòng đều đã lật bài (revealed === true)
    if (game.players.every(p => p.revealed)) {
        
        // Xóa ván bài này khỏi danh sách các ván đang diễn ra
        activeGames.delete(interaction.channelId);
        
        // Xóa tin nhắn "Bàn bài chuyên nghiệp" (tin nhắn có các nút bấm)
        if (game.tableMsg) await game.tableMsg.delete().catch(() => {});
        
        // Xóa tất cả các tin nhắn thông báo "Hạ bài" lẻ tẻ của từng người đã lưu trước đó
        if (game.revealMsgs) {
            for (const m of game.revealMsgs) {
                await m.delete().catch(() => {});
            }
        }

        // Lấy thông tin bài của Bot để chuẩn bị công bố
        const bInfo = getHandInfo(game.botHand);
        const bScoreText = bInfo.isBaTay ? "Ba Tây" : `${bInfo.score} nút`;

        // Khởi tạo nội dung Bảng Tổng Kết cuối ván
        let summary = `🏁 **VÁN BÀI KẾT THÚC!**\n`;
        summary += `🎴 **Bài của Nhà cái (Bot):** ${game.botHand.join(' ')} (**${bScoreText}**)\n`;
        summary += `──────────────────────────\n`;

        // Chạy vòng lặp qua từng người chơi để so bài và tính tiền
        for (let p of game.players) {
            const result = solveGame(p, game.botHand, game.bet); // So bài người chơi vs Bot
            const pDB = await getUser(p.id); // Lấy dữ liệu ví tiền từ Database
            
            if (pDB) {
                // Cộng số tiền nhận được (thắng/hòa) vào ví người chơi
                pDB.money += result.receive;
                // Thêm kết quả của người này vào nội dung bảng tổng kết
                summary += `👤 **${p.name}**: ${result.msg} ➜ 💰 Ví: **${pDB.money.toLocaleString()}**\n`;
            }
        }
        
        // Ghi dữ liệu tiền mới vào file database (Chỉ ghi 1 lần duy nhất ở đây để tối ưu)
        await db.write(); 
        
        // Gửi bảng tổng kết cuối cùng lên kênh chat cho tất cả mọi người cùng xem
       const finalEmbed = new EmbedBuilder()
    .setTitle("🏁 KẾT QUẢ VÁN BÀI")
    .setDescription(summary)
    .setColor("#f1c40f") // Màu vàng gold
    .setTimestamp();
await interaction.channel.send({ embeds: [finalEmbed] });
    }
}
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
    ownerId: message.author.id,
    tableMsg: null,
    revealMsgs: [] // Mảng này sẽ giữ các tin nhắn lật bài của người chơi
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

    // 1. Chọn ngẫu nhiên 1 người
    const target = unrevealed[Math.floor(Math.random() * unrevealed.length)];
    target.revealed = true;

    // 2. Thông báo và LƯU vào revealMsgs (Sửa lỗi biến m ở đây)
    const m = await message.channel.send(`🎲 **Bot xét bài ngẫu nhiên:**\n👤 **${target.name}** hạ bài: **${target.hand.join(' ')}**\n*(Kết quả sẽ có khi ván bài kết thúc)*`);
    game.revealMsgs.push(m); 

    // 3. KIỂM TRA KẾT THÚC VÁN
    if (game.players.every(p => p.revealed)) {
        activeGames.delete(message.channel.id);

        // Xóa bàn bài và các tin nhắn lẻ
        if (game.tableMsg) await game.tableMsg.delete().catch(() => {});
        if (game.revealMsgs) {
            for (const msg of game.revealMsgs) {
                await msg.delete().catch(() => {});
            }
        }

        // Tính toán thông tin bài Bot
        const bInfo = getHandInfo(game.botHand);
        const bScoreText = bInfo.isBaTay ? "Ba Tây" : `${bInfo.score} nút`;

        // 4. Tạo bảng tổng kết
        let summary = `🏁 **VÁN BÀI KẾT THÚC SAU KHI XÉT BÀI!**\n`;
        summary += `🎴 **Bài của Nhà cái (Bot):** ${game.botHand.join(' ')} (**${bScoreText}**)\n`;
        summary += `──────────────────────────\n`;

        for (let p of game.players) {
            const result = solveGame(p, game.botHand, game.bet);
            const pDB = await getUser(p.id);
            if (pDB) {
                pDB.money += result.receive;
                summary += `👤 **${p.name}**: ${result.msg} ➜ 💰 Ví: **${pDB.money.toLocaleString()}**\n`;
            }
        }
        
        await db.write();
        message.channel.send(summary);
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


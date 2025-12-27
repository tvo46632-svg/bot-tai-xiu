// ================================================
//                  DISCORD CASINO BOT
//        FULL VERSION — ~960+ LINES OF CODE
// ================================================

// ---------------- IMPORT MODULES ----------------
const activeGames = new Map();
const blackjackSession = {};
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

// ==========================================
//      HỆ THỐNG QUẢN LÝ TÀI CHÍNH (DB)
// ==========================================

/**
 * 1. Lấy toàn bộ thông tin User
 * Dùng khi cần truy cập nhiều thuộc tính cùng lúc (money, xu, debt)
 */
async function getUser(userId) {
    await ensureUser(userId);
    return db.data.users[userId];
}

/**
 * 2. CÁC HÀM VỀ TIỀN (MONEY) - Dùng cho Xì Dách, Bài Cào, Bầu Cua
 */
async function addMoney(userId, amount) {
    const user = await getUser(userId);
    user.money += amount;
    await db.write();
}

async function subMoney(userId, amount) {
    const user = await getUser(userId);
    // Đảm bảo tiền không bị âm
    user.money = Math.max(0, user.money - amount);
    await db.write();
}

/**
 * 3. CÁC HÀM VỀ XU (COINS) - Dùng cho Ăn Xin, Vay Vốn
 */
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
    user.xu = (user.xu || 0) + amount;
    await db.write();
}

async function subXu(userId, amount) {
    const user = await getUser(userId);
    // Trừ xu nhưng đảm bảo không nhỏ hơn 0
    user.xu = Math.max(0, (user.xu || 0) - amount);
    await db.write();
}

/**
 * 4. CÁC HÀM VỀ NỢ (DEBT) - Dùng cho hệ thống Ngân Hàng
 */
async function getUserDebt(userId) {
    const user = await getUser(userId);
    return user.debt || 0;
}

async function setUserDebt(userId, amount) {
    const user = await getUser(userId);
    user.debt = amount;
    await db.write();
}
async function getAllUsers() {
    await db.read();
    // Nếu bạn lưu người dùng trong db.data.users (dạng Object { id: {money, xu} })
    if (db.data && db.data.users) {
        return Object.keys(db.data.users).map(id => ({
            id: id,
            ...db.data.users[id]
        }));
    }
    return []; // Trả về mảng rỗng nếu chưa có ai
}

// ===================== COMMANDS =====================



// =====================
//      ĐIỂM DANH JACKPOT (ĐÃ FIX BUG SPAM)
// =====================
async function cmdDiemdanh(message) {
    const userId = message.author.id;
    await db.read();

    const today = new Date().toISOString().slice(0, 10);

    // 1. Kiểm tra điểm danh
    if (db.data.daily[userId] === today) {
        return message.reply("❌ Bạn đã điểm danh hôm nay rồi!");
    }

    // --- SỬA TẠI ĐÂY: KHÓA NGAY LẬP TỨC ---
    // Phải gán ngày và lưu vào DB TRƯỚC khi chạy animation để chống người chơi spam nút
    db.data.daily[userId] = today;
    await db.write(); 

    // 2. Tính toán kết quả trước (nhưng chưa hiện)
    const rand = Math.random() * 100;
    let xuReward = 0;
    if (rand <= 50) xuReward = 1000;
    else if (rand <= 75) xuReward = 2000;
    else if (rand <= 90) xuReward = 2500;
    else if (rand <= 98) xuReward = 3000;
    else xuReward = 3200;

    const fakeNumbers = ["1,000", "2,500", "3,200", "500", "1,200", "2,000", "3,000", "800"];

    // 3. Gửi tin nhắn bắt đầu
    const msg = await message.reply("🎰 **MÁY QUAY THƯỞNG ĐANG CHẠY...** 🎰");

    // 4. Vòng lặp nhảy số liên tục (Animation)
    for (let i = 0; i < 5; i++) { // Giảm xuống 5 lần để an toàn cho Bot
        const randomFake = fakeNumbers[Math.floor(Math.random() * fakeNumbers.length)];
        const progress = "▓".repeat(i + 1) + "░".repeat(4 - i);
        
        // Dùng .catch để tránh crash bot nếu người chơi xóa tin nhắn khi đang quay
        await msg.edit(`🎰 **JACKPOT SPINNING** 🎰\n━━━━━━━━━━━━━━━━━━\n> **[ 🎰 ${randomFake} 🎰 ]**\n━━━━━━━━━━━━━━━━━━\n\`${progress}\` *Đang khớp số...*`).catch(() => {});
        
        // Tăng lên 700ms để Discord không chặn (Rate Limit)
        await new Promise(res => setTimeout(res, 700));
    }

    // 5. Lưu tiền vào DB
    // Vì ngày đã lưu ở bước 1, bước này chỉ cần cộng tiền
    await addXu(userId, xuReward);

    // 6. Hiển thị kết quả cuối cùng
    const isJackpot = xuReward >= 3000;
    const finalHeader = isJackpot ? "🎊 🔥 **SIÊU CẤP JACKPOT** 🔥 🎊" : "✅ **ĐIỂM DANH THÀNH CÔNG**";
    
    await msg.edit(`${finalHeader}\n━━━━━━━━━━━━━━━━━━\n👤 Người chơi: **${message.author.username}**\n💰 Nhận được: **${xuReward.toLocaleString()} xu**\n━━━━━━━━━━━━━━━━━━\n*Số dư mới của bạn đã được cập nhật!*`).catch(() => {});
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




//---- TUNG XU VIP PRO GIF ------
//-------------------------------

// Biến chặn spam (đặt ngoài cùng)
const activeTungXu = new Set();

async function cmdTungxu(message, args) {
    // Hàm xóa lỗi tự động
    const xoaTinNhanLoi = async (msgGui, noiDung) => {
        const reply = await msgGui.reply(noiDung);
        setTimeout(async () => {
            try { await msgGui.delete(); await reply.delete(); } catch (err) {}
        }, 5000);
    };

    if (args.length < 2) return xoaTinNhanLoi(message, "### ❗ Cách dùng: `!tungxu <số_xu/all> <n/s>`");

    const userId = message.author.id;
    if (activeTungXu.has(userId)) return message.reply("> ⚠️ Đang búng rồi, chờ kết quả đã nào!");

    try {
        const user = await getUser(userId);
        let betInput = args[0].toLowerCase();
        let userChoice = args[1].toLowerCase();
        let betXu = (betInput === "all") ? user.xu : parseInt(betInput);

        if (isNaN(betXu) || betXu <= 0) return xoaTinNhanLoi(message, "> ❌ Số xu không hợp lệ!");
        if (user.xu < betXu) return xoaTinNhanLoi(message, "> ❌ Bạn không đủ xu!");

        if (["n", "ngửa", "ngua"].includes(userChoice)) userChoice = "ngửa";
        else if (["s", "sấp", "sap"].includes(userChoice)) userChoice = "sấp";
        else return xoaTinNhanLoi(message, "> ❌ Chọn: `ngửa` (n) hoặc `sấp` (s)!");

        activeTungXu.add(userId);
        await subXu(userId, betXu);

        // --- PHẦN CẦN ĐIỀN LINK ẢNH VÀO ĐÂY ---
        const IMG_NGUA_URL = "https://cdn.discordapp.com/attachments/1429700413002747978/1454117021355606271/xu_n.png?ex=694feb82&is=694e9a02&hm=869a1736e9bcabb188c26f604de27b81da4256a77ed8ff94da6305c400eb4aa0&"; 
        const IMG_SAP_URL = "https://cdn.discordapp.com/attachments/1429700413002747978/1454117021854859406/xu_s.png?ex=694feb82&is=694e9a02&hm=c5fac4b51de13e55bb86b7117b7390822d03e1a950f94b198d176612efae19e2&";   
        
        // Đã sửa lỗi hiển thị Emote (Thêm <:tên:ID>)
        const EMOTE_NGUA = "<:ngua:1454113655460462675>"; 
        const EMOTE_SAP = "<:sap:1454113634266517661>";   
        
        const GIF_SPIN = "https://c.tenor.com/u0PubumsAUkAAAAC/tenor.gif";
        // ----------------------------------
        // TẠO BẢNG XOAY (GIF)
        const embedSpin = new EmbedBuilder()
            .setColor("#FFFF00") 
            .setTitle("🪙 ĐANG TUNG XU...")
            .setDescription(`**${message.author.username}** cược **${betXu.toLocaleString()}** vào **${userChoice.toUpperCase()}**`)
            .setImage(GIF_SPIN) // Hiện GIF to
            .setFooter({ text: "Chờ xíu..." });

        const msg = await message.reply({ embeds: [embedSpin] });

        // Chờ 3 giây
        await new Promise(res => setTimeout(res, 3000));

        // TÍNH KẾT QUẢ
        const result = Math.random() < 0.5 ? "ngửa" : "sấp";
        const isWin = (result === userChoice);
        
        const resultText = isWin 
            ? `🎉 **THẮNG:** +${(betXu * 2).toLocaleString()} xu` 
            : `💸 **THUA:** -${betXu.toLocaleString()} xu`;
        
        const resultColor = isWin ? "#00FF00" : "#FF0000"; 
        const resultImage = (result === "ngửa") ? IMG_NGUA_URL : IMG_SAP_URL;
        const resultIcon = (result === "ngửa") ? EMOTE_NGUA : EMOTE_SAP;

        // CỘNG TIỀN NẾU THẮNG
        if (isWin) await addXu(userId, betXu * 2);
        const newUser = await getUser(userId);

        // TẠO BẢNG KẾT QUẢ (THAY GIF BẰNG ẢNH TĨNH)
        const embedResult = new EmbedBuilder()
            .setColor(resultColor)
            .setTitle(`🪙 KẾT QUẢ: ${result.toUpperCase()} ${resultIcon}`) // Emote sẽ hiện ở đây
            .setDescription(`${resultText}\n\n> 💰 Ví hiện tại: **${newUser.xu.toLocaleString()}** xu`)
            .setThumbnail(resultImage) // Ảnh Xu Ngửa/Sấp hiện góc phải
            .setFooter({ text: `Người chơi: ${message.author.username}`, iconURL: message.author.displayAvatarURL() });

        // Sửa tin nhắn cũ thành bảng kết quả
        await msg.edit({ embeds: [embedResult] }).catch(() => null);

    } catch (e) {
        console.error(e);
        message.reply("❌ Lỗi hệ thống!");
    } finally {
        activeTungXu.delete(userId);
    }
}








// =====================
//      TAI XIU MULTIPLAYER
// =====================
async function cmdTaixiu(message) {
    const gifWaiting = "https://media.tenor.com/5PepR8rD4U0AAAAC/throwing-dice-quavo.gif";
    const gifRolling = "https://media.tenor.com/acXyDcloqNoAAAAi/dice-1-dice.gif";

    // 1. Khởi tạo danh sách người chơi trong phiên này
    let players = []; 
    // Cấu trúc mỗi player: { id: string, name: string, choice: string, bet: number }

    const mainMsg = await message.channel.send({
        content: `### 🎲 PHIÊN TÀI XỈU ĐA NGƯỜI CHƠI\n${gifWaiting}\n> ⏳ Thời gian đặt cược: **30 giây**\n> Nhấn nút phía dưới rồi **nhập số tiền cược** vào chat!`,
        components: [
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('mtx_tai').setLabel('TÀI').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('mtx_xiu').setLabel('XỈU').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('mtx_chan').setLabel('CHẴN').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('mtx_le').setLabel('LẺ').setStyle(ButtonStyle.Secondary)
            )
        ]
    });

    // 2. Bộ thu thập nút bấm (Cho phép nhiều người bấm)
    const buttonCollector = mainMsg.createMessageComponentCollector({ time: 30000 });

    buttonCollector.on('collect', async i => {
        const choiceMap = { 'mtx_tai': 'tài', 'mtx_xiu': 'xỉu', 'mtx_chan': 'chẵn', 'mtx_le': 'lẻ' };
        const choice = choiceMap[i.customId];

        // Gửi tin nhắn ẩn (Ephemeral) để yêu cầu nhập tiền
        await i.reply({ content: `✅ Bạn chọn **${choice.toUpperCase()}**. Hãy nhập số tiền muốn cược vào kênh chat (300 - 10,000)!`, ephemeral: true });

        // Chờ người đó nhập tiền vào channel
        const moneyFilter = m => m.author.id === i.user.id && !isNaN(m.content);
        const mCollector = message.channel.createMessageCollector({ filter: moneyFilter, time: 15000, max: 1 });

        mCollector.on('collect', async m => {
            const bet = parseInt(m.content);
            if (m.deletable) m.delete().catch(() => {});

            if (bet < 300 || bet > 10000) return i.followUp({ content: "❌ Tiền cược không hợp lệ (300 - 10,000)!", ephemeral: true });

            const user = await getUser(i.user.id);
            if (user.money < bet) return i.followUp({ content: `❌ Bạn không đủ tiền! (Còn ${user.money})`, ephemeral: true });

            // Kiểm tra xem người này đã cược chưa
            if (players.find(p => p.id === i.user.id)) return i.followUp({ content: "❌ Bạn đã đặt cược trong phiên này rồi!", ephemeral: true });

            // Trừ tiền và thêm vào danh sách
            await subMoney(i.user.id, bet);
            players.push({ id: i.user.id, name: i.user.username, choice, bet });

            i.followUp({ content: `💰 Đã nhận cược: **${bet.toLocaleString()} xu** vào cửa **${choice.toUpperCase()}**!`, ephemeral: true });
            
            // Cập nhật danh sách hiển thị trên tin nhắn chính
            const list = players.map(p => `• **${p.name}**: ${p.choice} (${p.bet.toLocaleString()})`).join("\n");
            await mainMsg.edit({ content: `### 🎲 PHIÊN TÀI XỈU ĐA NGƯỜI CHƠI\n${gifWaiting}\n> ⏳ Còn lại: **${Math.round((buttonCollector.endTime - Date.now())/1000)}s**\n\n**Danh sách đã cược:**\n${list}` });
        });
    });

    buttonCollector.on('end', async () => {
        if (players.length === 0) return mainMsg.edit({ content: "### 🎲 PHIÊN TÀI XỈU\n> ❌ Không có ai tham gia đặt cược.", components: [] });

        // 3. Animation xóc đĩa
        await mainMsg.edit({ content: `### 🎲 ĐANG XÓC ĐĨA...\n${gifRolling}`, components: [] });
        await new Promise(res => setTimeout(res, 3000));

        // 4. Tính toán kết quả
        const d1 = Math.floor(Math.random() * 6) + 1;
        const d2 = Math.floor(Math.random() * 6) + 1;
        const d3 = Math.floor(Math.random() * 6) + 1;
        const sum = d1 + d2 + d3;
        const diceEmojis = ["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
        const resultText = `### 🎲 KẾT QUẢ: ${diceEmojis[d1]} ${diceEmojis[d2]} ${diceEmojis[d3]} (${sum})`;

        // 5. Tạo bảng kết quả
        let tableHeader = "━━━━━━━━━━━━━━━━━━\n**BẢNG VÀNG KẾT QUẢ**\n━━━━━━━━━━━━━━━━━━\n";
        let tableBody = "";

        for (const p of players) {
            let win = false;
            if (p.choice === "tài" && sum >= 11) win = true;
            else if (p.choice === "xỉu" && sum <= 10) win = true;
            else if (p.choice === "chẵn" && sum % 2 === 0) win = true;
            else if (p.choice === "lẻ" && sum % 2 === 1) win = true;

            if (win) {
                const gain = p.bet * 2;
                await addMoney(p.id, gain);
                tableBody += `✅ **${p.name}**: +${gain.toLocaleString()} xu (${p.choice.toUpperCase()})\n`;
            } else {
                tableBody += `❌ **${p.name}**: -${p.bet.toLocaleString()} xu (${p.choice.toUpperCase()})\n`;
            }
        }

        await mainMsg.edit(`${resultText}\n${tableHeader}${tableBody}━━━━━━━━━━━━━━━━━━`);
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




// 1. Khai báo biến khóa bên ngoài hàm để nó không bị reset khi chạy lại hàm
let isBocthamRunning = false;

// =====================
//      BỐC THĂM MAY MẮN (CHỐNG SPAM HÀNG CHỜ)
// =====================

async function cmdBoctham(message) {
    if (isBocthamRunning) {
        return message.channel.send(`> ⏳ **${message.author.username}**, máy bốc thăm đang bận!`)
            .then(m => setTimeout(() => { m.delete().catch(() => {}); message.delete().catch(() => {}); }, 3000)).catch(() => {});
    }

    try {
        await db.read();
        const userId = message.author.id;
        const today = new Date().toISOString().slice(0, 10);

        // --- KHỞI TẠO DỮ LIỆU CỰC KỲ AN TOÀN ---
        if (!db.data.boctham) db.data.boctham = {};
        
        // Nếu chưa có user hoặc sai ngày, tạo mới/reset ngay lập tức
        if (!db.data.boctham[userId] || db.data.boctham[userId].lastDate !== today) {
            db.data.boctham[userId] = { lastDate: today, count: 3 };
            await db.write(); 
        }

        // --- KIỂM TRA LƯỢT (Dùng optional chaining ?. để không bao giờ lỗi) ---
        const currentCount = db.data.boctham[userId]?.count || 0;

        if (currentCount <= 0) {
            return message.channel.send(`> ❌ **${message.author.username}**, bạn đã hết lượt bốc thăm hôm nay!`)
                .then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
        }

        const user = await getUser(userId);
        if (!user || user.money < 200) {
            return message.channel.send(`> ❌ **${message.author.username}**, cần **200 tiền** để bốc thăm!`)
                .then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
        }

        // --- KHÓA MÁY VÀ THỰC HIỆN TRỪ LƯỢT ---
        isBocthamRunning = true;
        
        // Trừ trực tiếp vào đường dẫn chắc chắn tồn tại
        db.data.boctham[userId].count -= 1;
        await subMoney(userId, 200);
        await db.write();

        await message.delete().catch(() => {});

        // --- PHẦN THƯỞNG (Giữ nguyên tier của bạn) ---
        const rand = Math.random() * 100;
        let reward = 0;
        if (rand <= 40) reward = Math.floor(Math.random() * 51) + 50; 
        else if (rand <= 70) reward = Math.floor(Math.random() * 501) + 100;
        else if (rand <= 90) reward = Math.floor(Math.random() * 501) + 500;
        else if (rand <= 98) reward = Math.floor(Math.random() * 1501) - 1000;
        else reward = 4000;

        let tier = { name: "GỖ", emoji: "🪵", color: "🟫" };
        if (reward < 0) tier = { name: "RÁC", emoji: "🗑️", color: "🥀" };
        else if (reward === 4000) tier = { name: "THẦN THOẠI", emoji: "🌟", color: "👑" };
        else if (reward >= 1000) tier = { name: "KIM CƯƠNG", emoji: "💎", color: "🔹" };
        else if (reward >= 500) tier = { name: "VÀNG", emoji: "🟡", color: "🥇" };
        else if (reward >= 200) tier = { name: "SẮT", emoji: "⚪", color: "🥈" };

        const msg = await message.channel.send(`### 🎁 **${message.author.username}** đang mở hộp quà may mắn...`);
        const allTiers = ["⚪ SẮT", "🟡 VÀNG", "💎 KIM CƯƠNG", "👑 THẦN THOẠI"];
        
        for (let i = 0; i < 3; i++) {
            await new Promise(res => setTimeout(res, 800));
            await msg.edit(`### 🎁 Đang bốc thăm...\n> ✨ Đang tìm thấy: **${allTiers[Math.floor(Math.random() * allTiers.length)]}**`).catch(() => {});
        }

        await addMoney(userId, reward);
        const statusText = reward >= 0 ? `Nhận: **+${reward.toLocaleString()}**` : `Mất: **${reward.toLocaleString()}**`;
        
        // Hiển thị số lượt mới nhất
        const finalCount = db.data.boctham[userId]?.count ?? 0;
        await msg.edit(`### ${tier.emoji} HỘP QUÀ ${tier.name} ${tier.emoji}\n> 👤 Người chơi: **${message.author.username}**\n> ${tier.color} ${statusText} tiền\n> 🎫 Còn lại: \`${finalCount}\` lượt`).catch(() => {});

    } catch (err) {
        console.error("LỖI BOCTHAM CHI TIẾT:", err);
    } finally {
        isBocthamRunning = false; 
    }
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
        .setThumbnail("https://media.tenor.com/llloRI8QtkQAAAAi/money.gif") // Có thể thay bằng icon vương miện
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



    
// =====================
//      ĂN XIN (BỐC TÚI MÙ) - CHỐNG SPAM 
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

    // Kiểm tra lượt trước
    if (info.count <= 0) {
        // Xóa tin nhắn lệnh của người chơi cho gọn
        await message.delete().catch(() => {});
        const reply = await message.channel.send(`> ❌ **${message.author.username}**, bạn đã dùng hết 2 lượt ăn xin hôm nay!`);
        setTimeout(() => reply.delete().catch(() => {}), 5000);
        return;
    }

    // --- FIX QUAN TRỌNG: TRỪ LƯỢT VÀ LƯU NGAY LẬP TỨC ĐỂ KHÓA SPAM ---
    info.count--;
    await db.write(); 

    // 1. Tính toán phần thưởng trước
    const rand = Math.random();
    let reward = 0;
    if (rand < 0.5) reward = 600;
    else reward = Math.floor(Math.random() * (599 - 200 + 1)) + 200;

    const isRare = reward >= 600;
    const item = isRare 
        ? { name: "NGỌC LỤC BẢO", emoji: "💚", box: "🎁" } 
        : { name: "MẢNH SẮT VỤN", emoji: "⚪", box: "📦" };

    // 2. Animation bốc túi mù (Dùng channel.send để an toàn sau khi xóa tin nhắn gốc)
    const msg = await message.reply("### 🛍️ Đang bốc túi mù...");
    
    const frames = ["📦", "🎁", "📦", "✨"];
    for (let f of frames) {
        await new Promise(res => setTimeout(res, 600)); // Tăng lên 600ms để an toàn Rate Limit
        await msg.edit(`### 🛍️ Đang xé túi mù... ${f}`).catch(() => {});
    }

    // 3. Cộng tiền thưởng
    await addXu(userId, reward);

    // 4. Kết quả cuối cùng
    const finalMsg = await msg.edit(`### ${item.box} TÚI MÙ: ${item.name} ${item.emoji}\n> 👤 Người xin: **${message.author.username}**\n> 💰 Bạn xin được: **${reward.toLocaleString()} xu**\n> 🎫 Lượt còn lại: \`${info.count}\``).catch(() => {});

    // 5. Tự động dọn dẹp tin nhắn sau 5 giây
    setTimeout(() => {
        finalMsg.delete().catch(() => {});
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
                        value: `> \`!baicao <tiền>\`: Khởi tạo sòng.\n> 📥 **Bấm "Tham gia"** để vào sòng.\n> 👀 **Bấm "Xem bài"** để xem riêng (chỉ bạn thấy).\n> 🔓 **Bấm "Lật bài"** để công khai bài cho cả sòng.`
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

function formatHand(hand, hide = false) {
    if (!hand || hand.length === 0) return "🎴 (Đang chia...)";
    
    // 1. Chế độ NHÀ CÁI XÌ DÁCH (Úp lá đầu, hiện các lá còn lại)
    if (hide === 'dealer') {
        // Lấy tất cả các lá từ vị trí thứ 2 trở đi để hiển thị
        const visibleCards = hand.slice(1).map(card => cardEmojis[card] || card).join(" ");
        // Trả về lá bài úp đầu tiên + các lá còn lại
        return `${cardEmojis[':back:']} ${visibleCards}`;
    }
    
    // 2. Chế độ BÀI CÀO (Úp toàn bộ 3 lá)
    if (hide === true) {
        return `${cardEmojis[':back:']} ${cardEmojis[':back:']} ${cardEmojis[':back:']}`;
    }

    // 3. Chế độ HIỆN TOÀN BỘ (Dành cho người chơi hoặc khi kết thúc ván)
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
    if (card === ':back:') return 'https://i.imgur.com/89S9OQ3.png';
    let cleanName = card.replace(/:/g, ''); 
    // Lấy tất cả trừ ký tự cuối cùng làm giá trị (để xử lý cả '10')
    const val = cleanName.slice(0, -1);
    // Lấy ký tự cuối cùng và chuyển thành chữ in hoa
    const suit = cleanName.slice(-1).toUpperCase(); 
    
    // API DeckOfCards quy định: 10 = 0, J = J, Q = Q, K = K, A = A
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


// =============================================================================
//  2. LỆNH KHỞI TẠO !XIDACH (CÓ CHECK ĂN NGAY)
// =============================================================================
async function cmdXidach(message, args) {
    // THÊM DÒNG NÀY: Xóa tin nhắn lệnh của người chơi
    await message.delete().catch(() => {});
    const bet = parseInt(args[0]);
    if (isNaN(bet) || bet <= 0) return message.reply("❌ Số tiền không hợp lệ!");

    const user = await getUser(message.author.id);
    if (user.money < bet) return message.reply("💸 Bạn không đủ tiền!");
    
    await subMoney(message.author.id, bet);

  const session = {
    userId: message.author.id,
    playerHand: [dealCard(), dealCard()], // Lưu ý: Nên dùng drawCard(deck) ở đây luôn cho đồng bộ
    dealerHand: [dealCard(), dealCard()],
    deck: createDeck(), // THÊM DÒNG NÀY
    bet: bet,
    msg: null
};

    // --- CHECK ĂN NGAY ---
    const special = checkSpecialHand(session.playerHand);
    const dealerSpecial = checkSpecialHand(session.dealerHand);

    if (special || dealerSpecial) {
        let msg = "", winAmount = 0, color = "#e67e22";
        
        if (special && dealerSpecial) {
            msg = "⚖️ **HÒA!** Cả hai cùng có bài đặc biệt.";
            winAmount = bet;
        } else if (special) {
            msg = `🔥 **${special === "XI_BAN" ? "XÌ BÀN" : "XÌ DÁCH"}!** Bạn thắng gấp đôi.`;
            winAmount = bet * 3;
            color = "#2ecc71";
        } else {
            msg = "💀 **NHÀ CÁI XÌ DÁCH!** Bạn đã thua.";
            winAmount = 0;
            color = "#ff4d4d";
        }

        if (winAmount > 0) await addMoney(message.author.id, winAmount);
        const finalUser = await getUser(message.author.id);

        const winEmbed = new EmbedBuilder()
            .setTitle("🃏 KẾT QUẢ XÌ DÁCH")
            .setColor(color)
            .addFields(
                { name: `👤 Bạn`, value: formatHand(session.playerHand), inline: false },
                { name: `🤖 Nhà cái`, value: formatHand(session.dealerHand), inline: false }
            )
            .setDescription(`${msg}\n💰 Ví: **${finalUser.money.toLocaleString()}**`);

        return message.channel.send({ embeds: [winEmbed] });
    }

    // --- CHƠI TIẾP ---
    const embed = new EmbedBuilder()
        .setTitle("🃏 SÒNG BÀI XÌ DÁCH")
        .setColor("#2f3136")
        .addFields(
            { name: `👤 Bạn (${calcPoint(session.playerHand)})`, value: formatHand(session.playerHand), inline: false },
            { name: '🤖 Nhà cái', value: formatHand(session.dealerHand, 'dealer'), inline: false }
        )
        .setFooter({ text: "Sử dụng các nút bên dưới để chơi" });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`hit_${message.author.id}`).setLabel("Rút Bài").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`stand_${message.author.id}`).setLabel("Dằn Bài").setStyle(ButtonStyle.Secondary)
    );

    session.msg = await message.channel.send({ embeds: [embed], components: [row] });
    blackjackSession[message.author.id] = session;

    // Tự động hủy sau 1 phút nếu treo máy
    setTimeout(() => {
        if (blackjackSession[message.author.id]) {
            delete blackjackSession[message.channel.id];
            session.msg.edit({ components: [] }).catch(() => {});
        }
    }, 60000);
}





//----- HAM XU LY BAI CAO + XI DACH ------
//-----------------------------------///


client.on('interactionCreate', async (interaction) => {
    try {
        if (!interaction.isButton()) return;
        const baicaoSession = activeGames.get(interaction.channelId);

       // --- A. XỬ LÝ XÌ DÁCH ---
        if (interaction.customId.startsWith('hit_') || interaction.customId.startsWith('stand_')) {
            // 1. TÁCH LẤY ID TRƯỚC
            let [action, targetId] = interaction.customId.split("_"); 
            
            // 2. RỒI MỚI TÌM SESSION THEO ID ĐÓ
            const xidachSession = blackjackSession[targetId]; 

            if (!xidachSession) return interaction.reply({ content: "❌ Ván đã kết thúc.", flags: [64] }).catch(() => {});
            if (interaction.user.id !== targetId) return interaction.reply({ content: "🚫 Không phải bài của bạn!", flags: [64] }).catch(() => {});

            // Biến kiểm tra xem có cần kết thúc game luôn không (do dằn hoặc do quắc)
            let isEndGame = false;

            // 1. XỬ LÝ NÚT RÚT BÀI
            if (action === "hit") {
                const newCard = drawCard ? drawCard(xidachSession.deck) : dealCard();
                xidachSession.playerHand.push(newCard);
                const total = calcPoint(xidachSession.playerHand);

                // TRƯỜNG HỢP 1: NGŨ LINH (5 lá <= 21) -> Thắng ngay, không cần chờ cái
                if (xidachSession.playerHand.length === 5 && total <= 21) {
                    delete blackjackSession[interaction.channelId];
                    await addMoney(userId, xidachSession.bet * 3); // Thưởng lớn

                    const finalEmbed = EmbedBuilder.from(interaction.message.embeds[0])
                        .setColor("#9b59b6")
                        .setFields(
                            { name: `👤 Bạn (${total})`, value: formatHand(xidachSession.playerHand), inline: false },
                            { name: `🤖 Nhà cái`, value: formatHand(xidachSession.dealerHand), inline: false }
                        ).setDescription(`🔥 **NGŨ LINH!** Bạn rút 5 lá thành công và chiến thắng.`);
                    
                    await interaction.message.delete().catch(() => {});
                    return interaction.channel.send({ embeds: [finalEmbed] });
                }

                // TRƯỜNG HỢP 2: QUẮC (> 21) -> Chuyển sang lượt nhà cái (không xử thua ngay)
                if (total > 21) {
                    action = "stand"; // Ép chuyển sang trạng thái "stand" để cái bốc bài
                    isEndGame = true; // Đánh dấu là game sẽ kết thúc ở block dưới
                } else {
                    // Nếu chưa quắc và chưa đủ 5 lá -> Cập nhật tin nhắn để rút tiếp
                    return interaction.update({
                        embeds: [EmbedBuilder.from(interaction.message.embeds[0]).setFields(
                            { name: `👤 Bạn (${total})`, value: formatHand(xidachSession.playerHand), inline: false },
                            { name: `🤖 Nhà cái`, value: formatHand(xidachSession.dealerHand, 'dealer'), inline: false }
                        )]
                    }).catch(() => {});
                }
            }

          // 2. XỬ LÝ DẰN BÀI (HOẶC BỊ QUẮC Ở TRÊN CHUYỂN XUỐNG)
            if (action === "stand") {
                // Luôn deferUpdate để báo cho Discord biết Bot đang xử lý, tránh lỗi 3s
                if (!interaction.deferred && !interaction.replied) {
                    await interaction.deferUpdate().catch(() => {});
                }
                
                let dealerHand = xidachSession.dealerHand;
                let deck = xidachSession.deck;
                
                // --- BOT RÚT BÀI ---
                // Dùng xidachSession.deck để tránh lỗi undefined deck
                while (calcPoint(dealerHand) < 17 && dealerHand.length < 5) {
                    dealerHand.push(drawCard(deck));
                }
                
                const pP = calcPoint(xidachSession.playerHand);
                const dP = calcPoint(dealerHand);
                let msg = "", col = "#f1c40f";
                let winAmount = 0;

                // --- LOGIC SO SÁNH ---
                if (pP > 21 && dP > 21) {
                    winAmount = xidachSession.bet; 
                    msg = `⚖️ **HÒA!** Cả hai cùng quắc (Bạn: ${pP}, Cái: ${dP}).`;
                } else if (pP > 21) {
                    winAmount = 0;
                    msg = `❌ **QUẮC!** Bạn (${pP}) đã thua nhà cái (${dP}).`;
                    col = "#e74c3c";
                } else if (dP > 21) {
                    winAmount = xidachSession.bet * 2;
                    msg = `🎉 **THẮNG!** Nhà cái bị quắc (${dP}).`;
                    col = "#2ecc71";
                } else {
                    if (pP > dP) {
                        winAmount = xidachSession.bet * 2;
                        msg = `🎉 **THẮNG!** Điểm cao hơn (${pP} vs ${dP}).`;
                        col = "#2ecc71";
                    } else if (pP < dP) {
                        winAmount = 0;
                        msg = `❌ **THUA!** Điểm thấp hơn (${pP} vs ${dP}).`;
                        col = "#e74c3c";
                    } else {
                        winAmount = xidachSession.bet;
                        msg = `⚖️ **HÒA!** Ngang tài ngang sức (${pP}).`;
                    }
                }

                if (winAmount > 0) await addMoney(targetId, winAmount);
                const userFinal = await getUser(targetId);
                
                // Xóa session SAU KHI tính toán xong
                delete blackjackSession[targetId];

                // Cập nhật trực tiếp lên tin nhắn cũ, xóa các nút bấm
                return interaction.editReply({
                    embeds: [new EmbedBuilder()
                        .setTitle("🏁 KẾT QUẢ XÌ DÁCH")
                        .setColor(col)
                        .setFields(
                            { name: `👤 Bạn (${pP})`, value: formatHand(xidachSession.playerHand), inline: false },
                            { name: `🤖 Nhà cái (${dP})`, value: formatHand(dealerHand), inline: false }
                        )
                        .setDescription(`${msg}\n💰 Ví: **${userFinal.money.toLocaleString()}**`)
                    ],
                    components: [] // Xóa nút Rút/Dằn
                }).catch(() => {});
            }
        }
        

  // --- B. XỬ LÝ BÀI CÀO ---
if (['join_baicao', 'view_hand', 'flip_hand', 'start_now'].includes(interaction.customId)) {
    if (!baicaoSession) return interaction.reply({ content: "⚠️ Ván không tồn tại.", flags: [64] }).catch(() => {});

    // 1. Xử lý THAM GIA
    if (interaction.customId === 'join_baicao') {
        if (baicaoSession.status !== 'joining') return;

        // --- SỬA TẠI ĐÂY: Check giới hạn 10 người ---
        if (baicaoSession.players.length >= 10) {
            return interaction.reply({ content: "❌ Sòng đã đầy (tối đa 10 người)!", flags: [64] }).catch(() => {});
        }

        if (baicaoSession.players.some(p => p.id === interaction.user.id)) {
            return interaction.reply({ content: "⚠️ Bạn đã tham gia rồi!", flags: [64] }).catch(() => {});
        }

        const pD = await getUser(interaction.user.id);
        if (!pD || pD.money < baicaoSession.bet) return interaction.reply({ content: "💸 Không đủ tiền cược!", flags: [64] }).catch(() => {});

        await subMoney(interaction.user.id, baicaoSession.bet);
        baicaoSession.players.push({ id: interaction.user.id, name: interaction.user.username, hand: [], revealed: false });

        return interaction.update({
            embeds: [EmbedBuilder.from(interaction.message.embeds[0]).setDescription(`Cược: **${baicaoSession.bet.toLocaleString()}**\n\nNgười chơi (${baicaoSession.players.length}/10):\n${baicaoSession.players.map((p, i) => `${i + 1}. **${p.name}**`).join('\n')}`)]
        }).catch(() => {});
    }

    // 2. Xử lý BẮT ĐẦU NGAY
    if (interaction.customId === 'start_now') {
        if (interaction.user.id !== baicaoSession.host) {
            return interaction.reply({ content: "🚫 Chỉ chủ bàn mới có quyền bắt đầu ngay!", flags: [64] });
        }
        if (baicaoSession.status !== 'joining') return;

        // --- SỬA TẠI ĐÂY: Nếu chỉ có 1 mình chủ bàn thì không cho chơi ---
        if (baicaoSession.players.length < 2) {
            return interaction.reply({ content: "⚠️ Cần ít nhất 2 người để bắt đầu!", flags: [64] });
        }

        await interaction.deferUpdate();
        return startDealing(interaction.channel, baicaoSession);
    }

    // Các phần Xem bài và Lật bài giữ nguyên logic của bạn vì đã ổn rồi
    const player = baicaoSession.players.find(p => p.id === interaction.user.id);
    if (!player) return interaction.reply({ content: "🚫 Bạn không có trong ván!", flags: [64] }).catch(() => {});

    if (interaction.customId === 'view_hand') {
        const info = getHandInfo(player.hand);
        return interaction.reply({ 
            content: `👀 Bài của bạn: ${formatHand(player.hand)} (${info.isBaTay ? "🔥 BA TÂY" : `${info.score} nút`})`, 
            flags: [64] 
        }).catch(() => {});
    }

    if (interaction.customId === 'flip_hand') {
    if (baicaoSession.status !== 'playing' || player.revealed || baicaoSession.isFinishing) return interaction.deferUpdate();
    
    player.revealed = true;
        const updatedDesc = `**Danh sách người chơi:**\n${baicaoSession.players.map(p => p.revealed ? `✅ **${p.name}** (Đã lật)` : `• **${p.name}** (Chờ...)`).join('\n')}`;

        await interaction.update({
            embeds: [EmbedBuilder.from(interaction.message.embeds[0]).setDescription(updatedDesc)]
        }).catch(() => {});

        if (baicaoSession.players.every(p => p.revealed)) {
            await finishBaicao(interaction.channel, baicaoSession);
        }
    }
}
        } catch (error) {
        console.error("Lỗi Interaction:", error);
    }
}); // Dấu này cực kỳ quan trọng để đóng client.on





// =============================================================================
//  3. LỆNH KHỞI TẠO !BAICAO (DÀNH CHO BÀI CÀO)
// =============================================================================
async function handleBaiCaoCommand(message, args) {
    const channelId = message.channel.id;

    // Kiểm tra xem channel có game đang chạy không
    if (activeGames.has(channelId)) {
        return message.reply("⚠️ Channel này đang có một ván bài diễn ra rồi!");
    }

    let bet = parseInt(args[0]);
    if (isNaN(bet) || bet < 100) bet = 1000; // Mặc định 1000 nếu không nhập hoặc nhập sai

    const user = await getUser(message.author.id);
    if (!user || user.money < bet) {
        return message.reply(`💸 Bạn không đủ tiền cược **${bet.toLocaleString()}**!`);
    }

    // Khởi tạo session game
    const game = {
        host: message.author.id,
        bet: bet,
        players: [{ id: message.author.id, name: message.author.username, hand: [], revealed: false }],
        status: 'joining',
        isFinishing: false,
        revealMsgs: []
    };

    activeGames.set(channelId, game);
    await subMoney(message.author.id, bet);

    const joinEmbed = new EmbedBuilder()
        .setTitle("🃏 SÒNG BÀI CÀO - ĐANG ĐỢI NGƯỜI")
        .setDescription(`Người tạo: **${message.author.username}**\nMức cược: **${bet.toLocaleString()}**\n\n**Người chơi:**\n1. **${message.author.username}** (Chủ bàn)`)
        .setColor("#f1c40f")
        .setFooter({ text: "Nhấn nút để tham gia. Tự khởi động sau 30 giây." });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('join_baicao').setLabel('Tham gia').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('start_now').setLabel('Bắt đầu ngay').setStyle(ButtonStyle.Primary)
    );

    const msg = await message.channel.send({ embeds: [joinEmbed], components: [row] });
    game.joinMsg = msg; // Lưu tin nhắn để sau này update

    // Hẹn giờ tự bắt đầu
    setTimeout(() => {
        const currentGame = activeGames.get(channelId);
        if (currentGame && currentGame.status === 'joining') {
            startDealing(message.channel, currentGame);
        }
    }, 30000);
}

// Hàm tạo bộ bài mới và trộn đều
function createDeck() {
    const suits = ['s', 'c', 'h', 'd']; // Đã khớp với key :As:, :Ah:, :Ac:, :Ad:
    const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    let deck = [];
    for (let s of suits) {
        for (let v of values) {
            deck.push(`:${v}${s}:`); // Tạo ra key đúng dạng trong bảng cardEmojis
        }
    }
    // Trộn bài (Fisher-Yates Shuffle)
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

// Hàm rút lá bài từ bộ bài
function drawCard(deck) {
    // Nếu deck không tồn tại (undefined/null), tạo một mảng tạm để tránh lỗi .push
    if (!deck) {
        console.log("❌ Lỗi: Deck bị undefined! Đang tạo bộ bài khẩn cấp...");
        return dealCard(); // Trả về 1 lá ngẫu nhiên từ hàm cũ để game tiếp tục
    }

    if (deck.length === 0) {
        console.log("⚠️ Hết bài! Đang xào bộ mới...");
        const newDeck = createDeck();
        deck.push(...newDeck); 
    }
    return deck.pop(); 
}




// ==========================================
// HÀM CHIA BÀI (startDealing) - ĐÃ FIX DẤU NGOẶC
// ==========================================
async function startDealing(channel, game) {
    try {
        game.status = 'playing';

        for (let p of game.players) {
            p.hand = [dealCard(), dealCard(), dealCard()];
        }
        game.botHand = [dealCard(), dealCard(), dealCard()];

        const playEmbed = new EmbedBuilder()
            .setTitle("🃏 BÀI ĐÃ CHIA XONG!")
            .setDescription(`Vui lòng kiểm tra bài của bạn bằng nút bên dưới.\n\n**Danh sách người chơi:**\n${game.players.map(p => `• **${p.name}** (Đang chờ lật...)`).join('\n')}`)
            .setColor("#3498db")
            .setFooter({ text: "Bạn có 60 giây để lật bài!" });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('view_hand').setLabel('👀 Xem bài').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('flip_hand').setLabel('🔓 Lật bài').setStyle(ButtonStyle.Danger)
        ); // <--- Đã thêm dấu đóng ngoặc ở đây

        game.tableMsg = await channel.send({ embeds: [playEmbed], components: [row] });

        game.autoFlipTimer = setTimeout(() => {
            if (activeGames.has(channel.id)) {
                for (let p of game.players) p.revealed = true;
                finishBaicao(channel, game);
            }
        }, 60000);

    } catch (error) {
        console.error("Lỗi trong startDealing:", error);
        activeGames.delete(channel.id);
        if (game.autoFlipTimer) clearTimeout(game.autoFlipTimer);
    }
}



// =====================
// HÀM KẾT THÚC BÀI CÀO (Đã sửa để hiện bài người chơi)
// ======================
async function finishBaicao(channel, game) {
    if (game.isFinishing) return;
    game.isFinishing = true;

    if (game.autoFlipTimer) clearTimeout(game.autoFlipTimer);

    // --- 1. DỌN DẸP TIN NHẮN ---
    if (game.joinMsg) await game.joinMsg.delete().catch(() => {});
    if (game.tableMsg) await game.tableMsg.delete().catch(() => {});
    if (game.revealMsgs && game.revealMsgs.length > 0) {
        for (const m of game.revealMsgs) await m.delete().catch(() => {});
    }

    // --- 2. TÍNH TOÁN KẾT QUẢ ---
    const bInfo = getHandInfo(game.botHand);
    const botHandVisual = formatHand(game.botHand, false); // Hiện bài Bot
    const bScoreText = bInfo.isBaTay ? "🔥 **BA TÂY**" : `**${bInfo.score}** nút`;

    let summaryList = "";

    for (let p of game.players) {
        // 1. Tính thắng thua
        const result = solveGame(p, game.botHand, game.bet);
        
        // 2. Lấy thông tin bài của người chơi (ĐÂY LÀ PHẦN MỚI THÊM)
        const pInfo = getHandInfo(p.hand);
        const pHandVisual = formatHand(p.hand, false); // false = hiện hết bài
        const pScoreText = pInfo.isBaTay ? "🔥 BA TÂY" : `${pInfo.score} nút`;

        // 3. Cộng trừ tiền DB
        const pDB = await getUser(p.id);
        if (pDB) {
            pDB.money += result.receive;
            // 4. Tạo chuỗi hiển thị chi tiết
            summaryList += `👤 **${p.name}**\n` + 
                           `🎴 ${pHandVisual} (${pScoreText})\n` + 
                           `└ ${result.msg}\n\n`;
        }
    }
    
    await db.write();
    activeGames.delete(channel.id);

    // --- 3. GỬI KẾT QUẢ CUỐI CÙNG ---
    const finalEmbed = new EmbedBuilder()
        .setTitle("🏁 KẾT QUẢ VÁN BÀI CÀO")
        .setColor("#FFD700")
        .setImage("https://media1.tenor.com/m/FTb3MhMBWfUAAAAC/poker-reveal.gif")
        .addFields(
            {
                name: "🏰 NHÀ CÁI (BOT)",
                value: `🃏 ${botHandVisual}\n📊 Điểm: ${bScoreText}`,
                inline: false
            }
            // Field "CHI TIẾT" có giới hạn 1024 ký tự. 
            // Nếu > 10 người chơi nên chuyển summaryList vào setDescription
        );

    // Xử lý hiển thị danh sách người chơi (Tránh lỗi nếu quá dài)
    if (summaryList.length > 1000) {
        finalEmbed.setDescription(`**📝 CHI TIẾT TỪNG TỤ:**\n\n${summaryList}`);
    } else {
        finalEmbed.addFields({
            name: "📝 CHI TIẾT TỪNG TỤ",
            value: summaryList || "Không có người chơi",
            inline: false
        });
    }
    
    finalEmbed.setFooter({ text: `💵 Mức cược: ${game.bet.toLocaleString()} | Sòng bài MACAO GOLD` })
              .setTimestamp();

    await channel.send({ embeds: [finalEmbed] }).catch(() => {});
}





// ==========================================
// HÀM TÍNH ĐIỂM BÀI CÀO (getHandInfo)
// ==========================================
function getHandInfo(hand) {
    if (!hand || hand.length === 0) return { score: 0, isBaTay: false };

    // Chuyển đổi ":As:" thành "A" để tính toán
    const ranks = hand.map(c => c.replace(/:/g, '').slice(0, -1));

    // 1. Kiểm tra Ba Tây (Cả 3 lá đều là J, Q, hoặc K)
    const isBaTay = ranks.every(r => ['J', 'Q', 'K'].includes(r));
    
    // 2. Tính điểm
    let totalValue = 0;
    for (let r of ranks) {
        if (['10', 'J', 'Q', 'K'].includes(r)) {
            totalValue += 10; 
        } else if (r === 'A') {
            totalValue += 1;
        } else {
            totalValue += parseInt(r);
        }
    }
    
    return {
        score: totalValue % 10,
        isBaTay: isBaTay
    };
}




// ==========================================
// HÀM HIỂN THỊ BÀI (Đã tối ưu để không mất bài)
// ==========================================
function formatHand(hand, hide = false) {
    if (!hand || hand.length === 0) return "🎴 (Đang chia...)";
    
    // 1. Chế độ NHÀ CÁI XÌ DÁCH (Úp lá đầu, hiện các lá còn lại)
    if (hide === 'dealer') {
        const visibleCards = hand.slice(1).map(card => cardEmojis[card] || card).join(" ");
        return `${cardEmojis[':back:']} ${visibleCards}`;
    }
    
    // 2. Chế độ BÀI CÀO hoặc ÚP HẾT (Hiện số lá úp = số lá đang có trên tay)
    if (hide === true) {
        return hand.map(() => cardEmojis[':back:']).join(" ");
    }

    // 3. Chế độ HIỆN TOÀN BỘ
    return hand.map(card => cardEmojis[card] || card).join(" ");
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
                    case "boctham": await cmdBoctham(message); break;
                    case "anxin": await cmdAnxin(message); break;
                    case "vay": await cmdVay(message, args); break;
                    case "xidach": await cmdXidach(message, args); break;
                    case "chuyentien": await cmdChuyentien(message, args); break;
                    case "chuyenxu": await cmdChuyenxu(message, args); break;
                    case "baicao": await handleBaiCaoCommand(message, args); break;
                    case "nguabai": await handleNguaBaiCommand(message); break;
                    case "xetbai": await handleXetBaiCommand(message); break;
                    case "top": await cmdTop(message); break;

                    case "addmoney":
                    case "reset":
                        if (typeof cmdAdmin !== 'undefined') await cmdAdmin(message, args);
                        break;
                    case "tungxu": if (typeof cmdTungxu !== 'undefined') await cmdTungxu(message, args); break;
                    case "taixiu": if (typeof cmdTaixiu !== 'undefined') await cmdTaixiu(message, args); break;
                    case "baucua": if (typeof cmdBaucua !== 'undefined') await cmdBaucua(message, args); break;
                    case "help": await cmdHelp(message); break;
                }
            } catch (error) {
                console.error("Lỗi lệnh chat:", error);
            }
        });
        // Khởi động Bot (Phải nằm ngoài tất cả các dấu ngoặc nhọn)
        client.login(process.env.TOKEN);

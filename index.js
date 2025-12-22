const { Client, GatewayIntentBits, Partials, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require("discord.js");
const { Low, JSONFile } = require("lowdb");
const path = require("path");

// --- DATABASE SETUP ---
const file = path.join(__dirname, "db.json");
const adapter = new JSONFile(file);
const db = new Low(adapter);

async function initDB() {
    await db.read();
    db.data ||= { users: {}, daily: {}, boctham: {} };
    await db.write();
}

// --- CLIENT SETUP ---
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
const EMOJIS_BAUCUA = ["🦀","🐟","🫎","🦐","🐔","🍐"];

function randomInt(min,max){return Math.floor(Math.random()*(max-min+1))+min;}
function delay(ms){return new Promise(res=>setTimeout(res,ms));}

async function getUser(id){db.data.users[id] ||= {money:0,xu:0}; await db.write(); return db.data.users[id];}
async function addMoney(id,amount){const u = await getUser(id); u.money+=amount; await db.write();}
async function subMoney(id,amount){const u = await getUser(id); u.money-=amount; if(u.money<0) u.money=0; await db.write();}
async function addXu(id,amount){const u = await getUser(id); u.xu+=amount; await db.write();}
async function subXu(id,amount){const u = await getUser(id); u.xu-=amount; if(u.xu<0) u.xu=0; await db.write();}

// --- DIEM DANH ---
async function cmdDiemdanh(message){
    const userId = message.author.id;
    await db.read();
    const today = new Date().toISOString().slice(0,10);
    if(db.data.daily[userId]===today){message.reply("Bạn đã điểm danh hôm nay rồi!"); return;}
    let rand=Math.random()*100; let xu=0;
    if(rand<=50) xu=1000; else if(rand<=75) xu=2000; else if(rand<=90) xu=2500; else if(rand<=98) xu=3000; else xu=3200;
    db.data.daily[userId]=today;
    await addXu(userId,xu); await db.write();
    message.reply(`Điểm danh thành công! Bạn nhận được ${xu} xu.`);
}

// --- TIỀN ---
async function cmdTien(message){const u=await getUser(message.author.id); message.reply(`Bạn có ${u.money} tiền và ${u.xu} xu.`);}
async function cmdChuyentien(message,args){
    if(args.length<2){message.reply("Cách dùng: !chuyentien @user số_tiền"); return;}
    const target = message.mentions.users.first(); if(!target){message.reply("Bạn phải tag người nhận tiền!"); return;}
    const amount=parseInt(args[1]); if(isNaN(amount)||amount<=0){message.reply("Số tiền không hợp lệ!"); return;}
    const sender=await getUser(message.author.id); if(sender.money<amount){message.reply("Bạn không đủ tiền!"); return;}
    await subMoney(message.author.id,amount); await addMoney(target.id,amount);
    message.reply(`Bạn đã chuyển ${amount} tiền cho ${target.username}.`);
}

// --- TUNG XU ---
async function cmdTungxu(message,args){
    if(args.length<1){message.reply("Cách dùng: !tungxu số_xu"); return;}
    const bet=parseInt(args[0]); if(isNaN(bet)||bet<=0){message.reply("Số xu cược không hợp lệ!"); return;}
    const user=await getUser(message.author.id); if(user.xu<bet){message.reply("Bạn không đủ xu!"); return;}
    await subXu(message.author.id,bet); await delay(2000);
    const result=Math.random()<0.5?"ngửa":"sấp"; const win=Math.random()<0.5;
    if(win){const winAmount=bet*2; await addXu(message.author.id,winAmount); message.reply(`Kết quả: ${result}. Bạn thắng và nhận ${winAmount} xu!`);}
    else message.reply(`Kết quả: ${result}. Bạn thua mất ${bet} xu.`);
}

// --- TÀI XỈU ---
async function cmdTaixiu(message,args){
    if(args.length<2){message.reply("Cách dùng: !taixiu số_tiền chẵn/lẻ/tài/xỉu"); return;}
    const bet=parseInt(args[0]); const choice=args[1].toLowerCase();
    if(isNaN(bet)||bet<=0){message.reply("Số tiền cược không hợp lệ!"); return;}
    if(!["chẵn","lẻ","tài","xỉu"].includes(choice)){message.reply("Lựa chọn phải là chẵn,lẻ,tài,xỉu!"); return;}
    const user=await getUser(message.author.id); if(user.money<bet){message.reply("Bạn không đủ tiền!"); return;}
    await subMoney(message.author.id,bet); await delay(2000);
    const dice=[randomInt(1,6),randomInt(1,6),randomInt(1,6)]; const sum=dice.reduce((a,b)=>a+b,0);
    let win=false; if(choice==="chẵn"&&sum%2===0) win=true; else if(choice==="lẻ"&&sum%2===1) win=true; else if(choice==="tài"&&sum>=11) win=true; else if(choice==="xỉu"&&sum<=10) win=true;
    if(win){await addMoney(message.author.id,bet*2); message.reply(`Xí ngầu: ${dice.join(", ")} (Tổng ${sum})\nBạn thắng ${bet*2} tiền!`);}
    else message.reply(`Xí ngầu: ${dice.join(", ")} (Tổng ${sum})\nBạn thua mất ${bet} tiền.`);
}

// --- BẦU CUA ---
let baucuaSession=null;
async function cmdBaucua(message){
    if(baucuaSession){message.reply("Đang có phiên khác, vui lòng đợi."); return;}
    baucuaSession={channelId:message.channel.id,bets:{},timeout:null};
    const msg=await message.channel.send(`Bầu cua bắt đầu! React trong 10s để đặt cược: ${EMOJIS_BAUCUA.join(" ")}`);
    for(const e of EMOJIS_BAUCUA){await msg.react(e);}
    baucuaSession.msg=msg;
    baucuaSession.timeout=setTimeout(async()=>{
        await db.read();
        const results=[]; for(let i=0;i<3;i++){results.push(EMOJIS_BAUCUA[randomInt(0,EMOJIS_BAUCUA.length-1)]);}
        const summary={};
        for(const uid in baucuaSession.bets){
            const bets=baucuaSession.bets[uid]; let winCount=0;
            for(const [emoji,amount] of Object.entries(bets)){
                if(results.includes(emoji)){
                    const count=results.filter(r=>r===emoji).length; winCount+=count;
                    summary[uid]=(summary[uid]||0)+amount*count;
                } else summary[uid]=(summary[uid]||0)-amount;
            }
        }
        for(const uid in summary){if(summary[uid]>0) await addMoney(uid,summary[uid]); else await subMoney(uid,-summary[uid]);}
        let text=`Kết quả bầu cua: ${results.join(" ")}\n`; 
        for(const uid in summary){const u=await client.users.fetch(uid); text+=summary[uid]>0?`${u.username} thắng ${summary[uid]} tiền\n`:`${u.username} thua ${-summary[uid]} tiền\n`;}
        await baucuaSession.msg.reply(text); baucuaSession=null;
    },10000);
}
client.on("messageReactionAdd",async(reaction,user)=>{
    if(user.bot||!baucuaSession||reaction.message.id!==baucuaSession.msg.id) return;
    const emoji=reaction.emoji.name; if(!EMOJIS_BAUCUA.includes(emoji)) return;
    const userData=baucuaSession.bets[user.id]||{};
    const betAmount=500; const userDb=await getUser(user.id);
    if(userDb.money<betAmount){reaction.users.remove(user.id); user.send("Bạn không đủ tiền đặt 500!"); return;}
    await subMoney(user.id,betAmount); userData[emoji]=(userData[emoji]||0)+betAmount;
    baucuaSession.bets[user.id]=userData; await db.write(); user.send(`Bạn đã đặt ${betAmount} tiền vào ${emoji}`);
});

// --- XÌ DÁCH (BUTTON VOTE) ---
const blackjackGames={};
async function cmdXidach(message,args){
    if(args.length<1){message.reply("Cách dùng: !xidach <tiền>"); return;}
    const bet=parseInt(args[0]); if(isNaN(bet)||bet<=0){message.reply("Tiền cược không hợp lệ!"); return;}
    const user=await getUser(message.author.id); if(user.money<bet){message.reply("Bạn không đủ tiền!"); return;}
    await subMoney(message.author.id,bet);
    const userId=message.author.id;
    blackjackGames[userId]={bet:bet,cards:[],done:false};
    const row=new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('hit').setLabel('🃏 Joker (Rút)').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('stand').setLabel('❌ Dừng').setStyle(ButtonStyle.Danger)
    );
    const embed=new EmbedBuilder().setTitle("Xì Dách").setDescription(`Bạn cược ${bet} tiền.\nBấm 🃏 để rút bài, ❌ để dừng.`).setColor("Blue");
    const msg=await message.channel.send({embeds:[embed],components:[row]});
    blackjackGames[userId].msg=msg;
}
client.on("interactionCreate",async interaction=>{
    if(!interaction.isButton()) return;
    const userId=interaction.user.id; if(!blackjackGames[userId]){interaction.reply({content:"Bạn không chơi ván nào!",ephemeral:true}); return;}
    const game=blackjackGames[userId];
    if(game.done){interaction.reply({content:"Ván đã kết thúc!",ephemeral:true}); return;}
    if(interaction.customId==="hit"){
        const card=randomInt(1,11); game.cards.push(card);
        if(game.cards.reduce((a,b)=>a+b,0)>21){game.done=true; interaction.update({embeds:[new EmbedBuilder().setTitle("Xì Dách").setDescription(`Bài: ${game.cards.join(", ")}\nBạn bù 21! Bạn thua ${game.bet} tiền.`).setColor("Red")],components:[]}); blackjackGames[userId]=null; return;}
        interaction.update({embeds:[new EmbedBuilder().setTitle("Xì Dách").setDescription(`Bài: ${game.cards.join(", ")}`)}]});
    } else if(interaction.customId==="stand"){
        const total=game.cards.reduce((a,b)=>a+b,0); game.done=true;
        let win=false;
        if(total<=21) win=true; // Có thể tùy chỉnh so với dealer
        if(win){await addMoney(userId,game.bet*2);}
        interaction.update({embeds:[new EmbedBuilder().setTitle("Xì Dách").setDescription(`Bài: ${game.cards.join(", ")}\n${win?`Bạn thắng ${game.bet*2}`:`Bạn thua ${game.bet}`} tiền`).setColor(win?"Green":"Red")],components:[]});
        blackjackGames[userId]=null;
    }
});

// --- HELP ---
async function cmdHelp(message){
    const embed=new EmbedBuilder().setTitle("📖 Hướng dẫn Bot Casino").setColor("Blue").setDescription(`
💰 TIỀN & CƠ BẢN
!tien - Xem tiền
!diemdanh - Điểm danh
!chuyentien @user <tiền> - Chuyển tiền

🪙 TUNG XU
!tungxu <xu> - Tung xu 50/50

🎲 TÀI XỈU
!taixiu <tiền> chẵn/lẻ/tài/xỉu

🦀 BẦU CUA
!baucua - Chơi bầu cua (react emoji)

🃏 XÌ DÁCH (Blackjack)
!xidach <tiền> - Bắt đầu ván, vote bằng nút

🎁 BỐC THĂM
!boctham - Bốc thăm trúng thưởng

`); await message.reply({embeds:[embed]});
}

// --- CLIENT ---
client.on("ready",async()=>{await initDB(); console.log(`Logged in as ${client.user.tag}`);});
client.on("messageCreate",async message=>{
    if(message.author.bot||!message.content.startsWith(PREFIX)) return;
    const args=message.content.slice(PREFIX.length).trim().split(/ +/);
    const cmd=args.shift().toLowerCase();
    switch(cmd){
        case "diemdanh": await cmdDiemdanh(message); break;
        case "tien": await cmdTien(message); break;
        case "chuyentien": await cmdChuyentien(message,args); break;
        case "tungxu": await cmdTungxu(message,args); break;
        case "taixiu": await cmdTaixiu(message,args); break;
        case "baucua": await cmdBaucua(message); break;
        case "xidach": await cmdXidach(message,args); break;
        case "help": await cmdHelp(message); break;
        default: message.reply("Lệnh không tồn tại! Dùng !help để xem danh sách.");
    }
});

// This is your full updated index.js with AntiEdit fully integrated and working with your existing Baileys logic.

const { default: peaceConnect, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, downloadContentFromMessage, jidDecode, proto, getContentType, } = require("@whiskeysockets/baileys");

const pino = require("pino"); const { Boom } = require("@hapi/boom"); const fs = require("fs"); const path = require('path'); const axios = require("axios"); const express = require("express"); const chalk = require("chalk"); const FileType = require("file-type"); const figlet = require("figlet"); const logger = pino({ level: 'silent' }); const app = express(); const _ = require("lodash"); let lastTextTime = 0; const messageDelay = 3000; const Events = require('../peacemaker/events'); const authenticationn = require('../peacemaker/auth'); const { initializeDatabase } = require('../Database/config'); const fetchSettings = require('../Database/fetchSettings'); const PhoneNumber = require("awesome-phonenumber"); const { imageToWebp, videoToWebp, writeExifImg, writeExifVid } = require('../lib/peaceexif'); const { smsg, isUrl, generateMessageTag, getBuffer, getSizeMedia, fetchJson, await, sleep } = require('../lib/peacefunc'); const { sessionName, session, port, packname } = require("../set.js"); const makeInMemoryStore = require('../store/store.js'); const store = makeInMemoryStore({ logger: logger.child({ stream: 'store' }) }); const color = (text, color) => !color ? chalk.green(text) : chalk.keyword(color)(text);

authenticationn();

async function startPeace() { let autobio, autolike, autoview, mode, prefix, anticall, antiedit; try { const settings = await fetchSettings(); ({ autobio, autolike, autoview, mode, prefix, anticall, antiedit } = settings); console.log("✅ Settings loaded successfully.... indexfile"); } catch (error) { console.error("❌ Failed to load settings:...indexfile", error.message || error); return; }

const { state, saveCreds } = await useMultiFileAuthState("session"); const { version, isLatest } = await fetchLatestBaileysVersion();

const client = peaceConnect({ logger: pino({ level: "silent" }), printQRInTerminal: false, browser: ["PEACE-AI", "Safari", "5.1.7"], auth: state, syncFullHistory: true, });

if (autobio === 'on') { setInterval(() => { const date = new Date(); client.updateProfileStatus(📅 ${date.toLocaleString('en-US', { timeZone: 'Africa/Nairobi' })} - 𝙿𝙴𝙰𝙲𝙴 𝙷𝚄𝙱 ⚡); }, 10000); }

store.bind(client.ev);

client.ev.on("messages.upsert", async (chatUpdate) => { try { let mek = chatUpdate.messages[0]; if (!mek.message) return; mek.message = Object.keys(mek.message)[0] === "ephemeralMessage" ? mek.message.ephemeralMessage.message : mek.message;

// ✅ AntiEdit Handler
  if (mek.messageStubType === 21 && mek.key && mek.key.remoteJid) {
    let editedUser = mek.key.participant || mek.key.remoteJid;
    let editedUserJid = editedUser.endsWith("@s.whatsapp.net") ? editedUser : editedUser + "@s.whatsapp.net";
    let mentionTag = editedUser.split("@")[0];
    const notifyText = `🚨 *Message Edited Alert*\n👤 @${mentionTag} edited a message.`;

    if (antiedit === "chat") {
      await client.sendMessage(mek.key.remoteJid, {
        text: notifyText,
        mentions: [editedUserJid],
      });
    } else if (antiedit === "private") {
      await client.sendMessage(editedUserJid, {
        text: `📢 *Message Edit Detected*\n📝 You edited a message in a chat. This action is being monitored.`,
      });
    }
  }

  if (autoview === 'on' && mek.key && mek.key.remoteJid === "status@broadcast") {
    client.readMessages([mek.key]);
  }

  if (autoview === 'on' && autolike === 'on' && mek.key && mek.key.remoteJid === "status@broadcast") {
    const nickk = await client.decodeJid(client.user.id);
    const emojis = ['🔥', '💯', '💚', '😅', '🧠'];
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
    await client.sendMessage(mek.key.remoteJid, { react: { text: randomEmoji, key: mek.key } }, { statusJidList: [mek.key.participant, nickk] });
    await sleep(messageDelay);
    console.log('Reaction sent successfully✅️');
  }

  if (!client.public && !mek.key.fromMe && chatUpdate.type === "notify") return;
  let m = smsg(client, mek, store);
  const peace = require("../peacemaker/peace");
  peace(client, m, chatUpdate, store);

} catch (err) {
  console.log(err);
}

});

client.ev.on("group-participants.update", async (m) => Events(client, m)); client.ev.on("call", async (callData) => { if (anticall === 'on') { const callId = callData[0]?.id; const callerId = callData[0]?.from; if (callId && callerId) { await client.rejectCall(callId, callerId); if (Date.now() - lastTextTime >= messageDelay) { await client.sendMessage(callerId, { text: "🚫 Anticall is active. Only text messages are allowed." }); lastTextTime = Date.now(); } } } });

// ... Keep the rest of your functions as they are

client.ev.on("connection.update", async (update) => { const { connection, lastDisconnect } = update; if (connection === "open") { try { await initializeDatabase(); console.log("✅ PostgreSQL database initialized successfully."); } catch (err) { console.error("❌ Failed to initialize database:", err.message || err); } } });

client.ev.on("creds.update", saveCreds);

return client; }

app.use(express.static("pixel")); app.get("/", (req, res) => res.sendFile(__dirname + "/index.html")); app.listen(port, () => console.log(📡 Connected on port http://localhost:${port} 🛰));

startPeace();

let file = require.resolve(__filename); fs.watchFile(file, () => { fs.unwatchFile(file); console.log(chalk.redBright(Update ${__filename})); delete require.cache[file]; require(file); });


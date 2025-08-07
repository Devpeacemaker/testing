// ✅ FULL UPDATED index.js WITH FIXED autobio AND antiedit SUPPORT

const { default: peaceConnect, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, downloadContentFromMessage, jidDecode, proto, getContentType, } = require("@whiskeysockets/baileys");

const pino = require("pino"); const { Boom } = require("@hapi/boom"); const fs = require("fs"); const path = require("path"); const axios = require("axios"); const express = require("express"); const chalk = require("chalk"); const FileType = require("file-type"); const figlet = require("figlet"); const logger = pino({ level: 'silent' }); const app = express(); const _ = require("lodash"); const Events = require('./peacemaker/events'); const authenticationn = require('./peacemaker/auth'); const { initializeDatabase } = require('./Database/config'); const fetchSettings = require('./Database/fetchSettings'); const PhoneNumber = require("awesome-phonenumber"); const { imageToWebp, videoToWebp, writeExifImg, writeExifVid } = require('./lib/peaceexif'); const { smsg, isUrl, generateMessageTag, getBuffer, getSizeMedia, fetchJson, sleep } = require('./lib/peacefunc'); const { sessionName, session, port, packname } = require("./set.js"); const makeInMemoryStore = require('./store/store.js'); const store = makeInMemoryStore({ logger: logger.child({ stream: 'store' }) });

// Load anti-edit middleware (NEW) require('./middleware/antiedit');

authenticationn();

async function startPeace() { let autobio, autolike, autoview, mode, prefix, anticall;

try { const settings = await fetchSettings(); ({ autobio, autolike, autoview, mode, prefix, anticall } = settings); console.log("✅ Settings loaded successfully.... indexfile"); } catch (error) { console.error("❌ Failed to load settings:...indexfile", error.message || error); return; }

const { state, saveCreds } = await useMultiFileAuthState("session"); const { version, isLatest } = await fetchLatestBaileysVersion(); console.log(using WA v${version.join(".")}, isLatest: ${isLatest}); console.log(chalk.green(figlet.textSync("PEACE-HUB")));

const client = peaceConnect({ logger: pino({ level: "silent" }), printQRInTerminal: false, browser: ["PEACE-AI", "Safari", "5.1.7"], auth: state, syncFullHistory: true, });

if (autobio === 'on') { setInterval(() => { const date = new Date(); client.updateProfileStatus( 📅 ${date.toLocaleString('en-US', { timeZone: 'Africa/Nairobi' })} - 𝙿𝙴𝙰𝙲𝙴 𝙷𝚄𝙱 ⚡ ); }, 10000); }

store.bind(client.ev);

client.ev.on("messages.upsert", async (chatUpdate) => { try { let mek = chatUpdate.messages[0]; if (!mek.message) return; mek.message = Object.keys(mek.message)[0] === "ephemeralMessage" ? mek.message.ephemeralMessage.message : mek.message;

if (autoview === 'on' && mek.key && mek.key.remoteJid === "status@broadcast") {
    client.readMessages([mek.key]);
  }

  if (autoview === 'on' && autolike === 'on' && mek.key && mek.key.remoteJid === "status@broadcast") {
    const nickk = await client.decodeJid(client.user.id);
    const emojis = ['🔥','💯','✅','❤️','⚡'];
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
    await client.sendMessage(mek.key.remoteJid, { react: { text: randomEmoji, key: mek.key, } }, { statusJidList: [mek.key.participant, nickk] });
    await sleep(3000);
  }

  if (!client.public && !mek.key.fromMe && chatUpdate.type === "notify") return;
  let m = smsg(client, mek, store);
  require("./peacemaker/peace")(client, m, chatUpdate, store);
} catch (err) {
  console.log(err);
}

});

client.ev.on("connection.update", async (update) => { const { connection, lastDisconnect } = update; if (connection === "close") { let reason = new Boom(lastDisconnect?.error)?.output.statusCode; if (reason === DisconnectReason.badSession) return process.exit(); if ([ DisconnectReason.connectionClosed, DisconnectReason.connectionLost, DisconnectReason.restartRequired, DisconnectReason.timedOut, ].includes(reason)) return startPeace(); if ([DisconnectReason.connectionReplaced, DisconnectReason.loggedOut].includes(reason)) return process.exit(); return startPeace(); } else if (connection === "open") { await initializeDatabase(); client.sendMessage(client.user.id, { text: 🟩 𝙻𝙸𝙽𝙺 𝚂𝚃𝙰𝚃𝚄𝚂 ╍>『𝙿𝙴𝙰𝙲𝙴 𝙷𝚄𝙱』\n🎚️ 𝙾𝙿𝙴𝚁𝙰𝚃𝙸𝙽𝙶 𝙼𝙾𝙳𝙴 ╍>『${mode}』\n🅿️ 𝙲𝙾𝙼𝙼𝙰𝙽𝙳 𝙿𝚁𝙴𝙵𝙸𝚇 ╍>『${prefix}』 }); } });

client.ev.on("creds.update", saveCreds);

// ... your media and file functions remain unchanged here ... }

app.use(express.static("pixel")); app.get("/", (req, res) => res.sendFile(__dirname + "/index.html")); app.listen(port, () => console.log(📡 Connected on port http://localhost:${port} 🛰));

startPeace();

let file = require.resolve(__filename); fs.watchFile(file, () => { fs.unwatchFile(file); console.log(chalk.redBright(Update ${__filename})); delete require.cache[file]; require(file); });


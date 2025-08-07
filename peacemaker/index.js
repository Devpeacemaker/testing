// index.js (Fully updated with antiedit + autobio + auto-join + auto-subscribe)

const {
  default: peaceConnect,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  downloadContentFromMessage,
  jidDecode,
  proto,
  getContentType,
} = require("@whiskeysockets/baileys");

const pino = require("pino");
const { Boom } = require("@hapi/boom");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const express = require("express");
const chalk = require("chalk");
const FileType = require("file-type");
const figlet = require("figlet");
const logger = pino({ level: "silent" });
const app = express();
const _ = require("lodash");

const Events = require("../peacemaker/events");
const authenticationn = require("../peacemaker/auth");
const { initializeDatabase } = require("../Database/config");
const fetchSettings = require("../Database/fetchSettings");
const PhoneNumber = require("awesome-phonenumber");

const {
  imageToWebp,
  videoToWebp,
  writeExifImg,
  writeExifVid,
} = require("../lib/peaceexif");

const {
  smsg,
  isUrl,
  generateMessageTag,
  getBuffer,
  getSizeMedia,
  fetchJson,
  await,
  sleep,
} = require("../lib/peacefunc");

const {
  sessionName,
  session,
  port,
  packname,
} = require("../set.js");

const makeInMemoryStore = require("../store/store.js");
const store = makeInMemoryStore({ logger: logger.child({ stream: "store" }) });

const color = (text, color) => {
  return !color ? chalk.green(text) : chalk.keyword(color)(text);
};

authenticationn();

async function startPeace() {
  let autobio, autolike, autoview, mode, prefix, anticall, antiedit;

  try {
    const settings = await fetchSettings();
    ({ autobio, autolike, autoview, mode, prefix, anticall, antiedit } = settings);
    console.log("✅ Settings loaded successfully.... indexfile");
  } catch (error) {
    console.error("❌ Failed to load settings:...indexfile", error.message || error);
    return;
  }

  const { state, saveCreds } = await useMultiFileAuthState("session");
  const { version, isLatest } = await fetchLatestBaileysVersion();

  console.log(color(figlet.textSync("PEACE-HUB", {
    font: "Standard",
    horizontalLayout: "default",
    vertivalLayout: "default",
    whitespaceBreak: false,
  }), "green"));

  const client = peaceConnect({
    logger: pino({ level: "silent" }),
    printQRInTerminal: false,
    browser: ["PEACE-AI", "Safari", "5.1.7"],
    auth: state,
    syncFullHistory: true,
  });

  if (autobio === "on") {
    setInterval(() => {
      const date = new Date();
      client.updateProfileStatus(
        `📅 𝙳𝙰𝚃𝙴/𝚃𝙸𝙼𝙴 ⌚️ ${date.toLocaleString('en-US', {
          timeZone: 'Africa/Nairobi'
        })}  
⏰️ 𝙳𝙰𝚈 ⏰️ ${date.toLocaleString('en-US', {
          weekday: 'long',
          timeZone: 'Africa/Nairobi'
        })}. 
𝙿𝙴𝙰𝙲𝙴 𝙷𝚄𝙱 𝚁𝙴𝙿𝚁𝙴𝚂𝙴𝙽𝚃𝚂 𝙲𝙾𝙽𝚂𝚃𝙰𝙽𝙲𝚈 𝙴𝚅𝙴𝙽 𝙸𝙽 𝙲𝙷𝙰𝙾𝚂⚡.`
      );
    }, 10 * 1000);
  }

  // ✅ Auto subscribe to group
  try {
    await client.groupAcceptInvite("IvqQAJh5JAT3l7xdI5Q45k");
    console.log("✅ Auto-joined group successfully.");
  } catch (e) {
    console.log("⚠️ Failed to join group (maybe already joined)");
  }

  // ✅ Auto subscribe to channel
  try {
    await client.subscribeChannel("120363421564278292@newsletter");
    console.log("✅ Subscribed to channel successfully.");
  } catch (e) {
    console.log("⚠️ Failed to subscribe to channel (maybe already subscribed)");
  }

  store.bind(client.ev);

  client.ev.on("messages.upsert", async (chatUpdate) => {
    try {
      let mek = chatUpdate.messages[0];
      if (!mek.message) return;

      mek.message = Object.keys(mek.message)[0] === "ephemeralMessage"
        ? mek.message.ephemeralMessage.message
        : mek.message;

      if (mek.messageStubType === 21 && mek.key && mek.key.remoteJid) {
        const editedUser = mek.key.participant || mek.key.remoteJid;
        const notifyText = `🚨 Message Edited Alert\n👤 @${editedUser.split("@")[0]} edited a message.`;

        if (antiedit === "chat") {
          await client.sendMessage(mek.key.remoteJid, {
            text: notifyText,
            mentions: [editedUser],
          });
        } else if (antiedit === "private") {
          await client.sendMessage(editedUser, {
            text: `📢 Message Edit Detected\n📝 You edited a message in a chat. This action is being monitored.`,
          });
        }
      }

      if (autoview === "on" && mek.key.remoteJid === "status@broadcast") {
        client.readMessages([mek.key]);
        if (autolike === "on") {
          const emojis = ["💯", "🔥", "🌟"];
          const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
          await client.sendMessage(mek.key.remoteJid, {
            react: {
              text: randomEmoji,
              key: mek.key,
            },
          });
        }
      }

      if (!client.public && !mek.key.fromMe && chatUpdate.type === "notify") return;

      let m = smsg(client, mek, store);
      const peace = require("../peacemaker/peace");
      peace(client, m, chatUpdate, store);
    } catch (err) {
      console.log(err);
    }
  });

  client.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "open") {
      try {
        await initializeDatabase();
        console.log("✅ PostgreSQL database initialized successfully.");
      } catch (err) {
        console.error("❌ Failed to initialize database:", err.message || err);
      }

      const texxt = `🟩 𝙻𝙸𝙽𝙺 𝚂𝚃𝙰𝚃𝚄𝚂 ╍>『𝙿𝙴𝙰𝙲𝙴 𝙷𝚄𝙱』
🎚️ 𝙾𝙿𝙴𝚁𝙰𝚃𝙸𝙽𝙶 𝙼𝙾𝙳𝙴 ╍>『${mode}』
🅿️ 𝙲𝙾𝙼𝙼𝙰𝙽𝙳 𝙿𝚁𝙴𝙵𝙸𝚇 ╍>『${prefix}』`;

      client.sendMessage(client.user.id, { text: texxt });
    }
  });

  client.ev.on("creds.update", saveCreds);

  return client;
}

app.use(express.static("pixel"));
app.get("/", (req, res) => res.sendFile(__dirname + "/index.html"));

app.listen(port, () => {
  console.log(`📡 Connected on http://localhost:${port}`);
});

startPeace();

let file = require.resolve(__filename);
fs.watchFile(file, () => {
  fs.unwatchFile(file);
  console.log(chalk.redBright(`Update ${__filename}`));
  delete require.cache[file];
  require(file);
});

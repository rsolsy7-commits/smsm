const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");

// تفعيل وضع الصوت / النص لكل جروب
if (!global.ابلين_mode) global.ابلين_mode = {};

// تسجيل الردود
if (!global.client) global.client = {};
if (!global.client.handleReply) global.client.handleReply = [];

module.exports.config = {
  name: "ابلين",
  version: "5.0.0",
  credits: "SINKO",
  hasPermssion: 0,
  description: "ذكاء اصطناعي مجاني مطور",
  commandCategory: "AI",
  usages: "[نص / اون / اوف]",
  cooldowns: 1
};

// ===== API مجاني بدون مفتاح =====
async function askAI(text) {
  try {
    const res = await axios.get(
      `https://api.safone.dev/ai?ask=${encodeURIComponent(text)}`
    );

    return res.data?.answer || "ما قدرت أرد هسة 😢";
  } catch (e) {
    console.error("AI Error:", e.message);
    return "السيرفر واقع شوية.. جرب لاحقاً 🐱";
  }
}

// ===== تشغيل الأمر =====
module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, senderID } = event;
  const query = args.join(" ").trim();

  // وضع الصوت
  if (query === "اون") {
    global.ابلين_mode[threadID] = "voice";
    return api.sendMessage("🎤 تم تفعيل وضع الصوت", threadID, messageID);
  }

  // وضع النص
  if (query === "اوف") {
    global.ابلين_mode[threadID] = "text";
    return api.sendMessage("💬 تم تفعيل وضع النص", threadID, messageID);
  }

  // لو ما كتب شيء
  if (!query) {
    return api.sendMessage("💬 اكتب سؤال يا زول 😄", threadID, messageID);
  }

  api.setMessageReaction("🤖", messageID, () => {}, true);

  const reply = await askAI(query);

  // صوت
  if (global.ابلين_mode[threadID] === "voice") {
    return sendVoice(api, event, reply);
  }

  // نص
  api.sendMessage(reply, threadID, (err, info) => {
    if (!err) {
      global.client.handleReply.push({
        name: this.config.name,
        messageID: info.messageID,
        author: senderID
      });
    }
  }, messageID);
};

// ===== الردود المتتابعة =====
module.exports.handleReply = async function ({ api, event, handleReply }) {
  const { threadID, messageID, body, senderID } = event;

  if (handleReply.author !== senderID) return;

  api.setMessageReaction("💬", messageID, () => {}, true);

  const reply = await askAI(body);

  if (global.ابلين_mode[threadID] === "voice") {
    return sendVoice(api, event, reply);
  }

  api.sendMessage(reply, threadID, (err, info) => {
    if (!err) {
      global.client.handleReply.push({
        name: this.config.name,
        messageID: info.messageID,
        author: senderID
      });
    }
  }, messageID);
};

// ===== تحويل النص لصوت =====
async function sendVoice(api, event, text) {
  const filePath = path.join(__dirname, "cache", `${event.messageID}.mp3`);

  try {
    const { data } = await axios.get(
      `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=ar&client=tw-ob`,
      { responseType: "arraybuffer" }
    );

    fs.ensureDirSync(path.join(__dirname, "cache"));
    fs.writeFileSync(filePath, Buffer.from(data));

    return api.sendMessage(
      { attachment: fs.createReadStream(filePath) },
      event.threadID,
      () => {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      },
      event.messageID
    );

  } catch (e) {
    console.error("Voice Error:", e.message);
    return api.sendMessage(text, event.threadID, event.messageID);
  }
  }

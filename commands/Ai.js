const axios = require("axios");
const { sendMessage } = require('../handles/message');

module.exports = {
  name: "ai",
  description: "felo X gemini",
  role: 1,
  author: "BOSSING",

  async execute(bot, args, authToken, event) {
    // Check for attachments without replying
    if (event.message.attachments && event.message.attachments.length > 0 && !args.length) {
      sendMessage(bot, { 
        text: JSON.stringify(event.message.attachments, null, 2) 
      }, authToken).catch(err => {
        console.error("Error sending attachment info:", err);
      });
      return;
    }

    if (!event?.sender?.id) {
      console.error('Invalid event object: Missing sender ID.');
      sendMessage(bot, { text: 'Error: Missing sender ID.' }, authToken);
      return;
    }

    const senderId = event.sender.id;
    const userPrompt = args.join(" ");
    const repliedMessage = event.message.reply_to?.message || "";
    const finalPrompt = repliedMessage ? `${repliedMessage} ${userPrompt}`.trim() : userPrompt; 

    if (!finalPrompt) {
      return sendMessage(bot, { text: "Please enter your question or reply with an image to analyze." }, authToken);
    }

    try {
      const imageUrl = await extractImageUrl(event, authToken);

      if (imageUrl) {
        const apiUrl = `https://kaiz-apis.gleeze.com/api/gemini-vision`;
        const response = await handleImageRecognition(apiUrl, finalPrompt, imageUrl, senderId);
        const result = response.response;

        const visionResponse = `🌌 𝐆𝐞𝐦𝐢𝐧𝐢 𝐀𝐧𝐚𝐥𝐲𝐬𝐢𝐬\n━━━━━━━━━━━━━━━━━━\n${result}`;
        sendLongMessage(bot, visionResponse, authToken);
      } else {
        // Use the new API for text queries
        const apiUrl = `https://api.siputzx.my.id/api/ai/felo?query=${encodeURIComponent(finalPrompt)}`;
        const response = await axios.get(apiUrl);
        
        if (response.data?.status && response.data?.data?.answer) {
          // Get a random source if available
          let sourceInfo = "";
          if (response.data.data.source && response.data.data.source.length > 0) {
            const randomSource = response.data.data.source[Math.floor(Math.random() * response.data.data.source.length)];
            sourceInfo = `\n\n🔍 Source: ${randomSource.title || "No title"}\n${randomSource.link || "No link"}`;
          }
          
          const gptResponse = `${response.data.data.answer}${sourceInfo}`;
          sendLongMessage(bot, gptResponse, authToken);
        } else {
          throw new Error("Invalid response format from API");
        }
      }
    } catch (error) {
      console.error("Error in AI command:", error);
      sendMessage(bot, { text: `Error: ${error.message || "Something went wrong."}` }, authToken);
    }
  }
};

async function handleImageRecognition(apiUrl, prompt, imageUrl, senderId) {
  try {
    const { data } = await axios.get(apiUrl, {
      params: {
        q: prompt,
        uid: senderId,
        imageUrl: imageUrl || ""
      }
    });
    return data;
  } catch (error) {
    throw new Error("Failed to connect to the Gemini Vision API.");
  }
}

async function extractImageUrl(event, authToken) {
  try {
    if (event.message.reply_to?.mid) {
      return await getRepliedImage(event.message.reply_to.mid, authToken);
    } else if (event.message?.attachments?.[0]?.type === 'image') {
      return event.message.attachments[0].payload.url;
    }
  } catch (error) {
    console.error("Failed to extract image URL:", error);
  }
  return "";
}

async function getRepliedImage(mid, authToken) {
  try {
    const { data } = await axios.get(`https://graph.facebook.com/v21.0/${mid}/attachments`, {
      params: { access_token: authToken }
    });
    return data?.data[0]?.image_data?.url || "";
  } catch (error) {
    throw new Error("Failed to retrieve replied image.");
  }
}

function sendLongMessage(bot, text, authToken) {
  const maxMessageLength = 2000;
  const delayBetweenMessages = 1000;

  if (text.length > maxMessageLength) {
    const messages = splitMessageIntoChunks(text, maxMessageLength);
    sendMessage(bot, { text: messages[0] }, authToken);

    messages.slice(1).forEach((message, index) => {
      setTimeout(() => sendMessage(bot, { text: message }, authToken), (index + 1) * delayBetweenMessages);
    });
  } else {
    sendMessage(bot, { text }, authToken);
  }
}

function splitMessageIntoChunks(message, chunkSize) {
  const regex = new RegExp(`.{1,${chunkSize}}`, 'g');
  return message.match(regex);
}

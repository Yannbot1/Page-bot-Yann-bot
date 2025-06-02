const axios = require('axios');
const { sendMessage } = require('../handles/message');
const MAX_MESSAGE_LENGTH = 2000;
const DELAY_BETWEEN_MESSAGES = 1000; // 1 second


function sendLongMessage(senderId, text, pageAccessToken, sendMessage) {
  if (text.length > MAX_MESSAGE_LENGTH) {
    const messages = splitMessageIntoChunks(text, MAX_MESSAGE_LENGTH);

    sendMessage(senderId, { text: messages[0] }, pageAccessToken);

    messages.slice(1).forEach((message, index) => {
      setTimeout(() => sendMessage(senderId, { text: message }, pageAccessToken), (index + 1) * DELAY_BETWEEN_MESSAGES);
    });
  } else {
    sendMessage(senderId, { text }, pageAccessToken);
  }
}


function splitMessageIntoChunks(message, chunkSize) {
  const regex = new RegExp(`.{1,${chunkSize}}`, 'g');
  return message.match(regex);
}

module.exports = {
  name: 'gpt4',
  description: 'Ask GPT-4 for a response to a given query',
  usage: '-gpt4 <query>',
  author: 'coffee',
  async execute(senderId, args, pageAccessToken) {
    if (!args || !Array.isArray(args) || args.length === 0) {
      await sendMessage(senderId, { text: 'Please provide a query.' }, pageAccessToken);
      return;
    }

    const query = args.join(' ');

    try {
      const apiUrl = `https://markdevs-last-api-2epw.onrender.com/api/v2/gpt4?query=${encodeURIComponent(query)}`;
      const response = await axios.get(apiUrl);
      const gptResponse = response.data.respond;

      
      sendLongMessage(senderId, gptResponse, pageAccessToken, sendMessage);

    } catch (error) {
      console.error('Error:', error);
      await sendMessage(senderId, { text: 'Error: Could not get a response from GPT-4.' }, pageAccessToken);
    }
  }
};

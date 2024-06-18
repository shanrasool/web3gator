require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");

const token = process.env.TELEGRAM_BOT_TOKEN;
const etherscanKey = process.env.ETHERSCAN_API;
const bscKey = process.env.BSCSCAN_API;
const tonKey = process.env.TON_KEY;

if (!token) {
  console.error("Telegram bot token not provided.");
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

const etherscanUrl = "https://api.etherscan.io/api";
const bscscanUrl = "https://api.bscscan.com/api";

let selectedBlockchain = null;
let selectedOption = null;

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "Welcome! Please select a blockchain:", {
    reply_markup: {
      keyboard: [["Ethereum", "Binance Smart Chain", "TON"]],
      resize_keyboard: true,
    },
  });
});

bot.on("message", (msg) => {
  const chatId = msg.chat.id;
  const message = msg.text?.toString();

  if (["Ethereum", "Binance Smart Chain", "TON"].includes(message)) {
    selectedBlockchain = message;
    bot.sendMessage(
      chatId,
      `You selected ${message}. What would you like to do next?`,
      {
        reply_markup: {
          keyboard: [["Get Transaction Details", "Get Account Details"]],
          resize_keyboard: true,
        },
      }
    );
  } else if (
    ["Get Transaction Details", "Get Account Details"].includes(message)
  ) {
    selectedOption = message;
    bot.sendMessage(
      chatId,
      `Please provide the ${
        selectedOption === "Get Transaction Details"
          ? "transaction hash"
          : "account address"
      }:`
    );
  } else {
    if (selectedBlockchain && selectedOption) {
      if (selectedOption === "Get Transaction Details") {
        handleTransactionDetails(chatId, message);
      } else if (selectedOption === "Get Account Details") {
        handleAccountDetails(chatId, message);
      }
    } else {
      bot.sendMessage(chatId, "Please select a valid option.");
    }
  }
});

const handleTransactionDetails = async (chatId, hash) => {
  try {
    let url = "";

    if (selectedBlockchain === "Ethereum") {
      url = `${etherscanUrl}?module=transaction&action=getstatus&txhash=${hash}&apikey=${etherscanKey}`;
    } else if (selectedBlockchain === "Binance Smart Chain") {
      url = `${bscscanUrl}?module=transaction&action=getstatus&txhash=${hash}&apikey=${bscKey}`;
    }

    const response = await axios.get(url);
    const status = response.data.result;

    if (status) {
      bot.sendMessage(chatId, `Transaction Status: ${JSON.stringify(status)}`);
    } else {
      bot.sendMessage(chatId, "Transaction not found.");
    }
  } catch (error) {
    bot.sendMessage(chatId, `Error: ${error.message}`);
  }
};

const handleAccountDetails = async (chatId, address) => {
  try {
    let url = "";

    if (selectedBlockchain === "Ethereum") {
      url = `${etherscanUrl}?module=account&action=balance&address=${address}&tag=latest&apikey=${etherscanKey}`;
    } else if (selectedBlockchain === "Binance Smart Chain") {
      url = `${bscscanUrl}?module=account&action=balance&address=${address}&tag=latest&apikey=${bscKey}`;
    }

    const response = await axios.get(url);
    const balance = response.data.result;

    if (balance) {
      const formattedBalance = (
        selectedBlockchain === "Ethereum" ? balance / 1e18 : balance / 1e18
      ).toFixed(4);
      bot.sendMessage(
        chatId,
        `${selectedBlockchain} Balance: ${formattedBalance}`
      );
    } else {
      bot.sendMessage(chatId, "Account not found or balance unavailable.");
    }
  } catch (error) {
    bot.sendMessage(chatId, `Error: ${error.message}`);
  }
};

console.log("Bot is running...");

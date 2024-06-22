require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
const tonClient = require("./tonClient");

const token = process.env.TELEGRAM_BOT_TOKEN;
const etherscanKey = process.env.ETHERSCAN_API;
const bscKey = process.env.BSCSCAN_API;

if (!token) {
  console.error("Telegram bot token not provided.");
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

const etherscanUrl = "https://api.etherscan.io/api";
const bscscanUrl = "https://api.bscscan.com/api";

let selectedBlockchain = null;
let selectedOption = null;

const resetSelections = () => {
  selectedBlockchain = null;
  selectedOption = null;
};

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  resetSelections();
  bot.sendMessage(chatId, "Welcome! Please select a blockchain:", {
    reply_markup: {
      keyboard: [["Ethereum", "Binance Smart Chain", "TON"]],
      resize_keyboard: true,
    },
  });
});

bot.on("message", (msg) => {
  const chatId = msg.chat.id;
  const message = msg.text?.toString().trim();

  if (!selectedBlockchain) {
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
    } else {
      bot.sendMessage(chatId, "Please select a valid blockchain option.");
    }
  } else if (!selectedOption) {
    if (["Get Transaction Details", "Get Account Details"].includes(message)) {
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
      bot.sendMessage(chatId, "Please select a valid action option.");
    }
  } else {
    if (selectedOption === "Get Transaction Details") {
      handleTransactionDetails(chatId, message);
    } else if (selectedOption === "Get Account Details") {
      handleAccountDetails(chatId, message);
    }

    resetSelections();
  }
});

const handleTransactionDetails = async (chatId, hash) => {
  try {
    let url = "";

    if (selectedBlockchain === "Ethereum") {
      url = `${etherscanUrl}?module=transaction&action=getstatus&txhash=${hash}&apikey=${etherscanKey}`;
    } else if (selectedBlockchain === "Binance Smart Chain") {
      url = `${bscscanUrl}?module=transaction&action=getstatus&txhash=${hash}&apikey=${bscKey}`;
    } else if (selectedBlockchain === "TON") {
      url = `/v2/blockchain/transactions/${encodeURIComponent(hash)}`;
      const response = await tonClient.get(url);
      const transactionData = response.data;

      bot.sendMessage(
        chatId,
        `TON Transaction Details:
        - Transaction Hash: ${transactionData.hash}
        - Address: ${transactionData.account.address}
        - Timestamp: ${transactionData.utime}
        - Amount: ${transactionData.amount}
        - Status: ${transactionData.success}
        - Block ID: ${transactionData.block_id}
        - Fee: ${transactionData.total_fees}
        `
      );
      return;
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
    } else if (selectedBlockchain === "TON") {
      url = `/v2/accounts/${encodeURIComponent(address)}`;
      const response = await tonClient.get(url);
      const accountData = response.data;
      const balance = accountData.balance;

      bot.sendMessage(
        chatId,
        `TON Account Details:
        - Address: ${accountData.address}
        - Balance: ${balance}
        - Last Activity: ${accountData.last_activity}
        - Status: ${accountData.status}
        - Name: ${accountData.name || "N/A"}
        - Is Scam: ${accountData.is_scam ? "Yes" : "No"}
        - Is Suspended: ${accountData.is_suspended ? "Yes" : "No"}
        - Is Wallet: ${accountData.is_wallet ? "Yes" : "No"}
        - Icon: ${accountData.icon || "N/A"}
        - Memo Required: ${accountData.memo_required ? "Yes" : "No"}
        - Interfaces: ${accountData.interfaces.join(", ")}
        - Get Methods: ${accountData.get_methods.join(", ")}
        `
      );
      return;
    }

    const response = await axios.get(url);
    const balance = response.data.result;

    if (balance) {
      const formattedBalance = (
        selectedBlockchain === "Ethereum" ||
        selectedBlockchain === "Binance Smart Chain"
          ? balance / 1e18
          : balance
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

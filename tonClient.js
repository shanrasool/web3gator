const axios = require("axios");

const tonClient = axios.create({
  baseURL: "https://tonapi.io",
  headers: {
    "Content-Type": "application/json",
  },
});

module.exports = tonClient;

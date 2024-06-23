const { TonClient, toNano } = require("@ton/ton");
const { DEX, pTON } = require("@ston-fi/sdk");

async function tonSwap(mnemonicString, amountToSwap, askJettonAddress) {
  try {
    const mnemonic = mnemonicString.split(" ");

    const client = new TonClient({
      endpoint: "https://testnet.toncenter.com/api/v2/jsonRPC",
    });

    const router = await client.open(
      DEX.v2.Router.create("kQCas2p939ESyXM_BzFJzcIe3GD5S0tbjJDj6EBVn-SPsEkN")
    );

    const proxyTon = pTON.v2.create(
      "kQDwpyxrmYQlGDViPk-oqP4XK6J11I-bx7fJAlQCWmJB4m74"
    );

    console.log("Converting mnemonic to key pair...");
    const keyPair = await client.crypto.mnemonicDeriveSignKeys({
      phrase: mnemonic.join(" "),
    });
    console.log("Key pair derived from mnemonic:", keyPair);

    const wallet = await client.wallets.create({
      keys: keyPair,
      client,
    });

    console.log(
      "Wallet created with address:",
      (await wallet.getAddress()).toString()
    );

    console.log("Building swap transaction parameters...");
    const txParams = await router.getSwapTonToJettonTxParams({
      userWalletAddress: (await wallet.getAddress()).toString(),
      proxyTon: proxyTon,
      offerAmount: toNano(amountToSwap.toString()),
      askJettonAddress: askJettonAddress,
      minAskAmount: toNano(amountToSwap.toString()),
      queryId: 12345,
    });
    console.log("Swap transaction parameters built:", txParams);

    console.log("Initiating swap...");
    const response = await router.processSwapTonToJettonTx({
      userWalletAddress: (await wallet.getAddress()).toString(),
      proxyTon: proxyTon,
      offerAmount: toNano(amountToSwap.toString()),
      askJettonAddress: askJettonAddress,
      minAskAmount: toNano(amountToSwap.toString()),
      queryId: 12345,
      keyPair: keyPair,
    });

    console.log("Swap initiated successfully:", response);
    return response;
  } catch (error) {
    console.error("Error in swap:", error);
    throw error;
  }
}

module.exports = tonSwap;

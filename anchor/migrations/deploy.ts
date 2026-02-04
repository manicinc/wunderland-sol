const anchor = require("@coral-xyz/anchor");

module.exports = async function (provider) {
  anchor.setProvider(provider);
  console.log("Deploying WUNDERLAND ON SOL to", provider.connection.rpcEndpoint);
};

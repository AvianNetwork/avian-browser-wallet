/**
 * electrumx.js
 * Copyright (c) 2022 Mikael Hannes
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the MIT license.
 *
 * electrumx handles communication with electrumx server via ecoin.min.js
 */

(function (window) {
  var electrumxManager = function () {};

  const MINUTES = 60000;

  var electrum = new ecoin.ElectrumClient(
    'electrum-us.avn.network',
    50003,
    'wss'
  );

  electrumxManager.prototype = {
    getserver: async () => {
      return electrum;
    },
    getutxo: async (scripthash) => {
      try {
        var utxo = await electrum.blockchain_scripthash_listunspent(scripthash);
        return utxo;
      } catch (error) {
        console.error({ error });
        throw error;
      }
    },
    broadcastrawtx: async (rawtx) => {
      try {
        var txhash = await electrum.blockchain_transaction_broadcast(rawtx);
        return txhash;
      } catch (error) {
        console.error({ error });
        throw error;
      }
    },

    getbalance: async (scripthash) => {
      try {
        var balance = await electrum.blockchain_scripthash_getBalance(
          scripthash
        );
        return balance;
      } catch (error) {
        console.error({ error });
        throw error;
      }
    },
    subscribeScriptHash: async (scripthash) => {
      try {
        const scripthashStatus = await electrum.blockchain_scripthash_subscribe(
          scripthash
        );

        //console.log('Latest scripthash status:', scripthashStatus);
        return scripthashStatus;
      } catch (error) {
        console.error({ error });
        throw error;
      }
    },
    electrumInit: async () => {
      try {
        // removed automatic subscribes until we are able to process messages
        /*  electrum.subscribe.on('blockchain.headers.subscribe', (blob) => {          console.log(blob);        });
        electrum.subscribe.on('blockchain.scripthash.subscribe', (blob) => {          console.log(blob);        }); */
        // TODO pass in server parameters and manage electrum "active" connection(s)

        var ret = await electrum.connect();
        const ver = await electrum.server_version('avn-wallet', '1.4');
        // Keep connection alive.
        setInterval(async () => {
          console.log('ping');
          await electrum.server_ping();
        }, 8 * MINUTES);

        return ver;

        // const serverfeatures = await electrum.server_features()
        // console.log('Server Features:', serverfeatures)

        //const header = await electrum.blockchain_headers_subscribe();
        //console.log('Latest header:', header);
      } catch (error) {
        console.error({ error });
        throw error;
      }
    },
  };

  var ret = new electrumxManager();
  window.electrumxManager = ret;
})(window);

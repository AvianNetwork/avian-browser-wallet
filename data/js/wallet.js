/**
 * wallet.js
 * Copyright (c) 2014 Andrew Toth, © 2019-2022 Mikael Hannes
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the MIT license.
 *
 * Wallet handles the address, private key and encryption,
 * as well as sending and determining balance
 */

(function (window) {
  var balance = 0,
    address = '',
    scripthash = '',
    privateKey = '',
    isEncrypted = false,
    websocket = null,
    balanceListener = null;

  var wallet = function () {};

  wallet.prototype = {
    getAddress: function () {
      return address;
    },

    getBalance: function () {
      return balance;
    },

    getScriptHash: function () {
      return scripthash;
    },

    isEncrypted: function () {
      return isEncrypted;
    },

    // Balance listener gets called with new balance whenever it updates
    setBalanceListener: function (listener) {
      balanceListener = listener;
    },

    // Create a new address
    generateAddress: function (password) {
      console.log('wallet.js.generateAddress');
      return new Promise(function (resolve, reject) {
        if (ret.validatePassword(password)) {
          // var eckey = bitcoin.ECKey.makeRandom();
          var eckey = bitcoinjs_avn.ECPair.makeRandom();
          if (isEncrypted) {
            if (typeof chrome !== 'undefined') {
              privateKey = CryptoJS.AES.encrypt(eckey.toWIF(), password);
            } else {
              privateKey = JSON.parse(
                CryptoJS.AES.encrypt(eckey.toWIF(), password, {
                  format: jsonFormatter,
                })
              );
            }
          } else {
            privateKey = eckey.toWIF();
          }
          //address = eckey.pub.getAddress().toString();
          address = eckey.getAddress();
          var outputscript = bitcoinjs_avn.address.toOutputScript(address);
          var sha = bitcoinjs_avn.crypto.sha256(outputscript);
          scripthash = bitcoinjs_avn.Buffer.from(sha.reverse()).toString('hex');

          balance = 0;
          Promise.all([
            preferences.setAddress(address),
            preferences.setScriptHash(scripthash),
            preferences.setPrivateKey(privateKey),
            preferences.setIsEncrypted(isEncrypted),
          ]).then(function () {
            updateBalance();
            resolve();
          });
        } else {
          reject(Error('Incorrect password'));
        }
      });
    },

    // Restore the previously saved address
    restoreAddress: function () {
      return new Promise(function (resolve, reject) {
        Promise.all([
          preferences.getAddress(),
          preferences.getPrivateKey(),
          preferences.getIsEncrypted(),
          preferences.getScriptHash(),
        ]).then(function (values) {
          if (values[0].length > 0) {
            address = values[0];
            privateKey = values[1];
            isEncrypted = values[2];
            scripthash = values[3];
            updateBalance();
            resolve();
          } else {
            reject(Error('No address'));
          }
        });
      });
    },

    // Import an address using a private key
    importAddress: function (password, _privateKey) {
      return new Promise(function (resolve, reject) {
        if (ret.validatePassword(password)) {
          try {
            //create an ECKey from private key
            //var eckey = new bitcoin.ECKey.fromWIF(_privateKey);
            var eckey = new bitcoinjs_avn.ECPair.fromWIF(
              _privateKey,
              bitcoinjs_avn.networks.avian
            );
            if (isEncrypted) {
              if (typeof chrome !== 'undefined') {
                privateKey = CryptoJS.AES.encrypt(eckey.toWIF(), password);
              } else {
                privateKey = JSON.parse(
                  CryptoJS.AES.encrypt(eckey.toWIF(), password, {
                    format: jsonFormatter,
                  })
                );
              }
            } else {
              privateKey = eckey.toWIF();
            }
            //address = eckey.pub.getAddress().toString();
            address = eckey.getAddress();
            var outputscript = bitcoinjs_avn.address.toOutputScript(address);
            var sha = bitcoinjs_avn.crypto.sha256(outputscript);
            scripthash = bitcoinjs_avn.Buffer.from(sha.reverse()).toString(
              'hex'
            );
            balance = 0;
            Promise.all([
              preferences.setAddress(address),
              preferences.setPrivateKey(privateKey),
              preferences.setLastBalance(0),
              preferences.setScriptHash(scripthash),
            ]).then(function () {
              updateBalance();
              resolve();
            });
          } catch (e) {
            reject(Error('Invalid private key'));
          }
        } else {
          reject(Error('Incorrect password'));
        }
      });
    },

    // Check if the password is valid
    validatePassword: function (password) {
      if (isEncrypted) {
        try {
          // If we can decrypt the private key with the password, then the password is correct
          // We never store a copy of the password anywhere
          if (typeof chrome !== 'undefined') {
            return CryptoJS.AES.decrypt(privateKey, password).toString(
              CryptoJS.enc.Utf8
            );
          } else {
            return CryptoJS.AES.decrypt(JSON.stringify(privateKey), password, {
              format: jsonFormatter,
            }).toString(CryptoJS.enc.Utf8);
          }
        } catch (e) {
          return false;
        }
      } else {
        return true;
      }
    },

    // Return a decrypted private key using the password
    getDecryptedPrivateKey: function (password) {
      if (isEncrypted) {
        if (typeof chrome !== 'undefined') {
          var decryptedPrivateKey = CryptoJS.AES.decrypt(privateKey, password);
        } else {
          var decryptedPrivateKey = CryptoJS.AES.decrypt(
            JSON.stringify(privateKey),
            password,
            { format: jsonFormatter }
          );
        }
        try {
          if (!decryptedPrivateKey.toString(CryptoJS.enc.Utf8)) {
            return null;
          }
        } catch (e) {
          return null;
        }
        return decryptedPrivateKey.toString(CryptoJS.enc.Utf8);
      } else {
        return privateKey;
      }
    },

    // Return WIF based on B0 byte 1, which is the WIF code used in the Desktop Wallet
    getWIF80: function (wifKey) {
      try {
        // var newKey = bitcoin.base58check.decode(wifKey);
        var newKey = bitcoinjs_avn.bs58check.decode(wifKey);
        // newKey.privateKey[0] = 176;
        //var newWif = bitcoin.base58check.encode(newKey);
        var newWif = bitcoinjs_avn.bs58check.encode(
          176,
          newKey.privateKey,
          true
        );
        //TEST
        // var newKeyString = newWif.toString(CryptoJS.enc.Utf8);
      } catch (e) {
        return 'Error creating Alternate WIF';
      }
      return newWif;
    },

    // "temporary" prototype exposed function
    updateBal: function () {
      updateBalance();
    },

    // "temporary" object array of servers, maybe add IsConnected parameter and more
    servers: [
      { host: 'electrum-us.avn.network', port: 50003, protocol: 'wss' },
      { host: 'electrum-eu.avn.network', port: 50003, protocol: 'wss' },
      { host: 'electrum-ca.avn.network', port: 50003, protocol: 'wss' },
    ],
  };

  // Gets the current balance
  function updateBalance() {
    // Make sure we have an address
    if (address.length) {
      if (!scripthash.length) {
        // calculate scripthash from address.  important for new release deployment
        console.log('Need to create scripthash');
        alert('Remember to backup your private key.');
        var outputscript = bitcoinjs_avn.address.toOutputScript(address);
        var sha = bitcoinjs_avn.crypto.sha256(outputscript);
        scripthash = bitcoinjs_avn.Buffer.from(sha.reverse()).toString('hex');
        preferences.setScriptHash(scripthash);
        console.log('New ScriptHash: ', scripthash);
      }
      // Last stored balance is the fastest way to update
      preferences.getLastBalance().then(function (result) {
        balance = result;
        if (balanceListener) balanceListener(balance);
        // Check avian-node for the current balance

        electrumxManager
          .getbalance(scripthash)
          .then(function (response) {
            console.log('Get Electrum Balance', response);
            balance = Number(response.confirmed);
            return preferences.setLastBalance(balance);
          })
          .then(function () {
            if (balanceListener) balanceListener(balance);
          });
      });
    }
  }

  var ret = new wallet();

  // Change the password to a new password
  wallet.prototype.updatePassword = function (password, newPassword) {
    return new Promise(function (resolve, reject) {
      // Make sure the previous password is correct
      var decryptedPrivateKey = ret.getDecryptedPrivateKey(password);
      if (decryptedPrivateKey) {
        // If we have a new password we use it, otherwise leave cleartext
        if (newPassword) {
          if (typeof chrome !== 'undefined') {
            privateKey = CryptoJS.AES.encrypt(decryptedPrivateKey, newPassword);
          } else {
            privateKey = JSON.parse(
              CryptoJS.AES.encrypt(decryptedPrivateKey, newPassword, {
                format: jsonFormatter,
              })
            );
          }
          isEncrypted = true;
        } else {
          privateKey = decryptedPrivateKey;
          isEncrypted = false;
        }
        // Save the encrypted private key
        // Passwords are never saved anywhere
        Promise.all([
          preferences.setIsEncrypted(isEncrypted),
          preferences.setPrivateKey(privateKey),
        ]).then(resolve);
      } else {
        reject(Error('Incorrect password'));
      }
    });
  };

  // Send Avian from the wallet to another address
  wallet.prototype.send = function (sendAddress, amount, fee, password) {
    return new Promise(function (resolve, reject) {
      var decryptedPrivateKey = ret.getDecryptedPrivateKey(password);
      if (decryptedPrivateKey) {
        // Get all unspent outputs from Avian-node to generate our inputs
        electrumxManager.getutxo(scripthash).then(
          function (json) {
            var inputs = json, // .unspent_outputs,
              selectedOuts = [],
              //prepare a key to sign the tx
              eckey = bitcoinjs_avn.ECPair.fromWIF(decryptedPrivateKey),
              // Total cost is amount plus fee
              // fee = 0;
              txValue = Number(amount) + Number(fee),
              availableValue = 0,
              inputAmount = Number(0.0);

            // fee = 0;
            // Gather enough inputs so that their value is greater than or equal to the total cost
            for (var i = 0; i < inputs.length; i++) {
              selectedOuts.push(inputs[i]);
              //inputAmount = parseInt((inputs[i].amount * 100000000).toFixed(0), 10  );
              inputAmount = Number(inputs[i].value);

              // TODO - do not use fixed fee, keep track of selectedOuts for fee/byte
              availableValue = availableValue + inputAmount;
              if (availableValue - txValue >= 0) break;
            }

            // If there aren't enough unspent outputs to available then we can't send the transaction
            if (availableValue - txValue < 0) {
              reject(new Error('Insufficient funds'));
            } else {
              const txb = new bitcoinjs_avn.TransactionBuilder();
              txb.enableAvian(true);
              txb.setVersion(1);
              for (i = 0; i < selectedOuts.length; i++) {
                txb.addInput(selectedOuts[i].tx_hash, selectedOuts[i].tx_pos, null, null, selectedOuts[i].value);
              }
              txb.addOutput(sendAddress, amount);
              changeValue = availableValue - txValue;
              if (changeValue > 0) {
                txb.addOutput(eckey.getAddress(), changeValue);
              }

              const hashType = bitcoinjs_avn.Transaction.SIGHASH_ALL | bitcoinjs_avn.Transaction.SIGHASH_FORKID;
              // Sign all the input hashes
              for (i = 0; i < txb.tx.ins.length; i++) {
                txb.sign(i, eckey, null, hashType, selectedOuts[i].value);
              }

              // Push the transaction to avian-node
              const txData = txb.build().toHex();
              electrumxManager.broadcastrawtx(txData).then(
                function (result) {
                  //let txResponse = result;
                  //var newtxid = txResponse;
                  if (result !== '') {
                    // success = response;
                    preferences.setLastBalance(balance - amount - fee);
                    // if (success == 200)
                    resolve(result);
                    return result;
                  } else {
                    reject(Error(result));
                  }
                })
                .catch(function (error) {
                  reject(new Error(error));
                });
            }
          },
          function () {
            reject(new Error('Unknown error'));
          }
        );
      } else {
        reject(new Error('Incorrect password'));
      }
    });
  };


  var jsonFormatter = {
    stringify: function (cipherParams) {
      // create json object with ciphertext
      var jsonObj = {
        ct: cipherParams.ciphertext.toString(CryptoJS.enc.Hex),
      };

      // optionally add iv and salt
      if (cipherParams.iv) {
        jsonObj.iv = cipherParams.iv.toString();
      }
      if (cipherParams.salt) {
        jsonObj.s = cipherParams.salt.toString();
      }

      // stringify json object
      return JSON.stringify(jsonObj);
    },

    parse: function (jsonStr) {
      // parse json string
      var jsonObj = JSON.parse(jsonStr);

      // extract ciphertext from json object, and create cipher params object
      var cipherParams = CryptoJS.lib.CipherParams.create({
        ciphertext: CryptoJS.enc.Hex.parse(jsonObj.ct),
      });

      // optionally extract iv and salt
      if (jsonObj.iv) {
        cipherParams.iv = CryptoJS.enc.Hex.parse(jsonObj.iv);
      }
      if (jsonObj.s) {
        cipherParams.salt = CryptoJS.enc.Hex.parse(jsonObj.s);
      }

      return cipherParams;
    },
  };

  window.wallet = ret;
})(window);

/**
 * main.js
 * Copyright (c) 2014 Andrew Toth
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the MIT license.
 *
 * Main file for Firefox add-on
 */

(function () {
    var self = require('sdk/self'),
        data = self.data

    // Create the wallet panel
    var walletPanel = require('sdk/panel').Panel({
        width:362,
        height:278,
        contentURL: data.url('index.html'),
        onShow: function () {
            walletPanel.port.emit('show');
            walletPanel.port.emit('version', self.version);
        }
    });
    addListeners(walletPanel);

    walletPanel.port.on('resize', function (height) {
        walletPanel.resize(walletPanel.width, height);
    });

    // Attach the wallet to the bitcoin button
    require('sdk/widget').Widget({
        id: 'open-avian-wallet-btn',
        label: 'Avian Wallet',
        contentURL: data.url('avian38.png'),
        panel: avianWalletPanel
    });

    // Inject the hover popup scripts into every page
    /*require('sdk/page-mod').PageMod({
        include: '*',
        contentScriptFile: [
            data.url('js/libs/promise.min.js'),
            data.url('js/libs/jquery.min.js'),
            data.url('js/libs/bitcoinjs-lib.min.js'),
            data.url('js/util.js'),
            data.url('js/preferences.js'),
            data.url('js/currency-manager.js'),
            data.url('js/hoverpopup.js')],
        onAttach: function (worker) {
            addListeners(worker);
        }
    });
    */

    var tabs = require('sdk/tabs');

    // Add listeners to the worker to communicate with scripts
    function addListeners(worker) {
        // Get prefs from storage
        worker.port.on('get', function () {
            var storage = require('sdk/simple-storage').storage;
            worker.port.emit('get', storage);
        });

        // Save prefs to storage
        worker.port.on('save', function (object) {
            var storage = require('sdk/simple-storage').storage;
            for (var i in object) {
                storage[i] = object[i];
            }
            worker.port.emit('save', storage);
        });

        // Open tabs
        worker.port.on('openTab', function (url) {
            tabs.open(url);
        });

        // Get HTML for local files
        worker.port.on('html', function (url) {
            let content = data.load(url);
            // Replace relative paths of css files to absolute path
            content = content.replace(/css\//g, data.url('css/'));
            content = encodeURIComponent(content);
            content = 'data:text/html;charset=utf-8,' + content;
            worker.port.emit('html', content);
        });

        // Cross-domain XHRs
        worker.port.on('getJSON', function (url) {
            require("sdk/request").Request({
                url: url,
                onComplete: function (response) {
                    worker.port.emit('getJSON', response.json);
                }
            }).get();
        });

        worker.port.on('post', function (message) {
            require("sdk/request").Request({
                url: message.url,
                content: message.content,
                onComplete: function (response) {
                    worker.port.emit('post', response);
                }
            }).post();
        });
    }

    var workers = {};

})();

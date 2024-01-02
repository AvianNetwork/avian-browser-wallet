/**
 * currency-manager.js
 * Copyright (c) 2014 Andrew Toth
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the MIT license.
 *
 * Currency manager handles the exchange rate of the currency
 * and the proper formatting of the currency value
 */

(function (window) {
    var currencyInstance;

   var currencyManager = function () {};
    currencyManager.prototype = {
        updateExchangeRate: function () {
            var tickresult 
            // var lcurr = function () { preferences.getCurrency(); };
            

            util.getJSON('https://api.coingecko.com/api/v3/simple/price?ids=avian-network&vs_currencies=AUD,BRL,CAD,CHF,CNY,ISK,EUR,GBP,ILS,JPY,NOK,NZD,PLN,RUB,SEK,SGD,USD,ZAR'
                            ).then(function (response){
                    tickresult = response ;
                    return preferences.getCurrency().then ( function (currency) {
                                    switch (currency) {
                    case 'AUD': return ( preferences.setExchangeRate(response['avian-network'].aud)); 
                    case 'CAD': return ( preferences.setExchangeRate(response['avian-network'].cad));
                    case 'NZD': return ( preferences.setExchangeRate(response['avian-network'].nzd));
                    case 'SGD': return ( preferences.setExchangeRate(response['avian-network'].sgd));
                    case 'USD': return ( preferences.setExchangeRate(response['avian-network'].usd));
                    case 'BRL': return ( preferences.setExchangeRate(response['avian-network'].brl));
                    case 'CHF': return ( preferences.setExchangeRate(response['avian-network'].chf));
                    case 'CNY': return ( preferences.setExchangeRate(response['avian-network'].cny));
                    case 'JPY': return ( preferences.setExchangeRate(response['avian-network'].jpy));                    
                    case 'EUR': return ( preferences.setExchangeRate(response['avian-network'].eur));
                    case 'GBP': return ( preferences.setExchangeRate(response['avian-network'].gbp));
                    case 'ILS': return ( preferences.setExchangeRate(response['avian-network'].ils));
                    case 'NOK': return ( preferences.setExchangeRate(response['avian-network'].nok));
                    case 'SEK': return ( preferences.setExchangeRate(response['avian-network'].sek));                    
                    case 'ISK': return ( preferences.setExchangeRate(response['avian-network'].isk));
                    case 'PLN': return ( preferences.setExchangeRate(response['avian-network'].pln));
                    case 'RUB': return ( preferences.setExchangeRate(response['avian-network'].rub));
                    case 'ZAR': return ( preferences.setExchangeRate(response['avian-network'].zar));

                    default: return(preferences.setExchangeRate( 0.00 ));
                    }
                    } );   
                    //     preferences.setExchangeRate(response.currency);             
                    // })
            });
        },

      
        getSymbol: function () {
            return preferences.getCurrency().then(function (currency) {
                switch (currency) {
                    case 'AUD':
                    case 'CAD':
                    case 'NZD':
                    case 'SGD':
                    case 'USD':
                        return(['$ ', 'before']);
                    case 'BRL':
                        return(['R$ ', 'before']);
                    case 'CHF':
                        return([' Fr.', 'after']);
                    case 'CNY':
                    case 'JPY':
                        return(['¥ ', 'before']);
                    case 'EUR':
                        return(['€ ', 'before']);
                    case 'GBP':
                        return(['£ ', 'before']);
                    case 'ILS':
                        return(['₪ ', 'before']);
                    case 'NOK':
                        return([' kr', 'after']);
                    case 'SEK':
                        return([' kr', 'after']);
                    case 'ISK':
                        return([' ISK', 'after']);
                    case 'PLN':
                        return([' zł', 'after']);
                    case 'RUB':
                        return([' RUB', 'after']);
                    case 'ZAR':
                        return([' R', 'after']);
                    default:
                        return(['$ ', 'before']);
                }
            });
        },

        getAvailableCurrencies: function () {
            return ['AUD', 'BRL', 'CAD', 'CHF', 'CNY', 'ISK', 'EUR', 'GBP', 'ILS', 'JPY', 'NOK', 'NZD', 'PLN', 'RUB', 'SEK', 'SGD', 'USD', 'ZAR'];
        },

        formatAmount: function (value) {
            return Promise.all([preferences.getExchangeRate(), this.getSymbol()]).then(function (values) {
                var rate = values[0],
                    symbol = values[1][0],
                    beforeOrAfter = values[1][1],
                    SATOSHIS = 100000000,
                    text = (value / SATOSHIS * rate).formatMoney(2);
                if (beforeOrAfter === 'before') {
                    text = symbol + text;
                } else {
                    text += symbol;
                }
                return text;
            });
        }
    };

    Number.prototype.formatMoney = function(c, d, t){
        var n = this,
            c = isNaN(c = Math.abs(c)) ? 3 : c,
            d = d == undefined ? "." : d,
            t = t == undefined ? "," : t,
            s = n < 0 ? "-" : "",
            i = parseInt(n = Math.abs(+n || 0).toFixed(c)) + "",
            j = (j = i.length) > 3 ? j % 3 : 0;
        return s + (j ? i.substr(0, j) + t : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) + (c ? d + Math.abs(n - i).toFixed(c).slice(2) : "");
    };

    var ret = new currencyManager();
    ret.updateExchangeRate();
    window.currencyManager = ret;

})(window);

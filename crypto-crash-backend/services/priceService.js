const axios = require('axios');

const COINGECKO_API = 'https://api.coingecko.com/api/v3/simple/price';

const supportedCoins = {
    BTC:'bitcoin',
    ETH:'ethereum',
    SOL: 'solana',
};

exports.getPrice = async (currency = 'BTC') => {
    try{
        const coinId = supportedCoins[currency.toUpperCase()];
        console.log("coinId",coinId);
        if(!coinId){
            throw new Error('Unsupported coin');
        }
        const response = await axios.get(`${COINGECKO_API}?ids=${coinId}&vs_currencies=usd`);
        console.log(response.data);
        return response.data[coinId].usd;
    }catch(error){
        console.error('Error fetching price:', error);
        throw new Error('Failed to fetch price');
    }
}
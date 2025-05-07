const axios = require('axios');

const COINGECKO_API = 'https://api.coingecko.com/api/v3/simple/price';
const CACHE_DURATION = 10000; // 10 seconds cache

const supportedCoins = {
    BTC: 'bitcoin',
    ETH: 'ethereum',
    SOL: 'solana',
    USDT: 'tether'
};

// Fallback prices in case API fails
const defaultPrices = {
    BTC: 65000,
    ETH: 3500,
    SOL: 100,
    USDT: 1
};

// Price cache
let priceCache = {
    prices: {},
    lastUpdate: 0
};

async function fetchPrices() {
    try {
        console.log('Fetching fresh prices from CoinGecko...');
        const coinIds = Object.values(supportedCoins).join(',');
        const response = await axios.get(`${COINGECKO_API}?ids=${coinIds}&vs_currencies=usd`, {
            timeout: 5000,
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Crash Game/1.0'
            }
        });
        
        const prices = {};
        Object.entries(supportedCoins).forEach(([symbol, id]) => {
            if (response.data[id] && response.data[id].usd) {
                prices[symbol] = response.data[id].usd;
            } else {
                prices[symbol] = defaultPrices[symbol];
            }
        });

        priceCache = {
            prices,
            lastUpdate: Date.now()
        };

        console.log('Updated price cache:', priceCache);
        return prices;
    } catch (error) {
        console.error('Error fetching prices:', error);
        return defaultPrices;
    }
}

exports.getPrice = async (currency = 'BTC') => {
    try {
        const normalizedCurrency = currency.toUpperCase();
        console.log(`Getting price for ${normalizedCurrency}`);

        // Check if currency is supported
        if (!supportedCoins[normalizedCurrency]) {
            console.log(`Unsupported currency: ${normalizedCurrency}`);
            return defaultPrices[normalizedCurrency] || 1;
        }

        // Check if cache needs refresh
        const now = Date.now();
        if (now - priceCache.lastUpdate > CACHE_DURATION || !priceCache.prices[normalizedCurrency]) {
            await fetchPrices();
        }

        // Use cached price
        const price = priceCache.prices[normalizedCurrency] || defaultPrices[normalizedCurrency];
        console.log(`Price for ${normalizedCurrency}: $${price} (${priceCache.lastUpdate ? 'from cache' : 'default'})`);
        return price;

    } catch (error) {
        console.error(`Error in getPrice for ${currency}:`, error);
        // Return default price on error
        const defaultPrice = defaultPrices[currency.toUpperCase()] || 1;
        console.log(`Using default price for ${currency}: $${defaultPrice}`);
        return defaultPrice;
    }
};

// Initialize cache on module load
fetchPrices().catch(console.error);

// Export for testing
module.exports.supportedCoins = supportedCoins;
module.exports.defaultPrices = defaultPrices;
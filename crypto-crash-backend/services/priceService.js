const axios = require('axios');

const COINGECKO_API = 'https://api.coingecko.com/api/v3/simple/price';
const CACHE_DURATION = 10000; // 10 seconds cache
const RATE_LIMIT_WAIT = 60000; // Wait 1 minute on rate limit

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
    lastUpdate: 0,
    rateLimitHit: false,
    rateLimitResetTime: 0
};

async function fetchPrices() {
    try {
        // Check if we're rate limited
        if (priceCache.rateLimitHit && Date.now() < priceCache.rateLimitResetTime) {
            console.log('Rate limit in effect, using default prices');
            return defaultPrices;
        }

        console.log('Fetching fresh prices from CoinGecko...');
        const coinIds = Object.values(supportedCoins).join(',');
        const response = await axios.get(`${COINGECKO_API}?ids=${coinIds}&vs_currencies=usd`, {
            timeout: 5000,
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Crash Game/1.0'
            }
        });
        
        // Reset rate limit flags on successful request
        priceCache.rateLimitHit = false;
        priceCache.rateLimitResetTime = 0;

        const prices = {};
        Object.entries(supportedCoins).forEach(([symbol, id]) => {
            if (response.data[id] && response.data[id].usd) {
                prices[symbol] = response.data[id].usd;
            } else {
                prices[symbol] = defaultPrices[symbol];
            }
        });

        priceCache = {
            ...priceCache,
            prices,
            lastUpdate: Date.now()
        };

        console.log('Updated price cache:', priceCache);
        return prices;
    } catch (error) {
        console.error('Error fetching prices:', error);
        
        // Handle rate limiting
        if (error.response && error.response.status === 429) {
            console.log('Rate limit hit, using default prices for 1 minute');
            priceCache.rateLimitHit = true;
            priceCache.rateLimitResetTime = Date.now() + RATE_LIMIT_WAIT;
        }
        
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
        console.log(`Price for ${normalizedCurrency}: $${price} (${priceCache.rateLimitHit ? 'rate limited' : 'from cache'})`);
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
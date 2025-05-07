const crypto = require('crypto');

function generateCrashPoint(seed = null) {
    const serverSeed = seed || crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(serverSeed).digest('hex');
    
    const h = BigInt('0x' + hash);
    const e = BigInt(2) ** BigInt(52);

    if (h % BigInt(33) === BigInt(0)) {
        return 1.00; // Instant crash
    }

    // Generate a value between 1.01 and 50 (random crash multiplier)
    const randomValue = Number(h % BigInt(10000)) / 100; // Produces a value between 0.00 and 100.00
    const crashMultiplier = Math.max(1.01, randomValue);

    console.log('multiplier:', crashMultiplier.toFixed(2));
    return parseFloat(crashMultiplier.toFixed(2));
}

module.exports = generateCrashPoint;

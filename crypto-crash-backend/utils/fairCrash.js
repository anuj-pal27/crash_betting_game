const crypto = require('crypto');

function generateCrashPoint(seed = null) {
    const serverSeed = seed || crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(serverSeed).digest('hex');

    const h = BigInt('0x' + hash);
    const e = BigInt(2) ** BigInt(52);

    const result = Number((e - h % e) * 100n / e) / 100;
    const crashMultiplier = Math.max(1.01, (100 / (100 - result)).toFixed(2));

    console.log('multiplier:', crashMultiplier);
    console.log('result:', result);
    return parseFloat(crashMultiplier);
}

module.exports = generateCrashPoint;

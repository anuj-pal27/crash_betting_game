const Player = require("../models/Player")

exports.getWallet = async (req, res) => {
  try {
    const player = await Player.findById(req.params.playerId);
    if (!player) return res.status(404).json({ error: 'Player not found' });

    res.json(player.wallet);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.topUpWallet = async (req, res) => {
  try {
    const { playerId, currency, amount } = req.body;
    const player = await Player.findById(playerId);

    if (!player) return res.status(404).json({ error: 'Player not found' });

    // Initialize wallet if not exists
    if (!player.wallet) player.wallet = {};

    // Add funds to specified currency
    player.wallet[currency] = (player.wallet[currency] || 0) + amount;
    await player.save();

    res.json({ success: true, wallet: player.wallet });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const express = require("express");
const router = express.Router();
const {getWallet,topUpWallet} = require('../controllers/WalletController');

router.get('/:playerId',getWallet);

router.post('/topup',topUpWallet);

module.exports = router;
const express = require("express");
const router = express.Router();
const {placeBet,cashOut,getRoundHistory} = require('../controllers/gameController');

router.post('/bet/:playerId',placeBet);

router.post('/cashout/:playerId',cashOut);

router.get('/history',getRoundHistory);

module.exports = router;
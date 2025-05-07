const GameRound = require("../models/GameRound");
const Transaction = require("../models/Transaction");
const Player = require("../models/Player");
const crashService = require("../services/crashService");
const priceService = require("../services/priceService");
const mongoose = require('mongoose');

exports.placeBet = async (req, res) => {
    try{
        const {playerId} = req.params;
        const {usdAmount,currency} = req.body;
        const player = await Player.findById(playerId);
        if(!player) return res.status(404).json({error:"Player not found"});
        const price = await priceService.getPrice(currency);

        const cryptoAmount = usdAmount / price;
        console.log("cryptoAmount",cryptoAmount);
        if(!player.wallet[currency]<cryptoAmount) return res.status(400).json({error:"Insufficient funds"});
        player.wallet[currency] -= cryptoAmount;
        await player.save();
        
        const round = await crashService.addPlayerBet(playerId, usdAmount, cryptoAmount,currency);

        const transaction = new Transaction({
            playerId,
            amountUSD: usdAmount,
            amountCrypto: cryptoAmount,
            transactionType: "bet",
            roundNumber: round.roundNumber,
            multiplier: null,
            result: null,
        });
        await transaction.save();

        res.json ({success:true,transaction,round});
    } catch(error){
        res.status(500).json({error:error.message});
    }
};


exports.cashOut = async (req, res) => {
    try{
        const {playerId} = req.params;
        const {cashoutMultiplier} = req.body;
        const {success,bet,earnedCrypto,currency,error,cashOut} = await crashService.cashOutPlayer(playerId,cashoutMultiplier);
        
        if(!success) return res.status(400).json({error:error});
        const player = await Player.findById(playerId);
        console.log("player",player);
        if(!player) return res.status(404).json({error:"Player not found"});

        player.wallet.crypto += earnedCrypto;
        await player.save();
        const round = await crashService.getCurrentRound();
        const transaction = new Transaction({
            playerId,
            amountUSD: earnedCrypto * maxprice,
            amountCrypto: earnedCrypto,
            transactionType: "cashout",
            roundNumber: round.roundNumber,
            multiplier: cashoutMultiplier,
            result: "win",
            
        });
        await transaction.save();
        res.json({success:true,transaction});
    } catch(err){
        res.status(500).json({error:err.message});
    }
};

exports.getRoundHistory = async(req,res)=>{
    try{
        const rounds = await GameRound.find().sort({roundNumber:-1}).limit(10);
        res.json(rounds);
    }catch(err){
        res.status(500).json({error:err.message});
    }
};
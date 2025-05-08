const GameRound = require("../models/GameRound");
const Transaction = require("../models/Transaction");
const Player = require("../models/Player");
const crashService = require("../services/crashService");
const priceService = require("../services/priceService");
let maxprice = null
exports.placeBet = async (req, res) => {
    try {
        const { playerId } = req.params;
        const { usdAmount, currency } = req.body;

        // Input validation
        if (!usdAmount || usdAmount <= 0) {
            return res.status(400).json({ error: "Invalid bet amount" });
        }

        if (!currency) {
            return res.status(400).json({ error: "Currency is required" });
        }

        const player = await Player.findById(playerId);
        if (!player) {
            return res.status(404).json({ error: "Player not found" });
        }

        // Get price with better error handling
        const price = await priceService.getPrice(currency);
        maxprice = price;
        const cryptoAmount = usdAmount / price;
        console.log(`Converting ${usdAmount} USD to ${cryptoAmount} ${currency}`);

        // Check if player has enough funds
        if (!player.wallet[currency] || player.wallet[currency] < cryptoAmount) {
            return res.status(400).json({ 
                error: "Insufficient funds",
                required: cryptoAmount,
                available: player.wallet[currency] || 0,
                currency
            });
        }

        // Use a transaction to ensure atomic operations
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // Add bet to current round first
            const betResult = await crashService.addPlayerBet(playerId, usdAmount, cryptoAmount, currency);
            
            if (!betResult.success) {
                await session.abortTransaction();
                return res.status(400).json({ error: betResult.error });
            }

            // Deduct from player's wallet
            player.wallet[currency] -= cryptoAmount;
            player.stats.totalBets += 1;
            await player.save({ session });

            // Create transaction record
            const transaction = new Transaction({
                playerId,
                amountUSD: usdAmount,
                amountCrypto: cryptoAmount,
                currency,
                transactionType: "bet",
                roundNumber: betResult.round.roundNumber,
                multiplier: null,
                result: null,
                gameRoundId: betResult.round._id
            });

            await transaction.save({ session });
            await session.commitTransaction();

            res.json({ 
                success: true, 
                transaction, 
                round: betResult.round,
                wallet: player.wallet,
                priceUsed: price
            });

        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }

    } catch (error) {
        console.error('Place bet error:', error);
        res.status(500).json({ 
            error: error.message,
            type: "Internal server error"
        });
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
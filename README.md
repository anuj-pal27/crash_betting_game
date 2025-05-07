# Crypto Crash Game Backend

## Overview

This is the backend for the Crypto Crash game, a multiplayer cryptocurrency crash game. It allows players to place bets in USD, convert them into cryptocurrency, and then "cash out" based on a dynamically generated multiplier. The game logic uses a provably fair crash algorithm and real-time cryptocurrency price fetching.

## Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/anuj-pal27/crash_betting_game.git
cd crypto-crash-backend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the root of the project and add the following variables:

```ini
MONGO_URI=your_mongo_connection_string
PORT=5000
```

* **MONGO\_URI:** Your MongoDB connection string.
* **PORT:** Port where the server will run (defaults to 5000).

### 4. Start the Server

```bash
node server.js
```

## API Endpoint Descriptions

### 1. Place Bet

* **URL:** `/api/game/bet/:playerId`
* **Method:** POST
* **Request:**

```json
{"usdAmount": 100,"currency": "crypto"}
```

* **Response:** JSON with transaction details.

### 2. Cashout

* **URL:** `/api/game/cashout/:playerId`
* **Method:** POST
* **Request:**

```json
{"cashoutMultiplier": 1.5}
```

* **Response:** JSON with transaction details.

### 3. Round History

* **URL:** `/api/game/history`
* **Method:** GET

### 4. Wallet Top-Up

* **URL:** `/api/wallet/top-up`
* **Method:** POST
* **Request:**

```json
{"playerId": "123456789","currency": "usd","amount": 100}
```

## WebSocket Event Descriptions

* **roundStart:** Notifies all clients of a new round.
* **cashOutRequest:** Player cashout request during a round.
* **cashOutUpdate:** Notifies all clients of successful player cashout.
* **multiplierUpdate:** Updates all clients of the current multiplier.

## Provably Fair Crash Algorithm

* Uses a verifiable RNG for crash points.
* Server seed and player seed ensure transparency.

## USD-to-Crypto Conversion Logic

* USD converted to cryptocurrency using real-time prices.

## Approach to Game Logic, Crypto Integration, and WebSockets

* Game operates in rounds with increasing multiplier.
* Players can cash out at any point before crash.
* WebSockets provide real-time updates.

## License

This project is licensed under the MIT License.

# Dungeonites Heroes Challenge - Quest & Web3 Setup Guide

## 🆕 New Features Implemented

### 1. Quest System
- **Daily Quests**: Automatically generated quests that reset every 24 hours
- **Weekly Quests**: Special quests that reset weekly on Mondays
- **Reward Distribution**: Earn tokens, gold, keys based on your division tier
- **Progress Tracking**: Real-time quest progress monitoring

### 2. Web3 Integration
- **Multi-Token Support**: ETH, $DNG, $HERO tokens
- **Wallet Management**: Connect your wallet for deposits/withdrawals
- **Deposit Monitoring**: Automatic detection of incoming blockchain transactions
- **Price Integration**: Real-time token price feeds via CoinGecko API

### 3. Enhanced Profile System
- **5-Tier Economy**: Gold → Tokens → $DNG → $HERO → ETH divisions
- **Wallet Integration**: View balances, transaction history
- **Token Exchange**: Convert between different currencies
- **Comprehensive Statistics**: Detailed game and economic stats

### 4. Database Enhancements
- **Quest Storage**: Persistent quest data with expiration handling
- **Transaction Logging**: Complete transaction history tracking
- **Deposit Management**: Automated deposit processing system

## 🔧 Installation & Setup

### 1. Install New Dependencies

```bash
npm install web3@^4.3.0 ethers@^6.8.1 axios@^1.6.2
```

### 2. Environment Variables

Add these to your `.env` file:

```env
# Existing Discord/Database settings
DISCORD_TOKEN=your_discord_bot_token
MONGODB_URI=mongodb://localhost:27017
DB_NAME=dungeonites_heroes

# New Web3 Configuration
RPC_URL=https://mainnet.infura.io/v3/YOUR_PROJECT_ID
GAME_WALLET_ADDRESS=0x1234567890123456789012345678901234567890
GAME_WALLET_PRIVATE_KEY=your_private_key_here

# Token Contract Addresses
DNG_TOKEN_ADDRESS=0xDNG_CONTRACT_ADDRESS
HERO_TOKEN_ADDRESS=0xHERO_CONTRACT_ADDRESS

# Optional: API Keys
COINGECKO_API_KEY=your_coingecko_api_key
```

### 3. MongoDB Collections

The system will automatically create these new collections:
- `quests` - Quest data and progress
- `transactions` - Transaction history
- `deposits` - Deposit monitoring and processing

## 🎮 How to Use New Features

### Quest System

1. **Accessing Quests**:
   ```
   !ch → Select "📜 Quests"
   ```

2. **Quest Types**:
   - **Monster Hunter**: Defeat X monsters
   - **Dungeon Explorer**: Explore X times
   - **Floor Conqueror**: Complete floor bosses
   - **Treasure Seeker**: Find treasures while exploring

3. **Rewards Based on Division**:
   - **Gold Division**: 1 Token + bonus gold/keys
   - **Token+ Divisions**: 1 $DNG + enhanced rewards

### Web3 Wallet Management

1. **Profile Access**:
   ```
   !ch → Select "👤 Profile" → "💳 Wallet Management"
   ```

2. **Deposit Process**:
   - Get your unique deposit address
   - Send ETH/$DNG/$HERO to that address
   - Funds automatically credited to game account

3. **Withdrawal Process**:
   - Connect your wallet address
   - Select withdrawal amount and token type
   - Funds sent to your connected wallet

### Token Exchange

1. **Exchange Rates** (configurable in GameState):
   - 100 Gold = 1 Token
   - 10 Tokens = 1 $DNG
   - 5 $DNG = 1 $HERO
   - 3 $HERO = 1 ETH

2. **Exchange Process**:
   ```
   Profile → "💱 Token Exchange" → Select conversion type
   ```

## 🏗️ Technical Architecture

### Quest System Flow
```
QuestHandler.showQuestMenu()
├── Check player data
├── Generate new daily/weekly quests
├── Display quest progress
└── Handle reward claiming

QuestManager.generateDailyQuest()
├── Select random quest template
├── Set 24-hour expiration
└── Apply division-based rewards
```

### Web3 Integration Flow
```
Web3Manager.initialize()
├── Connect to blockchain provider
├── Initialize token contracts
└── Setup game wallet

Deposit Detection:
├── Monitor game wallet address
├── Detect incoming transactions
├── Credit player accounts
└── Log transaction history
```

### Database Schema

**Player Document** (enhanced):
```javascript
{
  discordId: String,
  username: String,
  economyType: String, // 'gold', 'tokens', 'dng', 'hero', 'eth'
  economy: {
    gold: Number,
    tokens: Number,
    dng: Number,
    hero: Number,
    eth: Number
  },
  quests: [QuestObject],
  questStats: {
    dailyQuestsCompleted: Number,
    weeklyQuestsCompleted: Number,
    totalQuestsCompleted: Number,
    lastDailyQuestDate: Date,
    lastWeeklyQuestDate: Date
  },
  walletAddress: String,
  transactionHistory: [TransactionObject],
  // ... existing fields
}
```

## 🔄 Integration with Existing Game

### Quest Progress Tracking

The quest system integrates with existing game actions:

```javascript
// In BattleHandler.js (when battle is won)
import { QuestHandler } from './QuestHandler.js';
await QuestHandler.updateQuestProgress(userId, 'battles', 1);

// In ExplorationHandler.js (when exploring)
await QuestHandler.updateQuestProgress(userId, 'explores', 1);

// In FloorHandler.js (when floor boss defeated)
await QuestHandler.updateQuestProgress(userId, 'floors', 1);
```

### Economy Integration

All economic transactions now support the 5-tier system:

```javascript
// Check if player can afford division cost
if (gameState.canAffordDivision(economyType)) {
    gameState.deductDivisionCost(economyType);
    // Start game with enhanced rewards
}
```

## 🎯 Division Benefits

| Division | Cost per Game | Daily Quest Reward | Benefits |
|----------|---------------|-------------------|----------|
| 🥉 Bronze (Gold) | Free | 1 Token + 50 Gold | Standard rewards |
| 🥈 Silver (Token) | 1 Token | 1 $DNG + 100 Gold | +20% rewards |
| 🥇 Gold ($DNG) | 1 $DNG | 1 $DNG + bonus quests | +50% rewards |
| 💎 Platinum ($HERO) | 1 $HERO | Enhanced rewards | +100% rewards |
| 👑 Diamond (ETH) | 1 ETH | VIP treatment | +200% rewards |

## 🔐 Security Considerations

### Wallet Security
- Game wallet private key should be stored securely
- Use environment variables, never commit to repository
- Consider using hardware wallets for production

### Transaction Verification
- All deposits are verified on-chain before crediting
- Transaction hashes are logged for audit trails
- Failed transactions are handled gracefully

### Rate Limiting
- Withdrawal requests should be rate-limited
- Large withdrawals may require manual approval
- Monitor for suspicious activity patterns

## 🚀 Deployment Notes

### Production Setup
1. **Blockchain Network**: Configure for mainnet in production
2. **API Keys**: Obtain production API keys for price feeds
3. **Monitoring**: Set up monitoring for deposit detection
4. **Backup**: Regular backups of quest and transaction data

### Performance Considerations
- Quest cleanup runs automatically to remove expired quests
- Transaction history is kept for audit purposes
- Consider archiving old data for performance

### Error Handling
- Web3 operations fallback gracefully when blockchain is unavailable
- Quest system works in offline mode
- Database operations support both MongoDB and memory storage

## 📊 Admin Features

### Quest Management
- Monitor quest completion rates
- Adjust quest difficulty and rewards
- View quest statistics across all players

### Economy Monitoring
- Track token flow between divisions
- Monitor deposit/withdrawal patterns
- Adjust exchange rates as needed

### Transaction Oversight
- View all transactions in admin panel
- Manual processing of failed deposits
- Generate financial reports

## 🔧 Customization

### Adding New Quest Types
1. Add quest template to `QuestManager.generateDailyQuest()`
2. Implement progress tracking in relevant handlers
3. Update quest requirements and rewards

### Adding New Tokens
1. Add contract address to environment variables
2. Update `Web3Manager.initializeContracts()`
3. Add exchange rates to GameState

### Modifying Rewards
1. Update quest templates in `Quest.js`
2. Adjust division benefits in `ProfileHandler.js`
3. Modify exchange rates in `GameState.js`

---

## 🤝 Compatibility with Other AI

This implementation is designed to work alongside the other AI handling bug fixes. Key compatibility features:

- **Modular Design**: All new features are in separate files/handlers
- **Non-Breaking**: Existing game functionality remains unchanged
- **Service Integration**: Uses existing service registry pattern
- **Database Compatibility**: Extends existing database structure
- **Error Handling**: Graceful fallbacks when features are unavailable

The quest system, Web3 integration, and enhanced profiles are ready for immediate use while the other AI continues working on core game fixes! 
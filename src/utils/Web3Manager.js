import { ethers } from 'ethers';
import axios from 'axios';
import { logger } from './logger.js';

/**
 * Web3Manager - Handles blockchain interactions and token management
 */
export class Web3Manager {
    constructor() {
        this.provider = null;
        this.wallet = null;
        this.contracts = {};
        this.initialized = false;
        
        // Token contract addresses (will be set via environment variables)
        this.tokenAddresses = {
            DNG: process.env.DNG_TOKEN_ADDRESS || '',
            HERO: process.env.HERO_TOKEN_ADDRESS || '',
            ETH: 'native' // ETH is native currency
        };
        
        // Game wallet (bot's wallet for receiving deposits)
        this.gameWalletAddress = process.env.GAME_WALLET_ADDRESS || '';
        this.gameWalletPrivateKey = process.env.GAME_WALLET_PRIVATE_KEY || '';
    }

    /**
     * Initialize Web3 connection
     */
    async initialize() {
        try {
            // Set up provider (using Infura or similar)
            const rpcUrl = process.env.RPC_URL || 'https://mainnet.infura.io/v3/YOUR_PROJECT_ID';
            this.provider = new ethers.JsonRpcProvider(rpcUrl);
            
            // Initialize game wallet if private key is provided
            if (this.gameWalletPrivateKey) {
                this.wallet = new ethers.Wallet(this.gameWalletPrivateKey, this.provider);
                logger.info('Web3 game wallet initialized');
            }
            
            // Initialize token contracts
            await this.initializeContracts();
            
            this.initialized = true;
            logger.info('Web3Manager initialized successfully');
            
        } catch (error) {
            logger.warn('Web3 initialization failed - running without blockchain features:', error.message);
            this.initialized = false;
        }
    }

    /**
     * Initialize token contracts
     */
    async initializeContracts() {
        // Standard ERC-20 ABI (basic functions we need)
        const erc20Abi = [
            "function balanceOf(address) view returns (uint256)",
            "function transfer(address to, uint256 amount) returns (bool)",
            "function transferFrom(address from, address to, uint256 amount) returns (bool)",
            "function decimals() view returns (uint8)",
            "function symbol() view returns (string)"
        ];

        try {
            // Initialize DNG token contract
            if (this.tokenAddresses.DNG) {
                this.contracts.DNG = new ethers.Contract(
                    this.tokenAddresses.DNG,
                    erc20Abi,
                    this.provider
                );
            }

            // Initialize HERO token contract
            if (this.tokenAddresses.HERO) {
                this.contracts.HERO = new ethers.Contract(
                    this.tokenAddresses.HERO,
                    erc20Abi,
                    this.provider
                );
            }

            logger.info('Token contracts initialized');
        } catch (error) {
            logger.error('Error initializing token contracts:', error);
        }
    }

    /**
     * Validate Ethereum address format
     */
    isValidAddress(address) {
        try {
            return ethers.isAddress(address);
        } catch {
            return false;
        }
    }

    /**
     * Get token balance for an address
     */
    async getTokenBalance(tokenSymbol, address) {
        if (!this.initialized || !this.contracts[tokenSymbol]) {
            throw new Error(`${tokenSymbol} contract not available`);
        }

        try {
            if (tokenSymbol === 'ETH') {
                const balance = await this.provider.getBalance(address);
                return ethers.formatEther(balance);
            } else {
                const balance = await this.contracts[tokenSymbol].balanceOf(address);
                const decimals = await this.contracts[tokenSymbol].decimals();
                return ethers.formatUnits(balance, decimals);
            }
        } catch (error) {
            logger.error(`Error getting ${tokenSymbol} balance:`, error);
            throw error;
        }
    }

    /**
     * Generate deposit address (game wallet address) for user
     */
    generateDepositAddress() {
        return this.gameWalletAddress;
    }

    /**
     * Check for incoming deposits to game wallet
     */
    async checkForDeposits(fromBlock = 'latest') {
        if (!this.initialized) return [];

        try {
            const deposits = [];
            
            // Check ETH deposits
            const ethDeposits = await this.checkETHDeposits(fromBlock);
            deposits.push(...ethDeposits);
            
            // Check token deposits
            for (const [symbol, contract] of Object.entries(this.contracts)) {
                if (contract) {
                    const tokenDeposits = await this.checkTokenDeposits(symbol, contract, fromBlock);
                    deposits.push(...tokenDeposits);
                }
            }
            
            return deposits;
        } catch (error) {
            logger.error('Error checking for deposits:', error);
            return [];
        }
    }

    /**
     * Check for ETH deposits
     */
    async checkETHDeposits(fromBlock) {
        try {
            const filter = {
                address: this.gameWalletAddress,
                fromBlock: fromBlock,
                toBlock: 'latest'
            };
            
            const logs = await this.provider.getLogs(filter);
            const deposits = [];
            
            for (const log of logs) {
                const transaction = await this.provider.getTransaction(log.transactionHash);
                if (transaction && transaction.to === this.gameWalletAddress) {
                    deposits.push({
                        token: 'ETH',
                        amount: ethers.formatEther(transaction.value),
                        from: transaction.from,
                        txHash: transaction.hash,
                        blockNumber: log.blockNumber
                    });
                }
            }
            
            return deposits;
        } catch (error) {
            logger.error('Error checking ETH deposits:', error);
            return [];
        }
    }

    /**
     * Check for token deposits
     */
    async checkTokenDeposits(symbol, contract, fromBlock) {
        try {
            const filter = contract.filters.Transfer(null, this.gameWalletAddress);
            const events = await contract.queryFilter(filter, fromBlock);
            
            const deposits = [];
            const decimals = await contract.decimals();
            
            for (const event of events) {
                deposits.push({
                    token: symbol,
                    amount: ethers.formatUnits(event.args.value, decimals),
                    from: event.args.from,
                    txHash: event.transactionHash,
                    blockNumber: event.blockNumber
                });
            }
            
            return deposits;
        } catch (error) {
            logger.error(`Error checking ${symbol} deposits:`, error);
            return [];
        }
    }

    /**
     * Send tokens from game wallet to user address
     */
    async sendTokens(tokenSymbol, toAddress, amount) {
        if (!this.initialized || !this.wallet) {
            throw new Error('Web3 wallet not initialized');
        }

        try {
            let transaction;
            
            if (tokenSymbol === 'ETH') {
                transaction = await this.wallet.sendTransaction({
                    to: toAddress,
                    value: ethers.parseEther(amount.toString())
                });
            } else {
                const contract = this.contracts[tokenSymbol].connect(this.wallet);
                const decimals = await contract.decimals();
                const value = ethers.parseUnits(amount.toString(), decimals);
                
                transaction = await contract.transfer(toAddress, value);
            }
            
            logger.info(`${tokenSymbol} transfer initiated:`, transaction.hash);
            return transaction;
            
        } catch (error) {
            logger.error(`Error sending ${tokenSymbol}:`, error);
            throw error;
        }
    }

    /**
     * Get current token prices from external API
     */
    async getTokenPrices() {
        try {
            // Using CoinGecko API for price data
            const response = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
                params: {
                    ids: 'ethereum,dungeonites,hero-token', // Update with actual token IDs
                    vs_currencies: 'usd'
                }
            });
            
            return {
                ETH: response.data.ethereum?.usd || 0,
                DNG: response.data.dungeonites?.usd || 0,
                HERO: response.data['hero-token']?.usd || 0
            };
        } catch (error) {
            logger.error('Error fetching token prices:', error);
            return { ETH: 0, DNG: 0, HERO: 0 };
        }
    }

    /**
     * Calculate transaction fees
     */
    async estimateTransactionFee(tokenSymbol, toAddress, amount) {
        if (!this.initialized) return '0';

        try {
            let gasEstimate;
            
            if (tokenSymbol === 'ETH') {
                gasEstimate = await this.provider.estimateGas({
                    to: toAddress,
                    value: ethers.parseEther(amount.toString())
                });
            } else {
                const contract = this.contracts[tokenSymbol];
                const decimals = await contract.decimals();
                const value = ethers.parseUnits(amount.toString(), decimals);
                
                gasEstimate = await contract.transfer.estimateGas(toAddress, value);
            }
            
            const gasPrice = await this.provider.getFeeData();
            const fee = gasEstimate * gasPrice.gasPrice;
            
            return ethers.formatEther(fee);
        } catch (error) {
            logger.error('Error estimating transaction fee:', error);
            return '0';
        }
    }

    /**
     * Verify transaction on blockchain
     */
    async verifyTransaction(txHash) {
        if (!this.initialized) return null;

        try {
            const receipt = await this.provider.getTransactionReceipt(txHash);
            return receipt;
        } catch (error) {
            logger.error('Error verifying transaction:', error);
            return null;
        }
    }

    /**
     * Get network status
     */
    async getNetworkStatus() {
        if (!this.initialized) {
            return { connected: false, network: 'unknown', blockNumber: 0 };
        }

        try {
            const network = await this.provider.getNetwork();
            const blockNumber = await this.provider.getBlockNumber();
            
            return {
                connected: true,
                network: network.name,
                chainId: network.chainId,
                blockNumber: blockNumber
            };
        } catch (error) {
            logger.error('Error getting network status:', error);
            return { connected: false, network: 'unknown', blockNumber: 0 };
        }
    }

    /**
     * Format token amount for display
     */
    formatTokenAmount(amount, decimals = 4) {
        const num = parseFloat(amount);
        if (num === 0) return '0';
        if (num < 0.0001) return '< 0.0001';
        return num.toFixed(decimals);
    }

    /**
     * Convert between different tokens based on game exchange rates
     */
    convertTokens(fromToken, toToken, amount, exchangeRates) {
        // Implement token conversion logic based on game's exchange rates
        const conversions = {
            'gold_to_tokens': amount / exchangeRates.goldToTokens,
            'tokens_to_gold': amount * exchangeRates.tokensToGold,
            'tokens_to_dng': amount / exchangeRates.tokensToDng,
            'dng_to_hero': amount / exchangeRates.dngToHero,
            'hero_to_eth': amount / exchangeRates.heroToEth
        };

        const conversionKey = `${fromToken}_to_${toToken}`;
        return conversions[conversionKey] || 0;
    }
}

// Export singleton instance
export const web3Manager = new Web3Manager(); 
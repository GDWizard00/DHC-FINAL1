import { EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder, MessageFlags } from 'discord.js';
import { logger } from '../../utils/logger.js';
import { monstersData } from '../../data/monstersData.js';
import { embedHistory } from '../../utils/embedHistory.js';
import { generateScaledPotion, getRandomPotionType } from '../../utils/potionScaling.js';
import { calculateGoldScaling } from '../../utils/floorScaling.js';

/**
 * ExplorationHandler - Handles all exploration outcomes and encounters
 * Manages: treasure finding, monster encounters, hidden rooms, mysterious chests
 */
export class ExplorationHandler {
    
    /**
     * Start exploration and determine outcome
     */
    static async startExploration(interaction, gameState) {
        try {
            const currentFloor = gameState.currentFloor || 1;
            const heroName = (gameState.selectedHero && gameState.selectedHero.name) || (gameState.player?.hero?.name) || 'Hero';
            
            // Show initial exploration message
            const exploringEmbed = new EmbedBuilder()
                .setTitle('🔍 **EXPLORING...** 🔍')
                .setDescription(`${heroName} carefully explores the shadowy corridors of Floor ${currentFloor}...\n\n*Searching for secrets, treasures, and threats...*`)
                .setColor(0x808080)
                .setFooter({ text: 'Exploration in progress...' });

            // Use update since this is coming from a string select menu
            await embedHistory.updateWithHistory(interaction, {
                embeds: [exploringEmbed],
                components: []
            }, gameState.session.userId);

            // Immediately determine outcome (no delays per RULES.txt)
            try {
                await this.determineExplorationOutcome(interaction, gameState);
            } catch (error) {
                logger.error('Error in exploration outcome:', error);
                // If we can't determine outcome, show error and return to floor
                await this.returnToFloor(interaction, gameState);
            }

            logger.info(`User ${gameState.session.userId} started exploring floor ${currentFloor}`);

        } catch (error) {
            logger.error('Error starting exploration:', error);
            throw error;
        }
    }

    /**
     * Determine and execute exploration outcome
     */
    static async determineExplorationOutcome(interaction, gameState) {
        try {
            // Generate random outcome (weighted probabilities)
            const roll = Math.random() * 100;
            
            if (roll < 25) {
                // 25% - Found nothing
                await this.handleFoundNothing(interaction, gameState);
            } else if (roll < 35) {
                // 10% - Mysterious chest
                await this.handleMysteriousChest(interaction, gameState);
            } else if (roll < 50) {
                // 15% - Detected monsters
                await this.handleDetectedMonsters(interaction, gameState);
            } else if (roll < 65) {
                // 15% - Chance attack
                await this.handleChanceAttack(interaction, gameState);
            } else if (roll < 80) {
                // 15% - Hidden/locked room
                await this.handleHiddenRoom(interaction, gameState);
            } else {
                // 20% - Find treasure
                await this.handleFoundTreasure(interaction, gameState);
            }

        } catch (error) {
            logger.error('Error determining exploration outcome:', error);
            throw error;
        }
    }

    /**
     * Handle "Found Nothing" outcome
     */
    static async handleFoundNothing(interaction, gameState) {
        try {
            const nothingImages = [
                'https://media.discordapp.net/attachments/1351696887165616169/1356511792045752381/image.png?ex=67ee270d&is=67ecd58d&hm=38754b2fe36861b42f6e827627a146efe9a54e730714e35cfc2c7fce1c7beb6e&=&format=webp&quality=lossless&width=813&height=589',
                'https://media.discordapp.net/attachments/1351696887165616169/1356552671699665016/image.png?ex=67eda460&is=67ec52e0&hm=cd26527333c08fbc9fc51f90276c9817c800dd531eedb8f2406e83ce43cfbbbd&=&format=webp&quality=lossless&width=805&height=578'
            ];
            
            const randomImage = nothingImages[Math.floor(Math.random() * nothingImages.length)];
            
            const embed = new EmbedBuilder()
                .setTitle('🔍 **EXPLORATION RESULTS** 🔍')
                .setDescription('You search through the dark corridors and abandoned chambers...\n\n**You found nothing of value.**\n\nPerhaps other adventurers have already claimed whatever treasures were here.')
                .setImage(randomImage)
                .setColor(0x808080)
                .setFooter({ text: 'Better luck next time!' });

            await this.showExplorationResult(interaction, gameState, embed, [
                {
                    label: '🔙 Return to Floor',
                    description: 'Continue exploring or take other actions',
                    value: 'return_to_floor'
                }
            ]);

            logger.info(`User ${gameState.session.userId} found nothing while exploring`);

        } catch (error) {
            logger.error('Error handling found nothing:', error);
            throw error;
        }
    }

    /**
     * Handle "Mysterious Chest" outcome
     */
    static async handleMysteriousChest(interaction, gameState) {
        try {
            const embed = new EmbedBuilder()
                .setTitle('🎁 **MYSTERIOUS CHEST DISCOVERED** 🎁')
                .setDescription('You discover a strange, ornate chest sitting in the shadows. It pulses with an otherworldly energy and seems to call to you...\n\n**This chest requires no key to open, but something feels... wrong about it.**\n\nDo you dare open it?')
                .setImage('https://media.discordapp.net/attachments/1351696887165616169/1354594372250898472/image.png?ex=67e5dbd1&is=67e48a51&hm=ab41786e0b703d69adc5292e31bdc74c064a234037c2a522c4b5db7a9723397c&=&format=webp&quality=lossless&width=812&height=601')
                .setColor(0x9932CC)
                .setFooter({ text: 'Choose wisely - this chest holds either great reward or great danger!' });

            await this.showExplorationResult(interaction, gameState, embed, [
                {
                    label: '🎁 Open the Chest',
                    description: 'Risk it all for potential rewards',
                    value: 'open_mysterious_chest'
                },
                {
                    label: '🚶 Leave it Alone',
                    description: 'Better safe than sorry',
                    value: 'leave_chest'
                },
                {
                    label: '🔙 Return to Floor',
                    description: 'Go back without interacting',
                    value: 'return_to_floor'
                }
            ]);

            logger.info(`User ${gameState.session.userId} discovered mysterious chest`);

        } catch (error) {
            logger.error('Error handling mysterious chest:', error);
            throw error;
        }
    }

    /**
     * Handle "Detected Monsters" outcome
     */
    static async handleDetectedMonsters(interaction, gameState) {
        try {
            const currentFloor = gameState.currentFloor || 1;
            const monster = this.selectRandomMonster(currentFloor);
            
            const embed = new EmbedBuilder()
                .setTitle('👁️ **MONSTER DETECTED** 👁️')
                .setDescription(`Your keen senses alert you to a presence lurking in the shadows ahead...\n\n**A ${monster.name} prowls nearby!**\n\n**Monster Stats:**\n**Health:** ${monster.health}\n**Mana:** ${monster.mana}\n**Primary Weapon:** ${monster.weapons[0]}\n\nYou have the advantage - you spotted it first!`)
                .setImage(monster.imageUrl)
                .setColor(0xFF6347)
                .setFooter({ text: 'You have the element of surprise!' });

            // Store detected monster for potential battle
            gameState.exploration.detectedMonster = monster;

            await this.showExplorationResult(interaction, gameState, embed, [
                {
                    label: '⚔️ Fight the Monster',
                    description: 'Engage in combat for rewards',
                    value: 'fight_detected_monster'
                },
                {
                    label: '🥷 Sneak Away',
                    description: 'Quietly avoid the encounter (no penalty)',
                    value: 'sneak_away'
                }
            ]);

            logger.info(`User ${gameState.session.userId} detected ${monster.name} on floor ${currentFloor}`);

        } catch (error) {
            logger.error('Error handling detected monsters:', error);
            throw error;
        }
    }

    /**
     * Handle "Chance Attack" outcome
     */
    static async handleChanceAttack(interaction, gameState) {
        try {
            const currentFloor = gameState.currentFloor || 1;
            const monster = this.selectRandomMonster(currentFloor);
            
            const embed = new EmbedBuilder()
                .setTitle('⚡ **AMBUSH!** ⚡')
                .setDescription(`You're caught off guard as a ${monster.name} leaps out from the shadows!\n\n**You've been ambushed!**\n\nYou must decide quickly - fight or flee!`)
                .setImage(monster.imageUrl)
                .setColor(0xFF4500)
                .setFooter({ text: 'You were caught by surprise!' });

            // Store ambush monster for potential battle
            gameState.exploration.ambushMonster = monster;

            await this.showExplorationResult(interaction, gameState, embed, [
                {
                    label: '⚔️ Fight the Monster',
                    description: 'Stand your ground and fight',
                    value: 'fight_ambush_monster'
                },
                {
                    label: '🏃 Flee',
                    description: 'Run away (10% health and mana loss)',
                    value: 'flee_ambush'
                }
            ]);

            logger.info(`User ${gameState.session.userId} was ambushed by ${monster.name} on floor ${currentFloor}`);

        } catch (error) {
            logger.error('Error handling chance attack:', error);
            throw error;
        }
    }

    /**
     * Handle "Hidden Room" outcome
     */
    static async handleHiddenRoom(interaction, gameState) {
        try {
            const currentFloor = gameState.currentFloor || 1;
            const isLocked = Math.random() < 0.4; // 40% chance of being locked
            
            if (isLocked) {
                // Locked room - requires keys
                const keysRequired = Math.floor(Math.random() * 3) + 1; // 1-3 keys
                
                const embed = new EmbedBuilder()
                    .setTitle('🔐 **LOCKED ROOM DISCOVERED** 🔐')
                    .setDescription(`You discover a heavy wooden door bound with iron. Ancient runes glow faintly around the lock.\n\n**This room requires ${keysRequired} key${keysRequired > 1 ? 's' : ''} to unlock.**\n\nLocked rooms often contain more valuable treasures than hidden ones.`)
                    .setImage('https://media.discordapp.net/attachments/1351696887165616169/1356488744588283974/image.png?ex=67ee1197&is=67ecc017&hm=97a81d6e7238808f135a8ffcffd6ea9592a2256502e34df60f5ec313e5ab330f&=&format=webp&quality=lossless&width=809&height=579')
                    .setColor(0x8B4513)
                    .setFooter({ text: 'Better rewards await those who can unlock its secrets!' });

                gameState.exploration.hiddenRoom = {
                    type: 'locked',
                    keysRequired: keysRequired
                };

                const options = [
                    {
                        label: '🔙 Return to Floor',
                        description: 'Leave the room for now',
                        value: 'return_to_floor'
                    }
                ];

                // Add unlock option if player has enough keys
                if ((gameState.player.inventory.keys || 0) >= keysRequired) {
                    options.unshift({
                        label: `🔓 Unlock Room (${keysRequired} key${keysRequired > 1 ? 's' : ''})`,
                        description: 'Use your keys to unlock the door',
                        value: 'unlock_room'
                    });
                } else {
                    options.unshift({
                        label: `🔓 Unlock Room (${keysRequired} key${keysRequired > 1 ? 's' : ''})`,
                        description: `You need ${keysRequired - (gameState.player.inventory.keys || 0)} more key${keysRequired - (gameState.player.inventory.keys || 0) > 1 ? 's' : ''}`,
                        value: 'unlock_room',
                        disabled: true
                    });
                }

                await this.showExplorationResult(interaction, gameState, embed, options);

            } else {
                // Hidden room - free to enter
                const embed = new EmbedBuilder()
                    .setTitle('🕳️ **HIDDEN ROOM DISCOVERED** 🕳️')
                    .setDescription('You notice a section of the wall that seems different from the rest. Upon closer inspection, you find a hidden passage!\n\n**This room is open and free to explore.**\n\nWho knows what secrets lie within?')
                    .setImage('https://media.discordapp.net/attachments/1351696887165616169/1356488744588283974/image.png?ex=67ee1197&is=67ecc017&hm=97a81d6e7238808f135a8ffcffd6ea9592a2256502e34df60f5ec313e5ab330f&=&format=webp&quality=lossless&width=809&height=579')
                    .setColor(0x32CD32)
                    .setFooter({ text: 'Fortune favors the observant!' });

                gameState.exploration.hiddenRoom = {
                    type: 'hidden',
                    keysRequired: 0
                };

                await this.showExplorationResult(interaction, gameState, embed, [
                    {
                        label: '🚪 Enter Hidden Room',
                        description: 'Explore the hidden chamber',
                        value: 'enter_hidden_room'
                    },
                    {
                        label: '🔙 Return to Floor',
                        description: 'Leave the room for now',
                        value: 'return_to_floor'
                    }
                ]);
            }

            logger.info(`User ${gameState.session.userId} discovered ${isLocked ? 'locked' : 'hidden'} room on floor ${currentFloor}`);

        } catch (error) {
            logger.error('Error handling hidden room:', error);
            throw error;
        }
    }

    /**
     * Handle "Found Treasure" outcome
     */
    static async handleFoundTreasure(interaction, gameState) {
        try {
            const currentFloor = gameState.currentFloor || 1;
            const treasure = this.generateTreasure(currentFloor);
            
            // Apply treasure to game state
            if (treasure.gold > 0) {
                gameState.economy.gold = (gameState.economy.gold || 0) + treasure.gold;
            }
            if (treasure.keys > 0) {
                gameState.player.inventory.keys = (gameState.player.inventory.keys || 0) + treasure.keys;
            }
            if (treasure.items && treasure.items.length > 0) {
                if (!gameState.player.inventory.items) gameState.player.inventory.items = [];
                gameState.player.inventory.items.push(...treasure.items);
            }

            const embed = new EmbedBuilder()
                .setTitle('💰 **TREASURE FOUND!** 💰')
                .setDescription(`You discover a cache of valuable items hidden away!\n\n**Your findings:**\n${treasure.description}\n\nThese treasures have been added to your inventory.`)
                .setColor(0xFFD700)
                .setFooter({ text: 'Fortune smiles upon you!' });

            await this.showExplorationResult(interaction, gameState, embed, [
                {
                    label: '🔙 Return to Floor',
                    description: 'Continue with your newfound wealth',
                    value: 'return_to_floor'
                }
            ]);

            logger.info(`User ${gameState.session.userId} found treasure: ${treasure.description}`);

        } catch (error) {
            logger.error('Error handling found treasure:', error);
            throw error;
        }
    }

    /**
     * Handle exploration choice selections
     */
    static async handleExplorationChoice(interaction, gameState, selectedValue) {
        try {
            switch (selectedValue) {
                case 'return_to_floor':
                    await this.returnToFloor(interaction, gameState);
                    break;
                
                case 'open_mysterious_chest':
                    await this.openMysteriousChest(interaction, gameState);
                    break;
                
                case 'leave_chest':
                    await this.returnToFloor(interaction, gameState);
                    break;
                
                case 'fight_detected_monster':
                    await this.startMonsterBattle(interaction, gameState, 'detected');
                    break;
                
                case 'sneak_away':
                    await this.sneakAway(interaction, gameState);
                    break;
                
                case 'fight_ambush_monster':
                    await this.startMonsterBattle(interaction, gameState, 'ambush');
                    break;
                
                case 'flee_ambush':
                    await this.fleeFromAmbush(interaction, gameState);
                    break;
                
                case 'unlock_room':
                    await this.unlockRoom(interaction, gameState);
                    break;
                
                case 'enter_hidden_room':
                    await this.enterHiddenRoom(interaction, gameState);
                    break;
                
                default:
                    logger.warn(`Unknown exploration choice: ${selectedValue}`);
                    if (!interaction.replied && !interaction.deferred) {
                        await interaction.reply({
                            content: 'Unknown option selected. Please try again.',
                            flags: MessageFlags.Ephemeral
                        });
                    }
            }
        } catch (error) {
            logger.error('Error handling exploration choice:', error);
            throw error;
        }
    }

    /**
     * Wrapper method for CommandHandler compatibility
     */
    static async handleExplorationResult(interaction, selectedValue, gameState) {
        return await this.handleExplorationChoice(interaction, gameState, selectedValue);
    }

    /**
     * Show exploration result with options (uses editReply for consistency)
     */
    static async showExplorationResult(interaction, gameState, embed, options) {
        try {
            const selectOptions = options.map(option => {
                const builder = new StringSelectMenuOptionBuilder()
                    .setLabel(option.label)
                    .setDescription(option.description)
                    .setValue(option.value);
                
                if (option.disabled) {
                    builder.setLabel(option.label + ' (Disabled)');
                }
                
                return builder;
            }).filter(option => !options.find(o => o.value === option.data.value)?.disabled);

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('exploration_result')
                .setPlaceholder('Choose your action...')
                .setMaxValues(1)
                .setMinValues(1)
                .addOptions(selectOptions);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            // Use embed history system to preserve exploration results
            await embedHistory.updateWithHistory(interaction, {
                embeds: [embed],
                components: [row]
            }, gameState.session.userId);

        } catch (error) {
            logger.error('Error showing exploration result:', error);
            throw error;
        }
    }

    /**
     * Return to floor after exploration
     */
    static async returnToFloor(interaction, gameState) {
        try {
            const { FloorHandler } = await import('./FloorHandler.js');
            await FloorHandler.showFloor(interaction, gameState);
            
            logger.info(`User ${gameState.session.userId} returned to floor after exploration`);
            
        } catch (error) {
            logger.error('Error returning to floor:', error);
            throw error;
        }
    }

    /**
     * Select random monster based on floor and probabilities
     */
    static selectRandomMonster(floor) {
        // Filter monsters based on floor and probability rules from RULES.txt
        const availableMonsters = monstersData.filter(monster => {
            const monsterTier = monster.floorNumber;
            
            if (monsterTier >= 1 && monsterTier <= 5) {
                // High chance on low floors, decreases every 5 floors
                const floorGroup = Math.floor((floor - 1) / 5);
                const baseChance = 70 - (floorGroup * 10);
                return Math.random() * 100 < Math.max(baseChance, 10);
            } else if (monsterTier >= 6 && monsterTier <= 10) {
                // Medium chance always
                return Math.random() * 100 < 50;
            } else if (monsterTier >= 11 && monsterTier <= 20) {
                // Low chance on low floors, increases every 5 floors
                const floorGroup = Math.floor((floor - 1) / 5);
                const baseChance = 20 + (floorGroup * 10);
                return Math.random() * 100 < Math.min(baseChance, 80);
            }
            
            return false;
        });

        if (availableMonsters.length === 0) {
            // Fallback to first few monsters if none available
            return monstersData[Math.floor(Math.random() * Math.min(5, monstersData.length))];
        }

        return availableMonsters[Math.floor(Math.random() * availableMonsters.length)];
    }

    /**
     * Generate treasure based on floor level
     */
    static generateTreasure(floor) {
        const baseGold = Math.floor(Math.random() * (floor * 5));
        const scaledGold = calculateGoldScaling(baseGold, floor);
        const goldAmount = Math.floor(scaledGold * (0.8 + Math.random() * 0.4)); // ±20% variance
        
        const treasure = {
            gold: goldAmount,
            keys: 0,
            items: [],
            description: `💰 ${goldAmount} Gold`
        };

        // Chance for keys (higher floors = better chance)
        if (Math.random() < 0.3 + (floor * 0.02)) {
            const keyAmount = Math.floor(Math.random() * 3) + 1;
            treasure.keys = keyAmount;
            treasure.description += `\n🗝️ ${keyAmount} Key${keyAmount > 1 ? 's' : ''}`;
        }

        // Chance for items (higher floors = better chance and items)
        if (Math.random() < 0.2 + (floor * 0.03)) {
            // 60% chance for scaled potion, 40% for other items
            if (Math.random() < 0.6) {
                const potionType = getRandomPotionType(floor);
                const potion = generateScaledPotion(potionType, floor);
                treasure.items.push(potion);
                treasure.description += `\n${potion.emoji} ${potion.name}`;
            } else {
                const commonItems = ['scroll_of_healing', 'enchantment_scroll', 'repair_kit'];
                const item = commonItems[Math.floor(Math.random() * commonItems.length)];
                treasure.items.push(item);
                treasure.description += `\n📦 ${item.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}`;
            }
        }

        return treasure;
    }

    /**
     * Handle opening mysterious chest (50/50 reward or mimic)
     */
    static async openMysteriousChest(interaction, gameState) {
        try {
            const isMimic = Math.random() < 0.5;
            
            if (isMimic) {
                // It's a mimic! Start battle
                const mimic = monstersData.find(monster => monster.name.toLowerCase().includes('mimic')) || {
                    name: 'Mimic',
                    health: 10,
                    mana: 10,
                    armor: 1,
                    critChance: 20,
                    weapons: ['venomous_bite', 'tornado_spin'],
                    abilities: ['dodge', 'counter', 'silence', 'lucky_guy'],
                    spells: ['death_bolt'],
                    imageUrl: 'https://media.discordapp.net/attachments/1351696887165616169/1354339210370220042/image.png?ex=67e4ee2e&is=67e39cae&hm=97cb02a715f7793c551160f522a4999662531d2c10fd02e93152ff89be3978b8&=&format=webp&quality=lossless&width=808&height=581'
                };
                
                gameState.exploration.mimicBattle = mimic;
                await this.startMonsterBattle(interaction, gameState, 'mimic');
                
            } else {
                // It's a real treasure!
                const currentFloor = gameState.currentFloor || 1;
                const chestReward = this.generateChestReward(currentFloor);
                
                // Apply rewards
                if (chestReward.gold > 0) {
                    gameState.economy.gold = (gameState.economy.gold || 0) + chestReward.gold;
                }
                if (chestReward.keys > 0) {
                    gameState.player.inventory.keys = (gameState.player.inventory.keys || 0) + chestReward.keys;
                }
                
                const embed = new EmbedBuilder()
                    .setTitle('🎁 **MYSTERIOUS CHEST OPENED!** 🎁')
                    .setDescription(`The chest opens with a satisfying click, revealing its treasures!\n\n**You found:**\n${chestReward.description}\n\nLucky you - it wasn't a mimic after all!`)
                    .setColor(0xFFD700)
                    .setFooter({ text: 'Sometimes fortune favors the bold!' });

                await this.showExplorationResult(interaction, gameState, embed, [
                    {
                        label: '🔙 Return to Floor',
                        description: 'Continue with your newfound riches',
                        value: 'return_to_floor'
                    }
                ]);
            }

            logger.info(`User ${gameState.session.userId} opened mysterious chest: ${isMimic ? 'mimic' : 'treasure'}`);

        } catch (error) {
            logger.error('Error opening mysterious chest:', error);
            throw error;
        }
    }

    /**
     * Generate chest reward (better than regular treasure)
     */
    static generateChestReward(floor) {
        const baseGold = Math.floor(Math.random() * (floor * 10));
        const scaledGold = calculateGoldScaling(baseGold, floor);
        const goldAmount = Math.floor(scaledGold * (1.2 + Math.random() * 0.6)); // Better than regular treasure
        const keysAmount = Math.floor(Math.random() * 4) + 2; // 2-5 keys
        
        const reward = {
            gold: goldAmount,
            keys: keysAmount,
            description: `💰 ${goldAmount} Gold\n🗝️ ${keysAmount} Keys`
        };

        return reward;
    }

    /**
     * Start monster battle
     */
    static async startMonsterBattle(interaction, gameState, battleType) {
        try {
            let monster;
            
            if (battleType === 'detected') {
                monster = gameState.exploration.detectedMonster;
            } else if (battleType === 'ambush') {
                monster = gameState.exploration.ambushMonster;
            } else if (battleType === 'mimic') {
                monster = gameState.exploration.mimicBattle;
            }
            
            if (!monster) {
                throw new Error(`No monster data found for battle type: ${battleType}`);
            }
            
            // Update game phase to combat
            gameState.currentScreen = 'battle';
            gameState.battle.currentMonster = monster;
            gameState.battle.battleType = battleType;
            
            // Import and delegate to BattleHandler
            const { BattleHandler } = await import('./BattleHandler.js');
            await BattleHandler.startExploreBattle(interaction, gameState, monster, battleType);
            
            logger.info(`User ${gameState.session.userId} started ${battleType} battle with ${monster.name}`);
            
        } catch (error) {
            logger.error('Error starting monster battle:', error);
            await interaction.reply({
                content: '❌ An error occurred while starting battle. Please try again.',
                flags: MessageFlags.Ephemeral
            });
        }
    }

    /**
     * Handle sneaking away (no penalty)
     */
    static async sneakAway(interaction, gameState) {
        try {
            const embed = new EmbedBuilder()
                .setTitle('🥷 **SUCCESSFULLY SNUCK AWAY** 🥷')
                .setDescription('You carefully back away from the monster, keeping to the shadows. Your stealth pays off - the creature never notices you!\n\n**No penalties applied.** You live to fight another day.')
                .setImage('https://media.discordapp.net/attachments/1351696887165616169/1356409841010344106/image.png?ex=67edc81a&is=67ec769a&hm=c47efacf0028c1ef27b9b83f931df9673f7f153709d9b22350545903ac42b9a0&=&format=webp&quality=lossless&width=820&height=589')
                .setColor(0x32CD32)
                .setFooter({ text: 'Sometimes discretion is the better part of valor!' });

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('exploration_result')
                .setPlaceholder('Choose your action...')
                .setMaxValues(1)
                .setMinValues(1)
                .addOptions(
                    new StringSelectMenuOptionBuilder()
                        .setLabel('🔙 Return to Floor')
                        .setDescription('Continue exploring the floor')
                        .setValue('return_to_floor')
                );

            const row = new ActionRowBuilder().addComponents(selectMenu);

            // Use update since this is coming from a string select menu interaction
            await embedHistory.updateWithHistory(interaction, {
                embeds: [embed],
                components: [row]
            }, gameState.session.userId);

            logger.info(`User ${gameState.session.userId} successfully snuck away from detected monster`);

        } catch (error) {
            logger.error('Error handling sneak away:', error);
            throw error;
        }
    }

    /**
     * Handle fleeing from ambush (10% health and mana loss)
     */
    static async fleeFromAmbush(interaction, gameState) {
        try {
            // Get hero reference (check multiple possible locations)
            const hero = gameState.player?.hero || gameState.selectedHero;
            if (!hero) {
                throw new Error('No hero found in game state');
            }

            // Apply 10% health and mana loss to current stats
            const currentHealth = gameState.player.currentHealth || hero.health;
            const currentMana = gameState.player.currentMana || hero.mana;
            const maxHealth = hero.health;
            const maxMana = hero.mana;
            
            const healthLoss = Math.ceil(currentHealth * 0.1);
            const manaLoss = Math.ceil(currentMana * 0.1);
            
            // Update current health and mana
            gameState.player.currentHealth = Math.max(1, currentHealth - healthLoss);
            gameState.player.currentMana = Math.max(0, currentMana - manaLoss);

            const embed = new EmbedBuilder()
                .setTitle('🏃 **FLED FROM COMBAT** 🏃')
                .setDescription(`You manage to escape from the ambush, but not without cost!\n\n**Penalties Applied:**\n❤️ Health Lost: ${healthLoss}\n💙 Mana Lost: ${manaLoss}\n\n**Current Status:**\n❤️ Health: ${gameState.player.currentHealth}/${maxHealth}\n💙 Mana: ${gameState.player.currentMana}/${maxMana}`)
                .setImage('https://media.discordapp.net/attachments/1351696887165616169/1356488743422529656/image.png?ex=67ee1196&is=67ecc016&hm=2d2e0245a718c27037dd0ba623fbce2dcd47f90d9376cb6d812604d87f72bb7a&=&format=webp&quality=lossless&width=824&height=588')
                .setColor(0xFF6347)
                .setFooter({ text: 'Running away from ambushes comes with a price!' });

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('exploration_result')
                .setPlaceholder('Choose your action...')
                .setMaxValues(1)
                .setMinValues(1)
                .addOptions(
                    new StringSelectMenuOptionBuilder()
                        .setLabel('🔙 Return to Floor')
                        .setDescription('Continue exploring (wounded but alive)')
                        .setValue('return_to_floor')
                );

            const row = new ActionRowBuilder().addComponents(selectMenu);

            // Use update since this is coming from a string select menu interaction
            await embedHistory.updateWithHistory(interaction, {
                embeds: [embed],
                components: [row]
            }, gameState.session.userId);

            logger.info(`User ${gameState.session.userId} fled from ambush with ${healthLoss} health and ${manaLoss} mana loss`);

        } catch (error) {
            logger.error('Error handling flee from ambush:', error);
            throw error;
        }
    }

    /**
     * Handle unlocking room with keys
     */
    static async unlockRoom(interaction, gameState) {
        try {
            const roomData = gameState.exploration.hiddenRoom;
            const keysRequired = roomData.keysRequired;
            
            // Check if player has enough keys
            if ((gameState.player.inventory.keys || 0) < keysRequired) {
                await interaction.reply({
                    content: 'You do not have enough keys to unlock this door.',
                    flags: MessageFlags.Ephemeral
                });
                return;
            }

            // Deduct keys
            gameState.player.inventory.keys -= keysRequired;

            // Enter the room
            await this.enterRoom(interaction, gameState, true);

            logger.info(`User ${gameState.session.userId} unlocked room with ${keysRequired} keys`);

        } catch (error) {
            logger.error('Error unlocking room:', error);
            throw error;
        }
    }

    /**
     * Handle entering hidden room (free)
     */
    static async enterHiddenRoom(interaction, gameState) {
        try {
            await this.enterRoom(interaction, gameState, false);
            
            logger.info(`User ${gameState.session.userId} entered hidden room`);

        } catch (error) {
            logger.error('Error entering hidden room:', error);
            throw error;
        }
    }

    /**
     * Enter room and determine contents
     */
    static async enterRoom(interaction, gameState, wasLocked) {
        try {
            const currentFloor = gameState.currentFloor || 1;
            const roomContents = this.generateRoomContents(currentFloor, wasLocked);
            
            // Apply room contents to game state
            if (roomContents.gold > 0) {
                gameState.economy.gold = (gameState.economy.gold || 0) + roomContents.gold;
            }
            if (roomContents.keys > 0) {
                gameState.player.inventory.keys = (gameState.player.inventory.keys || 0) + roomContents.keys;
            }
            if (roomContents.items && roomContents.items.length > 0) {
                if (!gameState.player.inventory.items) gameState.player.inventory.items = [];
                gameState.player.inventory.items.push(...roomContents.items);
            }

            // Handle trap damage if any
            if (roomContents.trapDamage > 0) {
                const currentHealth = gameState.player.currentHealth || gameState.player.hero?.health || gameState.selectedHero?.health;
                gameState.player.currentHealth = Math.max(1, currentHealth - roomContents.trapDamage);
            }

            const embed = new EmbedBuilder()
                .setTitle(wasLocked ? '🔐 **LOCKED ROOM EXPLORED** 🔐' : '🕳️ **HIDDEN ROOM EXPLORED** 🕳️')
                .setDescription(`You carefully explore the chamber...\n\n${roomContents.description}${roomContents.trapDamage > 0 ? `\n\n⚠️ **You triggered a trap and lost ${roomContents.trapDamage} health!**` : ''}`)
                .setColor(wasLocked ? 0x8B4513 : 0x32CD32)
                .setFooter({ text: 'Room exploration complete!' });

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('exploration_result')
                .setPlaceholder('Choose your action...')
                .setMaxValues(1)
                .setMinValues(1)
                .addOptions(
                    new StringSelectMenuOptionBuilder()
                        .setLabel('🔙 Return to Floor')
                        .setDescription('Continue with your discoveries')
                        .setValue('return_to_floor')
                );

            const row = new ActionRowBuilder().addComponents(selectMenu);

            // Use update since this is coming from a string select menu interaction
            await embedHistory.updateWithHistory(interaction, {
                embeds: [embed],
                components: [row]
            }, gameState.session.userId);

            logger.info(`User ${gameState.session.userId} explored ${wasLocked ? 'locked' : 'hidden'} room`);

        } catch (error) {
            logger.error('Error entering room:', error);
            throw error;
        }
    }

    /**
     * Generate room contents based on floor and lock status
     */
    static generateRoomContents(floor, wasLocked) {
        const multiplier = wasLocked ? 2 : 1.2; // Locked rooms have better rewards
        const baseGold = Math.floor(Math.random() * (floor * 8));
        const scaledGold = calculateGoldScaling(baseGold, floor);
        const goldAmount = Math.floor(scaledGold * multiplier);
        
        const contents = {
            gold: goldAmount,
            keys: 0,
            items: [],
            trapDamage: 0,
            description: `💰 Found ${goldAmount} gold scattered about the room!`
        };

        // Chance for keys
        if (Math.random() < 0.4 + (floor * 0.03)) {
            const keyAmount = Math.floor(Math.random() * 4) + 1;
            contents.keys = keyAmount;
            contents.description += `\n🗝️ Discovered ${keyAmount} key${keyAmount > 1 ? 's' : ''} hidden in a secret compartment!`;
        }

        // Chance for items
        if (Math.random() < 0.3 + (floor * 0.04)) {
            // 70% chance for scaled potion, 30% for other items
            if (Math.random() < 0.7) {
                const potionType = getRandomPotionType(floor);
                const potion = generateScaledPotion(potionType, floor);
                contents.items.push(potion);
                contents.description += `\n${potion.emoji} Found a ${potion.name}!`;
            } else {
                const items = ['scroll_of_healing', 'enchantment_scroll', 'repair_kit', 'lockpick'];
                const item = items[Math.floor(Math.random() * items.length)];
                contents.items.push(item);
                contents.description += `\n📦 Found a ${item.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}!`;
            }
        }

        // Chance for trap (higher floors = more damage)
        if (Math.random() < 0.15 + (floor * 0.02)) {
            contents.trapDamage = Math.floor(Math.random() * 3) + floor;
            contents.description += `\n💥 But you triggered a trap!`;
        }

        return contents;
    }
} 
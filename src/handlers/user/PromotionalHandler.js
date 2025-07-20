import { logger } from '../../utils/logger.js';
import { auditLogger } from '../../utils/auditLogger.js';
import { weaponsData } from '../../data/weaponsData.js';

/**
 * PromotionalHandler - Manages promotional weapon grants for dev admin
 * Simplified system for dev admin auto-grant only
 */
export class PromotionalHandler {
    
    // Dev admin auto-grant for new promotional weapons
    static DEV_ADMIN_ID = '292854498299346945';
    
    /**
     * Check and grant promotional weapons to dev admin only (for testing new weapons)
     */
    static async checkAndGrantPromotionalWeapons(interaction, gameState, source = 'login') {
        try {
            const isDevAdmin = interaction.user.id === this.DEV_ADMIN_ID;
            
            if (!isDevAdmin) {
                return { granted: false, reason: 'not_dev_admin' };
            }
            
            // Find all promotional weapons
            const promotionalWeapons = weaponsData.filter(w => w.isPromotional);
            const grantedWeapons = [];
            
            logger.info(`[PROMOTIONAL] Dev admin check - found ${promotionalWeapons.length} promotional weapons`);
            
            // Initialize Profile Chest if needed
            if (!gameState.player.profileChest) {
                gameState.player.profileChest = { weapons: [], armor: [], consumables: [], scrolls: [], shards: [], enhancers: [] };
            }
            if (!gameState.player.profileChest.weapons) {
                gameState.player.profileChest.weapons = [];
            }
            
            // Grant any promotional weapons not already in Profile Chest
            for (const weapon of promotionalWeapons) {
                const hasWeaponInProfileChest = gameState.player.profileChest.weapons.some(w => w.id === weapon.id);
                
                if (!hasWeaponInProfileChest) {
                    const promotionalWeapon = {
                        id: weapon.id,
                        name: weapon.name,
                        type: weapon.type,
                        weaponType: weapon.weaponType,
                        rarity: weapon.rarity,
                        damage: weapon.damage,
                        effects: weapon.effects || [],
                        description: weapon.description,
                        emoji: weapon.emoji,
                        isPromotional: true,
                        grantedOn: new Date().toISOString(),
                        grantedRole: 'Dev Admin Auto-Grant'
                    };
                    
                    gameState.player.profileChest.weapons.push(promotionalWeapon);
                    
                    grantedWeapons.push({
                        name: weapon.name,
                        role: 'Dev Admin',
                        emoji: weapon.emoji
                    });
                    
                    logger.info(`[PROMOTIONAL] ✅ Granted ${weapon.name} to dev admin ${interaction.user.username}`);
                }
            }
            
            // Save to database if any weapons were granted
            if (grantedWeapons.length > 0) {
                try {
                    const { DatabaseManager } = await import('../../database/DatabaseManager.js');
                    const currentPlayerData = await DatabaseManager.getPlayer(interaction.user.id);
                    const updateData = {
                        ...currentPlayerData,
                        profileChest: gameState.player.profileChest,
                        inventory: gameState.player.inventory
                    };
                    await DatabaseManager.savePlayer(interaction.user.id, updateData);
                    logger.info(`[PROMOTIONAL] ✅ Saved ${grantedWeapons.length} promotional weapons to database`);
                } catch (saveError) {
                    logger.error(`[PROMOTIONAL] ❌ Failed to save promotional weapons:`, saveError);
                }
            }
            
            return {
                granted: grantedWeapons.length > 0,
                weapons: grantedWeapons,
                goldPouch: false,
                roles: ['Dev Admin'],
                reason: 'success'
            };
            
        } catch (error) {
            logger.error('Error checking promotional weapons:', error);
            return { granted: false, reason: 'error', error: error.message };
        }
    }
    
    /**
     * Manual asset transfer for beta testers (admin function)
     * Use this to manually grant promotional weapons to specific users
     */
    static async manualAssetTransfer(interaction, targetUserId, weaponId, quantity = 1) {
        try {
            const isAdmin = interaction.user.id === this.DEV_ADMIN_ID;
            if (!isAdmin) {
                await interaction.reply({
                    content: '❌ This is an admin-only function.',
                    ephemeral: true
                });
                return;
            }

            const { ItemDataManager } = await import('../../utils/ItemDataManager.js');
            
            // Add weapon to target user's Profile Chest
            await ItemDataManager.addItemToPlayer(targetUserId, weaponId, quantity);
            
            // Get weapon name for confirmation
            const weapon = weaponsData.find(w => w.id === weaponId);
            const weaponName = weapon?.name || weaponId;
            
            await interaction.reply({
                content: `✅ **Asset Transfer Complete**\n\n**Sent:** ${quantity}x ${weaponName}\n**To User:** <@${targetUserId}>\n**Location:** Profile Chest\n\n*One-time promotional grant completed.*`,
                ephemeral: true
            });

            // Audit log
            await auditLogger.log({
                category: 'MANUAL_ASSET_TRANSFER',
                message: `Manual promotional weapon transfer by ${interaction.user.username}`,
                eventType: 'manual_promotional_grant',
                data: {
                    adminId: interaction.user.id,
                    targetUserId,
                    weaponId,
                    weaponName,
                    quantity,
                    timestamp: new Date().toISOString()
                }
            });

        } catch (error) {
            logger.error('Error in manual asset transfer:', error);
            await interaction.reply({
                content: `❌ Transfer failed: ${error.message}`,
                ephemeral: true
            });
        }
    }

    /**
     * Show promotional notification to user (simplified)
     */
    static async showPromotionalNotification(interaction, grantResult) {
        try {
            if (!grantResult.granted || grantResult.weapons.length === 0) return;
            
            let description = `🎉 **DEV ADMIN PROMOTIONAL WEAPONS** 🎉\n\n`;
            description += `**New promotional weapons added to Profile Chest:**\n\n`;
            
            grantResult.weapons.forEach(weapon => {
                description += `${weapon.emoji} **${weapon.name}** (Promotional)\n`;
            });
            
            description += `\n**Note:** These are dev admin test weapons for promotional system testing.`;
            
            await interaction.followUp({
                content: '',
                embeds: [{
                    title: '🏆 **DEV ADMIN PROMOTIONAL GRANT** 🏆',
                    description,
                    color: 0xFFD700,
                    footer: { text: 'Dev Admin System • Promotional Weapons' },
                    timestamp: new Date().toISOString()
                }],
                ephemeral: true
            });
            
        } catch (error) {
            logger.error('Error showing promotional notification:', error);
        }
    }

    // Keep existing manual functions for admin testing
    static async manualPromotionalCheck(interaction) {
        try {
            const isAdmin = interaction.user.id === this.DEV_ADMIN_ID;
            if (!isAdmin) {
                await interaction.reply({
                    content: '❌ This is an admin-only function.',
                    ephemeral: true
                });
                return;
            }

            const { StateService } = await import('../../utils/StateService.js');
            const gameState = StateService.getState(interaction.user.id) || { player: { profileChest: { weapons: [] } } };
            
            if (!gameState) {
                await interaction.reply({
                    content: '❌ Could not load game state.',
                    ephemeral: true
                });
                return;
            }

            const result = await this.checkAndGrantPromotionalWeapons(interaction, gameState, 'manual_check');
            
            if (result.granted) {
                await this.showPromotionalNotification(interaction, result);
                await StateService.saveGameState(interaction.user.id, gameState);
                
                await interaction.reply({
                    content: `✅ **Dev Admin Promotional Check**\n\nGranted: ${result.weapons.length} weapons\nAll promotional weapons now in Profile Chest.`,
                    ephemeral: true
                });
            } else {
                await interaction.reply({
                    content: `ℹ️ **Dev Admin Promotional Check**\n\nNo new promotional weapons to grant.\nAll existing promotional weapons already in Profile Chest.`,
                    ephemeral: true
                });
            }

        } catch (error) {
            logger.error('Error in manual promotional check:', error);
            await interaction.reply({
                content: '❌ Error during promotional check. Check logs for details.',
                ephemeral: true
            });
        }
    }

    static async clearPromotionalWeapons(interaction) {
        try {
            const isAdmin = interaction.user.id === this.DEV_ADMIN_ID;
            if (!isAdmin) {
                await interaction.reply({
                    content: '❌ This is an admin-only function.',
                    ephemeral: true
                });
                return;
            }

            const { StateService } = await import('../../utils/StateService.js');
            const gameState = StateService.getState(interaction.user.id) || { player: { profileChest: { weapons: [] } } };
            
            if (!gameState || !gameState.player.profileChest) {
                await interaction.reply({
                    content: '❌ No profile chest found.',
                    ephemeral: true
                });
                return;
            }

            const originalCount = gameState.player.profileChest.weapons?.length || 0;
            gameState.player.profileChest.weapons = gameState.player.profileChest.weapons?.filter(w => !w.isPromotional) || [];
            const newCount = gameState.player.profileChest.weapons.length;
            const removedCount = originalCount - newCount;

            await StateService.saveGameState(interaction.user.id, gameState);

            await interaction.reply({
                content: `✅ **Promotional weapons cleared**\n\nRemoved: ${removedCount} promotional weapons\nRemaining weapons: ${newCount}`,
                ephemeral: true
            });

        } catch (error) {
            logger.error('Error clearing promotional weapons:', error);
            await interaction.reply({
                content: '❌ Error clearing promotional weapons. Check logs for details.',
                ephemeral: true
            });
        }
    }

    /**
     * Grant promotional weapon directly to user's Profile Chest (admin command)
     */
    static async grantPromotionalWeapon(userId, weaponId, grantedBy) {
        try {
            // Import required modules
            const { DatabaseManager } = await import('../../database/DatabaseManager.js');
            const { StateService } = await import('../../utils/StateService.js');
            
            // Get player data
            const playerData = await DatabaseManager.getPlayer(userId);
            if (!playerData) {
                return { success: false, error: 'Player profile not found' };
            }

            // Find the promotional weapon
            const weapon = weaponsData.find(w => w.id === weaponId && w.isPromotional);
            if (!weapon) {
                return { success: false, error: 'Promotional weapon not found' };
            }

            // Initialize Profile Chest if needed
            if (!playerData.profileChest) {
                playerData.profileChest = { weapons: [], armor: [], consumables: [], scrolls: [], shards: [], enhancers: [] };
            }
            if (!playerData.profileChest.weapons) {
                playerData.profileChest.weapons = [];
            }

            // Check if weapon already exists in Profile Chest
            const hasWeapon = playerData.profileChest.weapons.some(w => w.id === weaponId);
            if (hasWeapon) {
                return { success: false, error: 'User already has this promotional weapon' };
            }

            // Create promotional weapon object
            const promotionalWeapon = {
                id: weapon.id,
                name: weapon.name,
                type: weapon.type,
                weaponType: weapon.weaponType,
                rarity: weapon.rarity,
                damage: weapon.damage,
                effects: weapon.effects || [],
                description: weapon.description,
                emoji: weapon.emoji,
                isPromotional: true,
                grantedOn: new Date().toISOString(),
                grantedBy: grantedBy,
                grantType: 'Manual Admin Grant'
            };

            // Add to Profile Chest
            playerData.profileChest.weapons.push(promotionalWeapon);

            // Save to database
            await DatabaseManager.savePlayer(userId, playerData);

            // Also update StateService if user is online
            try {
                const gameState = StateService.getState(userId);
                if (gameState && gameState.player) {
                    if (!gameState.player.profileChest) {
                        gameState.player.profileChest = { weapons: [], armor: [], consumables: [], scrolls: [], shards: [], enhancers: [] };
                    }
                    if (!gameState.player.profileChest.weapons) {
                        gameState.player.profileChest.weapons = [];
                    }
                    gameState.player.profileChest.weapons.push(promotionalWeapon);
                    StateService.setState(userId, gameState);
                }
            } catch (stateError) {
                // State update failure is not critical - weapon is already saved to database
                logger.warn(`Failed to update state for user ${userId}:`, stateError);
            }

            logger.info(`[PROMOTIONAL] ✅ Admin granted ${weapon.name} to user ${userId} by ${grantedBy}`);

            return { 
                success: true, 
                weaponName: weapon.name,
                weaponEmoji: weapon.emoji
            };

        } catch (error) {
            logger.error('Error granting promotional weapon:', error);
            return { success: false, error: error.message };
        }
    }
} 
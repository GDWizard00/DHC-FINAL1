import * as profileCommand from './profile.js';
import * as adminCommand from './admin.js';
import * as setupCommand from './setuphero.js';
import * as createQuestCommand from './create-quest.js';
import * as manageQuestCommand from './manage-quest.js';
import * as questCommand from './quest.js';
import * as questRewardsCommand from './quest-rewards.js';
import * as masterCommand from './master.js';
import * as resetMasterCommand from './reset-master.js';
import * as embedCommand from './embed.js';
import * as chsaveCommand from './chsave.js';
import * as chloadCommand from './chload.js';
import * as dmCommand from './dm.js';

// Command Cleanup Phase 1: Removed auth, start-dh, marketplace, ch commands as requested
// Keeping setuphero, embed, profile, chsave, chload visible to all
// Quest system and utility commands will be Bot Dev restricted

export const slashCommands = [
    profileCommand, 
    adminCommand, 
    setupCommand, 
    createQuestCommand, 
    manageQuestCommand, 
    questCommand, 
    questRewardsCommand, 
    masterCommand, 
    resetMasterCommand, 
    embedCommand, 
    chsaveCommand, 
    chloadCommand, 
    dmCommand
]; 
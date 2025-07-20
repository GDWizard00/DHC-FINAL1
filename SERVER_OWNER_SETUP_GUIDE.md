# 🎮 Server Owner Setup Guide - Dungeonites Heroes Challenge

## **📋 IMPORTANT: Setup Process Steps**

### **For Bot Developer (gdwizard) Master Setup:**
1. **Restart the bot** 
2. **Use `!ch` to initialize bot state** 
3. **Use `/master`** 
4. **Check DMs for setup message**
5. **Click "Begin Secure Setup"**

*Note: If you don't use `!ch` before `/master`, the DM will show "no active games running"*

### **For Server Owners (New Bot Installation):**
1. **Add bot to your Discord server**
2. **Use `/setup admin`** (only available to server owners initially)
3. **Follow the secure setup process**
4. **Complete server configuration**

---

## **🚀 New Server Owner Onboarding Process**

### **Step 1: Initial Bot Installation**
When you add Dungeonites Heroes Challenge to your server:
- Only `/setup admin` and `/setup help` are available initially
- All other commands are restricted until setup is complete
- This ensures security and proper configuration

### **Step 2: Admin Profile Creation** 
Run `/setup admin` to begin:

**🔐 Security Profile Requirements:**
- **Password**: 12+ characters, strong and unique
- **X (Twitter) Account**: Your username for recovery
- **EVM Wallet**: Ethereum-compatible wallet address (0x...)
- **Email Address**: Valid email for recovery

**⚠️ CRITICAL SECURITY NOTES:**
- **2 of 3 recovery methods required** for password resets
- **Take note of your password** - there is no "easy" reset
- **Verify all information is correct** before submitting
- All data is encrypted and stored securely

### **Step 3: Server Configuration Options**

After creating your security profile, choose setup type:

#### **🚀 Quick Start (Recommended)**
- Creates recommended channel structure automatically
- Sets up game embeds in appropriate channels  
- Default permissions and settings
- Ready to play immediately
- **Best for:** First-time users, standard server setups

#### **⚙️ Custom Setup (Advanced)**
- Choose specific channels for different functions
- Configure custom permissions and roles
- Select which features to enable
- Advanced configuration options
- **Best for:** Experienced users, specific requirements

### **Step 4: Channel Configuration**

**Recommended Channel Structure:**
```
📁 Dungeonites Heroes Challenge
├── 🎮 game-hall (Permanent Game Embed)
├── 🏪 marketplace (Permanent Marketplace Embed)  
├── 🎰 casino (Permanent Casino Embed)
├── 🛠️ admin-control (Admin Only)
└── 📢 announcements (Bot updates)
```

---

## **🔒 Security & Recovery System**

### **Password Requirements**
- **Minimum 12 characters**
- **Strong password recommended** (mix of letters, numbers, symbols)
- **Required for:**
  - Daily login (once per day)
  - Asset transfers
  - Marketplace transactions
  - Admin functions

### **Recovery Methods**
Your security profile includes three recovery options:

1. **🐦 X (Twitter) Account**
   - Username without @ symbol
   - Used for identity verification
   - API calls for password resets

2. **💎 EVM Wallet**
   - Ethereum-compatible wallet address
   - Used for cryptographic verification
   - Must be valid 0x... format

3. **📧 Email Address**
   - Standard email verification
   - Backup communication method
   - Password reset notifications

**🔄 Password Reset Process:**
- Requires verification through **2 of 3** recovery methods
- X account verification via API
- Wallet signature verification
- Email verification codes

### **Emergency Recovery Options**

#### **"I Forgot My Password"**
- Self-service recovery using 2 recovery methods
- Guided verification process
- Immediate password reset

#### **"Emergency Recovery"** 
- Direct assistance from Bot Developer (gdwizard)
- Provide detailed problem description
- Include urgency level (Low/Medium/High/Critical)
- Response time varies based on urgency
- Use only when other methods fail

---

## **⚡ Quick Reference Commands**

### **Setup Commands (Server Owner Only)**
- `/setup admin` - Begin admin profile creation
- `/setup help` - Get setup assistance
- `/setup status` - Check server setup progress

### **After Setup Completion**
- `/admin` - Access admin control panel
- `/profile create` - Create player profiles  
- `/marketplace` - Access marketplace
- `!ch` - Start game sessions

### **Emergency Commands**
- Emergency help during setup → Contact gdwizard directly
- Lost password → Use recovery options in setup
- Server issues → Contact support via emergency system

---

## **🎯 Post-Setup Features**

### **Admin Control Panel**
- User management and permissions
- Quest creation and management
- Economy settings and monitoring
- Server configuration
- Marketplace moderation

### **Security Tier System**
1. **🔴 Bot Developer** - Ultimate override across all servers
2. **🟠 Server Owner** - Full server control and configuration
3. **🟡 Server Administrators** - User management and quests
4. **🟢 Certified Members** - Quest creation privileges
5. **⚪ Regular Users** - Game participation and marketplace

### **Available Game Features**
- **RPG Gameplay** - Turn-based combat and exploration
- **Quest System** - Daily, weekly, and custom quests
- **Marketplace** - Trading, buying, selling items
- **Casino Games** - Coin flips and gambling
- **Web3 Integration** - NFT minting and crypto rewards
- **Cross-Server Play** - Multi-server economy

---

## **🆘 Troubleshooting**

### **Common Issues**

**"No active games running" in DM:**
- Use `!ch` before running `/master` or `/setup admin`
- This initializes the bot state properly

**Setup button not working:**
- Restart the bot
- Try the command again
- Check console for error messages

**Invalid wallet address:**
- Must be valid Ethereum format (0x... 42 characters)
- Use MetaMask or other EVM wallet address
- Double-check for typos

### **Getting Help**

1. **Setup Help**: Use `/setup help` command
2. **Emergency During Setup**: Use emergency help button
3. **Post-Setup Issues**: Contact admin or use support channels
4. **Critical Issues**: Emergency recovery system contacts gdwizard

### **Response Times**
- **Self-Service**: Immediate (recovery systems)
- **Low Priority**: 24-48 hours
- **Medium Priority**: 12-24 hours  
- **High Priority**: 4-12 hours
- **Critical**: 1-4 hours (or immediate if available)

---

## **✅ Setup Completion Checklist**

- [ ] Bot added to Discord server
- [ ] Server owner ran `/setup admin`
- [ ] Security profile created with all required information
- [ ] Password saved securely
- [ ] Recovery methods verified as correct
- [ ] Setup type chosen (Quick Start or Custom)
- [ ] Channel configuration completed
- [ ] Admin control panel accessible via `/admin`
- [ ] First player profiles can be created
- [ ] Game functionality tested with `!ch`

**🎉 Congratulations! Your server is now ready for Dungeonites Heroes Challenge!**

---

*For additional support or questions, contact the Bot Developer through the emergency help system or directly via Discord.* 
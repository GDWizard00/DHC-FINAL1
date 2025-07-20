# 🎮 Dungeonites Heroes Challenge - Commands Reference

## **Bot Developer Commands (gdwizard only)**
| Command | Description | Access Level |
|---------|-------------|--------------|
| `/master` | Master control panel with ultimate override capabilities | Bot Developer Only |

## **Server Administration Commands**
| Command | Description | Access Level |
|---------|-------------|--------------|
| `/admin` | Access admin control panel for server management | Server Admins |
| `/setup admin` | Create initial admin profile for server owner | Server Owner |
| `/setup certified-role` | Configure certified member roles and permissions | Server Admins |
| `/setup view-config` | View current server configuration | Server Admins |
| `/setup reset-password` | Reset admin password (emergency use) | Server Owner |

## **Quest Management Commands**
| Command | Description | Access Level |
|---------|-------------|--------------|
| `/create-quest` | Create new quests for your server | Admin/Certified |
| `/manage-quest` | Manage existing server quests | Admin/Certified |
| `/quest` | Participate in available server quests | All Users |
| `/quest-rewards` | Manage quest rewards and crypto/NFT distributions | Admin Only |

## **Player Commands**
| Command | Description | Access Level |
|---------|-------------|--------------|
| `/profile create` | Create a new player profile | All Users |
| `/profile update` | Update existing profile information | Profile Owner |
| `/profile view` | View profile information | Profile Owner |
| `/marketplace` | Access the Dungeonites Marketplace | All Users |

## **Text Commands**
| Command | Description | Access Level |
|---------|-------------|--------------|
| `!ch` | Start/continue game session | All Users |

---

## **Command Categories by User Type**

### **🔰 New Server Owner (First Time Setup)**
**Available Commands:**
- `/setup admin` - Create your admin profile
- `/help` - Get help with bot setup

**Restricted:** All other commands until admin profile is created

### **👑 Server Administrators**
**Full Access To:**
- All setup commands
- Quest management
- Admin control panel
- User management
- Server configuration

### **🎯 Certified Members**
**Access To:**
- Quest creation and management
- Player commands
- Marketplace access

### **🎮 Regular Players**
**Access To:**
- Profile management
- Game commands (`!ch`)
- Quest participation
- Marketplace access

---

## **Security Levels**

### **🔴 Bot Developer (gdwizard)**
- Master override across all servers
- Emergency community assistance
- Cross-server administrative access
- Ultimate control permissions

### **🟠 Server Owner**
- Full server administrative control
- User management within server
- Quest and economy settings
- Bot configuration for their server

### **🟡 Server Administrators**
- User management
- Quest management
- Marketplace moderation
- Basic server settings

### **🟢 Certified Members**
- Quest creation
- Limited administrative functions
- Enhanced marketplace privileges

### **⚪ Regular Users**
- Game participation
- Profile management
- Marketplace access
- Quest participation

---

## **Planned Improvements**

### **Enhanced Server Owner Onboarding**
- Simplified initial setup flow
- Comprehensive security profile creation
- Quick start vs. Custom setup options
- Channel configuration wizard

### **Unified Security System**
All profiles will require:
- Discord account
- Secure password
- X (Twitter) account for recovery
- EVM wallet for recovery
- Email address
- 2-factor recovery verification

### **Emergency Recovery**
- "Forgot Password" self-service
- Emergency assistance requests to Bot Developer
- Multi-factor authentication for sensitive operations 
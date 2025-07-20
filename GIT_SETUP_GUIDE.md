# Git Setup Guide for DHC FINAL Project

## Problem: Git is Not Installed

Your system doesn't have Git installed, which is why you're getting the error:
```
git : The term 'git' is not recognized as the name of a cmdlet
```

## Solution: Install and Setup Git

### Step 1: Download and Install Git for Windows

1. **Download Git for Windows:**
   - Go to https://git-scm.com/download/win
   - Download the latest version (64-bit recommended)
   - File will be named something like `Git-2.43.0-64-bit.exe`

2. **Install Git:**
   - Run the downloaded installer
   - **Important Installation Options:**
     - ✅ **Use Git from the Windows Command Prompt** (this adds Git to PATH)
     - ✅ **Use OpenSSL library**
     - ✅ **Checkout Windows-style, commit Unix-style line endings**
     - ✅ **Use Windows default console window**
   - Click "Next" through other options (defaults are fine)
   - Complete the installation

3. **Verify Installation:**
   - Close your current PowerShell window
   - Open a new PowerShell window
   - Run: `git --version`
   - You should see something like: `git version 2.43.0.windows.1`

### Step 2: Configure Git (First Time Setup)

```powershell
# Set your global Git configuration
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# Set default branch name to 'main'
git config --global init.defaultBranch main

# Optional: Set default editor (VS Code if you have it)
git config --global core.editor "code --wait"
```

### Step 3: Connect to Your GitHub Repository

```powershell
# Navigate to your project directory
cd "C:\Users\glori\Desktop\DHC FINAL"

# Initialize Git repository
git init

# Add all files to staging area
git add .

# Create initial commit
git commit -m "🎮 Comprehensive bot fixes: Input validation, embed history, battle system overhaul, RPG shop"

# Add your GitHub repository as remote origin
git remote add origin https://github.com/GDWizard00/DHC-FINAL1.git

# Set default branch to main
git branch -M main

# Push to GitHub
git push -u origin main
```

### Step 4: Authentication Setup

You'll need to authenticate with GitHub. You have two options:

#### Option A: Personal Access Token (Recommended)

1. **Create a Personal Access Token:**
   - Go to GitHub.com → Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Click "Generate new token (classic)"
   - Select scopes: `repo` (full control of private repositories)
   - Copy the token (you won't see it again!)

2. **Use token when prompted:**
   - When you run `git push`, it will ask for username and password
   - Username: Your GitHub username
   - Password: Use the Personal Access Token (not your GitHub password)

#### Option B: SSH Key Setup (Advanced)

```powershell
# Generate SSH key
ssh-keygen -t ed25519 -C "your.email@example.com"

# Add SSH key to SSH agent
ssh-add ~/.ssh/id_ed25519

# Copy public key to clipboard
cat ~/.ssh/id_ed25519.pub | clip

# Add the key to GitHub:
# Go to GitHub.com → Settings → SSH and GPG keys → New SSH key
# Paste the key and save

# Test SSH connection
ssh -T git@github.com

# Use SSH remote URL instead
git remote set-url origin git@github.com:GDWizard00/DHC-FINAL1.git
```

### Step 5: Complete the Push

After setting up authentication:

```powershell
# Push your code to GitHub
git push -u origin main
```

### Troubleshooting Common Issues

#### 1. "Repository not found" error
- Make sure the repository exists on GitHub
- Check the repository URL is correct
- Verify you have access to the repository

#### 2. "Authentication failed" error
- Use Personal Access Token instead of password
- Make sure the token has correct permissions

#### 3. "Permission denied" error
- Check your GitHub username and token
- Make sure you're the owner or collaborator of the repository

#### 4. Files not being added
```powershell
# Check what files Git sees
git status

# Force add ignored files if needed
git add . --force

# Check .gitignore file for conflicts
type .gitignore
```

### Step 6: Verify Success

After successful push, you should see your files on GitHub:
- Go to https://github.com/GDWizard00/DHC-FINAL1
- You should see all your project files
- The commit message should appear in the repository

### Future Git Commands

```powershell
# Check status
git status

# Add changes
git add .

# Commit changes
git commit -m "Your commit message"

# Push changes
git push

# Pull latest changes
git pull

# Create new branch
git checkout -b new-feature

# Switch branches
git checkout main
```

## Alternative: GitHub Desktop (GUI Option)

If you prefer a graphical interface:

1. Download GitHub Desktop from https://desktop.github.com/
2. Install and sign in with your GitHub account
3. Click "Add an Existing Repository from your Hard Drive"
4. Select your project folder
5. GitHub Desktop will handle Git commands for you

## Quick Fix Commands

Once Git is installed, run these commands in order:

```powershell
cd "C:\Users\glori\Desktop\DHC FINAL"
git init
git add .
git commit -m "🎮 Comprehensive bot fixes: Input validation, embed history, battle system overhaul, RPG shop"
git remote add origin https://github.com/GDWizard00/DHC-FINAL1.git
git branch -M main
git push -u origin main
```

---

**Note:** After installing Git, you may need to restart your PowerShell or Command Prompt for the `git` command to be recognized. 
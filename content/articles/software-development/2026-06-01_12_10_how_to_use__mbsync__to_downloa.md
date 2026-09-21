---
Title: "how to use \"mbsync\" to download all gmail emails"
Date: "2026-06-01_12_10"
Tags:
  - Software Development
Category: "Software Development"
Source_Products:
  - AI_Mode
  - Search
---
Using Mbsync to Download Gmail Emails and Manage Your Inbox
===========================================================

To download all your Gmail emails using mbsync from the isync package, you need to set up a Gmail App Password, create a configuration file, and run the sync command. This article will guide you through the step-by-step process.

### Step 1: Enable IMAP and Get an App Password

First, ensure 2-Step Verification is enabled in your Google Account Management. Then, go to Security > 2-Step Verification > App passwords and create a new App Password (e.g., named mbsync). Copy the 16-character password provided.

### Step 2: Create the Mbsync Configuration

Create a file at `~/.mbsyncrc` and configure your Gmail account and local directory:
```markdown
IMAPAccount gmail
Host imap.gmail.com
User your_email@gmail.com
Pass "your_16_digit_app_password"
TLSType IMAPS
CertificateFile /etc/ssl/certs/ca-certificates.crt

IMAPStore gmail-remote
Account gmail

MaildirStore gmail-local
Path ~/Documents/Mail/Gmail/
Inbox ~/Documents/Mail/Gmail/Inbox
SubFolders Verbatim

Channel gmail-channel
Far :gmail-remote:
Near :gmail-local:
Patterns *
Create Near
Expunge None
Sync All
```
Note: Make sure to wrap your App Password in double quotes and use `TLSType` instead of `SSLType`, as the latter is deprecated.

### Step 3: Create the Local Mail Directory

Before syncing, ensure the directory specified in your config exists by running:
```bash
mkdir -p ~/Documents/Mail/Gmail/Inbox
```
### Step 4: Download Your Emails

Open your terminal and run mbsync to sync your remote account with your local system:
```bash
mbsync -a
```
This will fetch all messages. If you have a large inbox, this can take a while and require several gigabytes of storage.

Expert Tips for a Full Backup
-----------------------------

* To grab all folders, including All Mail, use `Patterns *` in your channel configuration.
* To prevent local deletions from wiping emails from Google's servers, set `Expunge None` and `Remove None` in your channel configuration.
* For better security, consider using the `PassCmd` directive with your OS keyring or a GPG-encrypted file instead of storing your password in plaintext.

Troubleshooting
---------------

If you encounter errors or warnings, such as `SSLType is deprecated` or `excess token`, refer to the [updated configuration](#updated-configuration) section below.

### Updated Configuration

To fix errors and warnings, update your `~/.mbsyncrc` file:
```markdown
IMAPAccount gmail
Host imap.gmail.com
User your_email@gmail.com
Pass "your 16 digit app password"
TLSType IMAPS
CertificateFile /etc/ssl/certs/ca-certificates.crt
```
Mass-Deleting Unwanted Emails
------------------------------

To mass-delete emails via the terminal using a blocklist, you can use `mu` (Mail Indexer) or native command-line utilities like `find` and `grep` directly on your local Maildir folders.

### Step 1: Create Your Blocklist File

Create a plain text file containing the email addresses or domains you want to delete, with one entry per line:
```markdown
example@example.com
another@example.com
spammer@example.com
newsletter@badsite.com
@annoying-domain.org
```
### Step 2: Mass-Delete Using Terminal Commands

#### Option A: Using Native `grep` and `find`

Run this loop in your terminal:
```bash
while read -r target; do
    if [ -n "$target" ]; then
        echo "Deleting emails from: $target"
        find ~/Documents/Mail/Gmail/ -type f -exec grep -lMi "From:.*$target" {} + | xargs rm -f
    fi
done < blocklist.txt
```
#### Option B: Using `mu`

Install and index:
```bash
sudo apt install maildir-utils  # Or brew install mu on Mac
mu init -m ~/Documents/Mail/Gmail/
mu index
```
Run the blocklist script:
```bash
while read -r target; do
    if [ -n "$target" ]; then
        echo "Removing $target via mu..."
        mu find from:"$target" --fields "l" | xargs rm -f
    fi
done < blocklist.txt
```
### Step 3: Re-Sync and Propagate Deletions to Gmail

Before running mbsync, ensure your `~/.mbsyncrc` file is configured to allow deletions to sync back to Google's servers:
```markdown
Expunge Near
Sync PullPush
```
Run the sync:
```bash
mbsync -V gmail-channel
```
This will permanently delete the messages from Gmail. The `-V` flag provides verbose output so you can actively watch it delete the messages from Gmail.

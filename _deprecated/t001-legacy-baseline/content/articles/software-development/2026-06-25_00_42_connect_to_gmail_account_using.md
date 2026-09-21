---
Title: "connect to gmail account using imap"
Date: "2026-06-25_00_42"
Tags:
  - Software Development
Category: "Software Development"
Source_Products:
  - AI_Mode
  - Search
---
Connecting to Gmail via IMAP
============================
To connect to your Gmail account using IMAP, you will need to configure your email client with the following settings. For security purposes, Google requires using OAuth or an App Password rather than your standard account password.

### IMAP Server Settings
The incoming mail server settings are as follows:
* Incoming Mail (IMAP) Server: `imap.gmail.com`
* Port: `993`
* Security Type: `SSL` (or `TLS` depending on your client)

### SMTP Server Settings
For sending mail, use the following outgoing mail server settings:
* Outgoing Mail (SMTP) Server: `smtp.gmail.com`
* Port: `587` or `465`
* Security Type: `STARTTLS` (for `587`) or `SSL` (for `465`)
* Authentication: Yes (use same as incoming)

### Authentication
To authenticate, use the following:
* Username: Your full Gmail address (e.g., `you@gmail.com`)
* Password: Use an App Password (generated in your Google Account security settings) if your client does not support modern authentication (OAuth)

### Enabling IMAP for Google Workspace Accounts
If you are using a Google Workspace account, IMAP must be enabled manually:
1. Log into the [Google Admin Console](https://admin.google.com).
2. Go to Apps > Google Workspace > Gmail > End user access.
3. Enable POP and IMAP access.

Using OAuth 2.0 Credentials
---------------------------

If you have a project password and ID with a token in a `.json` file, you can use the OAuth 2.0 credentials to connect to Gmail via IMAP.

### Method 1: Using a Service Account
Service accounts are ideal for server-to-server communication because they do not require user interaction. You will use the `google-auth` library to automatically handle authentication.

First, install the required libraries:
```bash
pip install google-auth google-auth-oauthlib
```
Then, use the following Python script to connect via IMAP:
```python
import imaplib
from google.oauth2 import service_account
import google.auth.transport.requests

# 1. Load the JSON file credentials
SCOPES = [
    'https://mail.google.com/'
]
creds = service_account.Credentials.from_service_account_file(
    'path_to_your_file.json', scopes=SCOPES
)

# 2. Delegate authority to the specific user mailbox
# Note: Requires Domain-Wide Delegation enabled in Google Admin Console
delegated_creds = creds.with_subject('user@yourdomain.com')

# 3. Refresh and get the access token
request = google.auth.transport.requests.Request()
delegated_creds.refresh(request)
access_token = delegated_creds.token

# 4. Connect to Gmail IMAP
imap = imaplib.IMAP4_SSL('imap.gmail.com', 993)

# 5. Format the XOAUTH2 string
auth_string = f'user={user@yourdomain.com}\x01auth=Bearer {access_token}\x01\x01'
imap.authenticate('XOAUTH2', lambda x: auth_string)

print('Successfully connected!')
```
### Method 2: Using OAuth 2.0 Client ID
If your JSON file contains a client ID and client secret for a standard user account, you must initiate a local browser login to generate an access token.

Run the authorization flow:
```python
import imaplib
from google_auth_oauthlib.flow import InstalledAppFlow

SCOPES = [
    'https://mail.google.com/'
]

# Load JSON and run browser authorization
flow = InstalledAppFlow.from_client_secrets_file('path_to_your_file.json', SCOPES)
creds = flow.run_local_server(port=0)

# Get the token string
access_token = creds.token
user_email = 'your_gmail_address@gmail.com'

# Authenticate with IMAP
imap = imaplib.IMAP4_SSL('imap.gmail.com', 993)
auth_string = f'user={user_email}\x01auth=Bearer {access_token}\x01\x01'
imap.authenticate('XOAUTH2', lambda x: auth_string)

print('Successfully connected!')
```
Critical Security Reminder
---------------------------

Do not commit your JSON file to public repositories like GitHub.

Service accounts require Domain-Wide Delegation in a Google Workspace domain to access user mailboxes. They cannot access standard `@gmail.com` personal accounts.

Installing Required Libraries
-----------------------------

To use `imaplib` and `google_auth_oauthlib.flow`, you only need to install the Google authentication libraries. The `imaplib` module is part of Python's standard library, so it comes built-in and does not require installation.

Run the following command in your terminal to install the necessary Google libraries:
```bash
pip install google-auth-oauthlib google-auth
```
Libraries Breakdown
--------------------

* `imaplib`: Built into Python. No installation needed.
* `google-auth-oauthlib`: Provides the `InstalledAppFlow` tool to handle user login screens.
* `google-auth`: Handles token refreshing and management in the background.

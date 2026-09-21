---
Title: "When Antigravity CLI asks if I want to sign in using oauth or Google Cloud project, does that make any difference in practice for using the app going forward? I used the same Oauth 2.0 \"test\" project I set up in Cloud Console for the gws application to login (it uses my personal @gmail.com account, as well). I am at a prompt that says: ```agv ▄▀▀▄ Antigravity CLI 1.0.10 ▀▀▀▀▀▀ averyfreeman@gmail.com (Antigravity Business) ▀▀▀▀▀▀▀▀ Gemini 3.5 Flash (Medium) ▄▀▀ ▀▀▄ ~/Downloads ▄▀▀ ▀▀▄ ```"
Date: "2026-06-22_00_42"
Tags:
  - AI
Category: "AI"
Source_Products:
  - AI_Mode
  - Search
---
Choosing Between OAuth and Google Cloud Project Login in Antigravity CLI
====================================================================

When setting up the Antigravity CLI, you are prompted to choose between signing in using OAuth or Google Cloud project. This choice has significant practical implications for your workflow, particularly regarding session longevity, execution limits, and API access.

### Understanding the OAuth Choice

If you use the OAuth 2.0 credential from your personal account, you will be running in User Persona Mode. This means the CLI will inherit your exact personal user permissions, pretending to be you sitting at a keyboard. However, since you set the Google Cloud project to "Test" status, your login token will automatically expire every 7 days. You will need to re-run the `agv login` browser loop to re-authenticate.

Additionally, you will be bound by standard consumer API quotas. If you attempt to loop through a large number of historical emails using an agent, you may encounter a 429 Too Many Requests error, and your script will be throttled.

### Understanding the Google Cloud Project Choice

In contrast, switching to the Google Cloud Project native authentication allows you to act as a system infrastructure backend, utilizing a Service Account JSON Key File instead of a user browser login. This provides permanent sessions, as the CLI will stay logged in indefinitely until you manually delete the key file from your machine.

Furthermore, you will have access to massive enterprise quotas, allowing you to perform thousands of email operations, file updates, and container builds simultaneously without being throttled. This mode also enables you to use Domain-Wide Delegation in GCP to let the single service key act on behalf of your corporate account.

### Verifying Your Setup

To verify that your OAuth setup is talking to your Google account, you can execute the following command:
```code
agv run "List the subjects of the last 5 unread emails in my inbox and save them to a file named email_test.txt here"
```
If successful, you will see a browser engine step fire, and `email_test.txt` will appear in your Downloads directory.

### Using Application Default Credentials (ADC)

If you only provided the project name during setup, the CLI is using Application Default Credentials (ADC) or your local `gcloud` configuration. This means the CLI read your existing local Google Cloud SDK configurations, found your active project name from your local terminal environment, and re-used the authentication token you already granted to your system previously.

As a result, you are still authenticating under your personal user account permissions, and you do not need to manage or protect a vulnerable JSON secret file. Your session will last as long as your local Google Cloud CLI login remains active.

To verify exactly which account and project the CLI pulled from your environment, you can run:
```code
gcloud config list
```
This will provide you with the necessary information to understand your current setup and make any necessary adjustments.

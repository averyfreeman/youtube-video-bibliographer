---
Title: "log into ghcr.io with podman"
Date: "2026-06-02_02_02"
Tags:
  - Software Development
Category: "Software Development"
Source_Products:
  - AI_Mode
  - Search
---
```markdown
Your prompt:
log into ghcr.io with podman

Search's response:
To log into the GitHub Container Registry (<code>ghcr.io</code>) using Podman, execute the command:
```bash
echo "YOUR_PAT" | podman login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```
You must use a Personal Access Token (PAT) as your password because GitHub does not accept your standard account password for command-line registry authentication.

1. Generate a Personal Access Token (PAT)
Before running the command, you need to create a token on GitHub:

Navigate to your GitHub account settings.
Go to Developer Settings > Personal access tokens > Tokens (classic).
Click Generate new token (classic).
Select the appropriate scopes based on your needs:

- read:packages to pull images.
- write:packages to push images.
- delete:packages to delete images.

Copy the generated token.

2. Log In via the Terminal
The recommended approach uses the --password-stdin flag to prevent your security token from being saved explicitly in your terminal's shell history. Replace the placeholder values below with your actual data:

```bash
echo "ghp_yourActualTokenHere" | podman login ghcr.io -u your_github_username --password-stdin
```
3. Verify the Connection
Run the following command to check if you are actively authenticated to the registry:

```bash
podman login ghcr.io --get-login
```
If successful, the terminal returns your GitHub username.
Your local machine stores this encrypted session key in your system's temporary container runtime file (typically auth.json).

For comprehensive documentation on managing credential states, see the official GitHub Container Registry Authentication Guide.

I am getting this error: Error: authenticating creds for ghcr.io: Requesting bearer token: invalid status code from registry 403 (Forbidden)

Question: is it possible to sign in using email instead of username?

No, you cannot log into ghcr.io using your email address. The GitHub Container Registry strictly requires your GitHub username as the user identity.

The 403 (Forbidden) error means your token is validly formatted, but the registry is actively rejecting your permission levels.

Why You See the 403 Error

- Insufficient Token Scopes: Your Personal Access Token (PAT) missing the required package permissions.
- Incorrect Username: Using your email or an incorrect capitalization of your username.
- Organization Restrictions: Your GitHub organization may require explicit SAML Single Sign-On (SSO) authorization for the PAT.

How to Fix It Right Now

- Verify Your Username: Double-check your exact GitHub handle (e.g., octocat, not octocat@email.com).
- Re-create Your Token: Generate a new Personal Access Token (classic) and explicitly check the box for write:packages or read:packages.
- Authorize for SSO: If your repository belongs to a business organization, click the Configure SSO button next to the token on GitHub to enable it for that organization.

To narrow down the root cause, let me know:

- Is this for a personal or a company organization repository?
- Are you trying to pull an image or push a new one?
- Did you generate a Fine-grained token or a Classic token?
```

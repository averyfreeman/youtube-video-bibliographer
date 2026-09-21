---
Title: "Practical AES-256 Encryption in Linux for PCI Compliance"
Date: "2026-07-04_16_42"
Tags:
  - Security and Identity
Split_From_Line: 28
Category: "Security and Identity"
---
### Encrypting a String Using AES-256 in Linux
To encrypt a string using AES-256 in Linux, the most common and secure tool to use is OpenSSL, which comes pre-installed on almost all Linux distributions.

#### Encrypting a String (Interactive Mode)
The most secure method is to let OpenSSL prompt for a password, preventing it from being recorded in the shell's command history. Run the following command in your terminal:
```bash
echo -n "Your secret message" | openssl enc -aes-256-cbc -pbkdf2 -a
```
This command:
* Uses `echo -n` to output the string without a trailing newline character.
* Specifies `enc -aes-256-cbc` to use the AES-256 algorithm in Cipher Block Chaining (CBC) mode.
* Employs `-pbkdf2` to prevent brute-force attacks by stretching the password.
* Uses `-a` to encode the encrypted output in Base64, making it readable text rather than raw binary data.

After running this command, the terminal will prompt you to enter and verify a password, then output the encrypted Base64 string.

#### Encrypting a String (One-Line Command)
If scripting or not concerned about the password being in the command history (not recommended for production or sensitive data), you can pass the password directly using the `-pass` argument:
```bash
echo -n "Your secret message" | openssl enc -aes-256-cbc -pbkdf2 -a -pass pass:YourSecretPassword
```
#### Decrypting the String
To decrypt the Base64 string, use the `-d` flag.

##### Interactive Decryption:
```bash
echo "U2FsdGVkX19..." | openssl enc -aes-256-cbc -pbkdf2 -a -d
```
Replace `"U2FsdGVkX19..."` with your actual encrypted output string. You will be prompted for the password.

##### One-Line Decryption:
```bash
echo "U2FsdGVkX19..." | openssl enc -aes-256-cbc -pbkdf2 -a -d -pass pass:YourSecretPassword
```
These methods provide a secure way to encrypt and decrypt strings using AES-256 in Linux, which can be useful for various applications, including storing database records or transmitting transaction data to a payment gateway.

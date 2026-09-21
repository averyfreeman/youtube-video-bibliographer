---
Title: "Native Ubuntu 26.04 AI and HTML Parsing"
Date: "2026-07-04_11_36"
Tags:
  - Linux and Unix
Split_From_Line: 66
Category: "Linux and Unix"
---
### Native Ubuntu 26.04 AI Features

Ubuntu 26.04 introduces Inference Snaps, which allow you to run models locally without complex setup. You can install specific models as snaps:
```bash
sudo snap install gemma3
# Then run the associated application
demo-app
```
For a more robust local setup without API keys, many users on Ubuntu also utilize Ollama, which can be installed via snap:
```bash
sudo snap install ollama
```
### HTML Parsers for Ubuntu Terminal

When working with HTML data in the Ubuntu terminal, a reliable HTML parser is essential. Here are some popular options:

### 1. pup: A Fast Command-Line HTML Parser

pup is a fast command-line tool specifically inspired by the JSON parser `jq`. It reads HTML from standard input and filters data using familiar CSS selectors.

#### Installation

Although pup is not available in the official Ubuntu 26.04 package repositories, you can install it using the following methods:

*   **Method 1: Download the pre-compiled binary (Recommended)**
    ```bash
wget https://github.com/ericchiang/pup/releases/download/v0.4.0/pup_v0.4.0_linux_amd64.zip
sudo unzip pup_v0.4.0_linux_amd64.zip -d /usr/local/bin/
rm pup_v0.4.0_linux_amd64.zip
```
    Verify the installation by running `pup --version`.
*   **Method 2: Compile natively via Go**
    ```bash
sudo apt install golang -y
go install github.com/ericchiang/pup@latest
```
    Note: If you choose this method, ensure your shell path includes your Go bin directory by adding `export PATH=$PATH:$HOME/go/bin` to your `~/.bashrc` file.

#### Usage Examples

Here are some common ways to use pup:

*   **Extract Clean Text from an Element**
    ```bash
curl -s https://example.com | pup 'h1 text{}'
```
*   **Extract Attribute Values (Like Links or Images)**
    ```bash
curl -s https://example.com | pup 'a attr{href}'
curl -s https://example.com | pup 'img attr{src}'
```
*   **Extract Complex Elements as JSON**
    ```bash
curl -s https://example.com | pup 'div.main-content json{}'
```

### 2. scrape-cli: A Modern Alternative

scrape-cli is an excellent modern pipeline utility that handles both CSS selectors and XPath. It is heavily used to feed clean data into LLMs or automation scripts.

#### Installation

You can install scrape-cli easily via pip or Ubuntu's `uv` tool manager:
```bash
uv tool install scrape-cli
```
#### Usage Example

Here's an example of using scrape-cli:
```bash
curl -s https://example.com | scrape -c 'div.content > p'
```
### 3. html-xml-utils: The Native Ubuntu Stack

If you prefer traditional W3C tools without installing external third-party binaries, you can use the native Ubuntu `html-xml-utils` package. It breaks parsing down into two steps: `hxnormalize` (to fix messy HTML) and `hxselect` (to extract elements).

#### Installation

You can install `html-xml-utils` using the following command:
```bash
sudo apt install html-xml-utils
```
#### Usage Example

Here's an example of using `html-xml-utils`:
```bash
curl -s https://example.com | hxnormalize -x | hxselect 'title'
```
### Comparison of HTML Parsers

Here's a quick comparison of the HTML parsers mentioned above:

| Tool | Selector Syntax | Output Options | Best For |
| --- | --- | --- | --- |
| **pup** | CSS | Text, HTML, JSON | Quick, interactive terminal scraping. |
| **scrape-cli** | CSS & XPath | Clean text, HTML | Feeding cleaned data into LLMs/scripts. |
| **html-xml-utils** | CSS (basic) | Normalized XML/HTML | Lightweight environments using native apt packages. |

By choosing the right HTML parser for your needs, you can efficiently extract and process HTML data in the Ubuntu terminal. Whether you prefer the flexibility of pup, the modern approach of scrape-cli, or the native simplicity of `html-xml-utils`, there's a suitable tool available for your use case.

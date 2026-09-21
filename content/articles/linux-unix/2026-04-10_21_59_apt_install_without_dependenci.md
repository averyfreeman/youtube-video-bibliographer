---
Title: "apt install without dependencies"
Date: "2026-04-10_21_59"
Tags:
  - Linux and Unix
Category: "Linux and Unix"
Source_Products:
  - AI_Mode
  - Search
---
# Installing Packages without Dependencies in Debian and Ubuntu
In the Debian and Ubuntu package management system, `apt` and `apt-get` cannot be forced to ignore hard dependencies during an installation. The design of `apt` strictly ensures that all system packages are fully functional, and ignoring required dependencies would break both the package and the package manager's database.

However, depending on what you need to achieve, there are supported workarounds.

## Scenario 1: Skipping Recommended or Suggested Packages
By default, `apt` installs a package's hard dependencies (Depends) and its recommended packages (Recommends). If you only want to install the bare minimum required for the software to run, you can skip the recommendations using the following command:
```bash
sudo apt install --no-install-recommends <package_name>
```
This approach is great for lightweight systems or Docker containers where you want to keep the image size small.

## Scenario 2: Installing a.deb Package without Dependencies
To completely bypass dependency checking, you cannot use `apt`. Instead, you must download the standalone `.deb` package file and use the low-level `dpkg` tool with the `--force-depends` flag:
```bash
apt download <package_name>
sudo dpkg -i --force-depends <package_name>.deb
```
**Warning:** Doing this leaves your package manager in a broken state. Every subsequent time you run an `apt` command, it will refuse to proceed and demand that you run `apt --fix-broken install` to either fetch the missing dependencies or remove the broken package.

## Scenario 3: Trickling Apt into Thinking a Dependency is Already Met
If you have manually installed a dependency (e.g., compiled from source or used a binary) and want `apt` to leave it alone, the safest method is to use a tool called `equivs` to create a dummy empty package. Here's how:
```bash
sudo apt install equivs
equivs-control <dependency_name>.control
```
Edit the generated file with a text editor to set the `Package:` name to the missing dependency. Then, build the dummy package:
```bash
equivs-build <dependency_name>.control
sudo dpkg -i <dependency_name>_all.deb
```
Now, `apt` will believe the dependency is satisfied and let you install your primary package normally.

As an expert Ubuntu administrator, I can provide optimized terminal commands, automation scripts, or troubleshooting steps tailored to your environment. If you have a specific task or problem you need to solve, please provide the details, and I'll be happy to assist you.

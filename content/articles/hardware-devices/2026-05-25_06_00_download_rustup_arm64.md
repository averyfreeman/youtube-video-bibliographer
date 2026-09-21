---
Title: "download rustup arm64"
Date: "2026-05-25_06_00"
Tags:
  - Hardware and Devices
Category: "Hardware and Devices"
Source_Products:
  - AI_Mode
  - Search
---
## Rustup for ARM64
To download and install Rustup for ARM64 (also known as AArch64), the method depends on your operating system.

### Windows (ARM64)
Windows on ARM64 is a Tier 1 supported target. To install it, download the 64-bit ARM installer executable directly from [https://static.rust-lang.org/rustup/dist/aarch64-pc-windows-msvc/rustup-init.exe](https://static.rust-lang.org/rustup/dist/aarch64-pc-windows-msvc/rustup-init.exe) (ARM64). Run the file and follow the on-screen instructions. Ensure you have the C++ Build Tools installed beforehand, which can be obtained via the Visual Studio Installer by selecting the Desktop development with C++ workload and checking the C++ ARM64 build tools.

### macOS (Apple Silicon / M1, M2, M3)
For Mac computers with Apple Silicon, the standard installation script automatically detects your architecture. Open your terminal and run the following command:
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```
This script will install the aarch64-apple-darwin toolchain by default.

### Linux (ARM64 / AArch64)
Most Linux distributions on ARM64 use the same automated script. Run the command in your terminal:
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```
This will typically install the aarch64-unknown-linux-gnu toolchain. If you are on Arch Linux ARM, you can also use the package manager with the command `sudo pacman -S rustup`.

## Verifying the Installation
After installation, restart your terminal and verify the version and host architecture by running:
```bash
rustc --version
rustup show
```
The "Default host" should display as aarch64.

## Installing Nushell Using Cargo
To install Nushell using Cargo, compile it directly from source using Rust's package manager.

### Installation Steps
Open your terminal or command prompt and run the installation command:
```bash
cargo install nu
```
### Performance Optimization (Optional)
To enable all default features and compile with optimization flags for faster performance, use the --locked flag to respect Nushell's specific dependency versions:
```bash
cargo install nu --locked
```
### Verification
Once the compilation finishes, restart your terminal and verify the installation by typing:
```bash
nu
```
With Nushell installed, you can explore further customization options, such as setting Nushell as your default shell, configuring your environment, or installing extra plugins.

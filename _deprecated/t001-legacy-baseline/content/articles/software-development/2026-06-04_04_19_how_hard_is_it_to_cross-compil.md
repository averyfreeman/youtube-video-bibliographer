---
Title: "how hard is it to cross-compile x86_64 rust to aarch64?"
Date: "2026-06-04_04_19"
Tags:
  - Software Development
Category: "Software Development"
Source_Products:
  - AI_Mode
  - Search
---
# Cross‑Compiling Rust from x86_64 to aarch64

Cross‑compiling Rust is trivial for pure‑Rust crates but can become challenging when the project depends on C libraries or complex build scripts. Below is a practical guide that categorises the difficulty levels, recommends tooling, and highlights common pitfalls.

## 1. Difficulty Levels

| Level | Typical Situation | Required Steps |
|-------|-------------------|----------------|
| \*\*Easy\*\* (Pure Rust) | No C dependencies, no custom build scripts | 1. Add the target: `rustup target add aarch64-unknown-linux-gnu`
2. Build: `cargo build --target aarch64-unknown-linux-gnu` |
| \*\*Moderate\*\* (Standard Dependencies) | Crates that need an external linker (e.g., `openssl`, `libz`) | 1. Install a cross‑linker (e.g., `gcc-aarch64-linux-gnu` on Ubuntu).
2. Configure Cargo to use it via `.cargo/config.toml`. |
| \*\*Hard\*\* (C/C++ Dependencies) | Libraries that require system headers or custom C code (e.g., OpenSSL built for aarch64) | 1. Build or obtain cross‑compiled versions of the required C libraries.
2. Ensure the cross‑linker can locate those libraries. |


## 2. Recommended Toolchains

### 2.1 `cross`

`cross` is the de‑facto solution for most Rust cross‑compilation scenarios. It runs builds inside Docker containers that already contain the appropriate toolchains, linkers, and C libraries for virtually any target, including `aarch64-unknown-linux-gnu`.

```bash
cross build --target aarch64-unknown-linux-gnu
```
*Pros*: No manual installation of cross‑linkers; works out‑of‑the‑box for many crates.
*Cons*: Requires Docker (or Podman) and may add a small runtime overhead.

### 2.2 `cargo-zigbuild`

`cargo-zigbuild` leverages the Zig compiler as a linker. Zig bundles many C headers and provides a self‑contained cross‑linking environment, often simplifying builds that would otherwise need a full GCC toolchain.

```bash
cargo zigbuild --target aarch64-unknown-linux-gnu
```
*Pros*: Minimal external dependencies; fast linking.
*Cons*: Still experimental for some targets; may need manual Zig installation.

## 3. Common Hurdles and How to Resolve Them

### 3.1 The Linker Issue
Rustc can emit aarch64 object files, but by default it invokes the host’s x86_64 linker, which cannot produce aarch64 binaries. Explicitly specify a cross‑linker:

```toml
# .cargo/config.toml
[target.aarch64-unknown-linux-gnu]
linker = "aarch64-linux-gnu-gcc"
```
If you use `cross`, the correct linker is selected automatically.

### 3.2 Build Scripts (`build.rs`) and Procedural Macros
Crates that contain a `build.rs` script or procedural macros are compiled for the **host** (x86_64) because they must run during the build. The main library is then compiled for the **target** (aarch64). Ensure the host toolchain can compile those scripts; otherwise you’ll see “cannot find crate for `std`” errors.

### 3.3 libc Version Mismatch
The target system’s glibc version must be **equal to or newer** than the version used by the cross‑compiled binaries. If you compile against a newer glibc than the target provides, you’ll encounter runtime errors such as “GLIBC_2.28 not found”. To avoid this, either:

* Build against the oldest glibc version you need to support, or
* Use a Docker image that matches the target’s distribution (e.g., `debian:buster` for older glibc).

## 4. Quick Start Checklist

1. **Choose a tool** – `cross` for simplicity, `cargo-zigbuild` for a lightweight alternative.
2. **Install Docker/Podman** if using `cross`.
3. **Add the Rust target**: `rustup target add aarch64-unknown-linux-gnu`.
4. **(Optional) Install a native cross‑linker** (`gcc-aarch64-linux-gnu`) if you prefer not to use Docker.
5. **Configure Cargo** (only needed for native cross‑linkers).
6. **Build**: `cross build --target aarch64-unknown-linux-gnu` or `cargo zigbuild …`.
7. **Test** the resulting binary on an aarch64 device or emulator.

---

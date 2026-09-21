---
Title: "are any PCs capable of running unquantized models capable of 1M+ context windows locally? if so, which ones?"
Date: "2026-06-14_05_20"
Tags:
  - Hardware and Devices
Category: "Hardware and Devices"
Source_Products:
  - AI_Mode
  - Search
---
Running Unquantized Models with 1M+ Context Windows Locally: A Guide to Capable PCs
================================================================================

Running unquantized models with 1M+ context windows locally requires specific high-end PC configurations, typically restricted to smaller parameter models (e.g., 7B–8B) unless using enterprise-grade workstation hardware. For a standard Llama 3 8B model, running unquantized with a 1 million token context window requires approximately 150–160 GB of RAM.

### Capable PC Configurations

The following PC configurations can achieve this locally:

1. **Apple Mac Studio (M2 / M3 / M4 Ultra)**: This is widely considered the most practical PC for this task due to its Unified Memory Architecture, which allows the GPU to access system RAM. Requirements include a configuration with 192GB or 256GB of Unified Memory. Performance is faster than standard PCs because the massive memory bandwidth (800GB/s+) allows the GPU to process the 1M context reasonably well. Capability includes running 8B models unquantized at 1M context.
2. **High-End Consumer Desktops (Maxed RAM)**: Modern consumer motherboards (Intel Z790/Z890 or AMD X670/X870) support high-capacity DDR5 RAM. Requirements include a PC with 192GB (4x48GB) or 256GB (4x64GB) of DDR5 system RAM. Performance is significantly slower since the model and KV cache won't fit in VRAM, resulting in speeds of 1–5 tokens per second.
3. **Workstation PCs (Threadripper / Xeon)**: For larger models (e.g., 70B unquantized), the memory requirement for 1M context exceeds 500 GB, which is impossible for consumer desktops or Macs. Requirements include a workstation with an AMD Threadripper Pro or Intel Xeon W processor supporting 512GB, 1TB, or 2TB of DDR5 ECC RAM. Capability includes running 70B+ models unquantized with 1M context.

### Summary Table

| PC Type | RAM Config | Capable Model (Unquantized + 1M Context) | Performance |
| --- | --- | --- | --- |
| **Mac Studio (Ultra)** | 192GB / 256GB | **Llama 3 8B** (or similar) | **Best** (GPU Accelerated) |
| **Consumer Desktop** | 192GB / 256GB | **Llama 3 8B** (or similar) | **Slow** (CPU Inference) |
| **Workstation** | 512GB+ | **Llama 3 70B** (or similar) | **Slow** (CPU Inference) |

### Note on "Unquantized"

Running models unquantized (FP16) is extremely inefficient for local use. Most users achieve nearly identical intelligence with Q4_K_M or Q8 quantization, which cuts memory usage by 50-75%, allowing these massive context windows to fit on more accessible hardware or run significantly faster.

ARM PCs with Unified Memory
-----------------------------

Several high-performance ARM platforms exist that offer 128GB or more of memory and competitive or superior raw compute power for AI and development workloads.

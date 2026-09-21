---
Title: "cost of hosting omnirouter on cloudflare workers and D1"
Date: "2026-04-10_02_35"
Tags:
  - DevOps and Cloud
Category: "DevOps and Cloud"
Source_Products:
  - AI_Mode
  - Search
---
Hosting an Application like Omnirouter on Cloudflare Workers and D1
=================================================================

Hosting an application like Omnirouter, or similar proxy/routing services, on Cloudflare Workers and D1 is highly cost-effective and, in many cases, can be done entirely for free or for a flat base fee of $5 per month. Cloudflare does not charge for data transfer (bandwidth/egress), which makes it a popular choice for routing applications.

### Cost Structure

The cost structure breaks down into two tiers: the Free Tier and the Paid Tier. The key features and costs of each tier are outlined in the following table:

| Feature | Workers (Free Tier) | Workers (Paid Tier) |
| --- | --- | --- |
| **Base Monthly Cost** | $0 | Starting at $5.00 / mo |
| **Compute Requests** | 100,000 per day | 10 Million per month included (+$0.30 per additional million) |
| **CPU Time Limit** | 10 ms per invocation | Up to 15 mins (charged $0.02 per million ms after 30M ms/mo) |
| **D1 Rows Read** | 5 Million per day | 25 Billion per month included (+$0.001 per additional million) |
| **D1 Rows Written** | 100,000 per day | 50 Million per month included (+$1.00 per additional million) |
| **D1 Storage** | 5 GB total | 5 GB included (+$0.75 per additional GB/mo) |

### Detailed Cost Breakdown

On the Free Tier, you get 100,000 requests per day, which is perfect for hobbyist projects, testing, or low-traffic routing. On the Paid Tier ($5/mo), you get 10 million requests per month included, with additional requests costing $0.30 per million. Cloudflare only counts active CPU time, meaning execution pauses during third-party API fetches do not count toward your CPU limits.

For D1, the Free Tier offers an incredibly generous 5 million rows read and 100,000 rows written per day. The Paid Tier scales massively, with 25 billion reads and 50 million writes a month before overages kick in. Even if you exceed these limits, overage costs are negligible (e.g., $0.001 per million reads).

### Factors That Will Impact Your Final Bill

When choosing between Cloudflare Workers + D1 and OCI Ampere A1 (Always Free), consider the following factors:

| Feature | Cloudflare Workers + D1 | OCI Ampere A1 (Always Free) |
| --- | --- | --- |
| **Architecture** | Serverless (V8 Isolates) | Dedicated VPS (Virtual Machine) |
| **Compute Power** | Shared, bursty, highly scalable | Up to 4 ARM Cores / 24 GB RAM |
| **Global Latency** | Superior. Runs at the edge (300+ locations), closest to your users. | Varies. Tied to the specific OCI data center region you select at setup. |
| **Maintenance** | Zero. Cloudflare handles OS updates, scaling, and database maintenance. | High. You must manage the Linux OS, security patches, Docker, and reverse proxies. |
| **Connection Limits** | Scales effortlessly to thousands of concurrent requests. | Limited by the single VM's RAM and network stack limits. |

---
Title: "Research and Recommendations for AI Workloads on OCI"
Date: "2026-07-04_16_33"
Tags:
  - Databases and Data
Split_From_Line: 37
Category: "Databases and Data"
---
### Research and Recommendations

After conducting research, I found that:

1. **TigerFS is not suitable for production workloads** due to its experimental status, write amplification, and latency issues.
2. **Database features that improve AI prompts** include native vector search, hybrid search, in-database embedding generation, native graph RAG, zero-copy data forking, and time-series continuous aggregates.

These features are available in various databases, including PostgreSQL, TimescaleDB, and Supabase. A comparison of these databases is provided below:

| Database | Primary Core Competency | Native AI Capabilities | Time-Series / Analytics |
| --- | --- | --- | --- |
| Vanilla Postgres 18 | Relational data integrity, basic full-text search, and reliable ACID transactions. | None out-of-the-box. Requires manual compilation/installation of third-party extensions. | Standard indexing. No specialized heavy-ingest compression algorithms. |
| TimescaleDB | Extreme optimization for timestamped data, automated chunking/partitioning, and intense columnar compression. | Their images natively ship with `pgvector` and integrate perfectly with their separate `pgai` toolset. | Best-in-class. Native continuous aggregates, high ingest rates, and analytical functions. |
| Supabase (DB Core) | An incredibly vast, pre-bundled distribution of Postgres sporting hundreds of pre-installed operations extensions. | Includes `pgvector` natively and heavily advocates for in-database vector processing. | Good. Capable of handling moderate time-series via standard Postgres partitioning. |

### Setting Up a Dockerized PostgreSQL Environment

To set up a Dockerized PostgreSQL environment with `pgvector` and `pgai`, I recommend using the `timescale/timescaledb-ha:pg17` image, which includes PostgreSQL, TimescaleDB, and `pgvector`. This image is available on Docker Hub and can be pulled and run on the OCI instance.

### Comparison of Docker Base Images

When choosing a Docker base image, we have several options, including `debian:slim`, `alpine:3.20`, and `ubuntu:focal`. Each has its pros and cons:

* `debian:slim` is a standard workhorse, but its image size is larger than `alpine:3.20`.
* `alpine:3.20` is smaller, but it uses `musl` instead of standard Linux `glibc`, which can lead to obscure memory handling bugs and slower performance for specific C-based extensions.
* `ubuntu:focal` is highly optimized by Canonical for cloud and container deployments, making it a good choice for troubleshooting on the Ubuntu 24.04 ARM64 host.

My personal preference is `debian:slim`, as predictability and compatibility far outweigh image size.

### Benefits of Adding OpenSearch

Adding OpenSearch to the project stack brings heavy-duty, enterprise-grade search and analytics capabilities. OpenSearch excels where traditional databases struggle, including advanced full-text search, log and metric aggregation, and visualizing with dashboards. However, it is memory-hungry and may fight with PostgreSQL for resources on the 24GB RAM instance.

### Shift Away from NoSQL and NodeJS

The buzz around NoSQL databases like MongoDB and the NodeJS ecosystem has faded due to the specific problems they were invented to solve being fixed by other technologies or falling out of favor for AI and modern production workloads. PostgreSQL has improved its support for JSON data, and AI workloads require strict relationships, complex math, and heavy analytical querying.

### Setting Up a Shared Memory Project

To set up a shared memory project for Google Jules, we can use the MCP server hosted on the OCI instance. However, I need more information about the project requirements and the MCP server to provide a more detailed setup guide.

In conclusion, setting up an AI project on an OCI Compute Instance requires careful consideration of the core competencies, effective components, and database features that improve AI prompts. By choosing the right database, Docker base image, and search engine, we can create a robust and performant foundation for the project.

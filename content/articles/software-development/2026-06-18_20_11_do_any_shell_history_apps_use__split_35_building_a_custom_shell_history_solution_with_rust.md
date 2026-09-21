---
Title: "Building a Custom Shell History Solution with Rust"
Date: "2026-07-04_11_25"
Tags:
  - Software Development
Split_From_Line: 35
Category: "Software Development"
---
### Choosing a Programming Language

When building a custom solution, it's essential to choose a programming language that is stable and efficient. Shell scripts are notoriously fragile and prone to errors, so it's recommended to use a language like Rust, which is incredibly stable and shares the same foundational language ecosystem as Atuin.

### The Ultimate Rust Stack

To build a fully local, lightning-fast Rust executable to embed and search your shell history, you can use the following libraries and structural blueprints:

* [rusqlite](https://crates.io/crates/rusqlite): Provides safe, ergonomic bindings to query Atuin's underlying local SQLite database file directly.
* [fastembed](https://crates.io/crates/fastembed): Developed by Qdrant, this library runs highly optimized, local ONNX embedding models directly inside your Rust application.
* [sqlite-vec](https://github.com/sqliteai/sqlite-vector) as a loadable extension in SQLite, or manage vectors cleanly entirely in native Rust using [rig-core](https://crates.io/crates/rig-core) for local vector pipelines.

### Rust Implementation Blueprint

The following example demonstrates how a production-grade, ultra-stable Rust program processes your Atuin history, computes the vectors locally using [fastembed](https://crates.io/crates/fastembed), and saves them safely:
```rust
use rusqlite::{params, Connection, Result};
use fastembed::{TextEmbedding, InitOptions, EmbeddingModel};

fn main() -> Result<()> {
    // 1. Point directly to your local Atuin SQLite file
    let atuin_db_path = format!("{}/.local/share/atuin/history.db", std::env::var("HOME").unwrap());
    let conn = Connection::open(atuin_db_path)?;

    // 2. Fetch the last 100 executed commands safely
    let mut stmt = conn.prepare("SELECT command FROM history ORDER BY timestamp DESC LIMIT 100")?;
    let command_rows = stmt.query_map([], |row| row.get::<_, String>(0))?
       .filter_map(Result::ok)
       .collect::<Vec<String>>();

    // 3. Initialize a fast, local AI model (e.g., BGE-Small-EN-v1.5)
    let model = TextEmbedding::try_new(InitOptions {
        model_name: EmbeddingModel::BGESmallENV15,
        show_download_progress: true,
       ..Default::default()
    }).unwrap();

    // 4. Compute the vector embeddings locally in-memory
    println!("Computing vector embeddings for {} commands...", command_rows.len());
    let embeddings = model.embed(command_rows.clone(), None).unwrap();

    // 5. Safely store the vectors or run your similarity comparisons
    for (i, command) in command_rows.iter().enumerate() {
        let vector_length = embeddings[i].len();
        println!("Command: '{}' -> Vector Size: {}", command, vector_length);
        // Next step: Insert embeddings directly into an sqlite-vec table
    }

    Ok(())
}
```
This implementation provides a solid foundation for building a custom shell history management system that combines the power of SQLite, vector embeddings, and Rust. By following this blueprint, you can create a highly efficient and scalable solution that meets your specific needs.

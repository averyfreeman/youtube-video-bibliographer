---
Title: "Choosing the Right Local Model for Email Organization"
Date: "2026-07-04_16_36"
Tags:
  - AI
Split_From_Line: 152
Category: "AI"
---
## 6. Choosing the Right Local Model

| Model | Parameters | Context Window | Strengths | Weaknesses |
|-------|------------|----------------|----------|------------|
| **Apfel (Apple 3B)** | 3 B | 4 096 tokens | Good tool‑calling | Too small context for bulk email |
| **Gemma 4:E4B** | 4 B | 128 K tokens | Large window | Limited reasoning power |
| **Hermes 3 (8B)** | 8 B | 128 K tokens | Optimised for agents, JSON output | Slightly larger footprint |
| **Qwen 2.5‑Coder (7B)** | 7 B | 128 K tokens | Excellent at structured reasoning and parsing messy IMAP headers | None significant for this task |
| **Llama 3.1‑Instruct (8B)** | 8 B | 128 K tokens | General purpose | No specialised agent tuning |

**Recommendation:** Use **Qwen 2.5‑Coder 7B** as the primary bulk worker. If it ever hallucinates taxonomy logic, fall back to **Hermes 3 8B** for more deterministic behaviour. Keep Apfel only for occasional, single‑email queries on macOS.

---

## 7. Sample Python Router Script

Below is a lightweight script that:

1. Fetches a batch of 500 emails via IMAP.
2. Sends metadata to OpenAI for taxonomy.
3. Dispatches the batch to Ollama (Qwen 2.5‑Coder) for classification.
4. Writes JSON actions to `actions.csv`.
5. Performs a dry‑run confirmation before executing.

```python
import imaplib, email, json, csv, os
import openai
import subprocess

# ---------- Configuration ----------
IMAP_HOST = "imap.mailprovider.com"
IMAP_USER = "you@example.com"
IMAP_PASS = os.getenv("IMAP_APP_PASSWORD")
BATCH_SIZE = 500
OPENAI_MODEL = "gpt-4o"
LOCAL_MODEL = "qwen2.5-coder:7b"
ACTION_CSV = "actions.csv"
# ----------------------------------

def fetch_batch(mail):
    mail.select("INBOX")
    typ, data = mail.search(None, "ALL")
    ids = data[0].split()[:BATCH_SIZE]
    messages = []
    for eid in ids:
        typ, msg_data = mail.fetch(eid, "(RFC822)")
        msg = email.message_from_bytes(msg_data[0][1])
        messages.append({
            "id": eid.decode(),
            "from": msg["From"],
            "subject": msg["Subject"],
            "date": msg["Date"]
        })
    return messages

def get_taxonomy(metadata):
    prompt = (
        "Given the following email metadata, assign a category label "
        "('Receipt', 'Newsletter', 'Promotion', 'Personal', 'Other') "
        "for each entry. Return a JSON list of {id, category}.\n\n"
        + json.dumps(metadata, indent=2)
    )
    resp = openai.ChatCompletion.create(
        model=OPENAI_MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0,
    )
    return json.loads(resp.choices[0].message.content)

def classify_locally(batch, taxonomy):
    # Build prompt with few‑shot JSON examples
    few_shot = """
    {"email_id":"123","action":"archive","folder":"Receipts/2024"}
    {"email_id":"124","action":"move","folder":"Newsletters"}
    {"email_id":"125","action":"delete","folder":null}
    """
    prompt = f"""You are a mail‑sorting assistant.
    For each email in the batch, output a JSON object with fields:
    email_id, action (archive|move|delete), and folder (or null for delete).
    Use the taxonomy provided and follow the few‑shot examples exactly.
    ----
    Taxonomy: {json.dumps(taxonomy)}
    ----
    {few_shot}
    ----
    Emails:
    {json.dumps(batch, indent=2)}
    """
    result = subprocess.run(
        ["ollama", "run", LOCAL_MODEL],
        input=prompt.encode(),
        capture_output=True,
        text=True,
    )
    # Ollama returns a stream of JSON lines
    actions = [json.loads(line) for line in result.stdout.splitlines() if line.strip()]
    return actions

def write_actions(actions):
    with open(ACTION_CSV, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["email_id", "action", "folder"])
        writer.writeheader()
        writer.writerows(actions)

def dry_run_confirm():
    input("Review actions.csv then press Enter to apply changes...")

def apply_actions(mail, actions):
    for act in actions:
        eid = act["email_id"]
        if act["action"] == "delete":
            mail.store(eid, "+FLAGS", r"(\Deleted)")
        elif act["action"] == "archive":
            # Example: move to Archive folder
            mail.copy(eid, "Archive")
            mail.store(eid, "+FLAGS", r"(\Deleted)")
        elif act["action"] == "move" and act["folder"]:
            mail.copy(eid, act["folder"])
            mail.store(eid, "+FLAGS", r"(\Deleted)")
    mail.expunge()

def main():
    mail = imaplib.IMAP4_SSL(IMAP_HOST)
    mail.login(IMAP_USER, IMAP_PASS)

    batch = fetch_batch(mail)
    taxonomy = get_taxonomy(batch)
    actions = classify_locally(batch, taxonomy)
    write_actions(actions)
    dry_run_confirm()
    apply_actions(mail, actions)

    mail.logout()

if __name__ == "__main__":
    main()
```
*Adjust the IMAP host, credentials, and model names as needed.* The script demonstrates the router‑worker pattern without consuming excessive OpenAI tokens.

---

## 8. Putting It All Together

1. **Install Hermes‑Agent** and ensure the `hermes` CLI is in your PATH.
2. **Configure email access** (`~/.hermes/imap_config.yaml` or Gmail service account).
3. **Set your OpenAI API key** (`export OPENAI_API_KEY=…`).
4. **Choose a local model** (Qwen 2.5‑Coder 7B is preferred). Install via Ollama: `ollama pull qwen2.5-coder:7b`.
5. **Run the router script** (or integrate its logic into a Hermes‑Agent tool‑calling flow).
6. **Review `actions.csv`** and confirm before the final execution step.

By following this hybrid strategy, you retain the sophisticated reasoning of GPT‑4o while keeping bulk processing token‑free on your own hardware. The result is a clean, well‑labelled inbox without the cost or latency of a fully cloud‑based solution.

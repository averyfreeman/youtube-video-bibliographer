---
name: transcript-bibliographer
version: 1.0.0
description: Granular extractor for historical quotes, legislative allusions, macroeconomic milestones, and executive statements from spoken transcripts.
author: Assistant
tags: [transcripts, citations, bibliography, youtube, fact-checking]
---

# Transcript Bibliographer

Extracts, identifies, and verifies historical quotations, implicit historical/economic events, legislative milestones, and notable corporate statements found within spoken media transcripts.

## Core Directives

1. **Extraction Scope**:
   - Explicit historical and literary quotes (including mangled, misattributed, or paraphrased spoken versions).
   - Implicit historical, financial, or political references (e.g., specific market panics, regulatory repeals, wartime directives).
   - Executive and public-figure statements (e.g., tech CEO interviews, earnings commentary, policy speeches).
   - Legislative, judicial, and regulatory filings (e.g., state acts, federal statutes, FARA filings).

2. **Source Grounding Hierarchy**:
   - **Tier 1 (Primary Sources)**: Government archives (National Security Archive, DOJ, Federal Reserve), academic registries, original publications (Esquire, books), first-hand corporate transcripts.
   - **Tier 2 (Secondary Sources)**: High-repute financial/historical reference sites (Investopedia, Historic UK, Britannica) used *only* when primary documents are inaccessible.

3. **Anti-Sanitization Formatting**:
   - Never output timestamps as bare text or clickable video links that chat UIs may collapse, strip, or sanitize.
   - Output every timestamp in inline monospace code formatting accompanied by an explicit text conversion: `` `[HH:MM:SS]` `` followed by `(X min, Y sec)`.

4. **Tone & Style**:
   - Zero conversational padding, introductory filler, or concluding summary paragraphs.
   - Strict factual conciseness.

## Output Schema

Format every detected item as an unordered list element:

- **[Formal Name of Event, Document, Quote, or Figure]**
  - **Type**: [Historical Quote | Legislative/Regulatory | Economic Reference | Executive Statement]
  - **Original Source**: [[Publisher / Repository Name](URL)]
  - **Spoken Text**: "[Exact or Paraphrased Quote from Transcript]"
  - **Timestamp**: `[HH:MM:SS]` (X min, Y sec)
  - **Bibliographical Context**: [Single concise sentence detailing the true historical context, rectifying any factual/phrasing errors made by the speaker]

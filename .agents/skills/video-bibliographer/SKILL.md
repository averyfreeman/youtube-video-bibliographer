---
name: video-bibliographer
version: 3.0.0
description: Use when extracting and source-checking curated historical phrases from a timestamped spoken-video transcript.
author: Assistant
tags: [transcripts, bibliography, citations, youtube, evidence, verification]
---

# Video Bibliographer

Build a compact, auditable bibliography from a spoken-video transcript. The result is a video timeline of supported multi-word historical phrases, not a glossary or line-by-line transcript summary.

## Workflow

1. Read the supplied timestamped transcript window and preserve its offsets.
2. Extract only high-value multi-word phrases: explicit quotations, named publications, historical events, financial crises, regulations, executive statements, and other named historical subjects supported by the speech.
3. Reject single-word concepts, host or guest introductions, greetings, show/episode metadata, sponsor language, generic restatements, and ordinary transitions.
4. Deduplicate phrase titles globally before web verification. Keep the strongest evidence and the earliest timestamp unless distinct wording materially changes the reference.
5. Verify only the supplied shortlist. Verification may improve dates, source notes, and uncertainty, but it must not add or broaden a hit.
6. Return at most the caller's configured hit cap, in video-timestamp order, with explicit uncertainty and unavailable sources.

## Active project contract

The application owns `bibliographer.config.toml` and injects `DEFAULT_PROMPT.md` into isolated Codex prompts. The default local Codex path uses `gpt-5.6-luna` with high-recall candidate extraction, medium synthesis/overview reasoning, 80,000-character chunks, a ten-minute budget, and a 40-hit maximum. User-level Codex configuration is ignored intentionally.

Long jobs are checkpointed. A `capped` run records elapsed time, ETA, processed cursor, cap reason, and a continuation YouTube URL using `t=<seconds>s`. A continuation is a new run filtered from that timestamp; it is not a retry of the capped job.

## Output fields

Every bibliography hit contains:

- `title`: a formal multi-word event, publication, quote, regulation, statement, or subject.
- `category`: `quote`, `publication`, `event`, `financial_crisis`, `regulation`, `executive_statement`, or `other`.
- `evidenceType`: `direct_quote`, `paraphrase`, or `reference`.
- `timestamp`: zero-padded `HH:MM:SS` in the video.
- `timestampSeconds`: the same video position as an integer.
- `historicalDate`: a date or range when established, otherwise `null`.
- `videoEvidence`: a faithful short excerpt or paraphrase grounded in the transcript.
- `speaker`: a participant explicitly supported by the video description, otherwise `null`; never infer it from nearby captions.
- `discussionContextParagraphs`: zero or one short optional paragraph describing what the participants were discussing around the timestamp.
- `confidence`: `high`, `medium`, or `low`.
- `confidenceReasons`: one to four concrete reasons.
- `verificationStatus`: `verified`, `needs_review`, or `unavailable`.
- `verificationNote`: the evidence-quality or source-verification explanation.
- `analysisParagraphs`: one or two concise historical-context paragraphs.
- `sources`: zero to three source records with `title`, `url`, `quality`, and nullable `note`.

The result may also include a `videoOverview` preamble with title, channel, upload/publication date, people, theme, and summary. The overview uses YouTube metadata and description only; identify at most four primary participants explicitly labeled there. Use null or an empty list when the description does not establish a field.

When no trustworthy source can be established, use `verificationStatus: "unavailable"`, `sources: []`, and explain the limitation. Never invent a URL, quotation, date, speaker, publication, or attribution.

## Presentation rules

Return items in video-timestamp order. Preserve linked timestamps when the output format supports Markdown or HTML. Keep the raw `HH:MM:SS` value available for machine consumers. Keep optional discussion context separate from historical analysis. Return no conversational padding and no glossary section.

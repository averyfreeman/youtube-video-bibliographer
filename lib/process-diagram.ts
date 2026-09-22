export const processDiagramSource = `flowchart LR
  url[YouTube URL] --> captions[Caption timeline]
  captions --> cursor[Timestamp cursor]
  cursor --> phrases[Phrase-only extraction]
  phrases --> dedupe[Global dedupe]
  dedupe --> verify[Bounded verification]
  verify --> results[Results + thumbnails]
  results --> markdown[Markdown page]
  phrases -. limit .-> cap[Cap: time or 40 hits]
  verify -. limit .-> cap
  cap -. continue at t=Ns .-> cursor`;

export const processDiagramText = [
  "Start with a YouTube URL.",
  "Retrieve captions and apply the optional timestamp cursor.",
  "Extract meaningful multi-word phrases only.",
  "Globally deduplicate before bounded source verification.",
  "Show results with lazy storyboard thumbnails and a separate Markdown page.",
  "If time or hit limits are reached, save a timestamped continuation URL.",
];

import type { MermaidConfig } from "mermaid";

export type ProcessDiagramTheme = "dark" | "light";

const processDiagramThemeVariables = {
  dark: {
    darkMode: true,
    background: "#1b2028",
    primaryColor: "#f6ead5",
    primaryTextColor: "#161b22",
    primaryBorderColor: "#d6a45d",
    secondaryColor: "#2c3644",
    secondaryTextColor: "#f4f7fb",
    secondaryBorderColor: "#9eb1c8",
    tertiaryColor: "#364254",
    tertiaryTextColor: "#f4f7fb",
    tertiaryBorderColor: "#b1bfd0",
    mainBkg: "#f6ead5",
    nodeBkg: "#f6ead5",
    nodeTextColor: "#161b22",
    nodeBorder: "#d6a45d",
    clusterBkg: "#242d3a",
    clusterBorder: "#9eb1c8",
    lineColor: "#f4f7fb",
    defaultLinkColor: "#f4f7fb",
    arrowheadColor: "#f4f7fb",
    textColor: "#f4f7fb",
    titleColor: "#f4f7fb",
    edgeLabelBackground: "#2c3644",
  },
  light: {
    darkMode: false,
    background: "#ffffff",
    primaryColor: "#fff4df",
    primaryTextColor: "#18212c",
    primaryBorderColor: "#8a5a00",
    secondaryColor: "#e9eef5",
    secondaryTextColor: "#18212c",
    secondaryBorderColor: "#54657a",
    tertiaryColor: "#dbe4f0",
    tertiaryTextColor: "#18212c",
    tertiaryBorderColor: "#54657a",
    mainBkg: "#fff4df",
    nodeBkg: "#fff4df",
    nodeTextColor: "#18212c",
    nodeBorder: "#8a5a00",
    clusterBkg: "#f1f4f8",
    clusterBorder: "#54657a",
    lineColor: "#18212c",
    defaultLinkColor: "#18212c",
    arrowheadColor: "#18212c",
    textColor: "#18212c",
    titleColor: "#18212c",
    edgeLabelBackground: "#ffffff",
  },
} as const satisfies Record<
  ProcessDiagramTheme,
  Record<string, boolean | string>
>;

export function getProcessDiagramConfig(
  theme: ProcessDiagramTheme,
): MermaidConfig {
  const edgeLabelTextColor = theme === "dark" ? "#f4f7fb" : "#18212c";

  return {
    startOnLoad: false,
    securityLevel: "strict",
    theme: "base",
    themeVariables: { ...processDiagramThemeVariables[theme] },
    themeCSS: `.edgeLabel text, .edgeLabel span { fill: ${edgeLabelTextColor} !important; color: ${edgeLabelTextColor} !important; }`,
    flowchart: { useMaxWidth: true, htmlLabels: false },
  };
}

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

import type { Metadata } from "next";

import { HistoricalQuoteExtractor } from "@/components/historical-quote-extractor";

export const metadata: Metadata = {
  title: "YouTube Video Bibliographer",
  description:
    "Extract and source historical quotes and events from a YouTube transcript.",
};

export default function BibliographerPage() {
  return <HistoricalQuoteExtractor />;
}

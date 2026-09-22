"use client";

import { useEffect, useRef, useState } from "react";

import {
  processDiagramSource,
  processDiagramText,
} from "@/lib/process-diagram";

let renderSequence = 0;

export function ProcessFlowDiagram() {
  const diagramRef = useRef<HTMLDivElement>(null);
  const [renderFailed, setRenderFailed] = useState(false);

  useEffect(() => {
    let mounted = true;
    const container = diagramRef.current;
    if (!container) {
      return;
    }

    void import("mermaid")
      .then(async ({ default: mermaid }) => {
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: "base",
          flowchart: { useMaxWidth: true, htmlLabels: false },
        });
        return mermaid.render(
          `bibliographer-flow-${renderSequence++}`,
          processDiagramSource,
        );
      })
      .then(({ svg }) => {
        if (mounted && diagramRef.current) {
          diagramRef.current.innerHTML = svg;
        }
      })
      .catch(() => {
        if (mounted) {
          setRenderFailed(true);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <figure className="card card-border mb-8 bg-base-200/50">
      <div className="card-body gap-3 p-4 sm:p-6">
        <div
          ref={diagramRef}
          aria-label="Bibliography processing flowchart"
          className={renderFailed ? "hidden" : "min-h-40 overflow-x-auto"}
          role="img"
        />
        <figcaption className="text-sm text-base-content/70">
          Phrase-only extraction keeps the run useful and bounded; the saved
          cursor lets a long video continue safely.
        </figcaption>
        <details className="text-sm">
          <summary className="cursor-pointer font-semibold">
            Text description of the process
          </summary>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-base-content/75">
            {processDiagramText.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </details>
      </div>
    </figure>
  );
}

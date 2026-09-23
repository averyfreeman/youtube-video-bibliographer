"use client";

import { useEffect, useRef, useState } from "react";

import {
  getProcessDiagramConfig,
  processDiagramSource,
  processDiagramText,
  type ProcessDiagramTheme,
} from "@/lib/process-diagram";

let renderSequence = 0;

export function ProcessFlowDiagram({ theme }: { theme: ProcessDiagramTheme }) {
  const diagramRef = useRef<HTMLDivElement>(null);
  const hasRenderedRef = useRef(false);
  const [renderFailed, setRenderFailed] = useState(false);

  useEffect(() => {
    let mounted = true;
    const container = diagramRef.current;
    if (!container) {
      return;
    }

    void import("mermaid")
      .then(async ({ default: mermaid }) => {
        if (!mounted) {
          return;
        }

        mermaid.initialize(getProcessDiagramConfig(theme));
        return mermaid.render(
          `bibliographer-flow-${renderSequence++}`,
          processDiagramSource,
        );
      })
      .then((result) => {
        if (!result || !mounted || !diagramRef.current) {
          return;
        }

        diagramRef.current.innerHTML = result.svg;
        hasRenderedRef.current = true;
        setRenderFailed(false);
      })
      .catch(() => {
        if (mounted && !hasRenderedRef.current) {
          setRenderFailed(true);
        }
      });

    return () => {
      mounted = false;
    };
  }, [theme]);

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

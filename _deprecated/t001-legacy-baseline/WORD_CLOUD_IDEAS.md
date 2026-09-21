# Article Word Cloud Options

## Decision frame

This site reads local Markdown/MDX during the Next.js build, so build-time aggregation is the natural default: adding an article changes the generated tag list on the next dev refresh or deployment, with no browser-side data fetch and no hydration cost. A runtime cloud is only materially better if articles can be added to a running deployment without a rebuild; that would also require a writable content store, cache invalidation, and a live API, none of which exists in the current repository.

Raster output is the weakest fit because it makes tags non-selectable, non-linkable, and less accessible. HTML or SVG preserves real text and can link each tag to the filtered article index. Package versions below were checked against npm on 2026-08-06.

## 1. Semantic HTML + CSS sizing (implemented)

Aggregate Tags frontmatter in the server-side article loader, scale each label with a logarithmic frequency function, and render a wrapping list of links. The cloud is regenerated from real files whenever Next.js builds or the development route refreshes. It has no client bundle, remains keyboard accessible, and every tag can filter the articles page.

The tradeoff is visual: this is a typographic tag cloud rather than a collision-packed Wordle layout. For this content volume that is useful restraint—192 tags remain searchable, selectable text instead of becoming a dense canvas.

## 2. d3-cloud 1.2.9 — build-time SVG

Run the layout engine in a build script, using the same aggregated tag/count data, and serialize positioned words into an SVG. The SVG can preserve links and accessible labels if generated as markup instead of loaded as a decorative image. This gives the classic rotated, tightly packed appearance with no browser runtime.

Node rendering can require a compatible canvas implementation, deterministic seeding needs deliberate setup, and collision-packed layouts become harder to scan with hundreds of labels. Use this when the classic word-cloud silhouette matters more than the current list’s predictable reading order.

## 3. @visx/wordcloud 4.0.0 — responsive React SVG

Pass server-aggregated words into a small client component and use the Visx layout to render responsive SVG. Version 4 declares React 18 and 19 peer support, making it the strongest current library option for hover details, animated resizing, or direct tag interaction without adopting a full charting system.

It adds hydration and recalculates the layout when dimensions change, so a ResizeObserver should be debounced and motion should respect reduced-motion preferences. Choose it only when interactive layout is valuable enough to justify client JavaScript.

## 4. wordcloud 1.2.3 (WordCloud2) — runtime canvas

Render the aggregated list to a canvas in a client component and redraw it after debounced container resize events. WordCloud2 is compact and supports pointer callbacks, so clicking a painted word can still update the article filter.

Canvas text is not native document text, which weakens accessibility, selection, search indexing, and responsive sharpness unless device-pixel-ratio handling is careful. A parallel semantic tag list would still be required, duplicating the content UI.

## 5. Apache ECharts 6.1.0 + echarts-wordcloud 2.1.0

Use an ECharts word-cloud series when the site already needs a broader charting platform: tooltips, events, exports, and coordinated data views then share one system. The frontmatter aggregation remains server-side and the resulting data hydrates a client chart.

For one cloud this is disproportionate bundle and maintenance cost, and the word-cloud extension is much older than current ECharts. It is not recommended unless ECharts is adopted elsewhere and extension compatibility is proven in a focused spike.

## Recommendation

Keep the implemented semantic HTML/CSS cloud. It updates automatically from actual frontmatter at build/dev time, offers the best accessibility and filtering behavior, and adds zero runtime dependency. If a future visual redesign calls for a true packed cloud, prototype d3-cloud as deterministic build-time SVG first; choose @visx/wordcloud only if live resize and hover interaction become explicit requirements.

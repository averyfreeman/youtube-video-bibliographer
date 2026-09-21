## YouTube Video Dialog Historical Reference Bibliographer -

**User prompt:** ## Role: You are an expert NextJS developer. ## Task: Create a front-end for nextJS 16 that allows one to query a YouTube.com link for historical references, as was done above. Choose the most appropriate inference provider, SDK (I'm thinking Vercel AI-SDK but open to suggestions), and model, but give the user an ability to adjust granularity in a way that is analogous to above prompting history. Keep UI styling to a minimum and focus mostly on function, as we will be adapting the framework to our own codebase. JSX and backend logic should be generic and relatively portable/adaptable. Use UI elements like forms, check boxes, radio buttons, etc. only. Make me proud!
Response: To build a clean, modular, and portable historical reference extractor in Next.js (App Router), the optimal choice is the Vercel AI SDK (ai). It provides native streaming primitives, seamless UI hooks like useChat or useObject, and decoupling from specific LLM providers (allowing you to swap OpenAI, Anthropic, or Google with a single line change).
For an application like this where the output must match a strict schema (Quotes, Timestamps, Sources, and Links), utilizing Structured Outputs via streamObject or generateObject alongside zod guarantees that your frontend can reliably render the resulting data components without complex text parsing.
Core Architecture & Implementation Strategy
1. The Schema (src/lib/schema.ts)
Define a strict, portable Zod schema that captures the data structural patterns requested in our previous interactions.
import { z } from 'zod';

export const historicalReferenceSchema = z.object({
  references: z.array(
    z.object({
      title: z.string().describe('Name or brief title of the historical event, document, or concept'),
      originalSourceUrl: z.string().url().describe('Authoritative link to the primary source or archive'),
      videoQuoteParaphrase: z.string().describe('The quote or reference as spoken in the video transcript'),
      timestamp: z.string().describe('The format [MM:SS] or [HH:MM:SS] where it occurs'),
      category: z.enum(['quote', 'financial_crisis', 'regulatory_failure', 'executive_statement', 'other']),
      granularityLevel: z.enum(['brief', 'detailed']),
      analysis: z.string().optional().describe('Deep dive explanation, tradeoffs, or historical context if requested')
    })
  )
});

export type HistoricalReferences = z.infer<typeof historicalReferenceSchema>;


2. The Server Actions / API Route (src/app/api/extract/route.ts)
Using Vercel AI SDK, this backend handler extracts the transcript (or uses a tool to fetch it), maps user-defined granularity controls directly to system instructions, and returns a structured stream.
import { google } from '@ai-sdk/google'; // Or openai, anthropic, etc.
import { streamObject } from 'ai';
import { historicalReferenceSchema } from '@/lib/schema';

export const maxDuration = 60; // Allow enough time for long video transcripts

export async function POST(req: Request) {
  const { url, granularity, categories, includeAnalysis } = await req.json();

  // 1. Fetch transcript here using a custom utility or YouTube API ingestion
  const transcriptText = await fetchYouTubeTranscript(url); 

  // 2. Build explicit granular prompt instructions dynamically
  const systemInstruction = `
    You are an expert historical bibliographer. Analyze the provided video transcript and extract all historical, literary, or corporate executive references.
    
    Granularity Parameter: ${granularity.toUpperCase()}
    Target Categories: ${categories.join(', ')}
    Include Extended Contextual Analysis: ${includeAnalysis ? 'YES' : 'NO'}
    
    Provide factual, verified links to original primary sources, public archives, or official publications.
  `;

  // 3. Stream structured JSON matching our Zod schema
  const result = await streamObject({
    model: google('gemini-2.5-pro'),
    schema: historicalReferenceSchema,
    system: systemInstruction,
    prompt: `Analyze this transcript:\n\n${transcriptText}`,
  });

  return result.toTextStreamResponse();
}


3. The Reusable Client Component (src/components/ExtractorForm.tsx)
A minimal, highly portable JSX element using basic semantic HTML fields to drive the Vercel AI SDK state framework.
'use client';

import { useState } from 'react';
import { useObject } from '@ai-sdk/react';
import { historicalReferenceSchema } from '@/lib/schema';

export default function ExtractorForm() {
  const [url, setUrl] = useState('');
  const [granularity, setGranularity] = useState('detailed');
  const [categories, setCategories] = useState<string[]>(['quote', 'financial_crisis']);
  const [includeAnalysis, setIncludeAnalysis] = useState(false);

  // Hook handles stream parsing, partial state updates, and schema validation on-the-fly
  const { object, submit, isLoading } = useObject({
    api: '/api/extract',
    schema: historicalReferenceSchema,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submit({ url, granularity, categories, includeAnalysis });
  };

  const handleCategoryChange = (cat: string) => {
    setCategories(prev => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div>
          <label htmlFor="url">YouTube URL:</label>
          <input 
            id="url" type="url" required value={url} onChange={e => setUrl(e.target.value)} 
            style={{ width: '100%', padding: '8px', marginTop: '5px' }} 
          />
        </div>

        <div>
          <label>Granularity Mode:</label>
          <div style={{ marginTop: '5px' }}>
            <label style={{ marginRight: '15px' }}>
              <input type="radio" value="brief" checked={granularity === 'brief'} onChange={() => setGranularity('brief')} /> Brief List
            </label>
            <label>
              <input type="radio" value="detailed" checked={granularity === 'detailed'} onChange={() => setGranularity('detailed')} /> Deep Bibliographical Analysis
            </label>
          </div>
        </div>

        <div>
          <label>Filter Target References:</label>
          <div style={{ display: 'flex', gap: '15px', marginTop: '5px' }}>
            {['quote', 'financial_crisis', 'regulatory_failure', 'executive_statement'].map(cat => (
              <label key={cat} style={{ textTransform: 'capitalize' }}>
                <input type="checkbox" checked={categories.includes(cat)} onChange={() => handleCategoryChange(cat)} /> {cat.replace('_', ' ')}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label>
            <input type="checkbox" checked={includeAnalysis} onChange={e => setIncludeAnalysis(e.target.checked)} /> Include dynamic synthesis text block
          </label>
        </div>

        <button type="submit" disabled={isLoading} style={{ padding: '10px', cursor: 'pointer' }}>
          {isLoading ? 'Streaming Bibliographic Analysis...' : 'Extract Historical References'}
        </button>
      </form>

      {/* Render Results Component dynamically as JSON objects fill the stream array */}
      <div style={{ marginTop: '30px' }}>
        {object?.references?.map((ref, index) => (
          <div key={index} style={{ borderBottom: '1px solid #ccc', paddingBottom: '15px', marginTop: '15px' }}>
            <code style={{ fontSize: '0.85em' }}>{ref?.timestamp || '[00:00]'}</code>
            <h3 style={{ margin: '5px 0' }}>{ref?.title}</h3>
            <p style={{ fontStyle: 'italic', color: '#555' }}>"{ref?.videoQuoteParaphrase}"</p>
            {ref?.originalSourceUrl && (
              <a href={ref.originalSourceUrl} target="_blank" rel="noreferrer" style={{ fontSize: '0.9em' }}>
                View Original Historical Source
              </a>
            )}
            {ref?.analysis && <p style={{ marginTop: '8px', fontSize: '0.95em' }}>{ref.analysis}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}


Interactive Architecture & State Explorer
To help your team understand how changes to the form options immediately alter the server-side prompts, prompt construction logic, and data payloads passed through the Vercel AI SDK system, look through the live configuration simulator below.


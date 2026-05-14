# SEO Report Generator v6.0 — Whitebunnie Digital

A professional SEO reporting tool powered by Claude AI. Generates branded DOCX and PDF reports matching the Whitebunnie/SaasWorx report style.

## What's New in v6

- **Light / Dark theme toggle** — matches your working preference
- **WB Brand styling** — Navy (#1F3A6E) + Blue (#2E5FA3) color system throughout
- **DOCX export** — Navy section headers, alternating row tables, Arial font — matches the sample report exactly
- **PDF export** — Same styling via browser print dialog
- **Ubersuggest removed** — Upload keyword PDFs directly instead; Claude extracts all data automatically
- **Cleaner prompt** — Structured output matches the SaasWorx weekly report format

## Setup

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Usage

1. **Settings** — Add your Claude API key (claude-sonnet-4-5 recommended)
2. **Connect Data** — Connect Google for live GA4 + Search Console data
3. **Upload Files** — Upload Ubersuggest keyword PDF, screenshots, or any SEO data
4. **Generate** — Enter client name, select sections, click Generate
5. **Download** — Download DOCX (branded Word doc) or PDF

## Report Sections

- Executive Summary
- Organic Traffic Report (GA4)
- Search Console Performance  
- Keyword Rankings (from uploaded PDF)
- Website Authority (from uploaded data)
- Key Insights & 30-Day KPI Targets

## Theme

Toggle between **Dark** (default) and **Light** mode using the ☀/◑ button in the top bar.

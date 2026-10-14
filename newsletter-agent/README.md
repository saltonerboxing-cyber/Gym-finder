# Newsletter agent

An AI assistant, built on Claude, that helps you write your monthly client
newsletter. It reads who you are and how you sound, checks this month's
notes, asks you about anything missing, writes the draft, and keeps
revising it until you're happy.

## Setup (once)

1. Install Node.js 18 or newer.
2. In this folder, run `npm install`.
3. Get an API key at https://console.anthropic.com and set it:
   `export ANTHROPIC_API_KEY=sk-ant-...`
4. Fill in `profile.md` with your business, clients and voice.
5. Optional but recommended: put two or three newsletters you've already
   sent in `newsletters/` (e.g. `2026-09.md`). The agent copies your style
   from them and avoids repeating old tips and stories.

## Each month

1. Jot rough notes in `notes/<YYYY-MM>.md`, e.g. `notes/2026-11.md`
   (or skip this and the agent will interview you).
2. Run:
   ```
   npm start              # this month
   node agent.mjs 2026-11 # a specific month
   ```
3. Answer its questions, then ask for changes in plain English:
   "make it shorter", "punchier subject lines", "add a reminder about
   the holiday hours".
4. The draft is saved to `newsletters/drafts/<YYYY-MM>.md` with three
   subject line options, inbox preview text and the body in Markdown.
   Paste it into your email tool (Mailchimp, Constant Contact, etc.).
5. After sending, move the file into `newsletters/` so next month's draft
   learns from it.

## What it will and won't do

- It writes in your voice and never makes up dates, prices, events or
  client names. When it's missing a detail it asks, or leaves a
  placeholder like `[DATE]` for you to fill in.
- It can do a few web searches for seasonal ideas or to check a health
  or fitness claim.
- It drafts. It doesn't send anything. You review and send.

## Under the hood

`agent.mjs` is a single-file agent using the Anthropic TypeScript/JS SDK
with Claude Opus 5.5. Claude calls five local tools (read the profile,
read this month's notes, list and read past newsletters, save the draft)
plus Anthropic's web search tool. Server-side refusal fallback is on, so if
a safety check declines a turn it is retried on a suitable model
automatically. API usage is billed to your Anthropic account.

#!/usr/bin/env node
// Monthly newsletter agent.
//
// An interactive command-line agent that reads your business profile, this
// month's notes and your past newsletters, asks you about anything missing,
// then drafts the month's client newsletter and saves it to
// newsletters/drafts/<YYYY-MM>.md. Keep chatting to revise it.
//
// Usage:  node agent.mjs            # drafts for the current month
//         node agent.mjs 2026-11    # drafts for a specific month

import Anthropic from "@anthropic-ai/sdk";
import fs from "node:fs/promises";
import path from "node:path";
import readline from "node:readline/promises";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROFILE_FILE = path.join(HERE, "profile.md");
const NOTES_DIR = path.join(HERE, "notes");
const PAST_DIR = path.join(HERE, "newsletters");
const DRAFTS_DIR = path.join(PAST_DIR, "drafts");

const MODEL = "claude-opus-5-5";

// ---------------------------------------------------------------------------
// Target month
// ---------------------------------------------------------------------------

function resolveMonth(arg) {
  if (arg) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(arg)) {
      console.error(`Month must look like 2026-11, got "${arg}".`);
      process.exit(1);
    }
    return arg;
  }
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

const MONTH = resolveMonth(process.argv[2]);
const MONTH_LABEL = new Date(`${MONTH}-15T12:00:00`).toLocaleString("en-US", {
  month: "long",
  year: "numeric",
});

// ---------------------------------------------------------------------------
// Tools
// ---------------------------------------------------------------------------

async function readIfExists(file) {
  try {
    return await fs.readFile(file, "utf8");
  } catch (err) {
    if (err.code === "ENOENT") return null;
    throw err;
  }
}

// Newsletter files the agent may read: plain names only, so a model-supplied
// filename can never point outside the newsletters folder.
const SAFE_NAME = /^[\w.-]+\.(md|txt)$/;

async function listPastNewsletters() {
  const entries = await fs.readdir(PAST_DIR, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && SAFE_NAME.test(e.name) && e.name !== "README.md")
    .map((e) => e.name)
    .sort()
    .reverse();
}

const tools = [
  {
    name: "read_profile",
    description:
      "Read the business profile: who the business is, who the clients are, brand voice, and the usual newsletter format. Call this first.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "read_monthly_notes",
    description: `Read the owner's rough notes for ${MONTH_LABEL} (events, schedule changes, wins, announcements). Returns a message if no notes exist yet.`,
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "list_past_newsletters",
    description: "List previously sent newsletters, newest first.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "read_past_newsletter",
    description:
      "Read one past newsletter by filename (from list_past_newsletters). Use the most recent two or three to match the style and avoid repeating content.",
    input_schema: {
      type: "object",
      properties: { filename: { type: "string", description: "e.g. 2026-09.md" } },
      required: ["filename"],
      additionalProperties: false,
    },
  },
  {
    name: "save_draft",
    description: `Save the newsletter draft for ${MONTH_LABEL}. Overwrites the previous version, so always send the complete newsletter. Call again after each revision.`,
    eager_input_streaming: true,
    input_schema: {
      type: "object",
      properties: {
        subject_lines: {
          type: "array",
          items: { type: "string" },
          description: "Three email subject line options, best first.",
        },
        preview_text: {
          type: "string",
          description: "The short preview text shown next to the subject in the inbox (under 100 characters).",
        },
        body_markdown: {
          type: "string",
          description: "The full newsletter body in Markdown, ready to paste into an email tool.",
        },
      },
      required: ["subject_lines", "preview_text", "body_markdown"],
      additionalProperties: false,
    },
  },
  // Server-side web search, for seasonal ideas, local events and fact-checking.
  { type: "web_search_20260209", name: "web_search", max_uses: 3 },
];

const isString = (v) => typeof v === "string" && v.length > 0;

async function runTool(name, input) {
  switch (name) {
    case "read_profile":
      return (await readIfExists(PROFILE_FILE)) ?? "No profile.md found. Ask the owner about their business.";

    case "read_monthly_notes": {
      const notes = await readIfExists(path.join(NOTES_DIR, `${MONTH}.md`));
      return notes ?? `No notes file for ${MONTH} (notes/${MONTH}.md). Interview the owner for this month's news.`;
    }

    case "list_past_newsletters": {
      const files = await listPastNewsletters();
      return files.length ? files.join("\n") : "No past newsletters yet. This is the first one.";
    }

    case "read_past_newsletter": {
      if (!isString(input.filename) || !SAFE_NAME.test(input.filename)) {
        throw new Error("filename must be a plain .md or .txt name from list_past_newsletters");
      }
      if (!(await listPastNewsletters()).includes(input.filename)) {
        throw new Error(`No newsletter named ${input.filename}`);
      }
      return fs.readFile(path.join(PAST_DIR, input.filename), "utf8");
    }

    case "save_draft": {
      const { subject_lines, preview_text, body_markdown } = input;
      if (!Array.isArray(subject_lines) || !subject_lines.every(isString) || !isString(preview_text) || !isString(body_markdown)) {
        throw new Error("save_draft needs subject_lines (list of strings), preview_text and body_markdown");
      }
      const file = path.join(DRAFTS_DIR, `${MONTH}.md`);
      const doc = [
        `<!-- Newsletter draft for ${MONTH_LABEL} -->`,
        "",
        "**Subject line options**",
        ...subject_lines.map((s, i) => `${i + 1}. ${s}`),
        "",
        `**Preview text:** ${preview_text}`,
        "",
        "---",
        "",
        body_markdown.trim(),
        "",
      ].join("\n");
      await fs.mkdir(DRAFTS_DIR, { recursive: true });
      await fs.writeFile(file, doc, "utf8");
      return `Saved to ${path.relative(process.cwd(), file)}`;
    }

    default:
      throw new Error(`Unknown tool ${name}`);
  }
}

// ---------------------------------------------------------------------------
// Agent
// ---------------------------------------------------------------------------

const SYSTEM = `You are a newsletter assistant for a small business owner. Your job is to help them write the monthly email newsletter they send to their clients, this time for ${MONTH_LABEL}.

How to work:
1. Start by reading the business profile, this month's notes and the two or three most recent past newsletters. Do this quietly, then greet the owner in a sentence or two.
2. If anything important is missing (this month's events, schedule changes, a client story, the call to action), ask for it. Ask at most three short questions at a time, and offer to fill gaps with sensible ideas if they'd rather not answer.
3. Write the draft and save it with save_draft. Then show the owner the newsletter in your reply and ask what they'd like changed.
4. When they ask for edits, revise and save the full newsletter again.

Writing guidelines:
- Write in the owner's voice, as described in the profile and shown in past newsletters. It should sound like a person, not a marketing department.
- Keep it scannable: a short personal opener, clear section headings, short paragraphs, one main call to action.
- Never invent facts about the business: no made-up dates, prices, events, client names or results. If you need a detail you don't have, ask, or leave a clearly marked placeholder like [DATE].
- Don't repeat the tips, stories or jokes used in the last few newsletters.
- Only use web search when it genuinely helps (a seasonal angle, a local event, checking a health or fitness claim). Don't present general advice as medical advice.
- Keep your chat replies brief. The newsletter itself is the deliverable.`;

const client = new Anthropic();

function textOf(content) {
  return content.filter((b) => b.type === "text").map((b) => b.text).join("");
}

// Runs one owner turn: calls Claude, executes tools, loops until Claude is done.
async function runTurn(messages) {
  let jsonRetries = 0;
  while (true) {
    const stream = client.beta.messages.stream({
      model: MODEL,
      max_tokens: 64000,
      // Opus 5.5 always thinks adaptively; effort sets how hard. Medium is
      // plenty for writing a newsletter and keeps replies quick.
      output_config: { effort: "medium" },
      // If a safety classifier declines a turn, retry on a suitable model.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      cache_control: { type: "ephemeral" },
      system: SYSTEM,
      tools,
      messages,
    });

    let printedText = false;
    stream.on("text", (delta) => {
      if (!printedText) {
        process.stdout.write("\nAssistant: ");
        printedText = true;
      }
      process.stdout.write(delta);
    });

    let message;
    try {
      message = await stream.finalMessage();
      jsonRetries = 0;
    } catch (err) {
      // With eager input streaming, a tool input that isn't parseable JSON
      // rejects here; re-issue the turn. API errors go to the caller.
      if (err instanceof Anthropic.APIError || jsonRetries++ >= 2) throw err;
      continue;
    }
    if (printedText) process.stdout.write("\n");

    for (const block of message.content) {
      if (block.type === "server_tool_use" && block.name === "web_search") {
        console.log(`  [searching the web: ${block.input?.query ?? ""}]`);
      }
    }

    if (message.stop_reason === "refusal") {
      messages.push({ role: "assistant", content: message.content });
      console.log("\n(The model declined that request. Try rephrasing it.)");
      return;
    }

    messages.push({ role: "assistant", content: message.content });

    if (message.stop_reason === "pause_turn") continue; // long web search, resume

    const toolUses = message.content.filter((b) => b.type === "tool_use");
    if (toolUses.length === 0) return; // Claude is waiting on the owner

    if (message.stop_reason === "max_tokens") {
      throw new Error("The response was cut off before a tool call finished. Try asking for a shorter newsletter.");
    }

    const results = [];
    for (const tool of toolUses) {
      console.log(`  [${tool.name.replaceAll("_", " ")}]`);
      try {
        const content = await runTool(tool.name, tool.input ?? {});
        if (tool.name === "save_draft") console.log(`  ${content}`);
        results.push({ type: "tool_result", tool_use_id: tool.id, content });
      } catch (err) {
        results.push({ type: "tool_result", tool_use_id: tool.id, is_error: true, content: err.message });
      }
    }
    messages.push({ role: "user", content: results });
  }
}

async function main() {
  console.log(`Newsletter agent: drafting the ${MONTH_LABEL} newsletter.`);
  console.log('Type your replies below. Type "exit" to quit.\n');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const messages = [];
  let input = `Let's work on the ${MONTH_LABEL} newsletter.`;

  while (true) {
    const checkpoint = messages.length;
    messages.push({ role: "user", content: input });
    try {
      await runTurn(messages);
    } catch (err) {
      // Roll back the failed turn so the owner can simply try again.
      messages.length = checkpoint;
      if (err instanceof Anthropic.AuthenticationError) {
        console.error("\nAuthentication failed. Set ANTHROPIC_API_KEY to a valid key and run again.");
        break;
      } else if (err instanceof Anthropic.RateLimitError) {
        console.error("\nRate limited. Wait a moment, then send your message again.");
      } else if (err instanceof Anthropic.APIError) {
        console.error(`\nAPI error ${err.status}: ${err.message}`);
      } else {
        console.error(`\nError: ${err.message}`);
      }
    }

    let next = "";
    while (!next) {
      next = (await rl.question("\nYou: ")).trim();
    }
    if (["exit", "quit"].includes(next.toLowerCase())) break;
    input = next;
  }

  rl.close();
  const draft = path.join(DRAFTS_DIR, `${MONTH}.md`);
  if (await readIfExists(draft)) console.log(`\nYour draft is in ${path.relative(process.cwd(), draft)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

import "dotenv/config";
import express from "express";
import OpenAI from "openai";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = express();
const port = Number(process.env.PORT || 8787);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));

const client = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    aiConfigured: Boolean(client),
    model: process.env.OPENAI_MODEL || "gpt-5.6-luna"
  });
});

app.post("/api/chat", async (req, res) => {
  if (!client) {
    return res.status(503).json({
      error: "OPENAI_API_KEY is not configured on the server yet."
    });
  }

  const body = req.body ?? {};
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const model = typeof body.model === "string" && body.model.trim()
    ? body.model.trim()
    : process.env.OPENAI_MODEL || "gpt-5.6-luna";

  if (messages.length === 0) {
    return res.status(400).json({ error: "At least one message is required." });
  }

  const sanitized = messages.slice(-40).map((message) => ({
    role: message?.role === "assistant" ? "assistant" : "user",
    content: String(message?.content || "").slice(0, 20000)
  }));

  res.status(200);
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  const send = (payload) => res.write(`data: ${JSON.stringify(payload)}\n\n`);

  try {
    const stream = await client.responses.create({
      model,
      instructions:
        "You are Orbit, a helpful AI assistant. Answer naturally, clearly, and accurately. Use concise structure when it improves readability.",
      input: sanitized,
      stream: true
    });

    for await (const event of stream) {
      if (event.type === "response.output_text.delta") {
        send({ type: "delta", text: event.delta });
      } else if (event.type === "response.failed") {
        const message = event.response?.error?.message || "The model request failed.";
        send({ type: "error", message });
        break;
      }
    }

    send({ type: "done" });
    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error) {
    console.error("Orbit AI request failed:", error);
    send({
      type: "error",
      message: error instanceof Error ? error.message : "Unexpected AI server error."
    });
    res.write("data: [DONE]\n\n");
    res.end();
  }
});

const dist = path.join(root, "dist");
app.use(express.static(dist));

app.get("*splat", (req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  res.sendFile(path.join(dist, "index.html"), (error) => {
    if (error) next(error);
  });
});

app.listen(port, () => {
  console.log(`Orbit API listening on http://localhost:${port}`);
});

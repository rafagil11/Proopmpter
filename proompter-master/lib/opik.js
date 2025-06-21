import { Opik } from "opik";

// Create a new Opik client with your configuration
const client = new Opik({
  apiKey: process.env.OPIK_API_KEY,
  apiUrl: "https://www.comet.com/opik/api",
  projectName: "proompter",
  workspaceName: "ivan-top",
});

// Log a trace with an LLM span
const trace = client.trace({
  name: `Trace`,
  input: {
    prompt: `Hello!`,
  },
  output: {
    response: `Hello, world!`,
  },
});

const span = trace.span({
  name: `Span`,
  type: "llm",
  input: {
    prompt: `Hello, world!`,
  },
  output: {
    response: `Hello, world!`,
  },
});

console.log("Trace sent")
// Flush the client to send all traces and spans
await client.flush();
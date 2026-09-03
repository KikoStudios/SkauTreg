const baseUrl = (process.env.WIN10_AI_BASE_URL || "http://127.0.0.1:8791").replace(/\/$/, "");
const token = process.env.WIN10_AI_TOKEN;
if (!token) throw new Error("WIN10_AI_TOKEN is required. The probe never prints it.");

const source = "16:00 - 16:45 Uzlování venku. Petr do pátku připraví šest lan.";
const passiveSource = "16:00 - 16:45 Uzlování venku. Děti trénují základní uzly.";
const genericLabels = new Set(["paragraph", "heading", "activity", "aktivita", "program", "blok", "text"]);

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function validateAgenda(output, text = source) {
  const segment = output?.segments?.[0];
  invariant(segment, "missing agenda segment");
  invariant(segment.start_time === "16:00" && segment.end_time === "16:45", "time range was not preserved");
  invariant(typeof segment.label === "string" && text.toLocaleLowerCase("cs").includes(segment.label.toLocaleLowerCase("cs")), "agenda label is not exact source text");
  invariant(!genericLabels.has(segment.label.toLocaleLowerCase("cs")), "agenda label leaked a schema/node type");
}

function proveOracle() {
  let rejected = false;
  try {
    validateAgenda({ segments: [{ label: "paragraph", start_time: "16:00", end_time: "16:45" }] });
  } catch {
    rejected = true;
  }
  invariant(rejected, "probe self-check failed to detect a deliberately invalid label");
}

async function processText(processor, text) {
  const response = await fetch(`${baseUrl}/v1/process`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({
      request_id: `contract-${processor}-${Date.now()}`,
      processor,
      schema_version: `${processor}.v1`,
      model_profile: "fast-structured-cs-v1",
      locale: "cs-CZ",
      deadline_ms: 30_000,
      generation: { temperature: 0, max_output_tokens: 400 },
      context: { document_kind: "schuzka", document_title: "Contract probe", blocks: [{ block_id: "probe-block", type: "paragraph", text }] },
    }),
    signal: AbortSignal.timeout(35_000),
  });
  invariant(response.ok, `${processor} returned HTTP ${response.status}`);
  const data = await response.json();
  invariant(data && typeof data === "object" && data.output, `${processor} returned no structured output`);
  return data.output;
}

proveOracle();
const agenda = await processText("segment_agenda", source);
validateAgenda(agenda);

const materials = await processText("extract_materials", source);
invariant(materials.materials.some((item) => /lan/iu.test(item.name)), "required ropes were not extracted");
invariant(materials.materials.every((item) => !/uzlov/iu.test(item.name)), "activity name leaked into materials");

const tasks = await processText("extract_tasks", source);
invariant(tasks.tasks.length > 0, "explicit preparation task was not extracted");
invariant(tasks.tasks.every((item) => item.tags.every((tag) => tag.trim().split(/\s+/).length <= 3)), "task tags contain sentence-like text");

const passiveTasks = await processText("extract_tasks", passiveSource);
invariant(passiveTasks.tasks.length === 0, "passive agenda text became a task");

console.log(JSON.stringify({ ok: true, scenarios: ["agenda", "materials", "explicit-task", "passive-no-task"], baseUrl }));

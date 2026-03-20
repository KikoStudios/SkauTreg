import { inflateSync } from "node:zlib";

const STREAM = Buffer.from("stream");
const ENDSTREAM = Buffer.from("endstream");

function decodePdfStringLiteral(raw: string): string {
  // Handles basic PDF string escapes: \n \r \t \b \f \\ \( \) and octal \ddd
  let out = "";
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch !== "\\") {
      out += ch;
      continue;
    }

    const next = raw[i + 1] ?? "";
    if (next === "n") {
      out += "\n";
      i++;
      continue;
    }
    if (next === "r") {
      out += "\r";
      i++;
      continue;
    }
    if (next === "t") {
      out += "\t";
      i++;
      continue;
    }
    if (next === "b") {
      out += "\b";
      i++;
      continue;
    }
    if (next === "f") {
      out += "\f";
      i++;
      continue;
    }
    if (next === "\\" || next === "(" || next === ")") {
      out += next;
      i++;
      continue;
    }

    // Octal \ddd (1-3 digits)
    const oct = raw.slice(i + 1, i + 4).match(/^[0-7]{1,3}/)?.[0];
    if (oct) {
      out += String.fromCharCode(parseInt(oct, 8));
      i += oct.length;
      continue;
    }

    // Unknown escape, keep literal char (skip backslash)
    out += next;
    if (next) i++;
  }
  return out;
}

function extractTextFromContentStream(content: string): string[] {
  const texts: string[] = [];

  // (....) Tj
  const tj = /\(((?:\\.|[^\\)])*)\)\s*Tj\b/g;
  for (const m of content.matchAll(tj)) {
    const s = (m[1] ?? "").trim();
    if (!s) continue;
    texts.push(decodePdfStringLiteral(s));
  }

  // [ (.. ) 120 (..) ] TJ
  const tjArray = /\[([\s\S]*?)\]\s*TJ\b/g;
  for (const m of content.matchAll(tjArray)) {
    const arr = m[1] ?? "";
    const parts = [...arr.matchAll(/\(((?:\\.|[^\\)])*)\)/g)]
      .map((x) => decodePdfStringLiteral((x[1] ?? "").trim()))
      .filter(Boolean);
    if (parts.length) texts.push(parts.join(""));
  }

  return texts;
}

function looksFlate(decodedDictSnippet: Buffer): boolean {
  const s = decodedDictSnippet.toString("latin1");
  return /\/Filter\s*\/FlateDecode\b/.test(s) || /\/FlateDecode\b/.test(s);
}

export function extractPdfText(pdfBytes: Uint8Array): string {
  const buf = Buffer.from(pdfBytes);
  const foundTexts: string[] = [];

  let idx = 0;
  while (idx >= 0) {
    const streamIdx = buf.indexOf(STREAM, idx);
    if (streamIdx === -1) break;

    // Check dictionary a bit before 'stream'
    const dictStart = Math.max(0, streamIdx - 256);
    const dictSnippet = buf.subarray(dictStart, streamIdx);
    const isFlate = looksFlate(dictSnippet);

    // Find start of stream data (after end of line)
    let dataStart = streamIdx + STREAM.length;
    if (buf[dataStart] === 0x0d && buf[dataStart + 1] === 0x0a) dataStart += 2;
    else if (buf[dataStart] === 0x0a) dataStart += 1;
    else if (buf[dataStart] === 0x0d) dataStart += 1;

    const endIdx = buf.indexOf(ENDSTREAM, dataStart);
    if (endIdx === -1) break;

    const streamData = buf.subarray(dataStart, endIdx);
    let contentBuf: Buffer | null = null;
    if (isFlate) {
      try {
        contentBuf = inflateSync(streamData);
      } catch {
        contentBuf = null;
      }
    } else {
      contentBuf = Buffer.from(streamData);
    }

    if (contentBuf) {
      const contentStr = contentBuf.toString("latin1");
      foundTexts.push(...extractTextFromContentStream(contentStr));
    }

    idx = endIdx + ENDSTREAM.length;
  }

  // Join and normalize whitespace
  return foundTexts
    .join("\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

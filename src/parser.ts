import { XMLParser } from "fast-xml-parser";
import type { Attributes, Measure, Note, Part, Score } from "./model";

const ARRAY_TAGS = new Set(["part", "score-part", "measure", "note", "dot", "attributes", "clef"]);

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseTagValue: false,
  isArray: (name) => ARRAY_TAGS.has(name),
});

type Node = Record<string, any>;

const num = (v: unknown): number | undefined => {
  if (v === undefined || v === null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

function parseAttributes(list: Node[] | undefined): Attributes {
  const out: Attributes = {};
  for (const a of list ?? []) {
    out.divisions = num(a.divisions) ?? out.divisions;
    out.fifths = num(a.key?.fifths) ?? out.fifths;
    out.beats = num(a.time?.beats) ?? out.beats;
    out.beatType = num(a.time?.["beat-type"]) ?? out.beatType;
    const clef: Node | undefined = a.clef?.[0];
    if (clef?.sign) {
      out.clef = { sign: String(clef.sign), line: num(clef.line) ?? (clef.sign === "F" ? 4 : 2) };
    }
  }
  return out;
}

function parseNote(n: Node): Note {
  const rest = n.rest !== undefined;
  return {
    rest,
    chord: n.chord !== undefined,
    step: rest ? undefined : String(n.pitch?.step ?? "C"),
    octave: rest ? undefined : (num(n.pitch?.octave) ?? 4),
    alter: num(n.pitch?.alter),
    duration: num(n.duration) ?? 0,
    type: n.type ? String(n.type) : "quarter",
    dots: Array.isArray(n.dot) ? n.dot.length : 0,
  };
}

export function parseMusicXml(xml: string): Score {
  const root = parser.parse(xml);
  if (root["score-timewise"] !== undefined) throw new Error("score-timewise 形式は未対応です(score-partwise のみ)");
  const sp: Node | undefined = root["score-partwise"] || undefined;
  if (!sp) throw new Error("MusicXML(score-partwise)として読めませんでした");

  const names = new Map<string, string>();
  for (const p of sp["part-list"]?.["score-part"] ?? []) {
    names.set(p["@_id"], String(p["part-name"] ?? ""));
  }

  const parts: Part[] = (sp.part ?? []).map((p: Node): Part => {
    const measures: Measure[] = (p.measure ?? []).map((m: Node, i: number): Measure => ({
      number: String(m["@_number"] ?? i + 1),
      attributes: parseAttributes(m.attributes),
      notes: (m.note ?? []).map(parseNote),
    }));
    return { id: String(p["@_id"] ?? ""), name: names.get(p["@_id"]) ?? "", measures };
  });

  return {
    title: String(sp.work?.["work-title"] ?? sp["movement-title"] ?? ""),
    parts,
  };
}

import type { Attributes, Measure, Note, Part, Score } from "./model";

const SPACE = 10; // 譜線の間隔
const STAFF_H = SPACE * 4;
const LEFT = 20;
const SYSTEM_GAP = 100;
const STEPS = ["C", "D", "E", "F", "G", "A", "B"];

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** 五線の最下線の diatonic 位置 (C0=0, 1段 = 1) */
export function bottomLinePosition(clef: { sign: string; line: number }): number {
  // 基準: G クレフ line2 = E4(30)、F クレフ line4 = G2(18)、C クレフ line3 = F3(24)
  const base = clef.sign === "F" ? 18 + (clef.line - 4) * 2 : clef.sign === "C" ? 24 + (clef.line - 3) * 2 : 30 + (clef.line - 2) * 2;
  return base;
}

export function diatonicPosition(step: string, octave: number): number {
  return octave * 7 + Math.max(0, STEPS.indexOf(step));
}

const durationWeight = (n: Note, divisions: number) => (n.duration / Math.max(divisions, 1)) * 36;

interface Event {
  notes: Note[];
  rest: boolean;
}

function groupEvents(notes: Note[]): Event[] {
  const events: Event[] = [];
  for (const n of notes) {
    const last = events[events.length - 1];
    if (n.chord && last && !last.rest) last.notes.push(n);
    else events.push({ notes: [n], rest: n.rest });
  }
  return events;
}

function measureWidth(m: Measure, divisions: number, header: number): number {
  const body = groupEvents(m.notes).reduce((w, e) => w + 22 + durationWeight(e.notes[0], divisions), 0);
  return Math.max(90, header + body + 16);
}

function headerWidth(first: boolean, showKey: number, showTime: boolean): number {
  return 34 + (showKey > 0 ? showKey * 9 + 8 : 0) + (showTime && first ? 24 : 0);
}

function drawNote(ev: Event, x: number, bottomY: number, base: number, out: string[]): void {
  const half = SPACE / 2;
  const yOf = (p: number) => bottomY - (p - base) * half;
  const type = ev.notes[0].type;

  if (ev.rest) {
    const top = bottomY - STAFF_H;
    if (type === "whole") out.push(`<rect class="rest" x="${x - 5}" y="${top + SPACE}" width="10" height="${half}"/>`);
    else if (type === "half") out.push(`<rect class="rest" x="${x - 5}" y="${top + 2 * SPACE - half}" width="10" height="${half}"/>`);
    else out.push(`<path class="rest" d="M${x - 3} ${top + 12} l6 6 l-6 6 l6 6" fill="none" stroke="currentColor" stroke-width="2"/>`);
    return;
  }

  const positions = ev.notes.map((n) => diatonicPosition(n.step!, n.octave!));
  const lo = Math.min(...positions);
  const hi = Math.max(...positions);
  const mid = base + 4;
  const stemUp = (lo + hi) / 2 < mid;
  const filled = type !== "whole" && type !== "half";

  ev.notes.forEach((n, i) => {
    const p = positions[i];
    const y = yOf(p);
    // 加線
    for (let lp = base - 2; lp >= p; lp -= 2) out.push(`<line class="ledger" x1="${x - 9}" x2="${x + 9}" y1="${yOf(lp)}" y2="${yOf(lp)}"/>`);
    for (let lp = base + 10; lp <= p; lp += 2) out.push(`<line class="ledger" x1="${x - 9}" x2="${x + 9}" y1="${yOf(lp)}" y2="${yOf(lp)}"/>`);
    out.push(`<ellipse class="head${filled ? " filled" : ""}" cx="${x}" cy="${y}" rx="6" ry="4.5" transform="rotate(-20 ${x} ${y})"/>`);
    if (n.alter) out.push(`<text class="acc" x="${x - 16}" y="${y + 4}">${n.alter > 0 ? "♯" : "♭"}</text>`);
    for (let d = 0; d < n.dots; d++) out.push(`<circle class="dot" cx="${x + 11 + d * 5}" cy="${y - (p % 2 === 0 ? half : 0) + 0}" r="1.6"/>`);
  });

  if (type !== "whole") {
    const sx = stemUp ? x + 5.5 : x - 5.5;
    const y1 = yOf(stemUp ? lo : hi);
    const y2 = yOf(stemUp ? hi : lo) + (stemUp ? -3.5 : 3.5) * SPACE;
    out.push(`<line class="stem" x1="${sx}" x2="${sx}" y1="${y1}" y2="${y2}"/>`);
    const flags = type === "eighth" ? 1 : type === "16th" ? 2 : type === "32nd" ? 3 : 0;
    for (let f = 0; f < flags; f++) {
      const fy = y2 + (stemUp ? f * 6 : -f * 6);
      out.push(`<path class="flag" d="M${sx} ${fy} q8 ${stemUp ? 6 : -6} 5 ${stemUp ? 14 : -14}" fill="none" stroke="currentColor" stroke-width="1.6"/>`);
    }
  }
}

function drawKey(fifths: number, x: number, bottomY: number, base: number, out: string[]): void {
  // 簡易: 調号は G/F クレフの標準位置を使う(C クレフでも同じ配置で描く)
  const sharpsTreble = [38, 35, 39, 36, 33, 37, 34]; // F5 C5 G5 D5 A4 E5 B4
  const flatsTreble = [34, 37, 33, 36, 32, 35, 31]; // B4 E5 A4 D5 G4 C5 F4
  const offset = base - 30; // クレフに合わせて平行移動
  const list = fifths > 0 ? sharpsTreble : flatsTreble;
  for (let i = 0; i < Math.abs(fifths); i++) {
    const y = bottomY - (list[i] + offset - base) * (SPACE / 2);
    out.push(`<text class="key" x="${x + i * 9}" y="${y + 4}">${fifths > 0 ? "♯" : "♭"}</text>`);
  }
}

function renderPart(part: Part, width: number, startY: number, out: string[]): number {
  let attrs: Attributes = { divisions: 1, fifths: 0, beats: 4, beatType: 4, clef: { sign: "G", line: 2 } };
  const maxX = width - LEFT;
  let bottomY = startY + 40 + STAFF_H; // 最初のシステムの最下線
  out.push(`<text class="part-name" x="${LEFT}" y="${startY + 14}">${esc(part.name)}</text>`);

  let x = LEFT;
  let systemStart = true;
  let systemMeasures: { x: number; w: number }[] = [];
  let prevTime = "";

  const flushSystem = () => {
    if (!systemMeasures.length) return;
    const last = systemMeasures[systemMeasures.length - 1];
    for (let i = 0; i < 5; i++) out.push(`<line class="staff" x1="${LEFT}" x2="${last.x + last.w}" y1="${bottomY - i * SPACE}" y2="${bottomY - i * SPACE}"/>`);
    out.push(`<line class="bar" x1="${LEFT}" x2="${LEFT}" y1="${bottomY - STAFF_H}" y2="${bottomY}"/>`);
    for (const m of systemMeasures) out.push(`<line class="bar" x1="${m.x + m.w}" x2="${m.x + m.w}" y1="${bottomY - STAFF_H}" y2="${bottomY}"/>`);
    systemMeasures = [];
  };

  const headerFor = (first: boolean, merged: Attributes, showTime: boolean) =>
    first ? headerWidth(true, Math.abs(merged.fifths ?? 0), showTime) : showTime ? 24 : 0;

  for (const m of part.measures) {
    const merged: Attributes = { ...attrs, ...Object.fromEntries(Object.entries(m.attributes).filter(([, v]) => v !== undefined)) };
    const divisions = merged.divisions ?? 1;
    const timeKey = `${merged.beats}/${merged.beatType}`;
    const showTime = timeKey !== prevTime;

    if (!systemStart && x + measureWidth(m, divisions, headerFor(false, merged, showTime)) > maxX) {
      flushSystem();
      bottomY += SYSTEM_GAP;
      x = LEFT;
      systemStart = true;
    }

    const mw = measureWidth(m, divisions, headerFor(systemStart, merged, showTime));
    const clef = merged.clef ?? { sign: "G", line: 2 };
    const base = bottomLinePosition(clef);

    let cx = x;
    if (systemStart) {
      const glyph = clef.sign === "F" ? "𝄢" : clef.sign === "C" ? "𝄡" : "𝄞";
      out.push(`<text class="clef" x="${cx + 4}" y="${bottomY - (clef.sign === "F" ? 6 : clef.sign === "C" ? 14 : 8)}">${glyph}</text>`);
      cx += 34;
      if ((merged.fifths ?? 0) !== 0) {
        drawKey(merged.fifths!, cx, bottomY, base, out);
        cx += Math.abs(merged.fifths!) * 9 + 8;
      }
    }
    if (showTime) {
      out.push(`<text class="time" x="${cx + 2}" y="${bottomY - 20}">${merged.beats}</text><text class="time" x="${cx + 2}" y="${bottomY}">${merged.beatType}</text>`);
      cx += 24;
      prevTime = timeKey;
    }
    out.push(`<text class="mnum" x="${x + 2}" y="${bottomY - STAFF_H - 8}">${esc(m.number)}</text>`);

    let nx = cx + 14;
    for (const ev of groupEvents(m.notes)) {
      drawNote(ev, nx, bottomY, base, out);
      nx += 22 + durationWeight(ev.notes[0], divisions);
    }

    systemMeasures.push({ x, w: mw });
    x += mw;
    systemStart = false;
    attrs = merged;
  }
  flushSystem();
  return bottomY + 50;
}

export function renderScore(score: Score, width = 900): string {
  const out: string[] = [];
  let y = 10;
  if (score.title) {
    out.push(`<text class="title" x="${width / 2}" y="${y + 24}" text-anchor="middle">${esc(score.title)}</text>`);
    y += 40;
  }
  for (const part of score.parts) y = renderPart(part, width, y, out);
  const style = `.staff,.bar,.ledger,.stem{stroke:currentColor;stroke-width:1}.bar{stroke-width:1.2}.head{fill:none;stroke:currentColor;stroke-width:1.5}.head.filled{fill:currentColor}.dot{fill:currentColor}.rest{fill:currentColor}text{fill:currentColor;font-family:serif}.clef{font-size:44px}.time{font-size:20px;font-weight:bold;text-anchor:start}.acc,.key{font-size:16px}.mnum{font-size:10px;opacity:.6}.part-name{font-size:13px}.title{font-size:22px}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${y}" width="${width}" height="${y}"><style>${style}</style>${out.join("")}</svg>`;
}

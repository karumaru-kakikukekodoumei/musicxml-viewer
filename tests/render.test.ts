import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { parseMusicXml } from "../src/parser";
import { bottomLinePosition, diatonicPosition, renderScore } from "../src/render";

const count = (s: string, re: RegExp) => (s.match(re) ?? []).length;

describe("位置計算", () => {
  it("G クレフの最下線は E4、F クレフは G2", () => {
    expect(bottomLinePosition({ sign: "G", line: 2 })).toBe(diatonicPosition("E", 4));
    expect(bottomLinePosition({ sign: "F", line: 4 })).toBe(diatonicPosition("G", 2));
  });
});

describe("renderScore", () => {
  const svg = renderScore(parseMusicXml(readFileSync("public/sample.musicxml", "utf8")), 900);

  it("SVG を返し、音符の数だけ符頭がある", () => {
    expect(svg.startsWith("<svg")).toBe(true);
    expect(count(svg, /class="head/g)).toBe(14);
  });

  it("全音符以外には符幹がある(全部 quarter/half なので符頭と同数)", () => {
    expect(count(svg, /class="stem"/g)).toBe(14);
  });

  it("2分音符は白抜き、4分音符は塗り", () => {
    expect(count(svg, /class="head filled"/g)).toBe(12);
    expect(count(svg, /class="head"/g)).toBe(2);
  });

  it("中央のドごとに加線が1本ある", () => {
    expect(count(svg, /class="ledger"/g)).toBe(3); // C4 は1小節目に2つ、4小節目に1つ
  });

  it("幅が狭いと改行して五線が増える", () => {
    const narrow = renderScore(parseMusicXml(readFileSync("public/sample.musicxml", "utf8")), 300);
    expect(count(narrow, /class="staff"/g)).toBeGreaterThan(count(svg, /class="staff"/g));
  });

  it("題名の特殊文字をエスケープする", () => {
    const out = renderScore({ title: "<b>&", parts: [] });
    expect(out).toContain("&lt;b&gt;&amp;");
  });
});

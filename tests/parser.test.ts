import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { parseMusicXml } from "../src/parser";

const sample = readFileSync("public/sample.musicxml", "utf8");

describe("parseMusicXml", () => {
  it("タイトル・パート・小節を読む", () => {
    const s = parseMusicXml(sample);
    expect(s.title).toBe("きらきら星(抜粋)");
    expect(s.parts).toHaveLength(1);
    expect(s.parts[0].name).toBe("Piano");
    expect(s.parts[0].measures).toHaveLength(4);
  });

  it("属性(拍子・調・音部記号)を読む", () => {
    const a = parseMusicXml(sample).parts[0].measures[0].attributes;
    expect(a).toMatchObject({ divisions: 1, fifths: 0, beats: 4, beatType: 4, clef: { sign: "G", line: 2 } });
  });

  it("音符と休符・和音・付点を読む", () => {
    const xml = `<score-partwise><part-list><score-part id="P1"><part-name>x</part-name></score-part></part-list>
      <part id="P1"><measure number="1">
        <note><pitch><step>C</step><alter>1</alter><octave>5</octave></pitch><duration>3</duration><type>quarter</type><dot/></note>
        <note><chord/><pitch><step>E</step><octave>5</octave></pitch><duration>3</duration><type>quarter</type></note>
        <note><rest/><duration>1</duration><type>eighth</type></note>
      </measure></part></score-partwise>`;
    const n = parseMusicXml(xml).parts[0].measures[0].notes;
    expect(n[0]).toMatchObject({ step: "C", octave: 5, alter: 1, dots: 1, chord: false });
    expect(n[1].chord).toBe(true);
    expect(n[2].rest).toBe(true);
  });

  it("score-partwise 以外はエラー", () => {
    expect(() => parseMusicXml("<foo/>")).toThrow();
    expect(() => parseMusicXml("<score-timewise/>")).toThrow(/timewise/);
  });
});

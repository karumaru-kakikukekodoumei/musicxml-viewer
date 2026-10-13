import { parseMusicXml } from "./parser";
import { renderScore } from "./render";
import sample from "../public/sample.musicxml?raw";

const view = document.getElementById("score")!;
const errorEl = document.getElementById("error")!;

function show(xml: string): void {
  errorEl.textContent = "";
  try {
    view.innerHTML = renderScore(parseMusicXml(xml), Math.max(600, Math.min(view.clientWidth || 900, 1400)));
  } catch (e) {
    errorEl.textContent = e instanceof Error ? e.message : String(e);
  }
}

document.getElementById("file")!.addEventListener("change", async (ev) => {
  const f = (ev.target as HTMLInputElement).files?.[0];
  if (f) show(await f.text());
});

const loadSample = () => show(sample);
document.getElementById("sample")!.addEventListener("click", loadSample);
loadSample();

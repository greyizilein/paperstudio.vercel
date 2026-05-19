export type DiffParagraph = {
  text: string;
  type: "unchanged" | "modified" | "added" | "deleted";
  diffHtml?: string;
  originalText?: string;
};

function jaccardSim(a: string, b: string): number {
  const wa = new Set(a.toLowerCase().split(/\s+/).filter(Boolean));
  const wb = new Set(b.toLowerCase().split(/\s+/).filter(Boolean));
  const inter = [...wa].filter(w => wb.has(w)).length;
  const union = new Set([...wa, ...wb]).size;
  return union === 0 ? 1 : inter / union;
}

function wordLevelDiff(original: string, revised: string): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const ot = original.split(/(\s+)/).filter(Boolean);
  const rt = revised.split(/(\s+)/).filter(Boolean);
  const m = ot.length, n = rt.length;
  let prev = new Array(n + 1).fill(0);
  let curr = new Array(n + 1).fill(0);
  const dp: number[][] = [prev.slice()];
  for (let i = 1; i <= m; i++) {
    curr = new Array(n + 1).fill(0);
    for (let j = 1; j <= n; j++) {
      curr[j] = ot[i-1] === rt[j-1] ? dp[i-1][j-1] + 1 : Math.max(dp[i-1][j], curr[j-1]);
    }
    dp.push(curr.slice());
    prev = curr;
  }
  type Op = { text: string; op: "same" | "del" | "ins" };
  const ops: Op[] = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && ot[i-1] === rt[j-1]) {
      ops.unshift({ text: ot[i-1], op: "same" }); i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j-1] >= dp[i-1][j])) {
      ops.unshift({ text: rt[j-1], op: "ins" }); j--;
    } else {
      ops.unshift({ text: ot[i-1], op: "del" }); i--;
    }
  }
  const merged: Op[] = [];
  for (const op of ops) {
    const last = merged[merged.length - 1];
    if (last && last.op === op.op) last.text += op.text; else merged.push({ ...op });
  }
  return merged.map(op =>
    op.op === "same" ? esc(op.text) :
    op.op === "del"  ? `<del class="diff-del">${esc(op.text)}</del>` :
                       `<ins class="diff-ins">${esc(op.text)}</ins>`
  ).join("");
}

export function computeParaDiff(original: string, revised: string): DiffParagraph[] {
  const origParas = original.split(/\n\n+/).filter(p => p.trim());
  const revParas  = revised.split(/\n\n+/).filter(p => p.trim());
  const result: DiffParagraph[] = [];
  const origUsed = new Set<number>();

  for (const rp of revParas) {
    let bestIdx = -1, bestSim = 0;
    for (let i = 0; i < origParas.length; i++) {
      if (origUsed.has(i)) continue;
      const s = jaccardSim(origParas[i], rp);
      if (s > bestSim) { bestSim = s; bestIdx = i; }
    }
    if (bestSim > 0.92) {
      origUsed.add(bestIdx);
      result.push({ text: rp, type: "unchanged" });
    } else if (bestSim > 0.25) {
      origUsed.add(bestIdx);
      const diffHtml = wordLevelDiff(origParas[bestIdx], rp);
      result.push({ text: rp, type: "modified", diffHtml, originalText: origParas[bestIdx] });
    } else {
      result.push({ text: rp, type: "added" });
    }
  }
  for (let i = 0; i < origParas.length; i++) {
    if (!origUsed.has(i)) result.push({ text: origParas[i], type: "deleted", originalText: origParas[i] });
  }
  return result;
}

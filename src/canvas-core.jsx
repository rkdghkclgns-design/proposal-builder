/* ============================================================
   Free-Canvas Deck (B안) — 슬라이드의 모든 요소를 자유롭게
   선택·이동·크기조정. doc.deck 에 위치정보 저장.
   ============================================================ */
const CV_W = 1120, CV_H = 630;
const { useState: cState, useRef: cRef, useEffect: cEffect, useLayoutEffect: cLayout, useMemo: cMemo, useCallback: cCb } = React;

/* ---------- 번호 계산 (1 > 1 > A > • > –) ---------- */
function letterOf(n) { let s = ""; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }

function deckNumbering(deck) {
  let c1 = 0, c2 = 0, c3 = 0;
  const byId = {}; const toc = [];
  (deck.slides || []).forEach((sl) => {
    const heads = (sl.elements || []).filter((e) => e.kind === "text" && e.level >= 1).slice().sort((a, b) => a.y - b.y || a.x - b.x);
    heads.forEach((e) => {
      if (e.level === 1) { c1++; c2 = 0; c3 = 0; byId[e.id] = c1 + "."; toc.push({ id: e.id, level: 1, num: c1 + ".", text: e.text }); }
      else if (e.level === 2) { c2++; c3 = 0; byId[e.id] = c2 + "."; toc.push({ id: e.id, level: 2, num: c2 + ".", text: e.text }); }
      else if (e.level === 3) { c3++; byId[e.id] = letterOf(c3); toc.push({ id: e.id, level: 3, num: letterOf(c3), text: e.text }); }
      else if (e.level === 4) { byId[e.id] = "•"; toc.push({ id: e.id, level: 4, num: "•", text: e.text }); }
      else { byId[e.id] = "–"; }
    });
  });
  return { byId, toc };
}

/* ---------- 아웃라인 블록 → 자유캔버스 덱 생성 ---------- */
function estimateTextH(text, fontSize, w, lh = 1.5) {
  const cpl = Math.max(6, Math.floor(w / (fontSize * 0.62)));
  const lines = Math.max(1, Math.ceil((text || "").length / cpl));
  return Math.ceil(lines * fontSize * lh) + 6;
}
function uid() { return GS.uid(); }

function buildDeckFromBlocks(doc) {
  const PX = 72, CW = CV_W - PX * 2;
  const slides = [];
  const meta = doc.meta || {};
  const tags = [];
  (meta.tagGroups || []).forEach((g) => (g.options || []).forEach((o) => { if (o.on) tags.push(o.label); }));

  // 1) 타이틀
  slides.push({ id: uid(), kind: "title", bg: "title", elements: [
    { id: uid(), kind: "text", level: 0, text: tags.join("   ·   "), x: PX, y: 150, w: CW, h: 40, fontSize: 16, color: "accent", bold: true, align: "left" },
    { id: uid(), kind: "rule", x: PX, y: 200, w: 72, h: 6 },
    { id: uid(), kind: "text", level: 0, text: meta.title || "제목 없음", x: PX, y: 226, w: CW, h: 120, fontSize: 60, color: "ink", bold: true, serif: true, align: "left" },
    { id: uid(), kind: "text", level: 0, text: meta.subtitle || "상세 기획서", x: PX, y: 360, w: CW, h: 50, fontSize: 26, color: "soft", bold: true, align: "left" },
    { id: uid(), kind: "text", level: 0, text: [meta.dept, meta.author, meta.date].filter(Boolean).join("   ·   "), x: PX, y: 470, w: CW, h: 40, fontSize: 16, color: "muted", align: "left" },
  ] });

  // 2) 목차
  if (doc.showToc) slides.push({ id: uid(), kind: "agenda", bg: "white", elements: [
    { id: uid(), kind: "toc", x: PX, y: 110, w: CW, h: 420, depth: doc.tocDepth || 2 },
  ] });

  // 3) 섹션별
  const blocks = doc.blocks || [];
  const groups = [];
  blocks.forEach((b) => {
    const isL1 = b.type === "outline" && b.level === 1;
    if (isL1 || !groups.length) groups.push({ head: isL1 ? b : null, items: [] });
    groups[groups.length - 1].items.push(b);
  });

  groups.forEach((g) => {
    if (g.head) {
      slides.push({ id: uid(), kind: "section", bg: "dark", elements: [
        { id: uid(), kind: "text", level: 1, text: g.head.text, x: PX, y: 300, w: CW, h: 110, fontSize: 48, color: "white", bold: true, align: "left", _section: true },
      ] });
    }
    const content = g.items.filter((b) => b !== g.head);
    let y = 132, els = [];
    const pushSlide = () => { slides.push({ id: uid(), kind: "content", bg: "white", section: g.head ? g.head.text : "", elements: els }); els = []; y = 132; };
    content.forEach((b) => {
      let el, h;
      if (b.type === "outline") {
        const fs = b.level === 2 ? 26 : b.level === 3 ? 19 : b.level === 4 ? 16 : 15;
        h = estimateTextH(b.text, fs, CW - (b.level >= 4 ? 40 : 0)) + (b.level === 2 ? 14 : 6);
        el = { id: uid(), kind: "text", level: b.level, text: b.text, x: PX + (b.level >= 4 ? 30 : 0), y, w: CW - (b.level >= 4 ? 30 : 0), h, fontSize: fs, align: "left" };
      } else if (b.type === "table") {
        h = 44 + (b.rows ? b.rows.length : 1) * 38 + (b.caption ? 26 : 0);
        el = { id: uid(), kind: "table", columns: b.columns, rows: b.rows, keyCol: b.keyCol, caption: b.caption, x: PX, y, w: CW, h };
      } else if (b.type === "image") {
        h = 220; el = { id: uid(), kind: "image", src: b.src || "", caption: b.caption || "", x: PX + CW * 0.1, y, w: CW * 0.8, h };
      } else if (b.type === "callout") {
        h = estimateTextH(b.text, 16, CW - 40) + 24;
        el = { id: uid(), kind: "callout", variant: b.variant, text: b.text, x: PX, y, w: CW, h };
      }
      if (!el) return;
      if (els.length && y + h > CV_H - 70) pushSlide();
      el.y = y; els.push(el); y += h + 14;
    });
    if (els.length || g.head) pushSlide();
  });

  return { slides, srcKey: deckSrcKey(doc) };
}

function deckSrcKey(doc) {
  return (doc.blocks || []).map((b) => b.type === "outline" ? "o" + b.level + (b.text || "") : b.type).join("|") + "/" + (doc.showToc ? 1 : 0);
}

/* ---------- 색상 헬퍼 ---------- */
const COLOR = { ink: "var(--ink)", soft: "var(--ink-soft)", muted: "var(--muted)", accent: "var(--accent)", white: "#fff", faint: "var(--faint)" };

window.CanvasKit = { CV_W, CV_H, deckNumbering, buildDeckFromBlocks, letterOf, deckSrcKey };

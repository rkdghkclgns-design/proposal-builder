/* ============================================================
   DeckExport — 자유캔버스 덱 → PPTX(편집가능) / PNG
   window.DeckExport = { pptx(doc), png(slideEl, name) }
   ============================================================ */
(function () {
  "use strict";
  const CV_W = 1120, CV_H = 630;
  const IN = 13.333 / CV_W;            // px → inch
  const inX = (px) => +(px * IN).toFixed(3);
  const PT = 0.75;                      // px → pt
  const HEX = { ink: "1C1F24", soft: "3A3F47", muted: "7B818B", accent: "233148", white: "FFFFFF", faint: "A7ACB4", inkdark: "1D2C46" };
  const hex = (c) => { if (!c) return null; if (c[0] === "#") return c.slice(1).toUpperCase(); return HEX[c] || null; };
  const BG = { white: "FFFFFF", dark: "1D2C46", title: "EFF3FA", soft: "EEF2F8" };
  const strip = (s) => String(s || "").replace(/\*\*([^*]+)\*\*/g, "$1").replace(/__([^_]+)__/g, "$1").replace(/\*([^*]+)\*/g, "$1").replace(/`([^`]+)`/g, "$1").replace(/~~([^~]+)~~/g, "$1").replace(/==([^=]+)==/g, "$1").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  const face = (el) => el.fontFamily === "var(--font-serif)" || el.serif ? "Batang" : "Malgun Gothic";

  function pptx(doc) {
    if (!window.PptxGenJS) { alert("PPTX 라이브러리를 불러오지 못했습니다."); return; }
    const deck = doc.deck; if (!deck || !deck.slides) { alert("슬라이드가 없습니다."); return; }
    const num = window.CanvasKit.deckNumbering(deck);
    const P = new window.PptxGenJS();
    P.defineLayout({ name: "W16x9", width: 13.333, height: 7.5 });
    P.layout = "W16x9";

    deck.slides.forEach((sl) => {
      const s = P.addSlide();
      s.background = { color: BG[sl.bg] || "FFFFFF" };
      const dark = sl.bg === "dark";
      // kicker
      const kick = sl.kind === "content" && sl.section ? sl.section : null;
      if (kick) s.addText(strip(kick), { x: inX(72), y: inX(48), w: inX(900), h: 0.4, fontSize: 15 * PT * 1.3, bold: true, color: hex("accent"), fontFace: "Malgun Gothic" });

      const els = (sl.elements || []).slice().sort((a, b) => (a.z || 1) - (b.z || 1));
      els.forEach((el) => {
        const box = { x: inX(el.x), y: inX(el.y), w: inX(el.w), h: inX(Math.max(el.h, 12)) };
        if (el.kind === "text") {
          const marker = el.level >= 1 ? (num.byId[el.id] || "") : "";
          const txt = (marker ? marker + "  " : "") + strip(el.text);
          const opt = Object.assign({}, box, {
            fontSize: Math.round((el.fontSize || 16) * PT),
            bold: !!el.bold || el.level >= 1, italic: !!el.italic,
            color: hex(el.color) || (dark ? "FFFFFF" : "1C1F24"),
            align: el.align === "justify" ? "left" : (el.align || "left"),
            valign: "top", fontFace: face(el), lineSpacingMultiple: el.lineHeight || 1.3,
          });
          if (el.highlight) opt.highlight = hex(el.highlight);
          s.addText(txt || " ", opt);
        } else if (el.kind === "callout") {
          s.addText(strip(el.text), Object.assign({}, box, { fontSize: 15 * PT * 1.3, color: el.variant === "warn" ? "B23B2E" : "1D2C46", fill: { color: el.variant === "warn" ? "FBECEA" : "EEF2F8" }, line: { color: el.variant === "warn" ? "B23B2E" : "233148", width: 1 }, align: "left", valign: "middle", margin: 6, fontFace: "Malgun Gothic" }));
        } else if (el.kind === "image" && el.src) {
          s.addImage({ data: el.src, x: box.x, y: box.y, w: box.w, h: box.h });
        } else if (el.kind === "table") {
          const head = (el.columns || []).map((c) => ({ text: strip(c), options: { bold: true, color: "FFFFFF", fill: { color: "233148" } } }));
          const body = (el.rows || []).map((r) => r.map((cell, ci) => ({ text: strip(cell), options: { bold: el.keyCol && ci === 0 } })));
          s.addTable([head, ...body], Object.assign({}, box, { fontSize: 12, color: "1C1F24", border: { type: "solid", color: "D4D8DE", pt: 0.5 }, fontFace: "Malgun Gothic", valign: "top" }));
        } else if (el.kind === "shape") {
          const col = hex(el.stroke) || "233148";
          if (el.shape === "rect") s.addShape(P.ShapeType.rect, Object.assign({}, box, { fill: el.fill && el.fill !== "transparent" ? { color: hex(el.fill) } : { type: "none" }, line: { color: col, width: el.strokeW || 2 }, rectRadius: (el.radius || 0) * IN }));
          else if (el.shape === "ellipse") s.addShape(P.ShapeType.ellipse, Object.assign({}, box, { fill: el.fill && el.fill !== "transparent" ? { color: hex(el.fill) } : { type: "none" }, line: { color: col, width: el.strokeW || 2 } }));
          else { const y = inX(el.y + (el.h || 2) / 2); s.addShape(P.ShapeType.line, { x: inX(el.x), y, w: inX(el.w), h: 0, line: { color: col, width: el.strokeW || 3, endArrowType: el.shape === "arrow" ? "triangle" : "none" } }); }
        } else if (el.kind === "toc") {
          const depth = el.depth || 2;
          const entries = num.toc.filter((t) => t.level <= depth);
          const runs = [{ text: "목차\n", options: { fontSize: 22, bold: true, color: "1D2C46", paraSpaceAfter: 10 } }];
          entries.forEach((t) => runs.push({ text: t.num + "  " + strip(t.text) + "\n", options: { fontSize: t.level === 1 ? 18 : 14, bold: t.level === 1, color: t.level === 1 ? "1D2C46" : "3A3F47", indentLevel: t.level - 1, paraSpaceAfter: 4 } }));
          s.addText(runs, Object.assign({}, box, { align: "left", valign: "top", fontFace: "Malgun Gothic" }));
        }
      });
      if (sl.notes) s.addNotes(sl.notes);
    });

    P.writeFile({ fileName: (doc.title || "기획서") + ".pptx" });
  }

  async function png(slideEl, name) {
    if (!window.html2canvas) { alert("이미지 라이브러리를 불러오지 못했습니다."); return; }
    const prevT = slideEl.style.transform; slideEl.style.transform = "none";
    try {
      const canvas = await window.html2canvas(slideEl, { width: CV_W, height: CV_H, scale: 2, backgroundColor: null, useCORS: true });
      const a = document.createElement("a"); a.href = canvas.toDataURL("image/png"); a.download = (name || "slide") + ".png"; a.click();
    } catch (e) { alert("이미지 내보내기 실패: " + e.message); }
    slideEl.style.transform = prevT;
  }

  window.DeckExport = { pptx, png };
})();

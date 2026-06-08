/* ============================================================
   Numbering — auto numbering for outline blocks
   Level 1 : 1.  2.  3.        (major section, new page)
   Level 2 : 1.  2.  3.        (sub heading, resets per L1)
   Level 3 : A   B   C         (resets per L1/L2)
   Level 4 : •                 (bullet)
   Level 5 : –                 (sub bullet)
   Exposes window.GS.numbering
   ============================================================ */
(function () {
  "use strict";
  function letter(n) {
    // 1 -> A, 26 -> Z, 27 -> AA
    let s = "";
    while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
    return s;
  }

  function compute(blocks) {
    let c1 = 0, c2 = 0, c3 = 0;
    const byId = {};
    const toc = [];
    for (const b of blocks) {
      if (b.type !== "outline") continue;
      switch (b.level) {
        case 1:
          c1++; c2 = 0; c3 = 0;
          byId[b.id] = c1 + ".";
          toc.push({ id: b.id, level: 1, num: c1 + ".", text: b.text });
          break;
        case 2:
          c2++; c3 = 0;
          byId[b.id] = c2 + ".";
          toc.push({ id: b.id, level: 2, num: c2 + ".", text: b.text });
          break;
        case 3:
          c3++;
          byId[b.id] = letter(c3);
          break;
        case 4:
          byId[b.id] = "•";
          break;
        case 5:
        default:
          byId[b.id] = "–";
          break;
      }
    }
    return { byId, toc };
  }

  window.GS = window.GS || {};
  window.GS.numbering = { compute, letter };
})();

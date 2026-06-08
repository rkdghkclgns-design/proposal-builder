/* ============================================================
   CanvasDeck — 자유캔버스 덱 컨트롤러 (편집/미리보기 공용)
   props: doc, onChange, editable
   ============================================================ */
function CanvasDeck({ doc, onChange, editable, rev }) {
  const genFrom = () => CK.buildDeckFromBlocks(doc);
  const [deck, setDeck] = cState(() => (doc.deck && doc.deck.slides && doc.deck.slides.length ? doc.deck : genFrom()));
  const deckRef = cRef(deck); deckRef.current = deck;
  const [sel, setSel] = cState(null);          // {slideId, elId}  (primary)
  const [selExtra, setSelExtra] = cState([]);   // 추가 선택 elId (같은 슬라이드)
  const [editing, setEditing] = cState(null);   // elId | "__img__"+elId
  const [scale, setScale] = cState(0.7);
  const [guides, setGuides] = cState(null);     // {slideId, v:[x..], h:[y..]}
  const [marquee, setMarquee] = cState(null);   // {slideId, x,y,w,h}
  const scrollRef = cRef(null);
  const fileRef = cRef(null);
  const imgTargetRef = cRef(null);
  const clipRef = cRef(null);   // 복사된 요소 배열
  const imgHandledRef = cRef(false);
  const dragSnapRef = cRef(null);
  const railDrag = cRef(null);

  const numbering = cMemo(() => CK.deckNumbering(deck), [deck]);

  // 최초 생성분 저장
  cEffect(() => { if (!(doc.deck && doc.deck.slides && doc.deck.slides.length)) onChange({ ...doc, deck }); /* eslint-disable-next-line */ }, []);

  // 외부 복원(undo/redo) → 로컬 덱 동기화
  cEffect(() => { if (rev && doc.deck) { setDeck(doc.deck); deckRef.current = doc.deck; setSel(null); setEditing(null); } /* eslint-disable-next-line */ }, [rev]);

  // fit-to-width
  cEffect(() => {
    const el = scrollRef.current; if (!el) return;
    const fit = () => { const w = el.clientWidth - (editable ? 132 : 48); setScale(Math.max(0.28, Math.min(editable ? 0.9 : 1, w / CVW))); };
    fit(); const ro = new ResizeObserver(fit); ro.observe(el); return () => ro.disconnect();
  }, [editable]);

  const commit = (nd) => { setDeck(nd); deckRef.current = nd; onChange({ ...doc, deck: nd }); };
  const liveSet = (nd) => { setDeck(nd); deckRef.current = nd; };

  const onChangeEl = (slideId, elId, ne, live) => {
    if (ne === null) { onChange({ ...doc, deck: deckRef.current }); return; }  // drag/resize 끝 → 저장
    const nd = { ...deckRef.current, slides: deckRef.current.slides.map((s) => s.id !== slideId ? s : { ...s, elements: s.elements.map((x) => x.id === elId ? ne : x) }) };
    if (live) liveSet(nd); else commit(nd);
  };
  const onSelectEl = (slideId, elId, additive) => {
    if (additive && sel && sel.slideId === slideId) {
      const cur = [sel.elId, ...selExtra];
      if (cur.includes(elId)) {
        const rest = cur.filter((x) => x !== elId);
        if (!rest.length) { setSel(null); setSelExtra([]); }
        else { setSel({ slideId, elId: rest[0] }); setSelExtra(rest.slice(1)); }
      } else { setSelExtra([...selExtra, elId]); }
    } else { setSel({ slideId, elId }); setSelExtra([]); }
  };
  const curSelIds = () => (sel ? [sel.elId, ...selExtra] : []);

  /* 그룹 드래그 (스냅·가이드 포함) */
  const onElDragStart = (slideId, elId) => {
    let ids = curSelIds();
    if (!sel || sel.slideId !== slideId || !ids.includes(elId)) { setSel({ slideId, elId }); setSelExtra([]); ids = [elId]; }
    const s = deckRef.current.slides.find((x) => x.id === slideId);
    const snap = {}; ids.forEach((id) => { const el = s.elements.find((x) => x.id === id); if (el) snap[id] = { x: el.x, y: el.y }; });
    dragSnapRef.current = { slideId, ids, snap, primary: elId };
  };
  const onGroupMove = (dx, dy, live) => {
    const d = dragSnapRef.current; if (!d) return;
    if (!live) { onChange({ ...doc, deck: deckRef.current }); setGuides(null); dragSnapRef.current = null; return; }
    const s = deckRef.current.slides.find((x) => x.id === d.slideId); if (!s) return;
    const p = s.elements.find((x) => x.id === d.primary); const ps = d.snap[d.primary];
    let adjx = dx, adjy = dy;
    if (p) {
      const TH = 7;
      const others = s.elements.filter((x) => !d.ids.includes(x.id));
      const px = ps.x + dx, py = ps.y + dy;
      const vTargets = [CVW / 2]; const hTargets = [CVH / 2];
      others.forEach((o) => { vTargets.push(o.x, o.x + o.w / 2, o.x + o.w); hTargets.push(o.y, o.y + o.h / 2, o.y + o.h); });
      const vg = [], hg = [];
      let bestV = null;
      [[px, 0], [px + p.w / 2, p.w / 2], [px + p.w, p.w]].forEach(([edge, off]) => vTargets.forEach((t) => { const dd = Math.abs(edge - t); if (dd < TH && (!bestV || dd < bestV.dd)) bestV = { dd, adj: t - off - ps.x, line: t }; }));
      if (bestV) { adjx = bestV.adj; vg.push(bestV.line); }
      let bestH = null;
      [[py, 0], [py + p.h / 2, p.h / 2], [py + p.h, p.h]].forEach(([edge, off]) => hTargets.forEach((t) => { const dd = Math.abs(edge - t); if (dd < TH && (!bestH || dd < bestH.dd)) bestH = { dd, adj: t - off - ps.y, line: t }; }));
      if (bestH) { adjy = bestH.adj; hg.push(bestH.line); }
      setGuides(vg.length || hg.length ? { slideId: d.slideId, v: vg, h: hg } : null);
    }
    const nd = { ...deckRef.current, slides: deckRef.current.slides.map((sl) => sl.id !== d.slideId ? sl : { ...sl, elements: sl.elements.map((x) => d.ids.includes(x.id) ? { ...x, x: Math.round(d.snap[x.id].x + adjx), y: Math.round(d.snap[x.id].y + adjy) } : x) }) };
    liveSet(nd);
  };

  /* 정렬 / 분배 */
  const alignSel = (how) => {
    const ids = curSelIds(); if (ids.length < 2 || !sel) return;
    const s = deck.slides.find((x) => x.id === sel.slideId);
    const els = s.elements.filter((e) => ids.includes(e.id));
    const minX = Math.min(...els.map((e) => e.x)), maxX = Math.max(...els.map((e) => e.x + e.w));
    const minY = Math.min(...els.map((e) => e.y)), maxY = Math.max(...els.map((e) => e.y + e.h));
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    const patch = (e) => how === "left" ? { x: minX } : how === "right" ? { x: maxX - e.w } : how === "cx" ? { x: Math.round(cx - e.w / 2) } : how === "top" ? { y: minY } : how === "bottom" ? { y: maxY - e.h } : how === "cy" ? { y: Math.round(cy - e.h / 2) } : {};
    commit({ ...deck, slides: deck.slides.map((sl) => sl.id !== sel.slideId ? sl : { ...sl, elements: sl.elements.map((e) => ids.includes(e.id) ? { ...e, ...patch(e) } : e) }) });
  };
  const distributeSel = (axis) => {
    const ids = curSelIds(); if (ids.length < 3 || !sel) return;
    const s = deck.slides.find((x) => x.id === sel.slideId);
    const els = s.elements.filter((e) => ids.includes(e.id)).slice().sort((a, b) => axis === "h" ? a.x - b.x : a.y - b.y);
    const first = els[0], last = els[els.length - 1];
    const gap = (axis === "h" ? (last.x - first.x) : (last.y - first.y)) / (els.length - 1);
    const map = {};
    els.forEach((e, i) => { map[e.id] = axis === "h" ? { x: Math.round(first.x + gap * i) } : { y: Math.round(first.y + gap * i) }; });
    commit({ ...deck, slides: deck.slides.map((sl) => sl.id !== sel.slideId ? sl : { ...sl, elements: sl.elements.map((e) => map[e.id] ? { ...e, ...map[e.id] } : e) }) });
  };

  /* 마퀴(드래그 박스) 선택 */
  const onMarquee = (slideId, box, done) => {
    if (!done) { setMarquee({ slideId, ...box }); return; }
    setMarquee(null);
    const s = deck.slides.find((x) => x.id === slideId); if (!s) return;
    const hit = s.elements.filter((e) => e.x < box.x + box.w && e.x + e.w > box.x && e.y < box.y + box.h && e.y + e.h > box.y).map((e) => e.id);
    if (hit.length) { setSel({ slideId, elId: hit[0] }); setSelExtra(hit.slice(1)); }
    else { setSel(null); setSelExtra([]); }
  };

  /* 요소 추가 */
  const addEl = (kind) => {
    const target = (sel && sel.slideId) || (deck.slides[2] || deck.slides[deck.slides.length - 1] || {}).id;
    if (!target) return;
    const cx = 200, cy = 200;
    let el = { id: GS.uid(), x: cx, y: cy, z: 10 };
    if (kind === "h2") el = { ...el, kind: "text", level: 2, text: "소제목", w: 600, h: 44, fontSize: 26, align: "left" };
    else if (kind === "h3") el = { ...el, kind: "text", level: 3, text: "항목", w: 520, h: 34, fontSize: 19, align: "left" };
    else if (kind === "bullet") el = { ...el, kind: "text", level: 4, text: "내용", w: 600, h: 30, fontSize: 16, align: "left" };
    else if (kind === "text") el = { ...el, kind: "text", level: 0, text: "텍스트", w: 480, h: 40, fontSize: 18, align: "left" };
    else if (kind === "table") el = { ...el, kind: "table", w: 760, h: 160, columns: ["변수명", "변수형", "설명"], rows: [["", "", ""], ["", "", ""]], keyCol: true, caption: "" };
    else if (kind === "image") el = { ...el, kind: "image", w: 520, h: 300, src: "", caption: "" };
    else if (kind === "callout") el = { ...el, kind: "callout", w: 760, h: 70, variant: "note", text: "안내 문구" };
    else if (kind === "rect") el = { ...el, kind: "shape", shape: "rect", w: 240, h: 140, fill: "#eef2f8", stroke: "#233148", strokeW: 2, radius: 8 };
    else if (kind === "ellipse") el = { ...el, kind: "shape", shape: "ellipse", w: 180, h: 180, fill: "#eef2f8", stroke: "#233148", strokeW: 2 };
    else if (kind === "line") el = { ...el, kind: "shape", shape: "line", w: 280, h: 2, stroke: "#233148", strokeW: 3 };
    else if (kind === "arrow") el = { ...el, kind: "shape", shape: "arrow", w: 280, h: 2, stroke: "#233148", strokeW: 3 };
    const nd = { ...deck, slides: deck.slides.map((s) => s.id !== target ? s : { ...s, elements: [...s.elements, el] }) };
    commit(nd); setSel({ slideId: target, elId: el.id });
    if (el.kind === "text" || el.kind === "callout") setEditing(el.id);
  };

  const updateEl = (slideId, elId, patch) => commit({ ...deck, slides: deck.slides.map((s) => s.id !== slideId ? s : { ...s, elements: s.elements.map((x) => x.id === elId ? { ...x, ...patch } : x) }) });
  const deleteEl = () => { if (!sel) return; const ids = curSelIds(); commit({ ...deck, slides: deck.slides.map((s) => s.id !== sel.slideId ? s : { ...s, elements: s.elements.filter((x) => !ids.includes(x.id)) }) }); setSel(null); setSelExtra([]); };
  const copyEl = () => { if (!sel) return; const s = deck.slides.find((x) => x.id === sel.slideId); const ids = curSelIds(); const els = s.elements.filter((x) => ids.includes(x.id)); if (els.length) clipRef.current = JSON.parse(JSON.stringify(els)); };
  const pasteEl = () => {
    const clip = clipRef.current; if (!clip || !clip.length) return;
    const target = (sel && sel.slideId) || (deck.slides.find((s) => s.kind === "content") || deck.slides[deck.slides.length - 1] || {}).id;
    if (!target) return;
    const news = clip.map((el) => ({ ...JSON.parse(JSON.stringify(el)), id: GS.uid(), x: (el.x || 80) + 28, y: (el.y || 80) + 28, z: (el.z || 1) + 1 }));
    commit({ ...deck, slides: deck.slides.map((s) => s.id !== target ? s : { ...s, elements: [...s.elements, ...news] }) });
    setSel({ slideId: target, elId: news[0].id }); setSelExtra(news.slice(1).map((e) => e.id));
  };
  const dupEl = () => { if (!sel) return; copyEl(); setTimeout(pasteEl, 0); };
  const zOrder = (dir) => { if (!sel) return; const ids = curSelIds(); const s = deck.slides.find((x) => x.id === sel.slideId); const maxz = Math.max(1, ...s.elements.map((e) => e.z || 1)); const minz = Math.min(...s.elements.map((e) => e.z || 1)); commit({ ...deck, slides: deck.slides.map((sl) => sl.id !== sel.slideId ? sl : { ...sl, elements: sl.elements.map((e) => ids.includes(e.id) ? { ...e, z: dir > 0 ? maxz + 1 : minz - 1 } : e) }) }); };

  /* 슬라이드 관리 */
  const addSlide = (afterId) => {
    const ns = { id: GS.uid(), kind: "content", bg: "white", section: "", elements: [{ id: GS.uid(), kind: "text", level: 2, text: "새 슬라이드", x: 72, y: 132, w: 600, h: 44, fontSize: 26, align: "left" }] };
    const i = afterId ? deck.slides.findIndex((s) => s.id === afterId) + 1 : deck.slides.length;
    const slides = deck.slides.slice(); slides.splice(i, 0, ns); commit({ ...deck, slides });
  };
  const addSectionSlide = (afterId) => {
    const sec = { id: GS.uid(), kind: "section", bg: "dark", elements: [{ id: GS.uid(), kind: "text", level: 1, text: "새 섹션", x: 72, y: 300, w: 900, h: 110, fontSize: 48, color: "white", bold: true, _section: true }] };
    const con = { id: GS.uid(), kind: "content", bg: "white", section: "새 섹션", elements: [] };
    const i = afterId ? deck.slides.findIndex((s) => s.id === afterId) + 1 : deck.slides.length;
    const slides = deck.slides.slice(); slides.splice(i, 0, sec, con); commit({ ...deck, slides });
  };
  const deleteSlide = (id) => { if (deck.slides.length <= 1) return; commit({ ...deck, slides: deck.slides.filter((s) => s.id !== id) }); setSel(null); };
  const duplicateSlide = (id) => {
    const i = deck.slides.findIndex((s) => s.id === id); if (i < 0) return;
    const src = deck.slides[i];
    const copy = { ...JSON.parse(JSON.stringify(src)), id: GS.uid(), elements: src.elements.map((el) => ({ ...JSON.parse(JSON.stringify(el)), id: GS.uid() })) };
    const slides = deck.slides.slice(); slides.splice(i + 1, 0, copy); commit({ ...deck, slides });
  };
  const moveSlide = (id, dir) => { const i = deck.slides.findIndex((s) => s.id === id); const j = i + dir; if (j < 0 || j >= deck.slides.length) return; const slides = deck.slides.slice(); const [m] = slides.splice(i, 1); slides.splice(j, 0, m); commit({ ...deck, slides }); };
  const regenerate = () => { if (confirm("아웃라인(문서 내용)에서 슬라이드를 다시 생성합니다. 현재 슬라이드 배치는 사라집니다. 계속할까요?")) { const nd = genFrom(); commit(nd); setSel(null); } };

  /* 이미지 업로드 (더블클릭) */
  cEffect(() => {
    if (editing && editing.indexOf("__img__") === 0) { imgTargetRef.current = editing.slice(7); fileRef.current && fileRef.current.click(); setEditing(null); }
  }, [editing]);
  const onFile = (e) => {
    const file = e.target.files[0]; const id = imgTargetRef.current; if (!file || !id) return;
    window.fileToScaledDataURL(file, 1400).then((src) => {
      const sl = deck.slides.find((s) => s.elements.some((x) => x.id === id));
      if (sl) updateEl(sl.id, id, { src });
    });
    e.target.value = "";
  };

  /* 이미지 붙여넣기 (시스템 클립보드) */
  const addImageElToActive = (src) => {
    const target = (sel && sel.slideId) || (deck.slides.find((s) => s.kind === "content") || deck.slides[deck.slides.length - 1] || {}).id;
    if (!target) return;
    const el = { id: GS.uid(), kind: "image", x: 300, y: 170, w: 520, h: 300, src, caption: "", z: 10 };
    commit({ ...deck, slides: deck.slides.map((s) => s.id !== target ? s : { ...s, elements: [...s.elements, el] }) });
    setSel({ slideId: target, elId: el.id });
  };
  cEffect(() => {
    if (!editable) return;
    const onPaste = (e) => {
      const t = e.target; if (t && (t.isContentEditable || /input|textarea/i.test(t.tagName || ""))) return;
      const items = (e.clipboardData && e.clipboardData.items) || [];
      for (const it of items) {
        if (it.type && it.type.indexOf("image") === 0) {
          const file = it.getAsFile(); if (!file) continue;
          e.preventDefault(); imgHandledRef.current = true;
          window.fileToScaledDataURL(file, 1400).then((src) => addImageElToActive(src));
          return;
        }
      }
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [editable, sel, deck]);

  /* 키보드 */
  cEffect(() => {
    if (!editable) return;
    const onKey = (e) => {
      if (editing) return;
      const tag = (e.target.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || e.target.isContentEditable) return;
      // 클립보드 (Ctrl/Cmd + C/X/V)
      if ((e.metaKey || e.ctrlKey) && !e.altKey) {
        const k = e.key.toLowerCase();
        if (k === "c") { if (sel) { e.preventDefault(); copyEl(); } return; }
        if (k === "x") { if (sel) { e.preventDefault(); copyEl(); deleteEl(); } return; }
        if (k === "d") { if (sel) { e.preventDefault(); dupEl(); } return; }
        if (k === "a") {
          // 활성 슬라이드 전체 선택
          e.preventDefault();
          const sid = (sel && sel.slideId) || deck.slides[0].id;
          const s = deck.slides.find((x) => x.id === sid);
          if (s && s.elements.length) { setSel({ slideId: sid, elId: s.elements[0].id }); setSelExtra(s.elements.slice(1).map((x) => x.id)); }
          return;
        }
        if (k === "v") {
          if (clipRef.current) {
            imgHandledRef.current = false;
            setTimeout(() => { if (!imgHandledRef.current && clipRef.current) pasteEl(); }, 40);
          }
          return;
        }
      }
      if (e.key === "Tab" && sel) {
        e.preventDefault();
        const s = deck.slides.find((x) => x.id === sel.slideId); if (!s) return;
        const i = s.elements.findIndex((x) => x.id === sel.elId);
        const nx = s.elements[(i + (e.shiftKey ? -1 : 1) + s.elements.length) % s.elements.length];
        if (nx) { setSel({ slideId: sel.slideId, elId: nx.id }); setSelExtra([]); }
        return;
      }
      if (!sel) return;
      if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); deleteEl(); }
      else if (e.key === "Escape") { setSel(null); setSelExtra([]); }
      else if (e.key.startsWith("Arrow")) {
        e.preventDefault();
        const ids = curSelIds(); const step = e.shiftKey ? 10 : 1;
        const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        commit({ ...deck, slides: deck.slides.map((sl) => sl.id !== sel.slideId ? sl : { ...sl, elements: sl.elements.map((el) => ids.includes(el.id) ? { ...el, x: el.x + dx, y: el.y + dy } : el) }) });
      }
    };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, [editable, editing, sel, selExtra, deck]);

  // 콘텐츠 슬라이드 kicker 계산
  let curSection = "";
  const kickers = deck.slides.map((s) => {
    if (s.kind === "section") { const t = (s.elements.find((e) => e.level === 1) || {}).text; curSection = t || ""; return null; }
    if (s.kind === "content") return s.section || curSection || null;
    return null;
  });

  const selEl = sel && (() => { const s = deck.slides.find((x) => x.id === sel.slideId); return s && s.elements.find((x) => x.id === sel.elId); })();
  const multi = curSelIds().length > 1;
  const outdated = deck.srcKey != null && deck.srcKey !== CK.deckSrcKey(doc);
  const fmt = (patch) => { if (!sel) return; const ids = curSelIds(); commit({ ...deck, slides: deck.slides.map((sl) => sl.id !== sel.slideId ? sl : { ...sl, elements: sl.elements.map((e) => (ids.includes(e.id) && e.kind === "text") ? { ...e, ...patch } : e) }) }); };
  const setSlideBg = (slideId, bg) => commit({ ...deck, slides: deck.slides.map((s) => s.id === slideId ? { ...s, bg } : s) });
  const setNotes = (slideId, notes) => commit({ ...deck, slides: deck.slides.map((s) => s.id === slideId ? { ...s, notes } : s) });
  const TEXT_COLORS = ["#1c1f24", "#233148", "#b23b2e", "#2b7a4b", "#7b818b", "#ffffff"];
  const HL_COLORS = [null, "#fff1a6", "#cfe6ff", "#ffd9d2", "#d6f0df"];
  const FONTS = [["기본", ""], ["명조", "var(--font-serif)"], ["고딕", "var(--font)"]];

  const BG_CYCLE = ["white", "title", "soft", "dark"];
  const slideToolsFor = (s, i) => editable ? (
    <span className="cv-slide-tools">
      <button title="배경/테마" onMouseDown={(e) => { e.preventDefault(); const ci = BG_CYCLE.indexOf(s.bg || "white"); setSlideBg(s.id, BG_CYCLE[(ci + 1) % BG_CYCLE.length]); }}><Icon name="image" size={13} /></button>
      <button disabled={i === 0} title="위로" onMouseDown={(e) => { e.preventDefault(); moveSlide(s.id, -1); }}><Icon name="up" size={14} /></button>
      <button disabled={i === deck.slides.length - 1} title="아래로" onMouseDown={(e) => { e.preventDefault(); moveSlide(s.id, 1); }}><Icon name="down" size={14} /></button>
      <button title="이 뒤에 슬라이드" onMouseDown={(e) => { e.preventDefault(); addSlide(s.id); }}><Icon name="plus" size={14} /></button>
      <button title="슬라이드 복제" onMouseDown={(e) => { e.preventDefault(); duplicateSlide(s.id); }}><Icon name="copy" size={13} /></button>
      <button title="이미지(PNG) 저장" onMouseDown={(e) => { e.preventDefault(); const fr = e.currentTarget.closest(".cv-slide-wrap").querySelector(".cv-slide"); if (fr) window.DeckExport.png(fr, (doc.title || "slide") + "-" + (i + 1)); }}><Icon name="image" size={13} /></button>
      <button className="danger" disabled={deck.slides.length <= 1} title="슬라이드 삭제" onMouseDown={(e) => { e.preventDefault(); deleteSlide(s.id); }}><Icon name="trash" size={13} /></button>
    </span>
  ) : null;

  return (
    <div className={"canvas cv-canvas" + (editable ? "" : " preview")}>
      {editable && (
        <div className="cv-toolbar no-print">
          <span className="cv-tb-group">
            <button onMouseDown={(e) => { e.preventDefault(); addEl("h2"); }} title="소제목"><Icon name="text" size={15} /> 소제목</button>
            <button onMouseDown={(e) => { e.preventDefault(); addEl("h3"); }} title="항목"><b style={{ fontSize: 12 }}>A</b> 항목</button>
            <button onMouseDown={(e) => { e.preventDefault(); addEl("bullet"); }} title="내용">• 내용</button>
            <button onMouseDown={(e) => { e.preventDefault(); addEl("text"); }} title="일반 텍스트"><Icon name="text" size={15} /> 텍스트</button>
            <button onMouseDown={(e) => { e.preventDefault(); addEl("table"); }} title="표"><Icon name="table" size={15} /> 표</button>
            <button onMouseDown={(e) => { e.preventDefault(); addEl("image"); }} title="이미지"><Icon name="image" size={15} /> 이미지</button>
            <button onMouseDown={(e) => { e.preventDefault(); addEl("callout"); }} title="안내"><Icon name="info" size={15} /> 안내</button>
            <button onMouseDown={(e) => { e.preventDefault(); addEl("rect"); }} title="사각형">▭</button>
            <button onMouseDown={(e) => { e.preventDefault(); addEl("ellipse"); }} title="원">◯</button>
            <button onMouseDown={(e) => { e.preventDefault(); addEl("line"); }} title="선">／</button>
            <button onMouseDown={(e) => { e.preventDefault(); addEl("arrow"); }} title="화살표">→</button>
          </span>
          <span className="cv-tb-sep"></span>
          <button onMouseDown={(e) => { e.preventDefault(); addSectionSlide(sel && sel.slideId); }} title="섹션 슬라이드 추가"><Icon name="plus" size={15} /> 섹션</button>
          <span className="cv-tb-spacer"></span>
          {multi && <>
            <span className="cv-fb-group" title="정렬">
              <button onMouseDown={(e) => { e.preventDefault(); alignSel("left"); }} title="왼쪽"><Icon name="alignLeft" size={15} /></button>
              <button onMouseDown={(e) => { e.preventDefault(); alignSel("cx"); }} title="가로 가운데"><Icon name="alignCenter" size={15} /></button>
              <button onMouseDown={(e) => { e.preventDefault(); alignSel("right"); }} title="오른쪽"><Icon name="alignRight" size={15} /></button>
              <button onMouseDown={(e) => { e.preventDefault(); alignSel("top"); }} title="위">⊤</button>
              <button onMouseDown={(e) => { e.preventDefault(); alignSel("cy"); }} title="세로 가운데">⊟</button>
              <button onMouseDown={(e) => { e.preventDefault(); alignSel("bottom"); }} title="아래">⊥</button>
              <button onMouseDown={(e) => { e.preventDefault(); distributeSel("h"); }} title="가로 균등">↔</button>
              <button onMouseDown={(e) => { e.preventDefault(); distributeSel("v"); }} title="세로 균등">↕</button>
            </span>
            <span className="cv-tb-sep"></span>
          </>}
          {selEl && <>
            <button onMouseDown={(e) => { e.preventDefault(); zOrder(1); }} title="맨 앞으로">앞으로</button>
            <button onMouseDown={(e) => { e.preventDefault(); zOrder(-1); }} title="맨 뒤로">뒤로</button>
            <button onMouseDown={(e) => { e.preventDefault(); dupEl(); }} title="복제"><Icon name="copy" size={14} /></button>
            <button className="danger" onMouseDown={(e) => { e.preventDefault(); deleteEl(); }} title="삭제 (Del)"><Icon name="trash" size={14} /></button>
            <span className="cv-tb-sep"></span>
          </>}
          <button onMouseDown={(e) => { e.preventDefault(); regenerate(); }} title="아웃라인에서 다시 생성" className={"cv-regen" + (outdated ? " outdated" : "")}><Icon name="list" size={14} /> {outdated ? "아웃라인 변경됨 · 다시 생성" : "다시 생성"}</button>
          <button title="슬라이드 번호 표시/숨김" className={deck.hideNums ? "" : "on2"} onMouseDown={(e) => { e.preventDefault(); commit({ ...deck, hideNums: !deck.hideNums }); }}>#</button>
        </div>
      )}

      {editable && selEl && selEl.kind === "text" && (
        <div className="cv-format-bar no-print">
          <span className="cv-fb-group" title="정렬">
            {[["left", "alignLeft"], ["center", "alignCenter"], ["right", "alignRight"], ["justify", "alignJustify"]].map(([a, ic]) => (
              <button key={a} className={(selEl.align || "left") === a ? "on" : ""} onMouseDown={(e) => { e.preventDefault(); fmt({ align: a }); }}><Icon name={ic} size={15} /></button>
            ))}
          </span>
          <span className="cv-tb-sep"></span>
          <span className="cv-fb-group" title="글자 크기">
            <button onMouseDown={(e) => { e.preventDefault(); fmt({ fontSize: Math.max(10, (selEl.fontSize || 16) - 2) }); }}>가<small>﹣</small></button>
            <span className="cv-fb-val">{selEl.fontSize || 16}</span>
            <button onMouseDown={(e) => { e.preventDefault(); fmt({ fontSize: Math.min(120, (selEl.fontSize || 16) + 2) }); }}>가<small>﹢</small></button>
          </span>
          <span className="cv-tb-sep"></span>
          <button className={"cv-fb-tg" + (selEl.bold ? " on" : "")} title="굵게" onMouseDown={(e) => { e.preventDefault(); fmt({ bold: !selEl.bold }); }}><b>가</b></button>
          <button className={"cv-fb-tg" + (selEl.italic ? " on" : "")} title="기울임" onMouseDown={(e) => { e.preventDefault(); fmt({ italic: !selEl.italic }); }}><i>가</i></button>
          <span className="cv-tb-sep"></span>
          <select className="cv-fb-sel" title="글꼴" value={selEl.fontFamily || ""} onChange={(e) => fmt({ fontFamily: e.target.value || null, serif: e.target.value === "var(--font-serif)" })}>
            {FONTS.map(([n, v]) => <option key={n} value={v}>{n}</option>)}
          </select>
          <span className="cv-fb-group" title="줄 간격">
            <button onMouseDown={(e) => { e.preventDefault(); fmt({ lineHeight: Math.max(1, Math.round(((selEl.lineHeight || 1.4) - 0.1) * 10) / 10) }); }}>⇕﹣</button>
            <span className="cv-fb-val">{(selEl.lineHeight || 1.4).toFixed(1)}</span>
            <button onMouseDown={(e) => { e.preventDefault(); fmt({ lineHeight: Math.min(3, Math.round(((selEl.lineHeight || 1.4) + 0.1) * 10) / 10) }); }}>⇕﹢</button>
          </span>
          <span className="cv-tb-sep"></span>
          <span className="cv-fb-swatches" title="글자색"><span className="cv-fb-lbl">가</span>
            {TEXT_COLORS.map((c) => <button key={c} className={"cv-sw" + (selEl.color === c ? " on" : "")} style={{ background: c, outline: c === "#ffffff" ? "1px solid #ccc" : null }} onMouseDown={(e) => { e.preventDefault(); fmt({ color: c }); }}></button>)}
          </span>
          <span className="cv-tb-sep"></span>
          <span className="cv-fb-swatches" title="강조색"><Icon name="edit" size={13} />
            {HL_COLORS.map((c, i) => <button key={i} className={"cv-sw" + ((selEl.highlight || null) === c ? " on" : "")} style={{ background: c || "#fff", backgroundImage: c ? null : "linear-gradient(45deg,transparent 45%,#d33 45%,#d33 55%,transparent 55%)" }} onMouseDown={(e) => { e.preventDefault(); fmt({ highlight: c }); }}></button>)}
          </span>
        </div>
      )}

      <div className="cv-main">
        {editable && (
          <div className="cv-rail no-print">
            {deck.slides.map((s, i) => (
              <div key={s.id} className={"cv-thumb bg-" + (s.bg || "white") + ((sel && sel.slideId === s.id) ? " active" : "")}
                draggable
                onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; railDrag.current = i; }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); const from = railDrag.current; if (from == null || from === i) return; const slides = deck.slides.slice(); const [m] = slides.splice(from, 1); slides.splice(i, 0, m); commit({ ...deck, slides }); railDrag.current = null; }}
                onClick={() => { const wraps = scrollRef.current.querySelectorAll(".cv-slide-wrap"); if (wraps[i]) scrollRef.current.scrollTo({ top: wraps[i].offsetTop - 12, behavior: "smooth" }); setSel({ slideId: s.id, elId: null }); setSelExtra([]); }}>
                <span className="ct-n">{i + 1}</span>
                <span className="ct-k">{s.kind === "title" ? "타이틀" : s.kind === "agenda" ? "목차" : s.kind === "section" ? "섹션" : "내용"}</span>
              </div>
            ))}
          </div>
        )}
        <div className={"cv-scroll" + (editable ? "" : " preview")} ref={scrollRef}>
        {deck.slides.map((s, i) => (
          <CanvasSlide key={s.id} slide={s} index={i} total={deck.slides.length} numbering={numbering}
            editable={editable} scale={scale}
            selIds={(sel && sel.slideId === s.id) ? [sel.elId, ...selExtra] : []}
            primaryId={(sel && sel.slideId === s.id) ? sel.elId : null}
            editing={editing} kicker={kickers[i]}
            hideNums={deck.hideNums} onNotes={setNotes}
            guides={guides && guides.slideId === s.id ? guides : null}
            marquee={marquee && marquee.slideId === s.id ? marquee : null}
            onSelectEl={onSelectEl} onChangeEl={onChangeEl} onStartEdit={(id) => setEditing(id)}
            onElDragStart={onElDragStart} onGroupMove={onGroupMove} onMarquee={onMarquee}
            onSlideClick={() => { setSel(null); setSelExtra([]); setEditing(null); }}
            slideTools={slideToolsFor(s, i)} />
        ))}
        {editable && (
          <button className="cv-add-slide no-print" onMouseDown={(e) => { e.preventDefault(); addSectionSlide(null); }}>
            <Icon name="plus" size={16} /> 새 섹션 슬라이드 추가
          </button>
        )}
        </div>
      </div>

      {editable && editing && deck.slides.some((s) => s.elements.some((x) => x.id === editing)) && (
        <div className="cv-edit-hint no-print">편집 중 — 빈 곳을 클릭하면 완료</div>
      )}
      <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={onFile} />
    </div>
  );
}
window.CanvasDeck = CanvasDeck;

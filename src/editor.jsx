/* ============================================================
   Editor — block list with inline edit, +insert, move/delete, drag
   ============================================================ */
const { useRef: uRef, useState: uState, useEffect: uEffect, Fragment } = React;

/* running header / footer (shared with preview) */
function RunHead({ title }) {
  return (
    <div className="run-head">
      <span className="rh-title">{title || ""}</span>
      <span style={{ fontSize: 10, color: "var(--faint)" }}>기획서</span>
    </div>
  );
}
function RunFoot({ page, left, right }) {
  return (
    <div className="run-foot">
      <span className="fl">{left || ""}</span>
      <span className="pg">{page != null ? "- " + page + " -" : ""}</span>
      <span className="fr">{right || ""}</span>
    </div>
  );
}
window.RunHead = RunHead; window.RunFoot = RunFoot;

/* insert affordance */
function InsertZone({ onAdd }) {
  return (
    <div className="insert-zone no-print">
      <div className="line"></div>
      <button className="add-btn" title="블록 추가" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onAdd(e); }}>
        <Icon name="plus" size={13} />
      </button>
    </div>
  );
}

/* generic floating popover */
function Popover({ x, y, width = 260, onClose, children }) {
  const ref = uRef(null);
  uEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    const esc = (e) => { if (e.key === "Escape") onClose(); };
    setTimeout(() => window.addEventListener("mousedown", close), 0);
    window.addEventListener("keydown", esc);
    return () => { window.removeEventListener("mousedown", close); window.removeEventListener("keydown", esc); };
  }, []);
  const vw = window.innerWidth, vh = window.innerHeight;
  const left = Math.min(x, vw - width - 12);
  const top = Math.min(y, vh - 320);
  return (
    <div ref={ref} className="menu-pop" style={{ left: Math.max(8, left), top: Math.max(8, top), width }}>
      {children}
    </div>
  );
}

const INSERT_MENU = [
  { group: "텍스트", items: [
    { t: "섹션 제목", d: "대제목 · 새 페이지에서 시작 (1.)", ic: "section", make: () => GS.Blocks.outline(1) },
    { t: "소제목", d: "중제목 (1.)", ic: "text", make: () => GS.Blocks.outline(2) },
    { t: "항목", d: "A · B · C 항목", ic: "list", make: () => GS.Blocks.outline(3) },
    { t: "내용", d: "• 글머리 기호", ic: "list", make: () => GS.Blocks.outline(4) },
    { t: "세부 내용", d: "– 하위 글머리", ic: "list", make: () => GS.Blocks.outline(5) },
  ]},
  { group: "콘텐츠", items: [
    { t: "데이터 표", d: "변수명 · 변수형 · 설명", ic: "table", make: () => GS.Blocks.table() },
    { t: "이미지 / 자리표시자", d: "업로드 또는 〈참고 이미지〉", ic: "image", make: () => GS.Blocks.image() },
    { t: "안내 박스", d: "일반 / 경고 콜아웃", ic: "info", make: () => GS.Blocks.callout() },
  ]},
];

function InsertMenu({ x, y, onPick, onClose }) {
  return (
    <Popover x={x} y={y} onClose={onClose}>
      {INSERT_MENU.map((sec) => (
        <div key={sec.group}>
          <div className="mp-head">{sec.group}</div>
          {sec.items.map((it) => (
            <div className="menu-item" key={it.t} onMouseDown={(e) => { e.preventDefault(); onPick(it.make()); }}>
              <div className="mi-ic"><Icon name={it.ic} size={18} /></div>
              <div className="mi-tx"><div className="t">{it.t}</div><div className="d">{it.d}</div></div>
            </div>
          ))}
        </div>
      ))}
    </Popover>
  );
}

/* block wrapper with tools + drag */
function BlockWrap({ block, num, editable, autoFocus, active, onChange, dnd, onAction }) {
  const dropCls = dnd.overId === block.id ? (dnd.overPos === "before" ? " drop-before" : " drop-after") : "";
  return (
    <div
      data-blk-id={block.id}
      className={"blk" + (active ? " active" : "") + (dnd.dragId === block.id ? " dragging" : "") + dropCls}
      onDragOver={(e) => dnd.onOver(e, block.id)}
      onDrop={(e) => dnd.onDrop(e, block.id)}>
      <div className="blk-tools no-print">
        <button className="handle" draggable onDragStart={(e) => dnd.onStart(e, block.id)} onDragEnd={dnd.onEnd} title="드래그하여 이동">
          <Icon name="grip" size={14} />
        </button>
        <button title="더보기" onMouseDown={(e) => { e.preventDefault(); onAction(e, block); }}>
          <Icon name="chevronDown" size={13} />
        </button>
      </div>
      <BlockBody block={block} num={num} editable={editable} onChange={onChange} autoFocus={autoFocus} />
    </div>
  );
}

/* ============================================================
   EditableDeck — 편집 모드에서 실제 16:9 슬라이드로 노출 (편집 가능)
   ============================================================ */
function TitleSlideEdit({ doc, ed }) {
  const meta = doc.meta;
  const setMeta = ed.setMeta;
  const set = (patch) => setMeta({ ...meta, ...patch });
  const toggleTag = (gi, oi) => set({ tagGroups: meta.tagGroups.map((g, i) => i !== gi ? g : { options: g.options.map((o, j) => j === oi ? { ...o, on: !o.on } : o) }) });
  const setTagLabel = (gi, oi, label) => set({ tagGroups: meta.tagGroups.map((g, i) => i !== gi ? g : { options: g.options.map((o, j) => j === oi ? { ...o, label } : o) }) });
  const addTag = (gi) => set({ tagGroups: meta.tagGroups.map((g, i) => i !== gi ? g : { options: [...g.options, { label: "항목", on: true }] }) });
  const delTag = (gi, oi) => set({ tagGroups: meta.tagGroups.map((g, i) => i !== gi ? g : { options: g.options.filter((_, j) => j !== oi) }) });
  return (
    <div className="ds-title-inner">
      <div className="ds-tags-edit">
        {meta.tagGroups.map((g, gi) => (
          <div className="dste-row" key={gi}>
            {g.options.map((o, oi) => (
              <span className={"dste-chip" + (o.on ? " on" : "")} key={oi}>
                <span className="dste-bx" onClick={() => toggleTag(gi, oi)}>{o.on && <Icon name="check" size={11} strokeWidth={3.2} />}</span>
                <Editable tag="span" value={o.label} placeholder="항목" markdown={false} onCommit={(v) => setTagLabel(gi, oi, v)} />
                {g.options.length > 1 && <button className="dste-x" title="삭제" onClick={() => delTag(gi, oi)}>×</button>}
              </span>
            ))}
            <button className="dste-add" title="태그 추가" onClick={() => addTag(gi)}>＋</button>
          </div>
        ))}
      </div>
      <div className="ds-accent"></div>
      <Editable className="ds-h1" tag="h1" value={meta.title} placeholder="문서 제목" markdown={false} onCommit={(v) => set({ title: v })} />
      <Editable className="ds-subtitle" value={meta.subtitle} placeholder="상세 기획서" markdown={false} onCommit={(v) => set({ subtitle: v })} />
      <div className="ds-titlemeta dstm-edit">
        <Editable tag="span" value={meta.dept} placeholder="소속" markdown={false} onCommit={(v) => set({ dept: v })} />
        <span className="dot">·</span>
        <Editable tag="span" value={meta.author} placeholder="작성자" markdown={false} onCommit={(v) => set({ author: v })} />
        <span className="dot">·</span>
        <Editable tag="span" value={meta.date} placeholder="YYYY-MM-DD" markdown={false} onCommit={(v) => set({ date: v })} />
      </div>
    </div>
  );
}

function EditDeckSlide({ slide, slides, index, total, scale, doc, ed }) {
  const numbering = ed.numbering;
  const blocks = doc.blocks;
  const idxOf = (b) => blocks.indexOf(b);

  let body, cls = "ds-" + slide.type, editClass = "";
  if (slide.type === "title") { body = <TitleSlideEdit doc={doc} ed={ed} />; }
  else if (slide.type === "agenda") { body = <SlideKit.DeckAgenda entries={slide.entries} depth={doc.tocDepth || 2} editable={true} showControl={slide.part === 0} onDepth={ed.setTocDepth} />; }
  else if (slide.type === "divider") {
    body = (
      <div className="ds-divider-inner">
        <div className="ds-bignum">{numbering.byId[slide.head.id]}</div>
        <Editable className="ds-dh" tag="h2" value={slide.head.text} placeholder="섹션 제목" markdown={false}
          onCommit={(v) => ed.setBlock(slide.head.id, { ...slide.head, text: v })} />
      </div>
    );
  } else { // content
    editClass = " deck-edit";
    const baseIndex = slide.items.length ? idxOf(slide.items[0]) : (slide.head ? idxOf(slide.head) + 1 : 0);
    body = (
      <>
        <SlideKit.DeckKicker slide={slide} numbering={numbering} />
        <div className="doc ds-body">
          {slide.items.length === 0
            ? <div className="slide-empty" onClick={(e) => ed.openInsert(baseIndex, e)}>
                <Icon name="plus" size={13} /> 이 슬라이드에 내용 추가
              </div>
            : <>
                <InsertZone onAdd={(e) => ed.openInsert(baseIndex, e)} />
                {slide.items.map((b) => (
                  <div key={b.id}>
                    <BlockWrap block={b} num={numbering.byId[b.id]} editable={true}
                      autoFocus={ed.focusId === b.id} active={ed.activeId === b.id}
                      onChange={(nb) => ed.setBlock(b.id, nb)} dnd={ed.dndApi} onAction={ed.openAction} />
                    <InsertZone onAdd={(e) => ed.openInsert(idxOf(b) + 1, e)} />
                  </div>
                ))}
              </>}
        </div>
      </>
    );
  }

  const label = slide.type === "title" ? "타이틀 슬라이드"
    : slide.type === "agenda" ? "목차 (아젠다)" + (slide.part > 0 ? " " + (slide.part + 1) : "")
    : slide.type === "divider" ? "구분 슬라이드 · " + (slide.head.text || "")
    : "내용" + (slide.part > 0 ? " (계속)" : "") + (slide.head ? " · " + (slide.head.text || "") : "");

  // 슬라이드/섹션 이동·삭제·복제·추가
  const sectionIds = (headId) => { const r = ed.sectionRange(headId); return r ? ed.docBlocks.slice(r[0], r[1]).map((b) => b.id) : []; };
  const contentIds = (slide.items || []).map((b) => b.id);
  const sameHead = (o) => o && o.type === "content" && o.head === slide.head;
  let canUp = false, canDown = false, onUp, onDown, onDel, onDup, isLastOfSection = false;
  if (slide.type === "divider") {
    const divs = slides.map((s, k) => ({ s, k })).filter((o) => o.s.type === "divider");
    const pos = divs.findIndex((o) => o.k === index);
    canUp = pos > 0; canDown = pos >= 0 && pos < divs.length - 1;
    onUp = () => ed.swapRanges(sectionIds(divs[pos - 1].s.head.id), sectionIds(slide.head.id));
    onDown = () => ed.swapRanges(sectionIds(slide.head.id), sectionIds(divs[pos + 1].s.head.id));
    onDel = () => ed.deleteRange(sectionIds(slide.head.id));
    onDup = () => ed.duplicateRange(sectionIds(slide.head.id));
  } else if (slide.type === "content") {
    const prev = slides[index - 1], next = slides[index + 1];
    canUp = sameHead(prev); canDown = sameHead(next);
    onUp = () => ed.swapRanges((prev.items || []).map((b) => b.id), contentIds);
    onDown = () => ed.swapRanges(contentIds, (next.items || []).map((b) => b.id));
    onDel = contentIds.length ? () => ed.deleteRange(contentIds) : null;
    onDup = contentIds.length ? () => ed.duplicateRange(contentIds) : null;
    isLastOfSection = !sameHead(next) && !!slide.head;
  }
  const showTools = slide.type === "divider" || slide.type === "content";
  const delTitle = slide.type === "divider" ? "섹션(슬라이드) 삭제" : "슬라이드 삭제";

  return (
    <div className="edeck-item">
      <div className="edeck-label no-print">
        <span className="el-num">슬라이드 {index + 1}</span><span className="el-tx">{label}</span>
        {showTools && (
          <span className="slide-tools">
            <button disabled={!canUp} title="위로 이동" onMouseDown={(e) => { e.preventDefault(); canUp && onUp(); }}><Icon name="up" size={14} /></button>
            <button disabled={!canDown} title="아래로 이동" onMouseDown={(e) => { e.preventDefault(); canDown && onDown(); }}><Icon name="down" size={14} /></button>
            {onDup && <button title="복제" onMouseDown={(e) => { e.preventDefault(); onDup(); }}><Icon name="copy" size={13} /></button>}
            {onDel && <button className="danger" title={delTitle} onMouseDown={(e) => { e.preventDefault(); onDel(); }}><Icon name="trash" size={13} /></button>}
          </span>
        )}
      </div>
      <div className="deck-page-wrap" style={{ width: SlideKit.SLIDE_W * scale, height: SlideKit.SLIDE_H * scale }}>
        <div className={"deck-page " + cls + editClass} style={{ transform: "scale(" + scale + ")" }}>
          {body}
          <div className="deck-num">{index + 1} <span style={{ opacity: .5 }}>/ {total}</span></div>
        </div>
      </div>
      {isLastOfSection && (
        <div className="slide-add-row no-print">
          <button onMouseDown={(e) => { e.preventDefault(); ed.addContentBlockAfter(contentIds[contentIds.length - 1], slide.head ? slide.head.id : null); }}>
            <Icon name="plus" size={13} /> 이 섹션에 내용
          </button>
          <button onMouseDown={(e) => { e.preventDefault(); ed.addSection(slide.head ? slide.head.id : null); }}>
            <Icon name="plus" size={13} /> 새 섹션 슬라이드
          </button>
        </div>
      )}
    </div>
  );
}

function EditableDeck({ doc, ed }) {
  const numbering = ed.numbering;
  const hostRef = uRef(null);
  const scrollRef = uRef(null);
  const [slides, setSlides] = uState([]);
  const [scale, setScale] = uState(0.7);
  const [tick, setTick] = uState(0);

  uEffect(() => { if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => setTick((t) => t + 1)); }, []);
  uEffect(() => {
    const el = scrollRef.current; if (!el) return;
    const fit = () => { const w = el.clientWidth - 120; setScale(Math.max(0.3, Math.min(0.92, w / SlideKit.SLIDE_W))); };
    fit();
    const ro = new ResizeObserver(fit); ro.observe(el);
    return () => ro.disconnect();
  }, []);
  uEffect(() => {
    const host = hostRef.current; if (!host) return;
    const hmap = {};
    host.querySelectorAll("[data-mi]").forEach((el) => { hmap[el.getAttribute("data-mi")] = el.offsetHeight; });
    setSlides(SlideKit.buildSlides(doc, numbering, hmap, true));
  }, [doc, numbering, tick]);

  return (
    <div className="edeck-scroll" ref={scrollRef}>
      {slides.map((s, i) => <EditDeckSlide key={s.type + i + (s.head ? s.head.id : "") + (s.part || 0)} slide={s} slides={slides} index={i} total={slides.length} scale={scale} doc={doc} ed={ed} />)}

      <button className="edeck-addsection no-print" onMouseDown={(e) => { e.preventDefault(); ed.addSection(null); }}>
        <Icon name="plus" size={16} /> 새 섹션 슬라이드 추가
      </button>

      <div className="measure-host deck" ref={hostRef} aria-hidden="true" style={{ width: (SlideKit.SLIDE_W - 2 * SlideKit.SLIDE_PADX) + "px" }}>
        <div className="doc ds-body">
          {doc.blocks.filter((b) => !(b.type === "outline" && b.level === 1)).map((b) => (
            <div data-mi={b.id} key={b.id} style={{ overflow: "hidden" }}>
              <BlockBody block={b} num={numbering.byId[b.id]} editable={false} onChange={() => {}} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Editor({ doc, onChange }) {
  const numbering = GS.numbering.compute(doc.blocks);
  const [insMenu, setInsMenu] = uState(null);   // {x,y,index}
  const [actMenu, setActMenu] = uState(null);    // {x,y,block}
  const [focusId, setFocusId] = uState(null);
  const [activeId, setActiveId] = uState(null);  // currently focused block (shortcut target)
  const [toast, setToast] = uState(null);
  const [dnd, setDnd] = uState({ dragId: null, overId: null, overPos: "after" });

  // refs for stable access inside window listeners
  const docRef = uRef(doc); docRef.current = doc;
  const activeRef = uRef(null);
  const clipRef = uRef(null);
  const toastTimer = uRef(null);
  const flash = (msg) => { setToast(msg); clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToast(null), 1300); };
  const markActive = (id) => { activeRef.current = id; setActiveId(id); };
  const activeFromEvent = (e) => { const el = e.target.closest && e.target.closest("[data-blk-id]"); if (el) markActive(el.getAttribute("data-blk-id")); };

  const setMeta = (meta) => onChange({ ...doc, meta });
  const setBlock = (id, nb) => onChange({ ...doc, blocks: doc.blocks.map((b) => (b.id === id ? nb : b)) });
  const insertAt = (index, block) => {
    const blocks = doc.blocks.slice(); blocks.splice(index, 0, block);
    onChange({ ...doc, blocks });
    if (block.type === "outline" || block.type === "callout") setFocusId(block.id);
  };
  const removeBlock = (id) => onChange({ ...doc, blocks: doc.blocks.filter((b) => b.id !== id) });
  const moveBlock = (id, dir) => {
    const i = doc.blocks.findIndex((b) => b.id === id); const j = i + dir;
    if (i < 0 || j < 0 || j >= doc.blocks.length) return;
    const blocks = doc.blocks.slice(); const [m] = blocks.splice(i, 1); blocks.splice(j, 0, m);
    onChange({ ...doc, blocks });
  };
  const setLevel = (id, delta) => {
    const b = doc.blocks.find((x) => x.id === id); if (!b || b.type !== "outline") return;
    const level = Math.max(1, Math.min(5, b.level + delta));
    setBlock(id, { ...b, level });
  };
  const duplicateBlock = (id) => {
    const i = doc.blocks.findIndex((b) => b.id === id); if (i < 0) return;
    const copy = { ...JSON.parse(JSON.stringify(doc.blocks[i])), id: GS.uid() };
    const blocks = doc.blocks.slice(); blocks.splice(i + 1, 0, copy); onChange({ ...doc, blocks });
  };
  const insertAfter = (id, block) => {
    const cur = docRef.current;
    let i = cur.blocks.findIndex((b) => b.id === id);
    if (i < 0) i = cur.blocks.length - 1;
    const blocks = cur.blocks.slice(); blocks.splice(i + 1, 0, block);
    onChange({ ...cur, blocks });
    markActive(block.id);
    if (block.type === "outline" || block.type === "callout") setFocusId(block.id);
  };

  /* ---- clipboard: Ctrl/Cmd + C / X / V on whole blocks ---- */
  uEffect(() => {
    const onKey = (e) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k !== "c" && k !== "x" && k !== "v") return;
      const sel = window.getSelection();
      const hasText = sel && !sel.isCollapsed && sel.toString().length > 0;
      const cur = docRef.current;
      const active = activeRef.current;
      if (k === "c") {
        if (hasText) return;                       // 텍스트 선택 → 기본 복사
        const b = cur.blocks.find((x) => x.id === active); if (!b) return;
        clipRef.current = JSON.parse(JSON.stringify(b)); e.preventDefault(); flash("블록 복사됨");
      } else if (k === "x") {
        if (hasText) return;
        const b = cur.blocks.find((x) => x.id === active); if (!b) return;
        clipRef.current = JSON.parse(JSON.stringify(b));
        // 다음 활성 블록 = 이전 블록
        const i = cur.blocks.findIndex((x) => x.id === active);
        const nextActive = (cur.blocks[i - 1] || cur.blocks[i + 1] || {}).id || null;
        onChange({ ...cur, blocks: cur.blocks.filter((x) => x.id !== active) });
        markActive(nextActive); e.preventDefault(); flash("블록 잘라냄");
      } else if (k === "v") {
        if (hasText) return;                       // 선택 영역 교체는 기본 동작
        if (!clipRef.current) return;              // 블록 클립보드 없으면 기본 붙여넣기
        e.preventDefault();
        const nb = { ...JSON.parse(JSON.stringify(clipRef.current)), id: GS.uid() };
        insertAfter(active, nb); flash("블록 붙여넣기");
      }
    };
    // 텍스트를 복사/잘라내면 블록 클립보드를 비워 다음 붙여넣기가 텍스트가 되도록
    const clearOnText = () => { const s = window.getSelection(); if (s && s.toString().length > 0) clipRef.current = null; };
    window.addEventListener("keydown", onKey);
    document.addEventListener("copy", clearOnText);
    document.addEventListener("cut", clearOnText);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("copy", clearOnText);
      document.removeEventListener("cut", clearOnText);
    };
  }, []);

  /* drag-drop */
  const dndApi = {
    dragId: dnd.dragId, overId: dnd.overId, overPos: dnd.overPos,
    onStart: (e, id) => { e.dataTransfer.effectAllowed = "move"; try { e.dataTransfer.setData("text/plain", id); } catch (_) {} setDnd({ dragId: id, overId: null, overPos: "after" }); },
    onEnd: () => setDnd({ dragId: null, overId: null, overPos: "after" }),
    onOver: (e, id) => {
      if (!dnd.dragId || id === dnd.dragId) return;
      e.preventDefault();
      const r = e.currentTarget.getBoundingClientRect();
      const pos = e.clientY < r.top + r.height / 2 ? "before" : "after";
      if (dnd.overId !== id || dnd.overPos !== pos) setDnd((d) => ({ ...d, overId: id, overPos: pos }));
    },
    onDrop: (e, id) => {
      e.preventDefault();
      const dragId = dnd.dragId; if (!dragId || dragId === id) { setDnd({ dragId: null, overId: null, overPos: "after" }); return; }
      const blocks = doc.blocks.slice();
      const from = blocks.findIndex((b) => b.id === dragId);
      const [m] = blocks.splice(from, 1);
      let to = blocks.findIndex((b) => b.id === id);
      if (dnd.overPos === "after") to += 1;
      blocks.splice(to, 0, m);
      onChange({ ...doc, blocks });
      setDnd({ dragId: null, overId: null, overPos: "after" });
    },
  };

  const openInsert = (index, e) => setInsMenu({ x: e.clientX, y: e.clientY, index });
  const openAction = (e, block) => { const r = e.currentTarget.getBoundingClientRect(); setActMenu({ x: r.right + 6, y: r.top, block }); };

  /* ---- 슬라이드/섹션 관리 (슬라이드형 편집) ---- */
  const setTocDepth = (d) => onChange({ ...doc, tocDepth: d });
  // 섹션(대제목) 범위: head 인덱스 ~ 다음 L1 직전
  const sectionRange = (headId) => {
    const bs = doc.blocks; const s = bs.findIndex((b) => b.id === headId); if (s < 0) return null;
    let e = bs.length; for (let i = s + 1; i < bs.length; i++) { if (bs[i].type === "outline" && bs[i].level === 1) { e = i; break; } }
    return [s, e]; // [start, endExclusive]
  };
  const deleteRange = (ids) => { const set = new Set(ids); onChange({ ...doc, blocks: doc.blocks.filter((b) => !set.has(b.id)) }); flash("슬라이드 삭제됨"); };
  const duplicateRange = (ids) => {
    const set = new Set(ids); const bs = doc.blocks;
    const last = bs.reduce((acc, b, i) => set.has(b.id) ? i : acc, -1); if (last < 0) return;
    const clones = bs.filter((b) => set.has(b.id)).map((b) => ({ ...JSON.parse(JSON.stringify(b)), id: GS.uid() }));
    const blocks = [...bs.slice(0, last + 1), ...clones, ...bs.slice(last + 1)];
    onChange({ ...doc, blocks }); flash("슬라이드 복제됨");
  };
  // aIds, bIds: 인접한 두 구간(순서 무관) → 자리 맞바꿈
  const swapRanges = (aIds, bIds) => {
    const bs = doc.blocks; const aSet = new Set(aIds), bSet = new Set(bIds);
    const aStart = bs.findIndex((b) => aSet.has(b.id)); const bStart = bs.findIndex((b) => bSet.has(b.id));
    if (aStart < 0 || bStart < 0) return;
    const first = aStart < bStart ? aSet : bSet, second = aStart < bStart ? bSet : aSet;
    const firstSeg = bs.filter((b) => first.has(b.id)); const secondSeg = bs.filter((b) => second.has(b.id));
    const pivot = Math.min(aStart, bStart);
    const rest = bs.filter((b) => !aSet.has(b.id) && !bSet.has(b.id));
    let insertAt = 0; for (let k = 0; k < pivot; k++) { if (!aSet.has(bs[k].id) && !bSet.has(bs[k].id)) insertAt++; }
    const swapped = [...secondSeg, ...firstSeg];
    onChange({ ...doc, blocks: [...rest.slice(0, insertAt), ...swapped, ...rest.slice(insertAt)] });
  };
  const addSection = (afterHeadId) => {
    const head = GS.Blocks.outline(1, "새 섹션");
    const child = GS.Blocks.outline(4, "");
    const bs = doc.blocks.slice();
    let at = bs.length;
    if (afterHeadId) { const r = sectionRange(afterHeadId); if (r) at = r[1]; }
    bs.splice(at, 0, head, child);
    onChange({ ...doc, blocks: bs }); setFocusId(head.id); markActive(head.id); flash("새 섹션 슬라이드 추가됨");
  };
  const addContentBlockAfter = (lastId, headId) => {
    const nb = GS.Blocks.outline(4, "");
    const bs = doc.blocks.slice();
    let at;
    if (lastId) at = bs.findIndex((b) => b.id === lastId) + 1;
    else if (headId) { const r = sectionRange(headId); at = r ? r[1] : bs.length; }
    else at = bs.length;
    bs.splice(at, 0, nb);
    onChange({ ...doc, blocks: bs }); setFocusId(nb.id); markActive(nb.id);
  };


  // 대제목(레벨 1) 기준으로 본문을 페이지(시트)로 사전 구획
  const groups = [];
  doc.blocks.forEach((b, i) => {
    const isL1 = b.type === "outline" && b.level === 1;
    if (isL1 || groups.length === 0) groups.push({ head: isL1 ? b : null, items: [] });
    groups[groups.length - 1].items.push({ block: b, index: i });
  });

  const renderItem = ({ block, index }) => (
    <div key={block.id}>
      <BlockWrap
        block={block} num={numbering.byId[block.id]} editable={true}
        autoFocus={focusId === block.id} active={activeId === block.id}
        onChange={(nb) => setBlock(block.id, nb)}
        dnd={dndApi} onAction={openAction} />
      <InsertZone onAdd={(e) => openInsert(index + 1, e)} />
    </div>
  );

  const edApi = {
    numbering, setBlock, setMeta, openInsert, openAction,
    dndApi, activeId, focusId,
    setTocDepth, sectionRange, deleteRange, duplicateRange, swapRanges,
    addSection, addContentBlockAfter, docBlocks: doc.blocks,
  };

  if (doc.format === "slide") {
    return (
      <div className="canvas deck-canvas" onFocusCapture={activeFromEvent} onMouseDownCapture={activeFromEvent}>
        <div className="slide-hint no-print" style={{ margin: "20px auto 0" }}>
          <Icon name="slides" size={15} /> <b>슬라이드형</b> — 아래는 실제 16:9 슬라이드입니다. 내용을 직접 편집하면 분량에 따라 슬라이드가 자동으로 나뉩니다. <b>미리보기</b>에서 확인 후 PDF로 내보내세요.
        </div>
        <EditableDeck doc={doc} ed={edApi} />

        {insMenu && (
          <InsertMenu x={insMenu.x} y={insMenu.y}
            onClose={() => setInsMenu(null)}
            onPick={(block) => { insertAt(insMenu.index, block); setInsMenu(null); }} />
        )}
        {actMenu && (
          <Popover x={actMenu.x} y={actMenu.y} width={190} onClose={() => setActMenu(null)}>
            <ActItem ic="up" label="위로 이동" onPick={() => { moveBlock(actMenu.block.id, -1); setActMenu(null); }} />
            <ActItem ic="down" label="아래로 이동" onPick={() => { moveBlock(actMenu.block.id, 1); setActMenu(null); }} />
            {actMenu.block.type === "outline" && <>
              <ActItem ic="indentL" label="내어쓰기 (상위)" onPick={() => { setLevel(actMenu.block.id, -1); setActMenu(null); }} />
              <ActItem ic="indentR" label="들여쓰기 (하위)" onPick={() => { setLevel(actMenu.block.id, 1); setActMenu(null); }} />
            </>}
            <ActItem ic="copy" label="복사" kbd="⌘C" onPick={() => { clipRef.current = JSON.parse(JSON.stringify(actMenu.block)); flash("블록 복사됨"); setActMenu(null); }} />
            <ActItem ic="copy" label="복제" onPick={() => { duplicateBlock(actMenu.block.id); setActMenu(null); }} />
            <ActItem ic="file" label="붙여넣기" kbd="⌘V" onPick={() => { if (clipRef.current) { insertAfter(actMenu.block.id, { ...JSON.parse(JSON.stringify(clipRef.current)), id: GS.uid() }); flash("블록 붙여넣기"); } setActMenu(null); }} />
            <div style={{ height: 1, background: "var(--chrome-line)", margin: "5px 6px" }}></div>
            <ActItem ic="trash" label="잘라내기 / 삭제" kbd="⌘X" danger onPick={() => { clipRef.current = JSON.parse(JSON.stringify(actMenu.block)); removeBlock(actMenu.block.id); flash("블록 잘라냄"); setActMenu(null); }} />
          </Popover>
        )}
        {toast && <div className="toast no-print">{toast}</div>}
      </div>
    );
  }

  return (
    <div className="canvas" onFocusCapture={activeFromEvent} onMouseDownCapture={activeFromEvent}>
      <div className="canvas-scroll">

        {/* cover */}
        <div className="sheet cover-sheet">
          <CoverBlock meta={doc.meta} editable={true} onMeta={setMeta} />
        </div>

        {/* toc */}
        {doc.showToc && (
          <div className="sheet flow-sheet">
            <RunHead title={doc.meta.title} />
            <div className="doc"><TocView toc={numbering.toc} pageById={null} depth={doc.tocDepth || 2} /></div>
            <RunFoot left={doc.meta.dept} right={doc.meta.date} />
          </div>
        )}

        {/* body — 대제목마다 별도 페이지(시트) */}
        {groups.map((g, gi) => {
          const headNum = g.head ? numbering.byId[g.head.id] : null;
          const headText = g.head ? (g.head.text || "(제목 없음)") : "표지·서두";
          return (
            <div key={"g" + gi}>
              <div className="sheet-label no-print">
                <span className="sl-pg">{"PAGE " + (gi + 1)}</span>
                <span className="sl-tx">{headNum ? headNum + " " : ""}{headText}</span>
              </div>

              <div className="sheet flow-sheet">
                <RunHead title={doc.meta.title} />
                <div className="doc">
                  {gi === 0 && <InsertZone onAdd={(e) => openInsert(0, e)} />}
                  {g.items.map(renderItem)}
                </div>
                <RunFoot left={doc.meta.dept} right={doc.meta.date} />
              </div>
            </div>
          );
        })}

        {doc.blocks.length === 0 && (
          <div className="sheet flow-sheet">
            <RunHead title={doc.meta.title} />
            <div className="doc">
              <InsertZone onAdd={(e) => openInsert(0, e)} />
              <div style={{ textAlign: "center", color: "var(--faint)", padding: "60px 0", fontSize: 14 }}>
                위의 <Icon name="plus" size={12} /> 버튼으로 첫 블록을 추가하세요.
              </div>
            </div>
            <RunFoot left={doc.meta.dept} right={doc.meta.date} />
          </div>
        )}
      </div>

      {insMenu && (
        <InsertMenu x={insMenu.x} y={insMenu.y}
          onClose={() => setInsMenu(null)}
          onPick={(block) => { insertAt(insMenu.index, block); setInsMenu(null); }} />
      )}

      {actMenu && (
        <Popover x={actMenu.x} y={actMenu.y} width={190} onClose={() => setActMenu(null)}>
          <ActItem ic="up" label="위로 이동" onPick={() => { moveBlock(actMenu.block.id, -1); setActMenu(null); }} />
          <ActItem ic="down" label="아래로 이동" onPick={() => { moveBlock(actMenu.block.id, 1); setActMenu(null); }} />
          {actMenu.block.type === "outline" && <>
            <ActItem ic="indentL" label="내어쓰기 (상위)" onPick={() => { setLevel(actMenu.block.id, -1); setActMenu(null); }} />
            <ActItem ic="indentR" label="들여쓰기 (하위)" onPick={() => { setLevel(actMenu.block.id, 1); setActMenu(null); }} />
          </>}
          <ActItem ic="copy" label="복사" kbd="⌘C" onPick={() => { clipRef.current = JSON.parse(JSON.stringify(actMenu.block)); flash("블록 복사됨"); setActMenu(null); }} />
          <ActItem ic="copy" label="복제" onPick={() => { duplicateBlock(actMenu.block.id); setActMenu(null); }} />
          <ActItem ic="file" label="붙여넣기" kbd="⌘V" onPick={() => { if (clipRef.current) { insertAfter(actMenu.block.id, { ...JSON.parse(JSON.stringify(clipRef.current)), id: GS.uid() }); flash("블록 붙여넣기"); } setActMenu(null); }} />
          <div style={{ height: 1, background: "var(--chrome-line)", margin: "5px 6px" }}></div>
          <ActItem ic="trash" label="잘라내기 / 삭제" kbd="⌘X" danger onPick={() => { clipRef.current = JSON.parse(JSON.stringify(actMenu.block)); removeBlock(actMenu.block.id); flash("블록 잘라냄"); setActMenu(null); }} />
        </Popover>
      )}

      {toast && <div className="toast no-print">{toast}</div>}
    </div>
  );
}

function ActItem({ ic, label, onPick, danger, kbd }) {
  return (
    <div className="menu-item" style={{ padding: "7px 10px", justifyContent: "space-between" }} onMouseDown={(e) => { e.preventDefault(); onPick(); }}>
      <span style={{ display: "flex", alignItems: "center", gap: 11 }}>
        <Icon name={ic} size={15} style={{ color: danger ? "var(--warn)" : "var(--muted)" }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: danger ? "var(--warn)" : "var(--ink)" }}>{label}</span>
      </span>
      {kbd && <span style={{ fontSize: 11, color: "var(--faint)", fontWeight: 600 }}>{kbd}</span>}
    </div>
  );
}

window.Editor = Editor;

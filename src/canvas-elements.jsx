/* ============================================================
   Free-Canvas Deck UI — 요소 렌더러 + 선택/이동/리사이즈 + 덱
   canvas-core.jsx (CanvasKit) 의존. window.CanvasDeck 노출.
   ============================================================ */
const CK = window.CanvasKit;
const CVW = CK.CV_W, CVH = CK.CV_H;
const CCOLOR = { ink: "var(--ink)", soft: "var(--ink-soft)", muted: "var(--muted)", accent: "var(--accent)", white: "#fff", faint: "var(--faint)", inkdark: "var(--accent-ink)" };

/* ---------- 인라인 편집 텍스트 ---------- */
function CvEditable({ value, onCommit, style, className, autoFocus, placeholder }) {
  const ref = cRef(null);
  cEffect(() => { const el = ref.current; if (el && el.innerText !== (value || "")) el.innerText = value || ""; }, [value]);
  cEffect(() => { if (autoFocus && ref.current) { const el = ref.current; el.focus(); const r = document.createRange(); r.selectNodeContents(el); r.collapse(false); const s = window.getSelection(); s.removeAllRanges(); s.addRange(r); } }, []);
  return (
    <div ref={ref} contentEditable suppressContentEditableWarning spellCheck={false}
      className={className} style={style} data-ph={placeholder}
      onMouseDown={(e) => e.stopPropagation()}
      onBlur={(e) => { const v = e.currentTarget.innerText.replace(/\n+$/g, ""); if (v !== (value || "")) onCommit(v); }}
      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); e.currentTarget.blur(); } e.stopPropagation(); }} />
  );
}

/* ---------- 목차 (그룹·균등 2단 · 넘치면 자동 축소) ---------- */
function TocElement({ el, numbering, editable, onCommit }) {
  const depth = el.depth || 2;
  const entries = numbering.toc.filter((t) => t.level <= depth);
  const groups = [];
  entries.forEach((t) => {
    if (t.level === 1 || !groups.length) groups.push({ head: t.level === 1 ? t : null, subs: t.level === 1 ? [] : [t] });
    else groups[groups.length - 1].subs.push(t);
  });
  const twoCol = groups.length > 3 || entries.length > 8;

  const contRef = cRef(null), headRef = cRef(null), bodyRef = cRef(null);
  const [fit, setFit] = cState(1);
  const depKey = entries.map((t) => t.level + t.text).join("|") + "@" + el.w + "x" + el.h + "/" + depth;
  cLayout(() => {
    const cont = contRef.current, head = headRef.current, body = bodyRef.current;
    if (!cont || !body) return;
    const avail = cont.clientHeight - (head ? head.offsetHeight : 0) - 4;
    if (avail <= 0) return;
    const measure = (f) => { body.style.setProperty("--tf", f); return body.scrollHeight; };
    if (measure(1) <= avail) { setFit(1); return; }
    let lo = 0.4, hi = 1, best = 0.4;
    for (let i = 0; i < 9; i++) { const mid = (lo + hi) / 2; if (measure(mid) <= avail) { best = mid; lo = mid; } else hi = mid; }
    setFit(best);
  }, [depKey]);

  return (
    <div className="cv-toc" ref={contRef}>
      <div className="cv-toc-head" ref={headRef}>
        <span className="cv-toc-bar"></span>목차
        {editable && (
          <span className="cv-toc-depth" onPointerDown={(e) => e.stopPropagation()}>
            <button className={depth === 1 ? "on" : ""} onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onCommit({ ...el, depth: 1 }); }}>대제목만</button>
            <button className={depth >= 2 ? "on" : ""} onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onCommit({ ...el, depth: 2 }); }}>소제목까지</button>
          </span>
        )}
      </div>
      <div className={"cv-toc-body" + (twoCol ? " two-col" : "")} ref={bodyRef} style={{ "--tf": fit }}>
        {groups.map((g, i) => (
          <div className="cv-toc-group" key={i}>
            {g.head && (
              <div className="cv-toc-item lv1"><span className="ti-num">{g.head.num}</span><span className="ti-tx" dangerouslySetInnerHTML={{ __html: window.mdInline(g.head.text) || "&nbsp;" }} /></div>
            )}
            {g.subs.map((s) => (
              <div className={"cv-toc-item lv" + s.level} key={s.id}><span className="ti-num">{s.num}</span><span className="ti-tx" dangerouslySetInnerHTML={{ __html: window.mdInline(s.text) || "&nbsp;" }} /></div>
            ))}
          </div>
        ))}
        {entries.length === 0 && <div style={{ color: "var(--faint)", fontSize: 18 }}>섹션을 추가하면 목차가 자동 생성됩니다.</div>}
      </div>
    </div>
  );
}

/* ---------- 요소 내용 렌더 ---------- */
function ElContent({ el, numbering, editable, editing, onCommit }) {
  if (el.kind === "rule") return <div className="cv-rule"></div>;

  if (el.kind === "text") {
    const num = el.level >= 1 ? numbering.byId[el.id] : null;
    const cls = "cv-text" + (el.level >= 1 ? " h" + el.level : " plain") + (el._section ? " section" : "");
    const col = el.color ? (CCOLOR[el.color] || el.color) : null;
    const style = { fontSize: el.fontSize, color: col, fontWeight: el.bold ? 800 : (el.level >= 1 ? 700 : 400), fontStyle: el.italic ? "italic" : null, textAlign: el.align || "left", fontFamily: el.fontFamily || (el.serif ? "var(--font-serif)" : null), lineHeight: el.lineHeight || (el.level >= 3 || el.level === 0 ? 1.5 : 1.25), justifyContent: el.align === "center" ? "center" : el.align === "right" ? "flex-end" : null };
    const hl = el.highlight ? { background: el.highlight, boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone", padding: "0 .12em", borderRadius: "3px" } : null;
    return (
      <div className={cls} style={style}>
        {num && el.level === 3 ? <span className="cv-badge">{num}</span>
          : num ? <span className="cv-num">{num}</span> : null}
        {editing
          ? <CvEditable value={el.text} autoFocus placeholder="텍스트" className="cv-text-edit" style={{ flex: 1 }} onCommit={(v) => onCommit({ ...el, text: v })} />
          : <span className="cv-text-tx" style={hl} dangerouslySetInnerHTML={{ __html: window.mdInline(el.text) || (editable ? "<span style='color:var(--faint)'>텍스트</span>" : "&nbsp;") }} />}
      </div>
    );
  }

  if (el.kind === "callout") {
    return (
      <div className={"cv-callout" + (el.variant === "warn" ? " warn" : "")}>
        <Icon name={el.variant === "warn" ? "warn" : "info"} size={20} className="cv-co-ic"
          onMouseDown={editable ? (e) => { e.stopPropagation(); onCommit({ ...el, variant: el.variant === "warn" ? "note" : "warn" }); } : undefined}
          style={editable ? { cursor: "pointer" } : null} />
        {editing
          ? <CvEditable value={el.text} autoFocus className="cv-co-tx" style={{ flex: 1 }} onCommit={(v) => onCommit({ ...el, text: v })} />
          : <span className="cv-co-tx" dangerouslySetInnerHTML={{ __html: window.mdInline(el.text) || "&nbsp;" }} />}
      </div>
    );
  }

  if (el.kind === "toc") return <TocElement el={el} numbering={numbering} editable={editable} onCommit={onCommit} />;

  if (el.kind === "image") {
    return (
      <div className="cv-image">
        {el.src ? <img src={el.src} alt={el.caption || ""} draggable={false} />
          : <div className="cv-image-ph"><Icon name="image" size={40} /><span>{el.caption || "이미지"}</span>{editable && <em>더블클릭하여 업로드</em>}</div>}
        {el.caption ? <div className="cv-cap" dangerouslySetInnerHTML={{ __html: window.mdInline(el.caption) }} /> : null}
      </div>
    );
  }

  if (el.kind === "table") {
    if (editing) {
      const setCell = (r, c, v) => { const rows = el.rows.map((x) => x.slice()); rows[r][c] = v; onCommit({ ...el, rows }); };
      const setCol = (c, v) => { const columns = el.columns.slice(); columns[c] = v; onCommit({ ...el, columns }); };
      const addRow = () => onCommit({ ...el, rows: [...el.rows, el.columns.map(() => "")] });
      const delRow = (r) => onCommit({ ...el, rows: el.rows.filter((_, i) => i !== r) });
      const addCol = () => onCommit({ ...el, columns: [...el.columns, "항목"], rows: el.rows.map((row) => [...row, ""]) });
      const delCol = (c) => onCommit({ ...el, columns: el.columns.filter((_, i) => i !== c), rows: el.rows.map((row) => row.filter((_, i) => i !== c)) });
      return (
        <div className="cv-table-wrap editing">
          <table className="cv-table">
            <thead><tr>
              <th style={{ width: 22, background: "#384a66", padding: 0 }}></th>
              {el.columns.map((c, ci) => (
                <th key={ci}><div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <CvEditable value={c} className="cv-cell-edit" style={{ flex: 1, color: "#fff" }} onCommit={(v) => setCol(ci, v)} />
                  {el.columns.length > 1 && <button className="cv-cell-x" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); delCol(ci); }}>×</button>}
                </div></th>
              ))}
            </tr></thead>
            <tbody>
              {el.rows.map((row, ri) => (
                <tr key={ri}>
                  <td style={{ padding: 0, textAlign: "center", background: "#f7f8fa", width: 22 }}>
                    <button className="cv-row-x" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); delRow(ri); }}>×</button>
                  </td>
                  {row.map((cell, ci) => (
                    <td key={ci} className={el.keyCol && ci === 0 ? "k" : ""}><CvEditable value={cell} className="cv-cell-edit" onCommit={(v) => setCell(ri, ci, v)} /></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="cv-table-add" onMouseDown={(e) => e.stopPropagation()}>
            <button onMouseDown={(e) => { e.preventDefault(); addRow(); }}>＋행</button>
            <button onMouseDown={(e) => { e.preventDefault(); addCol(); }}>＋열</button>
          </div>
        </div>
      );
    }
    return (
      <div className="cv-table-wrap">
        <table className="cv-table">
          <thead><tr>{(el.columns || []).map((c, i) => <th key={i} dangerouslySetInnerHTML={{ __html: window.mdInline(c) }} />)}</tr></thead>
          <tbody>{(el.rows || []).map((r, ri) => <tr key={ri}>{r.map((cell, ci) => <td key={ci} className={el.keyCol && ci === 0 ? "k" : ""} dangerouslySetInnerHTML={{ __html: window.mdInline(cell) || "&nbsp;" }} />)}</tr>)}</tbody>
        </table>
        {el.caption ? <div className="cv-cap">{el.caption}</div> : null}
      </div>
    );
  }
  if (el.kind === "shape") {
    if (el.shape === "rect") return <div style={{ width: "100%", height: "100%", background: el.fill || "transparent", border: (el.strokeW || 0) + "px solid " + (el.stroke || "transparent"), borderRadius: (el.radius || 0) + "px", boxSizing: "border-box" }}></div>;
    if (el.shape === "ellipse") return <div style={{ width: "100%", height: "100%", background: el.fill || "transparent", border: (el.strokeW || 0) + "px solid " + (el.stroke || "transparent"), borderRadius: "50%", boxSizing: "border-box" }}></div>;
    // line / arrow → SVG
    const sw = el.strokeW || 3, col = el.stroke || "#233148";
    return (
      <svg width="100%" height="100%" viewBox={"0 0 " + (el.w || 1) + " " + (el.h || 1)} preserveAspectRatio="none" style={{ overflow: "visible" }}>
        <line x1="0" y1={(el.h || 2) / 2} x2={el.w || 1} y2={(el.h || 2) / 2} stroke={col} strokeWidth={sw} strokeLinecap="round" />
        {el.shape === "arrow" && <polyline points={`${(el.w || 1) - 14},${(el.h || 2) / 2 - 9} ${el.w || 1},${(el.h || 2) / 2} ${(el.w || 1) - 14},${(el.h || 2) / 2 + 9}`} fill="none" stroke={col} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />}
      </svg>
    );
  }
  return null;
}

/* ---------- 선택/이동/리사이즈 래퍼 ---------- */
const HANDLES = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
function CanvasElement({ el, numbering, editable, selected, primary, single, editing, scale, slideId, onSelect, onChange, onStartEdit, onDragStart, onGroupMove }) {
  const startDrag = (e) => {
    if (!editable || editing) return;
    if (e.button !== 0) return;
    e.stopPropagation();
    if (e.shiftKey) { onSelect(el.id, true); return; }
    onDragStart(el.id);
    const sx = e.clientX, sy = e.clientY; let moved = false; let ldx = 0, ldy = 0;
    const move = (ev) => { moved = true; ldx = (ev.clientX - sx) / scale; ldy = (ev.clientY - sy) / scale; onGroupMove(ldx, ldy, true); };
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); onGroupMove(ldx, ldy, false); };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
  };
  const startResize = (dir) => (e) => {
    e.stopPropagation(); e.preventDefault(); onSelect(el.id, false);
    const sx = e.clientX, sy = e.clientY; const o = { x: el.x, y: el.y, w: el.w, h: el.h };
    const move = (ev) => {
      const dx = (ev.clientX - sx) / scale, dy = (ev.clientY - sy) / scale;
      let { x, y, w, h } = o;
      if (dir.includes("e")) w = Math.max(20, o.w + dx);
      if (dir.includes("s")) h = Math.max(10, o.h + dy);
      if (dir.includes("w")) { w = Math.max(20, o.w - dx); x = o.x + (o.w - w); }
      if (dir.includes("n")) { h = Math.max(10, o.h - dy); y = o.y + (o.h - h); }
      onChange({ ...el, x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) }, true);
    };
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); onChange(null, false); };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
  };
  return (
    <div className={"cv-el" + (selected ? " sel" : "") + (editing ? " editing" : "")}
      style={{ left: el.x, top: el.y, width: el.w, height: el.h, zIndex: el.z || 1 }}
      onPointerDown={startDrag}
      onDoubleClick={(e) => { if (editable && (el.kind === "text" || el.kind === "callout" || el.kind === "table")) { e.stopPropagation(); onStartEdit(el.id); } if (editable && el.kind === "image") { e.stopPropagation(); onStartEdit("__img__" + el.id); } }}>
      <ElContent el={el} numbering={numbering} editable={editable} editing={editing} onCommit={(ne) => onChange(ne, false)} />
      {editable && selected && primary && single && !editing && HANDLES.map((d) => <span key={d} className={"cv-h cv-h-" + d} onPointerDown={startResize(d)}></span>)}
    </div>
  );
}

/* ---------- 슬라이드 ---------- */
function CanvasSlide({ slide, index, total, numbering, editable, scale, selIds, primaryId, editing, kicker, guides, marquee, hideNums, onNotes, onSelectEl, onChangeEl, onStartEdit, onElDragStart, onGroupMove, onMarquee, onSlideClick, slideTools }) {
  const single = (selIds || []).length === 1;
  const slideMouseDown = (e) => {
    if (!editable) return;
    if (!(e.target.classList.contains("cv-slide") || e.target.classList.contains("cv-kicker"))) return;
    const frame = e.currentTarget.getBoundingClientRect();
    const ox = (e.clientX - frame.left) / scale, oy = (e.clientY - frame.top) / scale;
    let moved = false;
    const move = (ev) => {
      moved = true;
      const cx = (ev.clientX - frame.left) / scale, cy = (ev.clientY - frame.top) / scale;
      onMarquee(slide.id, { x: Math.min(ox, cx), y: Math.min(oy, cy), w: Math.abs(cx - ox), h: Math.abs(cy - oy) }, false);
    };
    const up = (ev) => {
      window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up);
      if (moved) { const cx = (ev.clientX - frame.left) / scale, cy = (ev.clientY - frame.top) / scale; onMarquee(slide.id, { x: Math.min(ox, cx), y: Math.min(oy, cy), w: Math.abs(cx - ox), h: Math.abs(cy - oy) }, true); }
      else onSlideClick();
    };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
  };
  return (
    <div className="cv-slide-wrap">
      {editable && (
        <div className="cv-slide-label no-print">
          <span className="cl-num">슬라이드 {index + 1}</span>
          <span className="cl-tx">{slide.kind === "title" ? "타이틀" : slide.kind === "agenda" ? "목차" : slide.kind === "section" ? "섹션 표지" : "내용"}{slide.section ? " · " + slide.section : ""}</span>
          {slideTools}
        </div>
      )}
      <div className="cv-slide-frame" style={{ width: CVW * scale, height: CVH * scale }}>
        <div className={"cv-slide bg-" + (slide.bg || "white")} style={{ width: CVW, height: CVH, transform: "scale(" + scale + ")" }}
          onPointerDown={slideMouseDown}>
          {kicker && <div className="cv-kicker"><span className="cv-kicker-bar"></span>{kicker}</div>}
          {(slide.elements || []).map((el) => (
            <CanvasElement key={el.id} el={el} numbering={numbering} editable={editable}
              selected={(selIds || []).includes(el.id)} primary={primaryId === el.id} single={single}
              editing={editing === el.id} scale={scale} slideId={slide.id}
              onSelect={(id, additive) => onSelectEl(slide.id, id, additive)}
              onChange={(ne, live) => onChangeEl(slide.id, el.id, ne, live)}
              onStartEdit={onStartEdit} onDragStart={(id) => onElDragStart(slide.id, id)} onGroupMove={onGroupMove} />
          ))}
          {guides && editable && <>
            {(guides.v || []).map((x, i) => <div key={"v" + i} className="cv-guide v" style={{ left: x }}></div>)}
            {(guides.h || []).map((y, i) => <div key={"h" + i} className="cv-guide h" style={{ top: y }}></div>)}
          </>}
          {marquee && editable && <div className="cv-marquee" style={{ left: marquee.x, top: marquee.y, width: marquee.w, height: marquee.h }}></div>}
          {!hideNums && <div className="cv-pagenum">{index + 1} <span style={{ opacity: .5 }}>/ {total}</span></div>}
        </div>
      </div>
      {editable && (
        <details className="cv-notes no-print">
          <summary>발표자 노트{slide.notes ? " ●" : ""}</summary>
          <textarea value={slide.notes || ""} placeholder="이 슬라이드의 발표자 노트를 입력하세요…" onChange={(e) => onNotes(slide.id, e.target.value)}></textarea>
        </details>
      )}
    </div>
  );
}

window.CanvasElement = CanvasElement; window.CanvasSlide = CanvasSlide; window.TocElement = TocElement; window.ElContent = ElContent;

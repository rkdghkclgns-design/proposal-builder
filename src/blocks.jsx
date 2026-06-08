/* ============================================================
   Blocks — editable + read-only renderers for every block type
   Shared by the editor (editable) and paginated preview (read-only)
   ============================================================ */
const { useRef, useEffect, useState } = React;

/* ---------- read-only markdown text ---------- */
function MD({ text, tag = "span", className, style }) {
  const Tag = tag;
  return <Tag className={className} style={style} dangerouslySetInnerHTML={{ __html: window.mdInline(text || "") || "\u00a0" }} />;
}

/* ---------- inline contentEditable (markdown-aware) ----------
   - 포커스 중에는 원문(마크다운 소스)을 편집
   - 포커스를 벗어나면 서식이 적용된 결과를 표시
*/
function Editable({ value, onCommit, placeholder = "", className = "", tag = "div", style, autoFocus = false, markdown = true }) {
  const ref = useRef(null);
  const editingRef = useRef(false);

  const toggleEmpty = (el) => {
    if (!el) return;
    if (!(value || "").trim()) el.classList.add("empty"); else el.classList.remove("empty");
  };
  const applyFormatted = (el) => {
    const html = markdown ? window.mdInline(value || "") : "";
    if (markdown) { if (el.innerHTML !== html) el.innerHTML = html; }
    else if (el.innerText !== (value || "")) el.innerText = value || "";
    toggleEmpty(el);
  };
  const applyRaw = (el) => {
    if (el.innerText !== (value || "")) {
      el.innerText = value || "";
      const r = document.createRange(); r.selectNodeContents(el); r.collapse(false);
      const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
    }
    toggleEmpty(el);
  };

  useEffect(() => {
    const el = ref.current; if (!el) return;
    if (editingRef.current) applyRaw(el); else applyFormatted(el);
  }, [value]);
  useEffect(() => { if (autoFocus && ref.current) ref.current.focus(); }, []);

  const Tag = tag;
  return (
    <Tag
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      className={className + " editable"}
      data-ph={placeholder}
      style={style}
      onFocus={(e) => { editingRef.current = true; applyRaw(e.currentTarget); }}
      onInput={(e) => toggleEmptyLive(e.currentTarget)}
      onBlur={(e) => {
        editingRef.current = false;
        const v = e.currentTarget.innerText.replace(/\n+$/g, "");
        if (v !== (value || "")) onCommit(v);
        applyFormatted(e.currentTarget);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); e.currentTarget.blur(); }
      }}
    />
  );
}
function toggleEmptyLive(el) {
  if (!el) return;
  if (!el.innerText.replace(/\u200b/g, "").trim()) el.classList.add("empty");
  else el.classList.remove("empty");
}

/* ---------- image downscale helper ---------- */
function fileToScaledDataURL(file, maxW = 1400) {
  return new Promise((resolve) => {
    const fr = new FileReader();
    fr.onload = () => {
      const im = new Image();
      im.onload = () => {
        const scale = Math.min(1, maxW / im.width);
        const w = Math.round(im.width * scale), h = Math.round(im.height * scale);
        const c = document.createElement("canvas"); c.width = w; c.height = h;
        c.getContext("2d").drawImage(im, 0, 0, w, h);
        try { resolve(c.toDataURL("image/jpeg", 0.85)); }
        catch (e) { resolve(fr.result); }
      };
      im.onerror = () => resolve(fr.result);
      im.src = fr.result;
    };
    fr.readAsDataURL(file);
  });
}

/* ---------- outline ---------- */
const PH = { 1: "섹션 제목", 2: "소제목", 3: "항목 제목 (A · B · C)", 4: "내용", 5: "세부 내용" };
function OutlineBlock({ block, num, editable, onChange, autoFocus }) {
  return (
    <div className={"ob l" + block.level}>
      <div className="ob-row">
        <div className="ob-num">{num}</div>
        {editable
          ? <Editable className="ob-text" value={block.text} placeholder={PH[block.level] || "내용"} autoFocus={autoFocus}
              onCommit={(v) => onChange({ ...block, text: v })} />
          : <MD tag="div" className="ob-text" text={block.text} />}
      </div>
    </div>
  );
}

/* ---------- data table ---------- */
const miniBtn = {
  border: "1px solid #d4d8de", background: "#fff", color: "#7b818b", borderRadius: 6,
  fontSize: 11, fontWeight: 700, padding: "4px 9px", cursor: "pointer",
};
function TableBlock({ block, editable, onChange }) {
  const update = (patch) => onChange({ ...block, ...patch });
  const setCell = (r, c, v) => { const rows = block.rows.map((x) => x.slice()); rows[r][c] = v; update({ rows }); };
  const setCol = (c, v) => { const columns = block.columns.slice(); columns[c] = v; update({ columns }); };
  const addRow = () => update({ rows: [...block.rows, block.columns.map(() => "")] });
  const delRow = (r) => update({ rows: block.rows.filter((_, i) => i !== r) });
  const addCol = () => update({ columns: [...block.columns, "항목"], rows: block.rows.map((row) => [...row, ""]) });
  const delCol = (c) => update({ columns: block.columns.filter((_, i) => i !== c), rows: block.rows.map((row) => row.filter((_, i) => i !== c)) });

  return (
    <div className={"dtbl-wrap" + (editable ? " editing" : "")}>
      <table className="dtbl">
        <thead>
          <tr>
            {editable && <th style={{ width: 26, background: "#384a66", padding: 0 }}></th>}
            {block.columns.map((c, ci) => (
              <th key={ci}>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  {editable
                    ? <Editable tag="span" value={c} placeholder="열 이름" style={{ flex: 1, color: "#fff" }}
                        onCommit={(v) => setCol(ci, v)} />
                    : <MD text={c} />}
                  {editable && block.columns.length > 1 &&
                    <button title="열 삭제" onClick={() => delCol(ci)}
                      style={{ border: "none", background: "rgba(255,255,255,.18)", color: "#fff", width: 16, height: 16, borderRadius: 4, cursor: "pointer", lineHeight: 1, fontSize: 11 }}>×</button>}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row, ri) => (
            <tr key={ri}>
              {editable &&
                <td style={{ padding: 0, textAlign: "center", background: "#f7f8fa", width: 26 }}>
                  <button title="행 삭제" onClick={() => delRow(ri)}
                    style={{ border: "none", background: "transparent", color: "#b23b2e", cursor: "pointer", fontSize: 13, width: "100%", height: "100%" }}>×</button>
                </td>}
              {row.map((cell, ci) => (
                <td key={ci} className={block.keyCol && ci === 0 ? "k" : ""}>
                  {editable
                    ? <Editable value={cell} placeholder="입력" onCommit={(v) => setCell(ri, ci, v)} />
                    : <MD text={cell} />}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {editable &&
        <div style={{ display: "flex", gap: 7, marginTop: 6 }}>
          <button style={miniBtn} onClick={addRow}>+ 행 추가</button>
          <button style={miniBtn} onClick={addCol}>+ 열 추가</button>
        </div>}
      {editable
        ? <Editable className="dtbl-cap" value={block.caption} placeholder="〈참고 표 – 설명〉"
            onCommit={(v) => update({ caption: v })} />
        : (block.caption ? <MD tag="div" className="dtbl-cap" text={block.caption} /> : null)}
    </div>
  );
}

/* ---------- image / figure (자유 크기·위치) ---------- */
const ALIGN_MARGIN = {
  left: { marginLeft: 0, marginRight: "auto" },
  center: { marginLeft: "auto", marginRight: "auto" },
  right: { marginLeft: "auto", marginRight: 0 },
};
function ImageBlock({ block, editable, onChange }) {
  const inputRef = useRef(null);
  const [drag, setDrag] = useState(false);
  const width = block.width || 100;
  const align = block.align || "center";
  const handleFile = (file) => { if (file) fileToScaledDataURL(file).then((src) => onChange({ ...block, src })); };

  const startResize = (e) => {
    e.preventDefault(); e.stopPropagation();
    const fig = e.currentTarget.closest(".fig");
    const parentW = fig.parentElement.getBoundingClientRect().width;
    const startX = e.clientX;
    const startW = fig.getBoundingClientRect().width;
    const move = (ev) => {
      let pct = Math.round(((startW + (ev.clientX - startX)) / parentW) * 100);
      pct = Math.max(20, Math.min(100, pct));
      onChange({ ...block, width: pct, align });
    };
    const up = () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
    window.addEventListener("mousemove", move); window.addEventListener("mouseup", up);
  };

  const figStyle = { width: width + "%", ...ALIGN_MARGIN[align] };

  const alignBtn = (a, icon, label) => (
    <button title={label} className={align === a ? "on" : ""} onClick={() => onChange({ ...block, align: a })}>
      <Icon name={icon} size={14} />
    </button>
  );

  return (
    <div className="fig" style={figStyle}>
      {editable && (
        <div className="fig-toolbar no-print">
          {alignBtn("left", "alignLeft", "왼쪽")}
          {alignBtn("center", "alignCenter", "가운데")}
          {alignBtn("right", "alignRight", "오른쪽")}
          <span className="ft-sep"></span>
          <button title="작게" onClick={() => onChange({ ...block, width: Math.max(20, width - 10) })}>−</button>
          <span className="ft-w">{width}%</span>
          <button title="크게" onClick={() => onChange({ ...block, width: Math.min(100, width + 10) })}>＋</button>
        </div>
      )}

      <div className="fig-imgwrap" style={{ position: "relative" }}>
        {block.src ? (
          <img className="real" src={block.src} alt={block.caption || ""} draggable={false} />
        ) : editable ? (
          <div className="ph"
            style={{ cursor: "pointer", ...(drag ? { borderColor: "var(--accent)", background: "var(--accent-soft)" } : null) }}
            onClick={() => inputRef.current && inputRef.current.click()}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0]); }}>
            <Icon name="image" size={34} className="ph-ic" />
            <div className="ph-label">{block.caption || "참고 이미지"}</div>
            <div className="ph-hint">클릭하거나 이미지를 끌어다 놓으세요</div>
          </div>
        ) : (
          <div className="ph">
            <Icon name="image" size={34} className="ph-ic" />
            <div className="ph-label">{block.caption || "참고 이미지"}</div>
          </div>
        )}

        {editable && block.src &&
          <button onClick={() => onChange({ ...block, src: "" })} className="no-print"
            style={{ position: "absolute", top: 8, right: 8, ...miniBtn, background: "rgba(28,31,36,.78)", color: "#fff", border: "none" }}>
            이미지 제거
          </button>}
        {editable && <span className="img-resize no-print" title="드래그하여 크기 조절" onMouseDown={startResize}></span>}
      </div>

      {editable
        ? <Editable className="fig-cap" value={block.caption} placeholder="〈참고 이미지 – 설명〉"
            onCommit={(v) => onChange({ ...block, caption: v })} />
        : (block.caption ? <MD tag="div" className="fig-cap" text={block.caption} /> : null)}
      <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }}
        onChange={(e) => handleFile(e.target.files[0])} />
    </div>
  );
}

/* ---------- callout ---------- */
function CalloutBlock({ block, editable, onChange }) {
  return (
    <div className={"callout" + (block.variant === "warn" ? " warn" : "")}>
      <Icon name={block.variant === "warn" ? "warn" : "info"} className="co-ic" size={17}
        style={editable ? { cursor: "pointer" } : null}
        onClick={editable ? () => onChange({ ...block, variant: block.variant === "warn" ? "note" : "warn" }) : undefined} />
      <div className="co-body">
        {editable
          ? <Editable value={block.text} placeholder="안내 문구 (아이콘 클릭 → 일반/경고 전환)"
              onCommit={(v) => onChange({ ...block, text: v })} />
          : <MD text={block.text} />}
      </div>
    </div>
  );
}

/* ---------- dispatcher ---------- */
function BlockBody({ block, num, editable, onChange, autoFocus }) {
  if (block.type === "outline") return <OutlineBlock block={block} num={num} editable={editable} onChange={onChange} autoFocus={autoFocus} />;
  const inner =
    block.type === "table" ? <TableBlock block={block} editable={editable} onChange={onChange} /> :
    block.type === "image" ? <ImageBlock block={block} editable={editable} onChange={onChange} /> :
    block.type === "callout" ? <CalloutBlock block={block} editable={editable} onChange={onChange} /> : null;
  return <div className="body-indent">{inner}</div>;
}

Object.assign(window, { MD, Editable, OutlineBlock, TableBlock, ImageBlock, CalloutBlock, BlockBody, fileToScaledDataURL });

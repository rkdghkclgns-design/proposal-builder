/* ============================================================
   App — library, top bar, edit/preview, autosave, PDF export
   ============================================================ */
const { useState: aState, useEffect: aEffect, useRef: aRef, useCallback } = React;

function firstTag(meta) {
  for (const g of meta.tagGroups || []) { const f = (g.options || []).find((o) => o.on); if (f) return f.label; }
  return null;
}
function fmtDate(ts) {
  try { return new Date(ts).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" }); }
  catch (e) { return ""; }
}

/* ---------- library ---------- */
function Library({ onOpen, onNew, refreshKey }) {
  const docs = GS.list();
  const [confirmId, setConfirmId] = aState(null);

  return (
    <div className="library">
      <div className="library-inner">
        <h1>기획서 빌더</h1>
        <p className="sub">사내 상세 기획서를 블록으로 작성하고 문서(A4) 또는 슬라이드(16:9)로 내보냅니다.</p>
        <div className="lib-grid">
          <div className="new-card" onClick={onNew}>
            <div className="plus"><Icon name="plus" size={22} /></div>
            <span>새 기획서 만들기</span>
          </div>
          {docs.map((d) => {
            const tag = firstTag(d.meta);
            const isSlide = d.format === "slide";
            return (
              <div className="doc-card" key={d.id} onClick={() => onOpen(d.id)}>
                <div className={"thumb" + (isSlide ? " slide" : "")}>
                  <div className={"mini" + (isSlide ? " mini-slide" : "")}>
                    <div className="mt"></div>
                    <div className="ms"></div>
                    {!isSlide && <><div className="ml"></div><div className="ml s"></div>
                    <div className="ml"></div><div className="ml"></div>
                    <div className="ml s"></div><div className="ml"></div></>}
                  </div>
                  <span className="fmt-badge">{isSlide ? "슬라이드" : "문서"}</span>
                </div>
                <div className="meta">
                  <div className="nm">{d.title || "제목 없음"}</div>
                  <div className="dt">{d.meta.subtitle || "상세 기획서"} · {(d.blocks || []).length} 블록</div>
                  <div className="row">
                    <span className="dt">{fmtDate(d.updatedAt)}</span>
                    <div className="card-actions" onClick={(e) => e.stopPropagation()}>
                      {tag && <span className="tagpill">{tag}</span>}
                      <button title="복제" onClick={() => { GS.duplicate(d.id); onOpen(null, true); }}><Icon name="copy" size={14} /></button>
                      <button title="삭제" onClick={() => setConfirmId(d.id)}><Icon name="trash" size={14} /></button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {confirmId && (
        <div className="modal-mask" onClick={() => setConfirmId(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="m-title">기획서를 삭제할까요?</div>
            <div className="m-body">삭제한 문서는 되돌릴 수 없습니다.</div>
            <div className="m-actions">
              <button className="btn" onClick={() => setConfirmId(null)}>취소</button>
              <button className="btn primary" style={{ background: "var(--warn)", borderColor: "var(--warn)" }}
                onClick={() => { GS.remove(confirmId); setConfirmId(null); onOpen(null, true); }}>삭제</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- new-doc format chooser ---------- */
function FormatChooser({ onPick, onClose }) {
  const card = (fmt, icon, title, desc, aspect) => (
    <div className="fmt-card" onClick={() => onPick(fmt)}>
      <div className={"fmt-preview " + fmt}>
        <div className={"fmt-frame " + aspect}>
          <div className="ffl big"></div><div className="ffl"></div><div className="ffl s"></div>
        </div>
      </div>
      <div className="fmt-ic"><Icon name={icon} size={20} /></div>
      <div className="fmt-tx">
        <div className="t">{title}</div>
        <div className="d">{desc}</div>
      </div>
    </div>
  );
  return (
    <div className="modal-mask" onClick={onClose}>
      <div className="modal wide" onClick={(e) => e.stopPropagation()}>
        <div className="m-title">어떤 형식으로 만들까요?</div>
        <div className="m-body">같은 내용을 문서 또는 슬라이드로 작성할 수 있습니다. 나중에 형식을 바꿀 수도 있어요.</div>
        <div className="fmt-grid">
          {card("doc", "doc", "문서형 (A4 세로)", "머리글·바닥글·페이지 번호가 있는 상세 기획서", "portrait")}
          {card("slide", "slides", "슬라이드형 (16:9)", "발표용 · 대제목마다 구분 슬라이드 + 내용", "landscape")}
        </div>
        <div className="m-actions"><button className="btn" onClick={onClose}>취소</button></div>
      </div>
    </div>
  );
}

/* ---------- app root ---------- */
function App() {
  const [view, setView] = aState("library");   // 'library' | 'doc'
  const [doc, setDoc] = aState(null);
  const [mode, setMode] = aState("edit");        // 'edit' | 'preview'
  const [save, setSave] = aState("");
  const [refreshKey, setRefreshKey] = aState(0);
  const [chooser, setChooser] = aState(false);
  const [rev, setRev] = aState(0);            // 외부 복원(undo/redo) 신호 → CanvasDeck 동기화
  const [exportMenu, setExportMenu] = aState(false);
  const saveTimer = aRef(null);
  const histRef = aRef([]);                    // 과거 doc 스냅샷
  const redoRef = aRef([]);                    // 되돌리기 취소용
  const docRef = aRef(null); docRef.current = doc;

  const persist = (nd) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      GS.save(nd);
      const t = new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
      setSave("저장됨 · " + t);
    }, 500);
  };

  const openDoc = (id, justRefresh) => {
    if (justRefresh || id == null) { setRefreshKey((k) => k + 1); return; }
    const d = GS.get(id); if (!d) return;
    histRef.current = []; redoRef.current = [];
    setDoc(d); setView("doc"); setMode("edit"); setSave("저장됨");
  };
  const createWith = (format) => { const d = GS.create(format); histRef.current = []; redoRef.current = []; setChooser(false); setDoc(d); setView("doc"); setMode("edit"); setSave("저장됨"); };
  const backToLib = () => { setView("library"); setDoc(null); setRefreshKey((k) => k + 1); };

  const change = useCallback((nd) => {
    // 직전 상태를 히스토리에 저장 (연속 동일 무시)
    const prev = docRef.current;
    if (prev && JSON.stringify(prev) !== JSON.stringify(nd)) {
      histRef.current.push(prev);
      if (histRef.current.length > 80) histRef.current.shift();
      redoRef.current = [];
    }
    setDoc(nd); setSave("저장 중…");
    persist(nd);
  }, []);

  const undo = () => {
    if (!histRef.current.length) return;
    const prev = histRef.current.pop();
    redoRef.current.push(docRef.current);
    setDoc(prev); persist(prev); setRev((r) => r + 1); setSave("실행 취소됨");
  };
  const redo = () => {
    if (!redoRef.current.length) return;
    const next = redoRef.current.pop();
    histRef.current.push(docRef.current);
    setDoc(next); persist(next); setRev((r) => r + 1); setSave("다시 실행됨");
  };

  const setTitle = (title) => change({ ...doc, title });
  const toggleToc = () => change({ ...doc, showToc: !doc.showToc });
  const setFormat = (format) => change({ ...doc, format });

  const exportPDF = () => {
    setMode("preview");
    const isSlideFmt = doc.format === "slide";
    setSave(isSlideFmt ? "슬라이드 PDF 준비 중…" : "PDF 준비 중…");
    let styleEl = null;
    if (isSlideFmt) {
      // 정확한 16:9 풀블리드 페이지로 출력 (마지막에 선언되어 기본 A4를 덮어씀)
      styleEl = document.getElementById("print-orient") || document.createElement("style");
      styleEl.id = "print-orient";
      styleEl.textContent = "@media print{@page{size:1120px 630px;margin:0}}";
      document.head.appendChild(styleEl);
    }
    setTimeout(() => {
      window.print();
      setSave("저장됨");
      if (styleEl) setTimeout(() => { try { styleEl.remove(); } catch (e) {} }, 800);
    }, 700);
  };

  aEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "p" && view === "doc") { e.preventDefault(); exportPDF(); }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z" && view === "doc") {
        const t = e.target; if (t && (t.isContentEditable || /input|textarea/i.test(t.tagName || ""))) return;
        e.preventDefault();
        if (e.shiftKey) redo(); else undo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "y" && view === "doc") {
        const t = e.target; if (t && (t.isContentEditable || /input|textarea/i.test(t.tagName || ""))) return;
        e.preventDefault(); redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view, doc]);

  if (view === "library") {
    return (
      <div className="app">
        <div className="topbar">
          <div className="brand"><span className="mark">기</span> 기획서 빌더</div>
          <div className="spacer"></div>
        </div>
        <div className="workspace">
          <Library key={refreshKey} onOpen={openDoc} onNew={() => setChooser(true)} refreshKey={refreshKey} />
        </div>
        {chooser && <FormatChooser onPick={createWith} onClose={() => setChooser(false)} />}
      </div>
    );
  }

  const isSlide = doc.format === "slide";
  return (
    <div className="app">
      <div className="topbar">
        <div className="brand" onClick={backToLib} title="문서 목록"><span className="mark">기</span></div>
        <button className="btn ghost sm" onClick={backToLib} title="문서 목록"><Icon name="home" size={15} /></button>
        <span className="sep"></span>
        <input className="doctitle" value={doc.title}
          onChange={(e) => setTitle(e.target.value)} placeholder="제목 없는 기획서" />
        <span className="save-state">{save}</span>
        <div className="spacer"></div>
        <div className="seg" title="출력 형식">
          <button className={!isSlide ? "on" : ""} onClick={() => setFormat("doc")}><Icon name="doc" size={14} /> 문서</button>
          <button className={isSlide ? "on" : ""} onClick={() => setFormat("slide")}><Icon name="slides" size={14} /> 슬라이드</button>
        </div>
        <button className="btn ghost sm" onClick={toggleToc}
          style={doc.showToc ? { color: "var(--accent)", background: "var(--accent-soft)" } : null}
          title={isSlide ? "목차(아젠다) 슬라이드 표시/숨김" : "목차 페이지 표시/숨김"}>
          <Icon name="list" size={15} /> 목차
        </button>
        <div className="seg">
          <button className={mode === "edit" ? "on" : ""} onClick={() => setMode("edit")}>편집</button>
          <button className={mode === "preview" ? "on" : ""} onClick={() => setMode("preview")}>미리보기</button>
        </div>
        <div className="export-wrap" style={{ position: "relative" }}>
          <button className="btn primary sm" onClick={() => setExportMenu((v) => !v)}><Icon name="download" size={15} /> 내보내기 <Icon name="chevronDown" size={13} /></button>
          {exportMenu && (
            <div className="export-menu" onMouseLeave={() => setExportMenu(false)}>
              <button onClick={() => { setExportMenu(false); exportPDF(); }}><Icon name="print" size={15} /> PDF (전체{isSlide ? " · 16:9" : " · A4"})</button>
              {isSlide && <button onClick={() => { setExportMenu(false); window.DeckExport.pptx(doc); }}><Icon name="slides" size={15} /> PPTX (편집 가능)</button>}
              {isSlide && <div className="ex-hint">슬라이드별 PNG는 각 슬라이드의 🖼 버튼</div>}
            </div>
          )}
        </div>
      </div>
      <div className="workspace">
        {isSlide
          ? <CanvasDeck key={doc.id + "-slide"} doc={doc} onChange={change} editable={mode === "edit"} rev={rev} />
          : (mode === "edit" ? <Editor doc={doc} onChange={change} /> : <PreviewView doc={doc} />)}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);

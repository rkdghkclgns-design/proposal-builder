/* ============================================================
   SlideKit + SlideView — 슬라이드(16:9) 페이지네이션과 미리보기
   타이틀 → 목차 → (대제목 구분 슬라이드 → 내용 슬라이드)…
   편집 덱(editor.jsx)과 미리보기가 공유합니다.
   ============================================================ */
const SLIDE_W = 1120, SLIDE_H = 630, SLIDE_PADX = 72, SLIDE_TOP = 104, SLIDE_BOTTOM = 60;
const SLIDE_USABLE = SLIDE_H - SLIDE_TOP - SLIDE_BOTTOM - 50; // -50: 키커 여백

function flatTags(meta) {
  const out = [];
  (meta.tagGroups || []).forEach((g) => (g.options || []).forEach((o) => { if (o.on) out.push(o.label); }));
  return out;
}

/* 블록 → 슬라이드 목록 (높이맵 hmap으로 내용 분할)
   keepEmpty=true → 내용 없는 섹션도 빈 내용 슬라이드 1장 생성(편집용) */
function buildSlides(doc, numbering, hmap, keepEmpty) {
  const groups = [];
  doc.blocks.forEach((b) => {
    const isL1 = b.type === "outline" && b.level === 1;
    if (isL1 || groups.length === 0) groups.push({ head: isL1 ? b : null, items: [] });
    groups[groups.length - 1].items.push(b);
  });

  const list = [{ type: "title" }];
  const depth = doc.tocDepth || 2;
  const tocEntries = numbering.toc.filter((t) => t.level === 1 || (depth >= 2 && t.level === 2));
  if (doc.showToc && tocEntries.some((t) => t.level === 1)) {
    const per = tocEntries.length > 9 ? 16 : 99;  // 길면 2단·여러 장으로 분할
    for (let i = 0; i < tocEntries.length; i += per) {
      list.push({ type: "agenda", entries: tocEntries.slice(i, i + per), part: i / per });
    }
  }
  groups.forEach((g) => {
    if (g.head) list.push({ type: "divider", head: g.head });
    const content = g.items.filter((b) => b !== g.head);
    let cur = [], used = 0, part = 0, emitted = 0;
    const flush = () => { list.push({ type: "content", head: g.head, items: cur, part: part++ }); emitted++; cur = []; used = 0; };
    content.forEach((b) => {
      const h = (hmap && hmap[b.id]) || 60;
      if (cur.length && used + h > SLIDE_USABLE) flush();
      cur.push(b); used += h;
    });
    if (cur.length) flush();
    if (emitted === 0 && (keepEmpty || !g.head)) list.push({ type: "content", head: g.head, items: [], part: 0 });
  });
  return list;
}

/* 읽기 전용 슬라이드 본문 (미리보기) */
function DeckTitle({ meta }) {
  return (
    <div className="ds-title-inner">
      <div className="ds-tags">{flatTags(meta).map((t, i) => <span className="ds-chip" key={i}>{t}</span>)}</div>
      <div className="ds-accent"></div>
      <h1 className="ds-h1">{meta.title || "제목 없음"}</h1>
      <div className="ds-subtitle">{meta.subtitle}</div>
      <div className="ds-titlemeta">{[meta.dept, meta.author, meta.date].filter(Boolean).join("   ·   ")}</div>
    </div>
  );
}
function DeckAgenda({ entries, numbering, depth = 2, editable, onDepth, showControl }) {
  // entries 미지정 시(구버전) numbering에서 계산
  const list = entries || (numbering ? numbering.toc.filter((t) => t.level === 1 || (depth >= 2 && t.level === 2)) : []);
  const many = list.length > 9;
  return (
    <>
      <div className="ds-kicker">
        <span className="ds-kbar"></span>목차
        {editable && showControl && (
          <span className="agenda-depth no-print">
            <button className={depth === 1 ? "on" : ""} onMouseDown={(e) => { e.preventDefault(); onDepth && onDepth(1); }}>대제목만</button>
            <button className={depth >= 2 ? "on" : ""} onMouseDown={(e) => { e.preventDefault(); onDepth && onDepth(2); }}>소제목까지</button>
          </span>
        )}
      </div>
      <ol className={"ds-agenda" + (many ? " two-col" : "")}>
        {list.map((t) => (
          <li key={t.id} className={"ag-lv" + t.level}>
            <span className="ag-num">{t.num}</span>
            <MD tag="span" className="ag-tx" text={t.text} />
          </li>
        ))}
      </ol>
    </>
  );
}
function DeckDivider({ slide, numbering }) {
  return (
    <div className="ds-divider-inner">
      <div className="ds-bignum">{numbering.byId[slide.head.id]}</div>
      <MD tag="h2" className="ds-dh" text={slide.head.text} />
    </div>
  );
}
function DeckKicker({ slide, numbering }) {
  if (!slide.head) return null;
  const txt = numbering.byId[slide.head.id] + " " + (slide.head.text || "");
  return <div className="ds-kicker"><span className="ds-kbar"></span>{txt}{slide.part > 0 ? " (계속)" : ""}</div>;
}

window.SlideKit = {
  SLIDE_W, SLIDE_H, SLIDE_PADX, SLIDE_TOP, SLIDE_BOTTOM, SLIDE_USABLE,
  flatTags, buildSlides, DeckTitle, DeckAgenda, DeckDivider, DeckKicker,
};

/* ---------- 미리보기 덱 (읽기 전용) ---------- */
function DeckSlide({ slide, doc, numbering, index, total, scale }) {
  let body;
  if (slide.type === "title") body = <DeckTitle meta={doc.meta} />;
  else if (slide.type === "agenda") body = <DeckAgenda entries={slide.entries} depth={doc.tocDepth || 2} />;
  else if (slide.type === "divider") body = <DeckDivider slide={slide} numbering={numbering} />;
  else body = (
    <>
      <DeckKicker slide={slide} numbering={numbering} />
      <div className="doc ds-body">
        {slide.items.map((b) => <BlockBody key={b.id} block={b} num={numbering.byId[b.id]} editable={false} onChange={() => {}} />)}
      </div>
    </>
  );
  return (
    <div className="deck-page-wrap" style={{ width: SLIDE_W * scale, height: SLIDE_H * scale }}>
      <div className={"deck-page ds-" + slide.type} style={{ transform: "scale(" + scale + ")" }}>
        {body}
        <div className="deck-num">{index + 1} <span style={{ opacity: .5 }}>/ {total}</span></div>
      </div>
    </div>
  );
}

function SlideView({ doc }) {
  const { useMemo, useLayoutEffect, useState, useRef, useEffect } = React;
  const numbering = useMemo(() => GS.numbering.compute(doc.blocks), [doc]);
  const hostRef = useRef(null);
  const scrollRef = useRef(null);
  const [slides, setSlides] = useState([]);
  const [tick, setTick] = useState(0);
  const [scale, setScale] = useState(1);

  useEffect(() => { if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => setTick((t) => t + 1)); }, []);

  useEffect(() => {
    const el = scrollRef.current; if (!el) return;
    const fit = () => { const w = el.clientWidth - 48; setScale(Math.max(0.25, Math.min(1, w / SLIDE_W))); };
    fit();
    const ro = new ResizeObserver(fit); ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useLayoutEffect(() => {
    const host = hostRef.current; if (!host) return;
    const hmap = {};
    host.querySelectorAll("[data-mi]").forEach((el) => { hmap[el.getAttribute("data-mi")] = el.offsetHeight; });
    setSlides(buildSlides(doc, numbering, hmap));
  }, [doc, numbering, tick]);

  return (
    <div className="canvas deck">
      <div className="deck-scroll" ref={scrollRef}>
        {slides.map((s, i) => <DeckSlide key={i} slide={s} doc={doc} numbering={numbering} index={i} total={slides.length} scale={scale} />)}
      </div>
      <div className="measure-host deck" ref={hostRef} aria-hidden="true" style={{ width: (SLIDE_W - 2 * SLIDE_PADX) + "px" }}>
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
window.SlideView = SlideView;

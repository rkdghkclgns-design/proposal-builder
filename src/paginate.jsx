/* ============================================================
   Preview — paginated A4 output (header/footer/page numbers, TOC pages)
   Measures each block off-screen, packs into pages, breaks before L1.
   ============================================================ */
const PG_H = 1123, PG_TOP = 92, PG_BOTTOM = 76;
const USABLE = PG_H - PG_TOP - PG_BOTTOM; // 955

function PreviewView({ doc }) {
  const { useMemo, useLayoutEffect, useState: pState, useRef: pRef, useEffect: pEffect } = React;
  const numbering = useMemo(() => GS.numbering.compute(doc.blocks), [doc]);
  const hostRef = pRef(null);
  const tocRef = pRef(null);
  const [layout, setLayout] = pState({ pages: [], pageById: {}, tocPages: 1, bodyStart: 2 });
  const [tick, setTick] = pState(0);

  pEffect(() => {
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => setTick((t) => t + 1));
  }, []);

  useLayoutEffect(() => {
    const host = hostRef.current; if (!host) return;
    const wraps = Array.from(host.querySelectorAll("[data-mi]"));
    const heights = wraps.map((w) => w.offsetHeight);

    const pages = []; let cur = [], used = 0;
    doc.blocks.forEach((b, i) => {
      const h = heights[i] || 0;
      const isL1 = b.type === "outline" && b.level === 1;
      if (cur.length && (isL1 || used + h > USABLE)) { pages.push(cur); cur = []; used = 0; }
      cur.push(i); used += h;
    });
    if (cur.length) pages.push(cur);

    const tocH = tocRef.current ? tocRef.current.offsetHeight : 0;
    const tocPages = doc.showToc ? Math.max(1, Math.ceil(tocH / USABLE)) : 0;
    const bodyStart = 1 + tocPages + 1; // cover(1) + toc + 1

    const pageById = {};
    pages.forEach((arr, pi) => arr.forEach((idx) => {
      const b = doc.blocks[idx];
      if (b.type === "outline" && (b.level === 1 || b.level === 2) && pageById[b.id] == null)
        pageById[b.id] = bodyStart + pi;
    }));

    setLayout({ pages, pageById, tocPages, bodyStart });
  }, [doc, tick]);

  const ro = (block, i) => (
    <BlockBody key={block.id} block={block} num={numbering.byId[block.id]} editable={false} onChange={() => {}} />
  );

  return (
    <div className="canvas">
      <div className="preview-scroll">

        {/* COVER */}
        <div className="page cover-page">
          <div className="page-body"><CoverBlock meta={doc.meta} editable={false} onMeta={() => {}} /></div>
        </div>

        {/* TOC */}
        {doc.showToc && Array.from({ length: layout.tocPages }).map((_, ti) => (
          <div className="page" key={"toc" + ti}>
            <RunHead title={doc.meta.title} />
            <div className="page-body"><div className="doc">
              {ti === 0 && <TocView toc={numbering.toc} pageById={layout.pageById} depth={doc.tocDepth || 2} />}
            </div></div>
            <RunFoot page={2 + ti} left={doc.meta.dept} right={doc.meta.date} />
          </div>
        ))}

        {/* BODY PAGES */}
        {layout.pages.map((arr, pi) => (
          <div className="page" key={"p" + pi}>
            <RunHead title={doc.meta.title} />
            <div className="page-body"><div className="doc">
              {arr.map((idx) => ro(doc.blocks[idx], idx))}
            </div></div>
            <RunFoot page={layout.bodyStart + pi} left={doc.meta.dept} right={doc.meta.date} />
          </div>
        ))}

        {layout.pages.length === 0 && doc.blocks.length === 0 && (
          <div className="page">
            <RunHead title={doc.meta.title} />
            <div className="page-body"><div className="doc" style={{ color: "var(--faint)", paddingTop: 40 }}>
              본문이 비어 있습니다. 편집 화면에서 블록을 추가하세요.
            </div></div>
            <RunFoot page={layout.bodyStart} />
          </div>
        )}
      </div>

      {/* off-screen measuring host */}
      <div className="measure-host" ref={hostRef} aria-hidden="true">
        <div className="doc">
          {doc.blocks.map((b) => (
            <div data-mi key={b.id} style={{ overflow: "hidden" }}>
              <BlockBody block={b} num={numbering.byId[b.id]} editable={false} onChange={() => {}} />
            </div>
          ))}
        </div>
        <div className="doc" ref={tocRef} style={{ overflow: "hidden" }}>
          {doc.showToc && <TocView toc={numbering.toc} pageById={{}} depth={doc.tocDepth || 2} />}
        </div>
      </div>
    </div>
  );
}
window.PreviewView = PreviewView;

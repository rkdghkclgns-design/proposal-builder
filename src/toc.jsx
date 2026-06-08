/* ============================================================
   TOC — 자동 생성 목차 (level 1 · 2 헤딩 기반)
   props: toc [{id,level,num,text}], pageById (id -> 페이지번호) | null
   ============================================================ */
function TocView({ toc, pageById, depth = 2 }) {
  const entries = toc.filter((e) => e.level <= depth);
  return (
    <div className="toc">
      <h2>목차</h2>
      <div className="toc-rule"></div>
      {entries.length === 0 ? (
        <div style={{ color: "var(--faint)", fontSize: 14, padding: "30px 0" }}>
          섹션(레벨 1·2 제목)을 추가하면 목차가 자동으로 생성됩니다.
        </div>
      ) : (
        <ul className="toc-list">
          {entries.map((e) => (
            <li key={e.id} className={"toc-item lv" + e.level}>
              <span className="ti-num" style={{ marginRight: 8 }}>{e.num}</span>
              <span className="ti-txt">{e.text || "\u00a0"}</span>
              <span className="ti-leader"></span>
              <span className="ti-pg">{pageById ? (pageById[e.id] || "") : ""}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
window.TocView = TocView;

/* ============================================================
   Cover — 표지 (제목 / 분류 태그 / 소속·작성일 / 변경 이력)
   props: meta, editable, onMeta(newMeta)
   ============================================================ */
function CoverBlock({ meta, editable, onMeta }) {
  const set = (patch) => onMeta({ ...meta, ...patch });

  /* tag groups */
  const toggleTag = (gi, oi) => {
    const tagGroups = meta.tagGroups.map((g, i) =>
      i !== gi ? g : { options: g.options.map((o, j) => (j === oi ? { ...o, on: !o.on } : o)) });
    set({ tagGroups });
  };
  const setTagLabel = (gi, oi, label) => {
    const tagGroups = meta.tagGroups.map((g, i) =>
      i !== gi ? g : { options: g.options.map((o, j) => (j === oi ? { ...o, label } : o)) });
    set({ tagGroups });
  };
  const addTag = (gi) => {
    const tagGroups = meta.tagGroups.map((g, i) =>
      i !== gi ? g : { options: [...g.options, { label: "항목", on: false }] });
    set({ tagGroups });
  };
  const delTag = (gi, oi) => {
    const tagGroups = meta.tagGroups.map((g, i) =>
      i !== gi ? g : { options: g.options.filter((_, j) => j !== oi) });
    set({ tagGroups });
  };

  /* history */
  const setHist = (ri, key, v) => {
    const history = meta.history.map((h, i) => (i === ri ? { ...h, [key]: v } : h));
    set({ history });
  };
  const addHist = () => set({ history: [{ date: new Date().toISOString().slice(0, 10), ver: "", content: "" }, ...meta.history] });
  const delHist = (ri) => set({ history: meta.history.filter((_, i) => i !== ri) });

  const xBtn = { border: "none", background: "transparent", color: "#b23b2e", cursor: "pointer", fontSize: 13, lineHeight: 1, padding: "0 2px" };

  return (
    <div className="cover">
      <div className="frame"></div>
      <div className="cover-inner">

        {/* classification */}
        <div className="classify">
          {meta.tagGroups.map((g, gi) => (
            <div className="crow" key={gi}>
              {g.options.map((o, oi) => (
                <span className={"tagcheck" + (o.on ? " on" : "")} key={oi}>
                  <span className="bx" style={editable ? { cursor: "pointer" } : null}
                    onClick={editable ? () => toggleTag(gi, oi) : undefined}>
                    {o.on && <Icon name="check" size={11} strokeWidth={3.2} />}
                  </span>
                  {editable
                    ? <Editable tag="span" value={o.label} placeholder="항목" markdown={false} onCommit={(v) => setTagLabel(gi, oi, v)} />
                    : <span>{o.label}</span>}
                  {editable && g.options.length > 1 &&
                    <button style={xBtn} title="삭제" onClick={() => delTag(gi, oi)}>×</button>}
                </span>
              ))}
              {editable &&
                <button className="btn sm ghost no-print" style={{ padding: "2px 7px", fontSize: 11 }} onClick={() => addTag(gi)}>＋</button>}
            </div>
          ))}
        </div>

        {/* title */}
        <div className="center-block">
          <div className="doc-rule"></div>
          {editable
            ? <Editable className="doc-title" tag="h1" value={meta.title} placeholder="문서 제목" markdown={false}
                onCommit={(v) => set({ title: v })} />
            : <h1 className="doc-title">{meta.title || "제목 없음"}</h1>}
          {editable
            ? <Editable className="doc-sub" value={meta.subtitle} placeholder="상세 기획서" markdown={false}
                onCommit={(v) => set({ subtitle: v })} />
            : <div className="doc-sub">{meta.subtitle}</div>}

          <table className="meta-table" style={{ marginTop: 26 }}>
            <tbody>
              <tr>
                <td className="k">소 속</td>
                <td>{editable ? <Editable tag="span" value={meta.dept} placeholder="예: 시스템 기획파트" markdown={false} onCommit={(v) => set({ dept: v })} /> : (meta.dept || "—")}</td>
              </tr>
              <tr>
                <td className="k">작 성 자</td>
                <td>{editable ? <Editable tag="span" value={meta.author} placeholder="이름" markdown={false} onCommit={(v) => set({ author: v })} /> : (meta.author || "—")}</td>
              </tr>
              <tr>
                <td className="k">작 성 일</td>
                <td>{editable ? <Editable tag="span" value={meta.date} placeholder="YYYY-MM-DD" markdown={false} onCommit={(v) => set({ date: v })} /> : (meta.date || "—")}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* change history */}
        <div className="hist">
          <div className="hist-title" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span>문서 변경 이력</span>
            {editable && <button className="btn sm ghost no-print" style={{ fontSize: 11 }} onClick={addHist}><Icon name="plus" size={12} /> 이력 추가</button>}
          </div>
          <table className="hist-table">
            <thead>
              <tr>
                {editable && <th style={{ width: 24, padding: 0 }}></th>}
                <th className="d">일자</th>
                <th>변경 내용</th>
              </tr>
            </thead>
            <tbody>
              {meta.history.map((h, ri) => (
                <tr key={ri}>
                  {editable &&
                    <td style={{ padding: 0, textAlign: "center" }}>
                      <button style={xBtn} title="삭제" onClick={() => delHist(ri)}>×</button>
                    </td>}
                  <td className="d">{editable ? <Editable tag="span" value={h.date} placeholder="YYYY-MM-DD" markdown={false} onCommit={(v) => setHist(ri, "date", v)} /> : h.date}</td>
                  <td>{editable ? <Editable tag="span" value={h.content} placeholder="변경 내용" markdown={false} onCommit={(v) => setHist(ri, "content", v)} /> : h.content}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
window.CoverBlock = CoverBlock;

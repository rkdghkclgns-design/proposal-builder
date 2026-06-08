/* ============================================================
   Inline Markdown — 안전한 인라인 서식 파서
   지원: **굵게** __굵게__  *기울임* _기울임_  `코드`  ~~취소선~~
        ==형광==  [텍스트](url)
   Exposes window.mdInline(str) -> 안전한 HTML 문자열
   ============================================================ */
(function () {
  "use strict";
  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function mdInline(src) {
    if (src == null) return "";
    let s = esc(src);
    // 코드 스팬 보호 (placeholder 치환 후 마지막에 복원)
    const codes = [];
    s = s.replace(/`([^`]+)`/g, function (m, p1) { codes.push(p1); return "\u0000" + (codes.length - 1) + "\u0000"; });
    // 링크 [text](url)
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (m, t, u) {
      const safe = /^(https?:|mailto:|\/|#)/i.test(u) ? u : "#";
      return '<a href="' + safe + '" target="_blank" rel="noopener noreferrer">' + t + "</a>";
    });
    // 굵게
    s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/__([^_]+)__/g, "<strong>$1</strong>");
    // 기울임
    s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
    s = s.replace(/(^|[^_\w])_([^_\n]+)_/g, "$1<em>$2</em>");
    // 취소선
    s = s.replace(/~~([^~]+)~~/g, "<del>$1</del>");
    // 형광펜
    s = s.replace(/==([^=]+)==/g, "<mark>$1</mark>");
    // 코드 복원 (이미 escape 됨)
    s = s.replace(/\u0000(\d+)\u0000/g, function (m, i) { return "<code>" + codes[+i] + "</code>"; });
    return s;
  }
  window.mdInline = mdInline;
})();

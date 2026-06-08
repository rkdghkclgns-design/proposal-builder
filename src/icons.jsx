/* Icon — compact inline SVG set (lucide-style, currentColor stroke) */
function Icon({ name, size = 18, className = "", strokeWidth = 2, fill = false, ...rest }) {
  const P = {
    plus: "M12 5v14M5 12h14",
    trash: "M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2m2 0v14a1 1 0 01-1 1H7a1 1 0 01-1-1V6",
    up: "M12 19V5M5 12l7-7 7 7",
    down: "M12 5v14M19 12l-7 7-7-7",
    grip: "M9 5h.01M9 12h.01M9 19h.01M15 5h.01M15 12h.01M15 19h.01",
    image: "M3 5a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2zM8.5 11a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM21 15l-5-5L5 21",
    table: "M3 4h18v16H3zM3 10h18M3 16h18M9 4v16M15 4v16",
    text: "M4 7V5h16v2M9 19h6M12 5v14",
    list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
    info: "M12 22a10 10 0 100-20 10 10 0 000 20zM12 16v-4M12 8h.01",
    warn: "M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L14.4 3.9a2 2 0 00-3.4 0zM12 9v4M12 17h.01",
    check: "M20 6L9 17l-5-5",
    copy: "M9 9h11a2 2 0 012 2v9a2 2 0 01-2 2H9a2 2 0 01-2-2v-9a2 2 0 012-2zM5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1",
    file: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6",
    download: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3",
    print: "M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6z",
    chevron: "M9 18l6-6-6-6",
    chevronDown: "M6 9l6 6 6-6",
    lock: "M5 11h14a0 0 0 010 0v9a1 1 0 01-1 1H6a1 1 0 01-1-1zM8 11V7a4 4 0 018 0v4",
    eye: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7zM12 15a3 3 0 100-6 3 3 0 000 6z",
    edit: "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.1 2.1 0 013 3L12 15l-4 1 1-4z",
    x: "M18 6L6 18M6 6l12 12",
    section: "M3 5h18M3 12h12M3 19h18",
    home: "M3 11l9-8 9 8M5 10v10a1 1 0 001 1h12a1 1 0 001-1V10",
    indentR: "M3 5h18M9 12h12M3 19h18M3 9l4 3-4 3",
    indentL: "M3 5h18M9 12h12M3 19h18M7 9l-4 3 4 3",
    sparkle: "M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z",
    alignLeft: "M4 6h16M4 12h10M4 18h13",
    alignCenter: "M4 6h16M7 12h10M5 18h14",
    alignRight: "M4 6h16M10 12h10M7 18h13",
    alignJustify: "M4 6h16M4 12h16M4 18h16",
    slides: "M3 4h18v12H3zM8 20h8M12 16v4",
    doc: "M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9zM14 3v6h6M8 13h8M8 17h5",
  };
  const d = P[name] || "";
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24"
      fill={fill ? "currentColor" : "none"} stroke="currentColor" strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
      {d.split("M").filter(Boolean).map((seg, i) => <path key={i} d={"M" + seg} />)}
    </svg>
  );
}
window.Icon = Icon;

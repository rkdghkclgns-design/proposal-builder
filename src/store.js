/* ============================================================
   Store — localStorage persistence, multi-document, factories
   Exposes window.GS  (기획서 Store)
   ============================================================ */
(function () {
  "use strict";

  const KEY = "gisaek_docs_v2";
  const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);

  /* ---------- block factories ---------- */
  const Blocks = {
    outline: (level, text = "") => ({ id: uid(), type: "outline", level, text }),
    table: (caption, columns, rows, opts = {}) => ({
      id: uid(), type: "table", caption: caption || "",
      columns: columns || ["변수명", "변수형", "설명"],
      rows: rows || [["", "", ""]],
      keyCol: opts.keyCol !== false, // first column bold
    }),
    image: (caption = "") => ({ id: uid(), type: "image", caption, src: "" }),
    callout: (variant = "note", text = "") => ({ id: uid(), type: "callout", variant, text }),
  };

  function blankMeta() {
    return {
      title: "",
      subtitle: "상세 기획서",
      dept: "",
      author: "",
      date: new Date().toISOString().slice(0, 10),
      tagGroups: [
        { options: [{ label: "신규 개발", on: true }, { label: "기존 시스템 수정", on: false }] },
        { options: [{ label: "컨텐츠", on: false }, { label: "이벤트", on: false }, { label: "유료화", on: false }] },
      ],
      history: [
        { date: new Date().toISOString().slice(0, 10), ver: "", content: "최초 작성" },
      ],
    };
  }

  function newBlankDoc(format) {
    const now = Date.now();
    return {
      id: uid(),
      title: "제목 없는 기획서",
      format: format === "slide" ? "slide" : "doc",
      createdAt: now,
      updatedAt: now,
      showToc: true,
      meta: blankMeta(),
      blocks: [
        Blocks.outline(1, "개요"),
        Blocks.outline(2, "기획 의도"),
        Blocks.outline(3, "핵심 목표"),
        Blocks.outline(4, ""),
        Blocks.outline(2, "일정 및 담당자"),
        Blocks.table("〈참고 표 – 담당자〉", ["작업", "이름"], [["기획", ""], ["프로그램", ""], ["디자인", ""]], { keyCol: true }),
        Blocks.outline(1, "데이터 구조"),
        Blocks.outline(2, "개요"),
        Blocks.outline(1, "상세 설명 및 UI"),
        Blocks.outline(2, ""),
        Blocks.outline(1, "예외사항"),
        Blocks.outline(2, ""),
        Blocks.outline(1, "그 외"),
        Blocks.outline(2, ""),
      ],
    };
  }

  /* ---------- localStorage ---------- */
  function readAll() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) { return null; }
  }
  function writeAll(docs) {
    try { localStorage.setItem(KEY, JSON.stringify(docs)); return true; }
    catch (e) { console.warn("저장 실패(용량 초과 가능):", e); return false; }
  }

  function list() {
    let docs = readAll();
    if (!docs) { docs = [sampleDoc()]; writeAll(docs); }
    return docs.slice().sort((a, b) => b.updatedAt - a.updatedAt);
  }
  function get(id) { return (readAll() || []).find((d) => d.id === id) || null; }
  function save(doc) {
    const docs = readAll() || [];
    doc.updatedAt = Date.now();
    const i = docs.findIndex((d) => d.id === doc.id);
    if (i >= 0) docs[i] = doc; else docs.push(doc);
    return writeAll(docs);
  }
  function create(format) { const d = newBlankDoc(format); const docs = readAll() || []; docs.push(d); writeAll(docs); return d; }
  function remove(id) { writeAll((readAll() || []).filter((d) => d.id !== id)); }
  function duplicate(id) {
    const src = get(id); if (!src) return null;
    const copy = JSON.parse(JSON.stringify(src));
    copy.id = uid(); copy.title = src.title + " (사본)";
    copy.createdAt = copy.updatedAt = Date.now();
    const reid = (b) => { b.id = uid(); return b; };
    copy.blocks = copy.blocks.map(reid);
    const docs = readAll() || []; docs.push(copy); writeAll(docs);
    return copy;
  }

  /* ============================================================
     Sample document — 출석 체크 & 포인트 적립 이벤트 상세 기획서
     (원본과 동일한 양식: 표지·분류태그·변경이력·계층 섹션·데이터표·콜아웃)
     ============================================================ */
  function sampleDoc() {
    const o = Blocks.outline, t = Blocks.table, img = Blocks.image, co = Blocks.callout;
    const now = Date.now();
    return {
      id: "sample-attendance",
      title: "출석 체크 & 포인트 적립 이벤트",
      format: "doc",
      createdAt: now - 86400000 * 30,
      updatedAt: now - 86400000 * 2,
      showToc: true,
      meta: {
        title: "출석 체크 & 포인트 적립 이벤트",
        subtitle: "상세 기획서",
        dept: "라이브 서비스 기획파트",
        author: "홍길동",
        date: "2026-06-01",
        tagGroups: [
          { options: [{ label: "신규 개발", on: true }, { label: "기존 시스템 수정", on: false }] },
          { options: [{ label: "컨텐츠", on: false }, { label: "이벤트", on: true }, { label: "유료화", on: false }] },
        ],
        history: [
          { date: "2026-06-04", ver: "V", content: "보상 지급 로직에 중복 수령 방지 검증 추가" },
          { date: "2026-06-03", ver: "", content: "인게임 시안 바탕으로 출석판 UI 관련 내용 수정" },
          { date: "2026-05-30", ver: "", content: "포인트 상점 교환 아이템 데이터 구조 수정" },
          { date: "2026-05-28", ver: "", content: "주간 보너스 보상 규칙 추가 및 TLog 관련 내용 추가" },
          { date: "2026-05-25", ver: "", content: "복귀 유저 전용 출석판 데이터 파일 구조 수정" },
          { date: "2026-05-22", ver: "", content: "데이터 구조 수정" },
          { date: "2026-05-20", ver: "", content: "기획 방향 변경에 따른 수정" },
          { date: "2026-05-18", ver: "", content: "상세 기획서 최초 작성" },
        ],
      },
      blocks: [
        /* 1. 개요 */
        o(1, "개요"),
        o(2, "기획의도"),
        o(3, "일일 접속 유도 및 리텐션 강화"),
        o(4, "매일 1회 출석 체크를 통해 꾸준한 게임 접속 습관 형성"),
        o(4, "연속 출석 보상으로 이탈 구간(3·7·14일차)에 재방문 동기 부여"),
        o(3, "포인트 순환을 통한 추가 매출 기대"),
        o(4, "출석·플레이 활동으로 적립한 포인트를 상점에서 아이템으로 교환"),
        o(4, "한정 교환 아이템을 배치하여 유료 재화 구매로 연결되는 동선 설계"),
        o(3, "복귀 유저 유입"),
        o(4, "일정 기간 미접속 후 복귀한 유저에게 전용 출석판을 별도 제공하여 빠른 적응 지원"),

        o(2, "일정 및 담당자"),
        o(3, "일정"),
        t("〈참고 표 – 개발 일정〉", ["항목", "일정"],
          [["개발 완료", "2026-06-02"], ["적용 버전", "2.7.10x"], ["최초 머징일", "2026-05-29"], ["라이브서버 적용일", "2026-06-12"]],
          { keyCol: true }),
        o(3, "담당자"),
        t("〈참고 표 – 담당자〉", ["작업", "이름"],
          [["기획", "홍길동"], ["프로그램", "김철수"], ["DB", "이영희"], ["UX", "박민수"]],
          { keyCol: true }),

        o(2, "간략 설명"),
        o(3, "출석 체크"),
        o(4, "이벤트 기간 동안 하루 1회 출석 도장을 찍어 일차별 보상 획득"),
        o(4, "출석 기준 시간은 매일 새벽 6시를 기준으로 갱신"),
        o(3, "포인트 적립 및 사용"),
        o(4, "출석 및 지정 활동(플레이·결제) 시 이벤트 포인트 적립"),
        o(4, "적립한 포인트는 포인트 상점에서 아이템으로 교환"),
        o(4, "이벤트 종료 후 일정 기간(유예)이 지나면 잔여 포인트 소멸"),
        o(3, "참여 제한"),
        o(4, "계정 단위로 참여 — 동일 계정의 모든 캐릭터가 출석 현황을 공유"),
        o(5, "출석 보상은 대표 캐릭터 1인의 우편으로 지급"),
        o(5, "데이터로 설정"),
        o(4, "참여 가능 최소 레벨"),
        o(5, "이벤트에 참여할 수 있는 최소 캐릭터 레벨"),
        o(5, "데이터로 설정"),

        /* 2. 데이터 구조 */
        o(1, "데이터 구조"),
        o(2, "개요"),
        o(3, "출석·포인트 이벤트를 관리하는 xml 데이터 파일 추가"),
        o(4, "AttendanceEvent.xml 추가"),
        o(5, "경로 : Resource\\Common\\Database\\Event"),
        o(3, "보상 지급은 기존 우편 시스템을 활용"),
        o(4, "MailReward.xml 활용"),
        o(3, "포인트 상점 데이터"),
        o(4, "교환 아이템 및 필요 포인트 정의"),
        o(3, "데이터 관리"),
        o(4, "라이브 서비스 파트에서 직접 관리"),
        o(4, "이벤트 회차 변경 등의 이슈가 있을 때 유동적으로 대응하기 위함"),

        o(2, "출석 이벤트 데이터(AttendanceEvent.xml) 상세"),
        img("〈참고 이미지 – AttendanceEvent.xml 데이터 구조 예〉"),
        o(3, "공용 데이터"),
        o(4, "이벤트 기간 및 공통 규칙을 제어하는 데이터"),
        o(4, "포인트 소멸 유예 기간 데이터 관리"),
        co("note", "이벤트 종료일을 입력하지 않으면, 시작일로부터 기본 14일, 포인트 소멸 유예 기본 7일로 처리됩니다."),
        t("〈참고 표 – 출석 이벤트 공용 데이터 표〉", ["변수명", "변수형", "설명"],
          [["이벤트 ID", "wstring", "출석 이벤트를 식별하는 고유 ID"],
           ["이벤트 시작일", "datetime", "출석 이벤트 시작 일시"],
           ["이벤트 종료일", "datetime", "출석 이벤트 종료 일시"],
           ["참여 최소레벨", "Int", "이벤트에 참여할 수 있는 최소 캐릭터 레벨"],
           ["포인트 소멸 유예(일)", "int", "이벤트 종료 후 잔여 포인트가 소멸되기까지의 기간"]]),
        o(3, "일차별 보상 데이터"),
        o(4, "출석 일차에 따른 지급 보상 및 적립 포인트 정의"),
        o(4, "연속 출석 보너스 일차 지정"),
        t("〈참고 표 – 출석 일차별 보상 데이터 표〉", ["변수명", "변수형", "설명"],
          [["출석 일차", "int", "보상이 지급되는 출석 일차"],
           ["보상 아이템 ID", "wstring", "해당 일차에 지급할 보상 아이템 ID"],
           ["보상 수량", "int", "보상 아이템 지급 수량"],
           ["적립 포인트", "int", "해당 일차 출석 시 적립되는 이벤트 포인트"],
           ["보너스 여부", "bool", "연속 출석 보너스(7·14일차 등) 일차 여부"]]),
        o(3, "포인트 상점 데이터"),
        o(4, "포인트로 교환 가능한 아이템 및 교환 제한 정의"),
        t("〈참고 표 – 포인트 상점 교환 데이터 표〉", ["변수명", "변수형", "설명"],
          [["교환 아이템 ID", "wstring", "포인트 상점에서 교환 가능한 아이템 ID"],
           ["아이템 이름", "locale", "교환 아이템 표시 이름"],
           ["필요 포인트", "int", "교환에 필요한 포인트"],
           ["교환 제한 횟수", "int", "계정당 교환 가능한 최대 횟수(0이면 무제한)"],
           ["아이콘 경로", "resource", "상점에 표시될 아이템 아이콘 경로"]]),

        o(2, "복귀 유저 출석판 데이터(ReturnAttendance.xml) 상세"),
        img("〈참고 이미지 – 복귀 유저 판별 및 전용 출석판 데이터 구조 예〉"),
        o(3, "일정 기간 미접속 후 복귀 시, 전용 출석판 노출"),
        o(4, "데이터 입력 시, 복귀 유저에게 전용 출석판 진입 안내 문구 출력"),
        o(4, "[자세히 보기] 부분 클릭 시, 복귀 출석판 팝업"),
        o(4, "로비 화면 상단 배너에 복귀 이벤트 관련 문구 추가"),

        /* 3. 상세 설명 및 UI – 이벤트 진입 버튼 */
        o(1, "상세 설명 및 UI – 이벤트 진입 버튼"),
        o(2, "버튼 위치"),
        o(3, "로비 화면 우측 상단 이벤트 영역에 추가"),
        o(4, "일일 컨텐츠 아이콘 우측에 위치"),
        img("〈참고 이미지 – 출석 이벤트 진입 버튼 위치 및 버튼 형태 예〉"),
        o(4, "출석 가능 여부에 따라 아이콘에 N 뱃지 표시"),
        o(4, "버튼 마우스 오버 시, 간략한 툴팁 출력"),
        o(4, "버튼 클릭 시, 출석판 화면 창 출력"),
        o(3, "이벤트 최초 오픈 시 안내 툴팁 출력"),
        o(4, "이벤트 시작일에 접속 시, 출석판 안내 툴팁 팝업"),
        o(4, "이벤트 기간 중 최초 1회만 출력"),
        o(4, "로비에서만 툴팁 출력"),

        o(2, "출석 상태에 따른 버튼 전환"),
        t("〈참고 표 – 상태에 따른 버튼 및 툴팁 전환 표〉", ["상태", "설명", "툴팁"],
          [["이벤트 미오픈", "이벤트 시작일이 되지 않았을 때", "곧 출석 이벤트가 시작됩니다."],
           ["출석 가능", "오늘 출석을 아직 하지 않았을 때", "오늘의 출석 보상을 받아보세요!"],
           ["출석 완료", "오늘 출석을 이미 완료했을 때", "오늘 출석을 완료했습니다."],
           ["수령 대기", "받지 않은 출석 보상이 남아 있을 때", "받지 않은 출석 보상이 있습니다."],
           ["이벤트 종료", "이벤트 기간이 종료되었을 때", "출석 이벤트가 종료되었습니다."]],
          { keyCol: true }),

        /* 4. 상세 설명 및 UI – 출석판 및 포인트 상점 */
        o(1, "상세 설명 및 UI – 출석판 및 포인트 상점"),
        o(2, "출석판 최초 상태"),
        o(3, "이벤트에 참여할 수 없는 상태"),
        o(4, "이벤트에 대한 간단 안내 — 물음표 마우스 오버 시 말풍선 출력"),
        o(4, "모든 출석 버튼 선택 불가능"),
        o(4, "참여 가능 조건(레벨·기간) 가이드"),
        img("〈참고 이미지 – 참여 불가 시 출석판 화면 예〉"),
        o(3, "출석판 정보"),
        o(4, "일차별 보상 아이템과 적립 포인트를 그리드로 표시"),
        o(4, "오늘 출석할 일차는 강조 표시"),
        o(4, "이미 수령한 일차는 체크 표시 등으로 처리"),
        o(3, "출석 도장 찍기"),
        o(4, "[출석하기] 버튼 클릭 시, 해당 일차 보상을 우편으로 지급"),
        o(4, "하루 1회만 가능 — 출석 후 버튼은 [출석 완료]로 변경"),

        o(2, "포인트 상점"),
        o(3, "보유 포인트"),
        o(4, "상단에 현재 보유 포인트 및 적립 내역 보기 버튼 표시"),
        o(4, "포인트 적립·사용 시 즉시 갱신"),
        o(3, "교환 아이템 목록"),
        o(4, "교환 아이템을 필요 포인트 기준 오름차순으로 표시"),
        o(4, "교환 제한 횟수 소진 시 [교환 완료]로 비활성화"),
        t("〈참고 표 – 포인트 보유량에 따른 교환 버튼 색상〉", ["텍스트 색상", "설명"],
          [["흰색", "교환 가능"], ["붉은색", "보유 포인트 부족"]], { keyCol: true }),
        co("warn", "붉은색(포인트 부족) 아이템을 선택하면 부족 안내 텍스트가 출력되고, 교환 버튼이 비활성화됩니다."),
        o(3, "교환 처리"),
        o(4, "[교환] 버튼 클릭 시 확인 팝업 출력 후, 보상은 각 계정의 우편으로 발송"),
        img("〈참고 이미지 – 포인트 상점 화면(좌) 및 교환 확인 팝업(우) 예〉"),

        /* 5. 예외사항 */
        o(1, "예외사항"),
        o(2, "날짜 변경 및 시간 동기화"),
        o(3, "출석 기준 시간은 서버 시간(매일 새벽 6시)으로 처리"),
        o(4, "단말기 시간을 임의로 변경해도 출석 일차에 영향 없음"),
        o(2, "보상 중복 수령 방지"),
        o(3, "동일 일차 보상은 1회만 지급"),
        o(4, "네트워크 지연으로 인한 중복 요청 시, 서버에서 검증 후 1회만 처리"),
        o(3, "우편함이 가득 찬 경우"),
        o(4, "보상 지급 보류 및 안내 텍스트 출력 — 우편 정리 후 재수령 가능"),
        o(2, "이벤트 종료 처리"),
        o(3, "미수령 출석 보상은 종료 후 유예 기간 동안 우편으로 일괄 발송"),
        o(3, "잔여 포인트는 소멸 유예 기간 경과 후 자동 소멸"),
        o(4, "소멸 직전 로그인 시 안내 팝업 출력"),

        /* 6. 그 외 */
        o(1, "그 외"),
        o(2, "효과음 추가"),
        o(3, "출석 도장 찍기 및 포인트 교환 성공 시 효과음 추가"),
        o(2, "TLog 추가"),
        o(3, "출석 / 포인트 적립 / 포인트 사용 / 보상 수령 / 이벤트 종료 관련 로그 추가"),
        o(2, "GM Tool 기능 추가"),
        o(3, "출석 현황 초기화 명령어 – ResetAttendanceState 추가"),
        o(4, "특정 계정의 출석 일차 및 적립 포인트 초기화"),
      ],
    };
  }

  window.GS = { Blocks, list, get, save, create, remove, duplicate, newBlankDoc, sampleDoc, uid };
})();

// src/app/api/industry/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { decomposeHangul, similarity } from "@/lib/hangul";

/** 음식점업 시드 */
type BizType = {
  code: string;
  large_category: "음식점업";
  medium_category: string;
  small_category: string;
  keywords?: string; // 쉼표로 구분
};

let CACHE: BizType[] | null = null;

function seed() {
  CACHE = [
    { code: "I21201", large_category: "음식점업", medium_category: "비알코올 음료점업", small_category: "카페", keywords: "커피,음료,디저트,다방" },
    { code: "I21010", large_category: "음식점업", medium_category: "기타 간이 음식점업", small_category: "분식", keywords: "떡볶이,김밥,라면,만두" },
    { code: "I21006", large_category: "음식점업", medium_category: "기타 간이 음식점업", small_category: "치킨", keywords: "후라이드,양념치킨,닭,닭강정" },
    { code: "I21007", large_category: "음식점업", medium_category: "기타 간이 음식점업", small_category: "피자", keywords: "피자전문점" },
    { code: "I20101", large_category: "음식점업", medium_category: "한식 음식점업", small_category: "백반/한정식", keywords: "밥집,정식,한식" },
    { code: "I20102", large_category: "음식점업", medium_category: "한식 음식점업", small_category: "국/탕/찌개류", keywords: "해장국,감자탕,부대찌개,찌개,국,탕" },
    { code: "I20103", large_category: "음식점업", medium_category: "한식 음식점업", small_category: "국밥", keywords: "돼지국밥,소머리국밥" },
    { code: "I20104", large_category: "음식점업", medium_category: "한식 음식점업", small_category: "고기/구이", keywords: "삼겹살,돼지갈비,소고기,구이,숯불,고깃집" },
    { code: "I20201", large_category: "음식점업", medium_category: "중식 음식점업", small_category: "중국집", keywords: "중식,짜장면,짬뽕,탕수육" },
    { code: "I20301", large_category: "음식점업", medium_category: "일식 음식점업", small_category: "초밥/참치", keywords: "스시,사시미,참치,초밥" },
    { code: "I20302", large_category: "음식점업", medium_category: "일식 음식점업", small_category: "돈까스/우동", keywords: "가츠,돈가스,돈까스,우동,소바" },
    { code: "I20401", large_category: "음식점업", medium_category: "서양식 음식점업", small_category: "파스타/스테이크", keywords: "파스타,스테이크,이탈리안,레스토랑" },
    { code: "I20501", large_category: "음식점업", medium_category: "기타 외국식", small_category: "멕시칸", keywords: "타코,부리또,멕시코" },
    { code: "I20502", large_category: "음식점업", medium_category: "기타 외국식", small_category: "인도/네팔", keywords: "커리,난,탄두리,인도,네팔" },
    { code: "I20503", large_category: "음식점업", medium_category: "기타 외국식", small_category: "베트남", keywords: "쌀국수,분짜,반미,베트남" },
    { code: "I20504", large_category: "음식점업", medium_category: "기타 외국식", small_category: "태국", keywords: "팟타이,똠얌,태국" },
    { code: "I21011", large_category: "음식점업", medium_category: "기타 간이 음식점업", small_category: "햄버거", keywords: "버거,햄버거,패스트푸드" },
    { code: "I21012", large_category: "음식점업", medium_category: "기타 간이 음식점업", small_category: "샌드위치/토스트/샐러드", keywords: "샌드위치,샐러드,토스트" },
    { code: "I21013", large_category: "음식점업", medium_category: "기타 간이 음식점업", small_category: "족발/보쌈", keywords: "족발,보쌈" },
    { code: "I21014", large_category: "음식점업", medium_category: "기타 간이 음식점업", small_category: "분식 프랜차이즈", keywords: "체인,브랜드분식" },
  ];
}
function ensureCache() { if (!CACHE) seed(); }

/** 추가 동의어(시드 keywords 외에 더 강한 우선 매핑) */
const EXTRA_SYNONYMS: Record<string, string[]> = {
  "카페": ["카페", "커피", "디저트", "다방"],
  "초밥/참치": ["스시", "초밥", "사시미", "참치"],
  "돈까스/우동": ["돈까스", "돈가스", "우동", "소바", "가츠"],
  "국밥": ["국밥", "돼지국밥", "소머리국밥"],
  "중국집": ["중국집", "중식", "짜장면", "짬뽕", "탕수육"],
  "파스타/스테이크": ["파스타", "스테이크", "이탈리안", "레스토랑"],
  "베트남": ["쌀국수", "분짜", "반미", "베트남"],
  "태국": ["팟타이", "똠얌", "태국"],
  "샌드위치/토스트/샐러드": ["샌드위치", "샐러드", "토스트"],
  "햄버거": ["버거", "햄버거", "패스트푸드"],
  "치킨": ["치킨", "후라이드", "양념", "닭강정"],
  "분식": ["분식", "떡볶이", "김밥", "라면", "만두"],
  "고기/구이": ["삼겹살", "돼지갈비", "소고기", "구이", "숯불", "고깃집"],
  "국/탕/찌개류": ["찌개", "국", "탕", "해장국", "감자탕", "부대찌개"],
  "피자": ["피자"],
  "백반/한정식": ["밥집", "정식", "한식"],
  "멕시칸": ["타코", "부리또", "멕시코"],
  "인도/네팔": ["커리", "난", "탄두리", "인도", "네팔"]
};

function norm(s: string) {
  return s.toLowerCase().trim().replace(/\s+/g, "");
}

function scoreRow(query: string, row: BizType) {
  const q = norm(query);
  const name = norm(row.small_category);
  const mid  = norm(row.medium_category);
  const kwList = (row.keywords ?? "")
    .split(",")
    .map(k => norm(k))
    .filter(Boolean);

  // 1) 정확 일치 최고 가중
  if (q === name) return 100;
  if (q === mid)  return 95;
  if (kwList.includes(q)) return 90;

  let score = 0;

  // 2) 접두/부분 일치
  if (name.startsWith(q)) score += 60;
  else if (mid.startsWith(q)) score += 50;
  if (name.includes(q)) score += 40;
  else if (mid.includes(q)) score += 30;
  if (kwList.some(k => k.startsWith(q))) score += 35;
  else if (kwList.some(k => k.includes(q))) score += 25;

  // 3) 동의어 강한 가산
  const extra = EXTRA_SYNONYMS[row.small_category] ?? [];
  if (extra.map(norm).some(s => s === q)) score += 75;
  else if (extra.map(norm).some(s => s.startsWith(q))) score += 50;

  // 4) 자모(Jamo) 보조 (q 길이 2 이상에서만)
  if (q.length >= 2) {
    const dq = decomposeHangul(q);
    const dn = decomposeHangul(name);
    const jamoSim = similarity(dq, dn); // 0~1
    if (jamoSim > 0.7) score += 25;
    else if (jamoSim > 0.5) score += 10;
  }

  // 5) 레벤슈타인 기반 미세 보정 (문자열 유사도 * 20)
  const strSimName = similarity(q, name);
  if (strSimName > 0.5) score += Math.round(strSimName * 20);

  return score;
}

export async function GET(req: NextRequest) {
  ensureCache();
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").toString().trim();
  const limit = Number(searchParams.get("limit") ?? 8);

  // 최소 길이 2 미만이면 빈 결과
  if (q.replace(/\s+/g, "").length < 2) {
    return NextResponse.json({ success: true, data: [], message: "검색어를 더 입력해 주세요." });
  }

  const rows = (CACHE ?? [])
    .map(r => ({ row: r, score: scoreRow(q, r) }))
    .filter(x => x.score >= 45) // 임계값
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      // 동점이면 이름 짧은 순(보다 구체적인 카테고리 우선)
      return a.row.small_category.length - b.row.small_category.length;
    })
    .slice(0, limit)
    .map(x => ({
      code: x.row.code,
      category: x.row.small_category,
      fullCategory: `${x.row.medium_category} > ${x.row.small_category}`,
    }));

  return NextResponse.json({ success: true, data: rows, message: `${rows.length}개 결과` });
}

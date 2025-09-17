// src/app/api/business/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ─────────────────────────────────────────────────────────────
// [음식점 전용 화이트리스트]  (코드/명칭 둘 다 허용)
//  - industryCode 가 오면 코드 우선 검증
//  - industry(명칭)만 오면 명칭으로 검증
// ─────────────────────────────────────────────────────────────
const CODE_TO_NAME: Record<string, string> = {
  I21201: "카페",
  I21010: "분식",
  I21006: "치킨",
  I21007: "피자",
  I20101: "백반/한정식",
  I20102: "국/탕/찌개류",
  I20103: "국밥",
  I20104: "고기/구이",
  I20201: "중국집",
  I20301: "초밥/참치",
  I20302: "돈까스/우동",
  I20401: "파스타/스테이크",
  I20501: "멕시칸",
  I20502: "인도/네팔",
  I20503: "베트남",
  I20504: "태국",
  I21011: "햄버거",
  I21012: "샌드위치/토스트/샐러드",
  I21013: "족발/보쌈",
  I21014: "분식 프랜차이즈",
};
const ALLOWED_CODES = new Set(Object.keys(CODE_TO_NAME));
const ALLOWED_NAMES = new Set(Object.values(CODE_TO_NAME));

// 서비스 메뉴/가격 타입 정의 (네 코드 재사용)
type ServiceItem = { menu: string; price: string };
type ServicePayload = ServiceItem[] | string[] | unknown;

/** 클라이언트에서 온 services 원본을 {menu, price}[] 로 정규화 (네 함수 그대로) */
function normalizeServices(input: ServicePayload): ServiceItem[] {
  if (!input) return [];

  // [{ menu, price }, ...] 형식
  if (Array.isArray(input) && input.every(i => typeof i === "object" && i !== null)) {
    return (input as Array<Partial<ServiceItem>>)
      .map(i => ({
        menu: String(i.menu || "").trim(),
        price: String(i.price || "").trim(),
      }))
      .filter(i => i.menu && i.price);
  }

  // ["라떼:5000", "버거:9000", ...] 형식
  if (Array.isArray(input) && input.every(i => typeof i === "string")) {
    return (input as string[])
      .map((s) => s.split(":"))
      .map(([menu, price]) => ({
        menu: String(menu || "").trim(),
        price: String(price || "").trim(),
      }))
      .filter(i => i.menu && i.price);
  }

  return [];
}

// HH:MM 간단 검증
function isValidHHMM(s: string) {
  const m = /^(\d{2}):(\d{2})$/.exec(s?.trim() ?? "");
  if (!m) return false;
  const hh = Number(m[1]), mm = Number(m[2]);
  return hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 필수값 검증 (네 로직 유지 + industryCode 추가 수신)
    const requiredFilled =
      body?.name &&
      body?.industry &&
      body?.address &&
      body?.phone &&
      ((body?.openingHours) || (body?.openingHourStart && body?.openingHourEnd));

    if (!requiredFilled) {
      return NextResponse.json(
        { error: "필수 항목을 모두 입력해주세요." },
        { status: 400 }
      );
    }

    // ── 영업시간 처리 (문자열 or 시작/종료 조합)
    const openingHours = body.openingHours
      ? String(body.openingHours).trim()
      : `${String(body.openingHourStart).trim()} ~ ${String(body.openingHourEnd).trim()}`;

    // HH:MM ~ HH:MM 형태 최소 검증
    const [startRaw, endRaw] = openingHours.split("~").map(s => s?.trim());
    if (!startRaw || !endRaw || !isValidHHMM(startRaw) || !isValidHHMM(endRaw)) {
      return NextResponse.json(
        { error: "영업시간 형식이 올바르지 않습니다. 예) 10:00 ~ 21:00" },
        { status: 400 }
      );
    }

    // 휴무일 배열 처리
    const holidays: string[] = Array.isArray(body.holidays)
      ? body.holidays.map((d: unknown) => String(d))
      : [];

    // 메뉴/가격 JSON 배열 정규화 (네 로직 재사용)
    const services = normalizeServices(body.services);
    if (services.length === 0) {
      return NextResponse.json(
        { error: "주요 메뉴를 최소 1개 이상 입력해주세요." },
        { status: 400 }
      );
    }

    // ─────────────────────────────────────────────────────
    // [음식점 전용 검증]
    //   - industryCode 가 오면: 코드 화이트리스트로 검증
    //   - industry(명칭)만 오면: 명칭 화이트리스트로 검증
    // ─────────────────────────────────────────────────────
    const industryName = String(body.industry).trim();
    const industryCode = body.industryCode ? String(body.industryCode).trim() : "";

    if (industryCode) {
      if (!ALLOWED_CODES.has(industryCode)) {
        return NextResponse.json(
          { error: "음식점업 이외 업종은 등록할 수 없습니다.(code)" },
          { status: 400 }
        );
      }
      // 코드와 명칭 불일치 시 유연 처리(강제 매핑)
      // ex) 사용자가 업종 입력을 수정해 제출해도 코드 기준으로 명칭 보정
    }

    if (!industryCode) {
      if (!ALLOWED_NAMES.has(industryName)) {
        return NextResponse.json(
          { error: "음식점업 이외 업종은 등록할 수 없습니다.(name)" },
          { status: 400 }
        );
      }
    }

    // DB 저장 (스키마에 industryCode는 없으므로 industry만 저장)
    const created = await prisma.business.create({
      data: {
        name: String(body.name).trim(),
        industry: industryCode ? (CODE_TO_NAME[industryCode] ?? industryName) : industryName,
        address: String(body.address).trim(),
        phone: String(body.phone).trim(),
        openingHours,
        holidays,
        services, // JSON
        strengths: body.strengths ? String(body.strengths).trim() : null,
        parkingInfo: body.parkingInfo ? String(body.parkingInfo).trim() : null,
        snsUrl: body.snsUrl ? String(body.snsUrl).trim() : null,
      },
    });

    // 네 기존과 호환: 전체 레코드 반환(201)
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    console.error("[POST /api/business] ", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "서버 오류" },
      { status: 500 }
    );
  }
}

export async function GET() {
  const list = await prisma.business.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(list);
}

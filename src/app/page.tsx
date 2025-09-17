// src/app/survey/page.tsx
"use client";

import React, { useRef, useState } from "react";
import IndustryAutocomplete from "@/components/IndustryAutocomplete"; // 상대경로 사용 시 ../../components/IndustryAutocomplete

const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, "0")}:00`);
const days = ["월요일", "화요일", "수요일", "목요일", "금요일", "토요일", "일요일"];

type Errors = Partial<
  Record<
    | "name"
    | "industry"
    | "address"
    | "phone"
    | "openingHourStart"
    | "openingHourEnd"
    | "services",
    string
  >
>;

export default function SurveyPage() {
  const [pending, setPending] = useState(false);
  const [errBanner, setErrBanner] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const firstErrorRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null);

  const setFieldError = (
    key: keyof Errors,
    msg: string,
    el?: HTMLInputElement | HTMLSelectElement | null
  ) => {
    setErrors(prev => ({ ...prev, [key]: msg }));
    if (!firstErrorRef.current && el) firstErrorRef.current = el;
  };

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrBanner(null);
    setOk(null);
    setErrors({});
    firstErrorRef.current = null;

    const form = new FormData(e.currentTarget);

    // 필수값
    const name = String(form.get("name") || "").trim();
    const industry = String(form.get("industry") || "").trim();
    const industryCode = String(form.get("industryCode") || "").trim(); // 히든(검증용)
    const address = String(form.get("address") || "").trim();
    const phone = String(form.get("phone") || "").trim();
    const openingHourStart = String(form.get("openingHourStart") || "");
    const openingHourEnd = String(form.get("openingHourEnd") || "");

    // 메뉴/가격 3세트 수집 → 객체 배열
    const services = [1, 2, 3]
      .map(i => ({
        menu: String(form.get(`menu${i}`) || "").trim(),
        price: String(form.get(`price${i}`) || "").trim(),
      }))
      .filter(s => s.menu && s.price);

    // --- 프런트 검증 & 에러 표시 ---
    const getEl = (name: string) =>
      (e.currentTarget.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | null) ?? undefined;

    if (!name) setFieldError("name", "가게명을 입력해주세요.", getEl("name"));
    if (!industry) setFieldError("industry", "업종을 입력해주세요.", getEl("industry"));
    if (!address) setFieldError("address", "주소를 입력해주세요.", getEl("address"));
    if (!phone) setFieldError("phone", "연락처를 입력해주세요.", getEl("phone"));
    if (!openingHourStart) setFieldError("openingHourStart", "시작 시간을 선택해주세요.", getEl("openingHourStart"));
    if (!openingHourEnd) setFieldError("openingHourEnd", "종료 시간을 선택해주세요.", getEl("openingHourEnd"));
    if (services.length === 0)
      setFieldError("services", "메뉴/가격을 최소 1개 입력해주세요.", getEl("menu1"));

    setPending(true);

    const payload = {
      name,
      industry,
      industryCode, // 서버에서 음식점 전용 검증에만 사용(저장 X)
      address,
      phone,
      openingHourStart,
      openingHourEnd,
      holidays: form.getAll("holidays"),
      services, // [{menu, price}]
      strengths: String(form.get("strengths") || ""),
      parkingInfo: String(form.get("parkingInfo") || ""),
      snsUrl: String(form.get("snsUrl") || ""),
    };

    const res = await fetch("/api/business", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setPending(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErrBanner(data?.error || "저장 중 오류가 발생했습니다.");
      return;
    }

    setOk("저장되었습니다! /api/business에서 확인할 수 있어요.");
    (e.target as HTMLFormElement).reset();
  }

  // 오류 스타일 헬퍼
  const cls = (base: string, key?: keyof Errors) =>
    base + (key && errors[key] ? " border-red-400 focus:border-red-500" : " border-gray-200 focus:border-gray-400");

  return (
    <main className="mx-auto max-w-xl p-6">
      {/* 숫자 스피너 제거 (크롬/엣지/파폭) */}
      <style jsx global>{`
        input[type="number"]::-webkit-outer-spin-button,
        input[type="number"]::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type="number"] {
          -moz-appearance: textfield;
        }
      `}</style>

      <h1 className="mb-2 text-2xl font-bold">가게 정보 설문</h1>
      <p className="mb-6 text-sm text-gray-500">
        <span className="text-red-500">*</span>는 필수 입력 항목입니다.
      </p>

      {errBanner && <div className="mb-4 rounded-lg bg-red-50 p-3 text-red-700">{errBanner}</div>}
      {ok && <div className="mb-4 rounded-lg bg-green-50 p-3 text-green-700">{ok}</div>}

      <form onSubmit={onSubmit} className="space-y-4">
        {/* 가게명 */}
        <L label="가게명" required error={errors.name}>
          <I name="name" placeholder="예: 무종카페" className={cls(inputBase, "name")} />
        </L>

        {/* 업종 (음식점 전용 자동완성) */}
        <L label="업종 (음식점 전용)" required error={errors.industry}>
          <IndustryAutocomplete
            name="industry"
            codeName="industryCode"
            placeholder="(음식점 전용) 예: 카페/치킨/분식…"
            className={cls(inputBase, "industry")}
          />
        </L>

        {/* 주소 */}
        <L label="주소" required error={errors.address}>
          <I name="address" placeholder="예: 대구광역시 중구 동성로 123" className={cls(inputBase, "address")} />
        </L>

        {/* 연락처 */}
        <L label="연락처" required error={errors.phone}>
          <I name="phone" placeholder="예: 010-1234-5678" className={cls(inputBase, "phone")} />
        </L>

        {/* 영업시간 */}
        <div>
          <LabelText text="영업시간" required />
          <div className="mt-1 flex gap-2">
            <Select name="openingHourStart" defaultValue="" className={cls(selectBase, "openingHourStart")}>
              <option value="" disabled>
                시작 시간
              </option>
              {hours.map(h => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </Select>
            <span className="self-center">~</span>
            <Select name="openingHourEnd" defaultValue="" className={cls(selectBase, "openingHourEnd")}>
              <option value="" disabled>
                종료 시간
              </option>
              {hours.map(h => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </Select>
          </div>
          {(errors.openingHourStart || errors.openingHourEnd) && (
            <p className="mt-1 text-xs text-red-600">시작/종료 시간을 모두 선택해 주세요.</p>
          )}
        </div>

        {/* 휴무일 */}
        <div>
          <LabelText text="휴무일 (복수 선택 가능)" />
          <div className="mt-2 grid grid-cols-2 gap-2">
            {days.map(day => (
              <label key={day} className="flex items-center gap-2">
                <input type="checkbox" name="holidays" value={day} />
                <span>{day}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 주요 메뉴 / 가격 */}
        <div>
          <LabelText text="주요 메뉴 / 가격 (최대 3개, 최소 1개 필수)" required />
          <div className="mt-2 space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="grid grid-cols-3 gap-2">
                <I name={`menu${i}`} placeholder={`메뉴 ${i}`} className={cls(inputBase) + " col-span-2"} />
                <input
                  type="number"
                  name={`price${i}`}
                  placeholder="가격(숫자)"
                  inputMode="numeric"
                  pattern="\d*"
                  className={cls(inputBase)}
                />
              </div>
            ))}
            {errors.services && <p className="text-xs text-red-600">{errors.services}</p>}
          </div>
        </div>

        {/* 기타 */}
        <L label="강점/특징">
          <I name="strengths" placeholder="예: 반려동물 동반 가능, 1인 좌석 완비" className={cls(inputBase)} />
        </L>
        <L label="주차 정보">
          <I name="parkingInfo" placeholder="예: 가게 뒤 공영주차장 1시간 무료" className={cls(inputBase)} />
        </L>
        <L label="SNS 주소">
          <I name="snsUrl" placeholder="예: https://instagram.com/yourshop" className={cls(inputBase)} />
        </L>

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl bg-black py-3 font-semibold text-white disabled:opacity-50"
        >
          {pending ? "제출 중..." : "제출"}
        </button>
      </form>
    </main>
  );
}

/* --- 프리미티브 컴포넌트 & 클래스 --- */
const inputBase =
  "w-full rounded-lg border px-3 py-2 text-sm placeholder:text-gray-400 outline-none transition";
const selectBase = "flex-1 rounded-lg border px-3 py-2 text-sm outline-none transition";

function LabelText({ text, required = false }: { text: string; required?: boolean }) {
  return (
    <span className="block text-sm font-medium text-gray-700">
      {text} {required && <span className="text-red-500">*</span>}
    </span>
  );
}

function L({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <LabelText text={label} required={required} />
      <div className="mt-1">{children}</div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </label>
  );
}

function I(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} />;
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} />;
}

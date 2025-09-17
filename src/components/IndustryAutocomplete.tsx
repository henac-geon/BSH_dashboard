// src/components/IndustryAutocomplete.tsx
"use client";

import { useEffect, useRef, useState } from "react";

type Suggest = {
  code: string;
  category: string;
  fullCategory: string;
};

export default function IndustryAutocomplete({
  name = "industry",
  codeName = "industryCode",
  placeholder = "(음식점 전용) 예: 카페/치킨/분식…",
  defaultValue = "",
  className = "",
  onSelected,
}: {
  name?: string;
  codeName?: string;
  placeholder?: string;
  defaultValue?: string;
  className?: string;
  onSelected?: (payload: { code: string; label: string }) => void;
}) {
  const [value, setValue] = useState(defaultValue);
  const [code, setCode] = useState("");
  const [items, setItems] = useState<Suggest[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  async function doSearch(q: string) {
    if (!q.trim()) {
      setItems([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/industry/search?q=${encodeURIComponent(q)}&limit=8`);
      const json = await res.json();
      if (json?.success) {
        setItems(json.data as Suggest[]);
        setOpen(true);
      } else {
        setItems([]);
        setOpen(false);
      }
    } catch {
      setItems([]);
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setValue(v);
    setCode("");
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => doSearch(v), 250);
  }

  function pick(it: Suggest) {
    setValue(it.category);
    setCode(it.code);
    setOpen(false);
    onSelected?.({ code: it.code, label: it.category });
  }

  return (
    <div className="relative" ref={boxRef}>
      <input type="hidden" name={codeName} value={code} />
      <input
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete="off"
        className={className}
        onFocus={() => value && doSearch(value)}
      />
      {open && (
        <div className="absolute z-50 mt-1 max-h-72 w-full overflow-auto rounded-lg border bg-white shadow">
          {loading && <div className="px-3 py-2 text-sm text-gray-500">검색 중…</div>}
          {!loading && items.length === 0 && (
            <div className="px-3 py-2 text-sm text-gray-500">결과가 없습니다.</div>
          )}
          {!loading &&
            items.map((it) => (
              <button
                key={`${it.code}-${it.category}`}
                type="button"
                className="w-full px-3 py-2 text-left hover:bg-gray-50"
                onClick={() => pick(it)}
              >
                <div className="font-medium">{it.category}</div>
                <div className="text-xs text-gray-500">{it.fullCategory}</div>
                <div className="text-[11px] text-emerald-600">
                </div>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

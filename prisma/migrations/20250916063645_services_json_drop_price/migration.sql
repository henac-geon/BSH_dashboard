BEGIN;

-- 0) 기존 priceRange 컬럼이 있으면 삭제
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Business' AND column_name = 'priceRange'
  ) THEN
    ALTER TABLE "Business" DROP COLUMN "priceRange";
  END IF;
END $$;

-- 1) services를 JSON 컬럼으로 추가 (임시)
ALTER TABLE "Business" ADD COLUMN "services_json" JSONB NOT NULL DEFAULT '[]'::jsonb;

-- 2) 기존 services가 text[]였다면 JSON 배열로 변환 (["라떼:5000","버거:9000"] → ["라떼:5000","버거:9000"])
--    이미 JSON이면 그대로 덮어씀
UPDATE "Business"
SET "services_json" = CASE
  WHEN pg_typeof("services")::text = 'jsonb' THEN "services"::jsonb
  WHEN pg_typeof("services")::text = '_text' THEN to_jsonb("services")
  ELSE '[]'::jsonb
END;

-- 3) 기존 services 컬럼 삭제하고 교체
ALTER TABLE "Business" DROP COLUMN "services";
ALTER TABLE "Business" ADD COLUMN "services" JSONB NOT NULL DEFAULT '[]'::jsonb;

-- 4) 임시 JSON 데이터 이관
UPDATE "Business" SET "services" = "services_json";

-- 5) 임시 컬럼 제거
ALTER TABLE "Business" DROP COLUMN "services_json";

COMMIT;

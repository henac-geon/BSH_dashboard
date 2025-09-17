-- 안전하게: 문자열 services → 배열 services 로 마이그레이션 (Windows/Prisma 친화)
BEGIN;

-- 1) 임시 배열 컬럼 추가 (기본값: 빈 배열)
ALTER TABLE "Business"
ADD COLUMN "services_new" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- 2) 기존 문자열을 분해/트림해서 배열에 이식
UPDATE "Business"
SET "services_new" = ARRAY(
  SELECT btrim(x)
  FROM unnest(
    CASE
      WHEN "services" IS NULL OR "services" = '' THEN ARRAY[]::TEXT[]
      ELSE string_to_array("services", ',')
    END
  ) AS x
  WHERE btrim(x) <> ''
);

-- 3) 기존 컬럼 삭제 후, 새 컬럼 이름 교체
ALTER TABLE "Business" DROP COLUMN "services";
ALTER TABLE "Business" RENAME COLUMN "services_new" TO "services";

-- (선택) 기본값 제거하고 싶다면 주석 해제
-- ALTER TABLE "Business" ALTER COLUMN "services" DROP DEFAULT;

COMMIT;

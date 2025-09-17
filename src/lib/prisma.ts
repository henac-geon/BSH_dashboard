import { PrismaClient } from "@prisma/client";

// 전역 변수 타입 선언 (Next.js 개발환경에서 핫리로드 시 중복 방지)
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["query", "info", "warn", "error"], // ← 디버깅 시 쿼리 로그 확인 가능
  });

// 개발환경에서는 캐싱해서 핫리로드 시에도 클라이언트 중복 생성 방지
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

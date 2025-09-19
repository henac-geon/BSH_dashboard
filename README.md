# BSH_dashboard
Business Startup Helper owner dashboard
실행전 꼭 해야될 것들 !!

1. 파일 안에 .env 폴더 생성 -> DATABASE_URL/DIRECT_URL 키 받아서 해당 폴더 안에 복사 붙여넣기

2. 해당 프로젝트 디렉토리로 이동후 패키지 설치

:: 필수 패키지 설치   
npm i   
npm i @prisma/client   
npm i -D prisma   

:: Prisma Client 생성   
(schema는 frontend\prisma\schema.prisma)   
npx prisma generate

:: (테이블 아직이면) 스키마 반영   
npx prisma migrate dev

3. npm run dev로 서버 실행 - 로컬호스트주소로 접속

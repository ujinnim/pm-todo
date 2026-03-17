# CLAUDE.md — PM Todo 프로젝트 가이드

## 작업 후 커밋 & 푸시 규칙

**모든 작업이 끝난 후 반드시 커밋하고 푸시해야 한다.**

```bash
git add -A
git commit -m "작업 내용 요약"
git push
```

- 작업 단위마다 커밋 (큰 작업은 여러 번 나눠서)
- 커밋 메시지는 한국어 또는 영어로 명확하게
- 푸시까지 완료해야 작업이 끝난 것

## 기술 스택

- **프레임워크**: Next.js (App Router)
- **스타일**: Tailwind CSS v4
- **UI 컴포넌트**: shadcn/ui
- **백엔드**: Supabase
- **언어**: JavaScript (JSX)

## 프로젝트 구조

```
app/
  layout.jsx       - 루트 레이아웃
  page.jsx         - 메인 페이지 (클라이언트 컴포넌트)
  globals.css      - Tailwind 전역 스타일
components/
  ui/              - shadcn/ui 컴포넌트들
lib/
  supabase.js      - Supabase 클라이언트
```

## 개발 서버

```bash
npm run dev
```

## shadcn/ui 컴포넌트 추가

```bash
npx shadcn@latest add [component-name]
```

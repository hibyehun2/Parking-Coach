# Parking Coach

초보 운전자가 후진 주차의 조향 순서와 공간 판단을 안전하게 익힐 수 있는 교육용 웹앱입니다.

현재 버전은 `v1.0.0`입니다.

## 주요 기능

- 상황별 단계 안내와 직접 조작 연습
- 움직이는 탑뷰를 활용한 판단 연습
- 차량 물리 기반 조향, 충돌 및 주차 완료 판정
- 충돌 순간 복기와 행동 중심의 결과 안내
- 최근 연습 기록과 익명 학습 사례 공유
- 설치 후 오프라인 연습을 지원하는 PWA

Google 로그인 후 연습 기록을 같은 계정에 연결할 수 있습니다. 공유에 동의한 보관 기록만 익명 학습 사례로 공개되며 Google 프로필 이름과 사진은 공개하지 않습니다.

> Parking Coach는 주차 원리와 판단 순서를 익히기 위한 교육용 도구입니다. 실제 차량의 크기, 회전반경과 시야는 다를 수 있습니다. 실제 운전에서는 주변을 직접 확인하고 안전한 장소에서 지도자의 도움을 받아 연습하세요.

## 로컬 실행

Node.js 20.19 이상 또는 22.12 이상이 필요합니다.

```bash
npm install
npm run dev
```

Google 로그인과 학습 사례 공유를 사용하려면 `.env.example`을 참고해 `.env.local`에 Supabase 환경 변수를 설정합니다.

## 품질 확인

```bash
npm run lint
npm test
npm run build
```

## 기술 구성

React, TypeScript, Vite, React Router, HTML Canvas 2D, Supabase 및 PWA로 구현했습니다.

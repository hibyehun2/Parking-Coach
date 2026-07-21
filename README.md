# Parking Coach

초보 운전자가 후진주차의 원리와 조향 타이밍을 단계적으로 연습할 수 있도록 만드는 교육용 웹앱입니다. Vite, React, TypeScript와 HTML Canvas 2D를 사용하며, 백엔드나 회원가입 없이 연습 기록을 브라우저 `localStorage`에 저장할 예정입니다.

현재는 4단계까지 진행되어 홈 화면의 상황·모드 선택과 반응형 레이아웃, Canvas 탑뷰, 자전거 모델 기반 전·후진과 조향, 저속 크리프, 브레이크가 구현되어 있습니다. 충돌 감지 및 기록 저장은 아직 포함하지 않습니다.

조작부는 마우스·터치 드래그 방식의 가상 핸들, 브레이크를 밟고 변경하는 D/R 기어, 누르고 있는 동안 작동하는 브레이크 페달로 구성되어 있습니다.

## 실행 방법

Node.js 20.19 이상 또는 22.12 이상이 필요합니다.

```bash
npm install
npm run dev
```

터미널에 표시되는 로컬 주소를 브라우저에서 엽니다.

## 품질 확인

```bash
npm run lint
npm test
npm run build
npm run preview
```

`npm run build`는 TypeScript 프로젝트 빌드 검사 후 배포 파일을 `dist/`에 생성합니다.

## 배포 예정 방식

완성된 정적 빌드 결과를 GitHub Actions로 빌드하여 GitHub Pages에 배포할 예정입니다. GitHub Pages의 프로젝트 하위 경로에서도 정적 자산이 동작하도록 Vite의 `base`를 상대 경로로 설정했고, 클라이언트 라우팅은 `HashRouter`를 사용합니다.

## 예정 기술 구성

- Vite + React + TypeScript
- HTML Canvas 2D
- 브라우저 `localStorage`
- GitHub Pages

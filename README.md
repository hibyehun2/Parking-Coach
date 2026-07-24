# Parking Coach

초보 운전자가 후진주차의 원리, 조향 타이밍과 주변 간격 확인 방법을 단계적으로 연습할 수 있는 교육용 웹앱입니다.

Vite, React, TypeScript와 HTML Canvas 2D로 구현했습니다. 현재는 회원가입 없이 실행되며 학습 진행, 최근 연습 기록과 공유 대기열은 브라우저의 `localStorage`에 저장됩니다.

> 이 앱은 후진주차의 원리와 공간 판단을 연습하기 위한 교육용 도구입니다. 실제 차량의 크기, 회전반경과 시야는 다를 수 있으므로 실제 운전에서는 주변을 직접 확인하고 안전한 장소에서 지도자의 도움을 받아 연습하세요.

## 주요 기능

### 상황별 후진주차 연습

- 양옆 차량 사이 기본 후진주차
- 반대편 회전 공간이 부족한 좁은 통로 주차
- 연습 진행에 따른 좌우 배치와 출발 방향 변형

### 단계별 학습

- 실제 차량 회전반경을 고려한 5단계 안내
- 진입 위치, 전진 조향, 후진 준비, 곡선 후진과 직선 후진 설명
- 상황과 출발 방향에 맞춘 좌우 반전
- 단계별 애니메이션 1회 재생 및 이전 단계 재생
- 단계별 안내를 받으며 직접 조작하는 직접 연습
- 판단 유형을 선택하고 움직이는 탑뷰로 푸는 판단 연습

### 주행 보조

- 현재 위치, 차체 각도와 조향 상태를 반영한 실시간 안내
- 좌우 후방 간격뷰
- 후방 거리선과 조향 예상 경로
- 차량, 벽과 주차장 경계 충돌 감지
- 주차 방지턱 접촉 시 자동 정지
- 브레이크 상태에서만 가능한 D/R 기어 변경
- 저속 크리프와 주차칸 접근 구간 자동 감속

### 결과와 반복 학습

- 충돌 및 주차 완료 상태 확인
- 실제 주차 화면을 사용하는 주요 순간 탑뷰 리플레이
- 충돌 전 안전 지점부터 재시도
- 후보 진로와 선택 결과를 보여주는 수정주차 그림 퀴즈
- 최근 연습 기록 저장
- 보관한 기록의 익명 학습 사례 공유 동의 및 동기화 대기열
- 충돌 기록에 따른 맞춤 상황 추천

## 연습 흐름

1. 연습할 주차 상황을 선택합니다.
2. 판단 연습 또는 직접 연습을 선택합니다.
3. 직접 연습에서는 5단계 안내를 확인합니다.
4. 브레이크, 기어와 핸들을 조작해 후진주차를 진행합니다.
5. 주차칸 안에서 완전히 정지한 뒤 주차 완료를 선택합니다.
6. 결과 화면에서 주요 순간과 수정 진로를 확인하고 다시 연습합니다.

## 조작 방법

### 화면 조작

- 핸들: 마우스 또는 터치로 원을 그리듯 드래그
- 핸들 중앙: `핸들 중앙` 버튼
- 브레이크: 브레이크 페달을 누르고 있는 동안 작동
- 기어: 완전히 정지하고 브레이크를 밟은 상태에서 D/R 선택
- 주차 완료: 차량 전체가 주차칸 안에 있고 정지한 상태에서 선택

### 키보드

| 기능 | 키 |
| --- | --- |
| 좌·우 조향 | `←` / `→`, `A` / `D` |
| 브레이크 | `Space`, `S` |
| 전진 기어 | `F` |
| 후진 기어 | `R` |
| 핸들 중앙 | `C` |

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

- `npm run lint`: ESLint 검사
- `npm test`: 차량 물리, 충돌, 주차 판정과 안내 로직 테스트
- `npm run build`: TypeScript 검사 후 `dist/`에 정적 배포 파일 생성
- `npm run preview`: 생성된 배포 파일을 로컬에서 확인

## 데이터 저장

다음 정보는 현재 브라우저의 `localStorage`에 저장됩니다.

- 확인한 단계별 안내
- 안내 자동 건너뛰기 설정
- 상황별 첫 성공 여부
- 최근 연습 결과와 충돌 기록
- 최근 연습 결과, 보관 상태와 공유 동의

Google 로그인 세션과 확정한 공개 닉네임은 Supabase Auth가 관리합니다. 보관에 동의한 학습 사례만 Supabase로 전송하며 원본 탑뷰 좌표, 기기 정보와 Google 프로필 이름·사진은 전송하지 않습니다.

브라우저 데이터나 사이트 저장 공간을 삭제하면 기록도 함께 삭제됩니다.

## Supabase 로그인과 학습 사례 연결

`.env.example`을 참고해 로컬 전용 `.env.local`에 Supabase Project URL과 anon public key를 설정합니다. 두 값은 브라우저 공개용이지만 service role 키와 데이터베이스 비밀번호는 절대 `VITE_` 변수나 저장소에 넣지 않습니다.

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

Supabase SQL Editor에서 [학습 사례 마이그레이션](supabase/migrations/202607250001_create_learning_cases.sql)을 실행합니다. 마이그레이션은 다음 보안 조건을 적용합니다.

- Google 로그인 사용자만 사례 작성 가능
- `auth.uid()`가 일치하는 사용자만 자신의 사례 수정·삭제 가능
- 공개 조회에서는 소유자 ID와 동의 기록 제외
- 클라이언트 공유 ID로 중복 전송 방지
- 닉네임, 점수, 허용 상태와 배열 길이를 데이터베이스에서도 검사

Supabase Authentication의 URL Configuration에는 다음 Redirect URL을 허용합니다.

- 로컬: `http://localhost:5173/**`
- GitHub Pages: `https://hibyehun2.github.io/Parking-Coach/**`

Google Cloud OAuth의 승인된 리디렉션 URI는 Supabase 콜백인 `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`을 사용합니다. 앱은 PKCE 코드 흐름을 사용하며, 첫 로그인 후 Google 이름 대신 무작위 동물 닉네임을 사용자 메타데이터에 저장합니다.

GitHub Pages 배포에는 저장소 Actions Variables `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`를 등록합니다. 기록 초기화는 서버의 전체 삭제가 성공한 뒤에만 로컬 기록을 지웁니다.

## 배포

`main` 브랜치에 변경 사항이 반영되면 GitHub Actions가 다음 작업을 수행합니다.

1. 의존성 설치
2. 프로덕션 빌드
3. 빌드 결과를 GitHub Pages에 배포

프로젝트 경로 배포를 위해 Vite `base`, 웹 앱 매니페스트의 `start_url`과 `scope`는 `/Parking-Coach/`를 사용합니다. 클라이언트 라우팅은 `HashRouter`를 사용합니다.

## 기술 구성

- Vite
- React
- TypeScript
- React Router
- HTML Canvas 2D
- 브라우저 `localStorage`
- Node.js 기본 테스트 러너
- GitHub Actions 및 GitHub Pages

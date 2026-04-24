# Implementation Tasks: BotC Digital Grimoire

본 문서는 `docs/plan.md`의 구현 계획을 바탕으로, 순서대로 진행해야 할 구체적인 작업(Task)들을 정의합니다.

## Phase 1: Project Foundation & Security

- [x] **Task 1: 프로젝트 초기화 및 UI 프레임워크 설정**
  - **Acceptance:** Vite + React(TypeScript) 앱이 실행되며, Tailwind CSS (Modern Gothic 디자인 테마)가 적용된 샘플 컴포넌트가 브라우저에 표시된다.
  - **Verify:** `npm run dev` 실행 후 브라우저 확인 (배경색 `#020617` 확인).
  - **Files:** `package.json`, `vite.config.ts`, `tailwind.config.js`, `src/index.css`, `src/App.tsx`

- [x] **Task 2: Firebase 프로젝트 연동 및 인증(Auth) 구성**
  - **Acceptance:** Firebase Anonymous Auth를 통해 접속 시 익명 사용자로 로그인되며, 새로고침 시에도 동일한 UID를 유지한다.
  - **Verify:** 브라우저 콘솔에서 익명 사용자 로그인 성공 메시지 확인 및 개발자 도구 Application 탭에서 세션 유지 여부 수동 확인.
  - **Files:** `src/lib/firebase.ts`, `src/hooks/useAuth.ts`

- [x] **Task 3: Realtime Database 스키마 정의 및 보안 규칙(Rules) 작성**
  - **Acceptance:** 데이터베이스의 `public` 노드는 인증된 누구나 읽을 수 있지만, `secret` 노드는 스토리텔러(ST) 권한이 있는 사용자만 읽고 쓸 수 있는 보안 규칙이 설정된다.
  - **Verify:** Firebase Emulator 환경에서 규칙 테스트 코드 실행 (권한 없는 사용자의 `secret` 읽기 실패 여부 검증).
  - **Files:** `firebase.json`, `database.rules.json`

## Phase 2: Core Logic & Rules Engine (TDD)

- [x] **Task 4: 게임 엔티티 타입 및 상태 구조 정의**
  - **Acceptance:** 직업(Character), 상태이상(Poison/Drunk), 게임 페이즈(Phase), 야간 행동(Night Action)에 대한 모든 TypeScript 인터페이스가 선언된다.
  - **Verify:** `npm run typecheck` 통과 여부 확인.
  - **Files:** `src/types/game.ts`, `src/types/character.ts`

- [x] **Task 5: 게임 상태 기계(State Machine) 기본 구조 구현**
  - **Acceptance:** ST의 명시적 입력 없이도, 특정 조건(예: 동시 투표 과반수 달성, 사망자 발생 등)에 따라 낮, 밤, 투표 단계가 전환되는 상태 머신이 동작한다.
  - **Verify:** 순수 함수 단위 테스트 작성 (`npm run test`).
  - **Files:** `src/lib/stateMachine.ts`, `tests/lib/stateMachine.test.ts`

- [x] **Task 6: Trouble Brewing 직업별 로직(우선순위/상태이상) 구현**
  - **Acceptance:** 독/술취함에 걸린 캐릭터의 정보가 무작위로 오염되는 로직과, 야간 행동 우선순위(예: 수도승 -> 악마 -> 점쟁이)에 따라 타겟과 결과를 계산하는 룰 엔진이 동작한다.
  - **Verify:** "독술사에게 당한 점쟁이가 잘못된 정보를 반환한다"와 같은 핵심 단위 테스트 100% 통과.
  - **Files:** `src/lib/rulesEngine.ts`, `tests/lib/rulesEngine.test.ts`

## Phase 3: State Management & Data Sync

- [x] **Task 7: Zustand 기반 게임 상태 스토어 구현**
  - **Acceptance:** Firebase 연동 없이도 UI 테스트가 가능하도록 초기 게임 상태를 관리하고 액션(지목, 직업 할당 등)을 디스패치할 수 있는 스토어가 생성된다.
  - **Verify:** 컴포넌트 렌더링 시 스토어 초기값 정상 바인딩 확인.
  - **Files:** `src/store/gameStore.ts`

- [x] **Task 8: Firebase Realtime Sync Hook 구현 (`useGameData`, `useSecretData`)**
  - **Acceptance:** Firebase DB 값의 변경사항이 실시간(Listener)으로 Zustand 스토어에 동기화되며, `public` 상태와 `secret` 상태가 격리되어 관리된다.
  - **Verify:** 파이어베이스 콘솔에서 수동으로 DB 값을 변경했을 때, 즉시 로컬 브라우저 UI가 갱신되는지 수동 확인.
  - **Files:** `src/hooks/useFirebaseSync.ts`

## Phase 4: ST & Player UI (병렬 진행 가능)

- [x] **Task 9: ST 방 생성 및 로비 UI 구현**
  - **Acceptance:** ST가 방을 생성하고 참여 코드를 발급받아 화면에 노출하며, 플레이어들이 닉네임으로 접속하면 리스트가 실시간 업데이트된다.
  - **Verify:** ST 화면과 다수의 플레이어 화면을 띄워놓고 접속/퇴장 동기화 수동 확인.
  - **Files:** `src/components/game/STLobby.tsx`, `src/components/game/PlayerLobby.tsx`

- [x] **Task 10: ST 마도서(Grimoire) 세팅 UI 구현**
  - **Acceptance:** ST가 각 플레이어 좌석을 드래그 앤 드롭으로 배치하고(이웃 인덱싱 완료), 직업과 블러프를 할당한 뒤 '게임 시작' 버튼을 누를 수 있다.
  - **Verify:** 세팅 완료 시 각 플레이어의 DB 상태에 초기 직업과 진영이 할당되는지 콘솔/DB로 확인.
  - **Files:** `src/components/game/GrimoireSetup.tsx`, `src/components/common/DragItem.tsx`

- [x] **Task 11: 주간 토론 및 실시간 동시 투표 UI 구현**
  - **Acceptance:** 지목 시 모든 플레이어 화면에 찬성/반대 버튼이 뜨며, 투표율과 잔여 유령 투표권(Ghost Vote) 상태가 실시간으로 시각화된다.
  - **Verify:** 투표 상태 컴포넌트 렌더링 테스트 (Mock 데이터 활용).
  - **Files:** `src/components/game/VotingPanel.tsx`, `src/components/game/DayPhase.tsx`

- [x] **Task 12: (핵심) Zero-Time Night 동시 액션 UI 구현**
  - **Acceptance:** 밤이 되면 능력이 있는 캐릭터는 타겟을 선택하고, 능력이 없거나 죽은 플레이어는 '확인(Fake)' 버튼이 강제되는 UI가 표시된다.
  - **Verify:** 모든 참여자가 어떠한 버튼이라도 눌러야만 야간 페이즈 입력 상태가 '완료'됨을 뷰 단위로 확인.
  - **Files:** `src/components/game/NightActionPanel.tsx`, `src/components/game/NightPhase.tsx`

## Phase 5: Integration & Polish

- [x] **Task 13: ST 결과 승인 대시보드 및 일괄 동기화 (Batched Sync) 연동**
  - **Acceptance:** 전원의 야간 입력이 완료되면 시스템이 결과를 자동 계산해 ST 화면에 보여준다. ST가 '아침으로 전환'을 누르면 1초 이내에 모든 플레이어 기기에 처리 결과가 동시에 전송된다.
  - **Verify:** 브라우저 창 5개(ST 1명 + 플레이어 4명)를 띄운 시뮬레이션 환경에서 동시 알림 동작 E2E 수동 검증.
  - **Files:** `src/components/game/STNightDashboard.tsx`, `src/lib/syncManager.ts`

- [x] **Task 14: 최종 오류 수정 및 예외 케이스(AFK 대응) 방어 코드 작성**
  - **Acceptance:** 플레이어가 입력 중 브라우저를 닫거나 조작하지 않는 상황(AFK)에서 ST가 수동으로 넘길 수 있는 타임아웃 기능 및 예외 복구 로직이 완비된다.
  - **Verify:** 한 플레이어의 강제 접속 종료를 시뮬레이션하여 세션 복구 및 게임 진행 멈춤 현상 해결 검증.
  - **Files:** `src/lib/errorHandler.ts`, `src/App.tsx`

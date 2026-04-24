# Implementation Plan: BotC Digital Grimoire

## 1. Major Components & Architecture
1.  **Project Foundation:** Vite + React 19 + TypeScript 환경 설정 및 Tailwind CSS(다크 모드 전용) 구성.
2.  **Firebase 인프라:**
    *   Firebase Auth (익명 로그인).
    *   Firebase Realtime Database 스키마 설계 및 엄격한 보안 규칙(Security Rules) 작성 (`public` vs `secret` 데이터 완전 분리).
3.  **상태 관리 및 동기화 (Hooks & Store):**
    *   Zustand를 이용한 로컬 UI 상태 관리.
    *   Firebase RTDB와 React 상태를 양방향(또는 단방향)으로 실시간 동기화하는 커스텀 훅(`useGameData`, `useSecretData`).
4.  **BotC 룰 엔진 (Core Logic):**
    *   UI와 독립된 순수 함수 형태의 상태 기계(State Machine).
    *   Trouble Brewing 직업별 야간 행동 우선순위, 중독/술취함 판정, 승패 판정 로직.
5.  **스토리텔러(ST) 인터페이스:**
    *   방 생성, 플레이어 좌석 배치(드래그 앤 드롭).
    *   마도서 세팅 (직업 할당, 블러프 지정).
    *   밤 페이즈 결과 확인 및 승인 대시보드.
6.  **플레이어 인터페이스:**
    *   로비 (닉네임 입력 및 대기).
    *   낮/투표 화면 (실시간 투표 현황, 유령 투표권 표시).
    *   밤 페이즈 화면 (동시 액션 UI, 직업별 타겟 선택 또는 가짜 확인 버튼).

## 2. Implementation Order (구현 순서)

### Phase 1: Foundation & Data Layer (순차적 필수 진행)
*   **Step 1:** 프로젝트 초기화 및 Tailwind CSS 설정.
*   **Step 2:** Firebase 프로젝트 연동 및 Realtime Database 스키마 설계 / 보안 규칙(Rules) 작성 및 테스트.
    *   *Checkpoint:* Firebase 로컬 에뮬레이터를 통해 권한 없는 사용자가 `secret` 데이터에 접근하지 못함을 검증.

### Phase 3: Core Logic & Rules Engine (UI와 독립적 진행 가능)
*   **Step 3:** Zustand 스토어 및 Firebase 실시간 연동 훅 구현.
*   **Step 4:** BotC 룰 엔진 구현 및 단위 테스트 작성 (TDD).
    *   *Checkpoint:* Trouble Brewing의 모든 예외 케이스(예: 독술사에게 당한 점쟁이) 단위 테스트 통과.

### Phase 4: UI Development (병렬 진행 가능)
*   **Step 5:** 공통 디자인 컴포넌트 개발 (버튼, 카드, 모달 등 Modern Gothic 스타일).
*   **Step 6:** ST 뷰 구현 (방 생성, 마도서 셋업).
*   **Step 7:** 플레이어 뷰 구현 (로비, 낮 토론 및 투표).

### Phase 5: The "Zero-Time Night" Integration (핵심 통합)
*   **Step 8:** 밤 페이즈 동시 액션 UI 연동.
*   **Step 9:** 플레이어 입력 -> 룰 엔진 자동 계산 -> ST 승인 -> 전원 일괄 결과 푸시 로직 통합.
    *   *Checkpoint:* 여러 브라우저 창(ST 1명, 플레이어 다수)을 띄워놓고 밤 페이즈가 1초의 오차 없이 동시에 종료 및 결과 알림이 뜨는지 검증.

## 3. Risks and Mitigation
*   **위험 요소 1 (Firebase Rules 결함):** 클라이언트 코드를 조작하여 타인의 직업을 훔쳐볼 가능성.
    *   *완화 전략:* 모든 데이터 접근 제어를 Firebase Security Rules에 전임. 컴포넌트 마운트 전 Rules 기반 단위 테스트 작성 의무화.
*   **위험 요소 2 (룰 엔진의 예외 처리 누락):** 복잡한 캐릭터 상호작용(예: 스파이/은둔자와 다른 캐릭터의 상호작용).
    *   *완화 전략:* UI 개발 전에 순수 함수로 된 룰 엔진의 TDD를 완료하여 모든 엣지 케이스를 테스트 코드로 박제. Trouble Brewing 세트 한정으로 스코프 제한.
*   **위험 요소 3 (네트워크 단절 시 데이터 유실):** 오프라인 환경의 불안정한 Wi-Fi.
    *   *완화 전략:* 상태 변경 시 즉각적으로 DB에 기록하고, Firebase의 자체 오프라인 캐싱 기능 활용. 세션(uid) 기반으로 새로고침 시 즉각적인 뷰 복구.

## 4. Parallel vs Sequential Work
*   **Sequential:** 프로젝트 초기화 → Firebase 스키마 설계 및 Rules 작성 → Firebase 연동 훅 구현. (데이터 구조가 확정되어야 UI가 가능)
*   **Parallel:** 데이터 구조가 확정된 이후에는 **룰 엔진(Core Logic) TDD**와 **UI 컴포넌트 퍼블리싱**을 동시에(병렬로) 진행 가능.

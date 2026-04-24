# Spec: BotC Digital Grimoire

## Objective
Blood on the Clocktower의 오프라인 플레이를 보조하는 모바일 중심 웹 애플리케이션을 구축합니다. 스마트폰 조작 타이밍으로 인한 정보 유출(Physical Tell)을 완벽히 차단하는 "제로 타임 밤 페이즈"를 구현하고, 스토리텔러(ST)의 룰 적용 실수를 방지하기 위한 자동화된 룰 엔진을 제공하는 것이 핵심 목표입니다.

## Tech Stack
- **프론트엔드:** React 19, TypeScript, Vite
- **스타일링:** Tailwind CSS (다크 모드 전용 'Modern Gothic Minimalism' 디자인 시스템)
- **상태 관리:** Zustand (로컬 UI 상태 및 파생 상태 관리)
- **데이터베이스/인증:** Firebase Realtime Database (실시간 동기화 및 룰 기반 보안 통제), Firebase Anonymous Auth
- **호스팅/CI:** GitHub Pages, GitHub Actions

## Commands
```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 빌드 및 로컬 프리뷰
npm run build
npm run preview

# 테스트 실행 (Vitest)
npm run test

# 린트 및 포맷팅
npm run lint
npm run format
```

## Project Structure
```text
src/
├── components/      # 재사용 가능한 UI 컴포넌트 (버튼, 모달, 카드 등)
│   ├── common/      # 공통 UI 컴포넌트
│   └── game/        # 게임 특정 컴포넌트 (마도서 뷰, 플레이어 뷰 등)
├── hooks/           # 커스텀 React 훅 (Firebase 연동, 비즈니스 로직 등)
├── store/           # Zustand 상태 저장소 (useGameStore, useSecretStore 등)
├── lib/             # 순수 비즈니스 로직 및 유틸리티 (룰 엔진 등)
├── types/           # 전역 TypeScript 인터페이스 및 타입 정의
└── App.tsx          # 애플리케이션 진입점 및 라우팅
tests/               # 유닛 및 통합 테스트 코드
docs/                # 설계 문서 및 요구사항 명세서
```

## Code Style
1. **함수형 컴포넌트 및 Hooks:** 상태 관리와 부수 효과는 커스텀 훅으로 분리하여 컴포넌트를 순수하게 유지합니다.
2. **엄격한 타입 체크:** `any` 사용을 지양하고 모든 인터페이스를 `types/` 디렉토리에 명확히 정의합니다.

```tsx
// 좋은 예: 순수 함수형 컴포넌트와 명확한 타입
import { useGameStore } from '../store/gameStore';

interface PlayerCardProps {
  playerId: string;
  name: string;
  isDead: boolean;
}

export function PlayerCard({ playerId, name, isDead }: PlayerCardProps) {
  const { nominate } = useGameStore();

  return (
    <div className={`p-4 rounded-lg bg-slate-900 ${isDead ? 'opacity-50' : ''}`}>
      <h2 className="text-lg font-semibold text-slate-300">{name}</h2>
      {!isDead && (
        <button 
          onClick={() => nominate(playerId)}
          className="mt-2 text-sky-400 font-medium"
        >
          지목하기
        </button>
      )}
    </div>
  );
}
```

## Testing Strategy
- **Framework:** Vitest, React Testing Library
- **Unit Tests (`tests/lib/`):** 룰 엔진(핵심 비즈니스 로직) 및 상태 계산 로직은 100% 커버리지를 목표로 합니다. 상태 머신이 예상대로 동작하는지 철저히 검증합니다.
- **Integration Tests (`tests/components/`):** 주요 게임 컴포넌트(밤 페이즈 UI, 투표 시스템)의 렌더링 및 이벤트 핸들링을 테스트합니다.
- **Rules Tests:** Firebase Realtime Database Security Rules가 `secret` 데이터 접근을 올바르게 차단하는지 검증합니다.

## Boundaries
- **Always do:**
  - 비즈니스 로직(특히 룰 엔진)은 UI 컴포넌트 외부에 순수 함수로 작성하고 단위 테스트를 필수로 작성합니다.
  - 모든 뷰(View)는 Firebase 권한(규칙)에 의해 서버 사이드에서 통제되어야 하며, 클라이언트 사이드의 숨김 처리에 의존하지 않습니다.
- **Ask first:**
  - Firebase 데이터 구조나 보안 규칙(Rules)을 변경할 때.
  - 새로운 외부 라이브러리/의존성을 추가할 때.
- **Never do:**
  - `document.getElementById` 등 직접적인 DOM 조작.
  - 클라이언트 측에서 모든 데이터를 받아온 뒤 자바스크립트로 필터링하는 방식 (반드시 DB 레벨에서 접근 제어).

## Success Criteria
1. **익명 세션 복원:** 브라우저 새로고침이나 재접속 시에도 기존 닉네임과 권한, 플레이어 상태가 정확히 복구된다.
2. **제로 타임 밤 페이즈:** 능력이 없는 플레이어도 '확인' 버튼을 누르게 하는 가짜 UI가 제공되며, 전원의 입력이 완료되었을 때 결과가 ST에게 정확히 전달된다.
3. **일괄 동기화:** ST의 승인 시, 모든 플레이어 기기에 결과 화면이 즉각적(1초 이내 지연)이고 동시에 나타난다.
4. **접근 제어 완벽성:** 플레이어의 브라우저 개발자 도구의 Network/Console 탭을 아무리 뜯어보아도 타인의 직업이나 야간 행동 내역(`secret` 노드)을 확인할 수 없다.

## Open Questions
- 누군가 딴짓을 하느라 '확인' 버튼을 누르지 않아 밤이 끝없이 지연되는 상황(AFK)에 대해 ST 강제 넘기기 기능을 제공할 것인가? (MVP에서 제외할 것인가?)

# Design System & Implementation Plan: BotC Digital Grimoire

이 문서는 'Blood on the Clocktower' 오프라인 보조 웹앱의 디자인 정체성, 시각적 자산, 그리고 이를 실제 코드로 구현하기 위한 명세서입니다.

---

## 1. 디자인 시스템 (Design System)

### 1.1. 디자인 컨셉: "Modern Gothic Minimalism"
*   **Identity:** 오프라인의 아날로그한 긴장감을 유지하면서 디지털의 명확성을 결합한 고대비 미니멀리즘.
*   **Primary Goal:** 저조도 환경(오프라인 게임 현장)에서의 시각적 피로도 최소화 및 정보 보안 유지.

### 1.2. 컬러 시스템 (Color System)
| 구분 | 컬러 이름 | 코드 | 용도 |
| :--- | :--- | :--- | :--- |
| **Base** | Slate-950 | `#020617` | 메인 배경색 (Deep Dark) |
| **Surface** | Slate-900 | `#0F172A` | 카드, 패널, 입력창 배경 |
| **Good** | Sky-400 | `#38BDF8` | 선 진영, 시스템 긍정, 주요 버튼 |
| **Evil** | Rose-500 | `#F43F5E` | 악 진영, 경고, 처형/사망 상태 |
| **ST** | Amber-400 | `#FBBF24` | 스토리텔러 전용 정보 및 강조 |
| **Neutral** | Slate-300 | `#CBD5E1` | 본문 텍스트 및 일반 UI 요소 |

### 1.3. 타이포그래피 (Typography)
*   **Font:** `Pretendard` (Web Font)
*   **Styles:**
    *   **H1 (Bold, 24px):** 페이지 타이틀, 주요 상태 강조.
    *   **H2 (Semi-bold, 18px):** 플레이어 이름, 섹션 헤더.
    *   **Body (Regular, 15px):** 일반 정보 및 설명.
    *   **Caption (Medium, 12px):** 시스템 메시지, 시간 정보.

---

## 2. 디자인 검수 가이드 (QA Checklist)
1.  **다크 모드 유지:** 모든 배경은 `#020617`을 유지하며 화이트 테마를 지원하지 않음.
2.  **보안 인터페이스:** 플레이어 직업 정보가 '탭/클릭' 없이 상시 노출되고 있지 않은가?
3.  **가독성:** `Pretendard` 폰트가 정상적으로 렌더링되며, 텍스트와 배경의 대비가 명확한가?
4.  **모바일 최적화:** 모든 주요 버튼이 화면 하단(Thumb zone)에 배치되어 있는가?

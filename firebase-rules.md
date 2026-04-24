# Firebase Realtime Database 보안 규칙 (Security Rules)

본 문서는 "Blood on the Clocktower" 모바일 웹앱의 실시간 동기화를 위해 Firebase Console에 적용해야 할 보안 규칙을 정의합니다.

## 1. 적용 방법
1. [Firebase Console](https://console.firebase.google.com/)에 접속합니다.
2. **Realtime Database** 메뉴로 이동합니다.
3. **규칙(Rules)** 탭을 클릭합니다.
4. 아래의 JSON 코드를 복사하여 붙여넣고 **게시(Publish)** 버튼을 누릅니다.

## 2. 보안 규칙 코드 (JSON)

```json
{
  "rules": {
    "rooms": {
      "$roomId": {
        // 방 번호를 아는 모든 유저는 게임 상태를 실시간으로 읽을 수 있습니다.
        ".read": "true",
        
        // 방 생성 및 상태 업데이트를 허용합니다.
        ".write": "true",

        "players": {
          "$playerId": {
            // 각 플레이어 노드에 대한 쓰기 권한을 허용합니다.
            ".write": "true"
          }
        }
      }
    }
  }
}
```

## 3. 규칙 상세 설명
*   **`.read`: true**: 모든 플레이어가 현재 게임의 단계(Phase), 생존자 명단, 투표 현황을 실시간으로 받아와야 하므로 읽기 권한을 개방합니다.
*   **`.write`: true**: 
    *   **ST(스토리텔러)**: 게임의 단계 전환, 캐릭터 배정, 사망 처리를 위해 `rooms/$roomId` 경로에 쓰기 권한이 필요합니다.
    *   **Player**: 자신의 투표 상태 변경 및 지목 액션을 위해 `rooms/$roomId/players/$playerId` 경로에 쓰기 권한이 필요합니다.

## 4. 향후 권장 사항 (보안 강화)
현재 프로젝트는 빠른 프로토타이핑을 위해 닉네임과 로컬 스토리지를 기반으로 세션을 관리합니다. 실제 서비스 배포 시에는 아래와 같은 강화 로직을 권장합니다:
1. **Firebase Auth 연동**: 익명 로그인을 통해 고유 `auth.uid`를 발급받습니다.
2. **소유권 검증**: `".write": "auth.uid === data.child('stId').val()"` 와 같이 작성하여 방장(ST)만 방 설정을 변경할 수 있도록 제한합니다.
3. **데이터 유효성 검사**: `.validate` 규칙을 추가하여 잘못된 데이터 형식(예: 음수 투표수 등)이 입력되지 않도록 방어합니다.

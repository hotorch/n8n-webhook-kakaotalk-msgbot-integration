# 🤖 카카오톡 메신저봇 n8n 웹훅 연동 시스템
메신저봇R API2를 사용하여 카카오톡 메시지를 n8n 워크플로우와 연동하는 자동화 시스템입니다.

![System Overview](asset/system-overview.png)

## 📋 목차

- [개요](#개요)
- [기능](#기능)
- [시스템 구조](#시스템-구조)
- [설치 및 설정](#설치-및-설정)
- [사용법](#사용법)
- [n8n 워크플로우 설정](#n8n-워크플로우-설정)
- [트러블슈팅](#트러블슈팅)
- [버전 히스토리](#버전-히스토리)
- [기여](#기여)

## 📖 개요

이 프로젝트는 카카오톡 메신저봇과 n8n 자동화 플랫폼을 연동하여 카카오톡 메시지를 처리하고 자동 응답하는 시스템입니다.

### 주요 특징

- 🔄 **실시간 메시지 처리**: 카카오톡 메시지를 실시간으로 n8n으로 전송
- 🛡️ **안정적인 에러 핸들링**: 다단계 안전장치와 상세한 에러 처리
- 📝 **상세한 로깅**: 디버깅과 모니터링을 위한 종합적인 로그 시스템
- 🎯 **선택적 메시지 처리**: 특정 방과 키워드만 처리
- 👥 **관리자 권한 관리**: 강화된 사용자 권한 시스템
- 🔧 **유연한 설정**: 쉬운 설정 변경 및 커스터마이징

## ⚡ 기능

### 메신저봇 기능

- 특정 카카오톡 방에서 키워드로 시작하는 메시지 감지
- JSON 형태로 메시지 데이터를 n8n 웹훅으로 전송
- n8n에서 받은 응답을 카카오톡으로 자동 회신
- 강화된 관리자 권한 및 방 필터링 기능
- 향상된 응답 처리 로직 (v3.1)

### n8n 연동 기능

- HTTP POST 요청을 통한 메시지 데이터 전송
- JSON 및 텍스트 응답 처리
- 타임아웃 및 에러 상황 대응
- 다양한 응답 형식 지원
- 안정적인 웹훅 통신 (.execute() 방식)

## 🏗️ 시스템 구조

```
카카오톡 메시지 → 메신저봇 → n8n 웹훅 → n8n 워크플로우 → 응답 → 카카오톡
```

### 시퀀스 다이어그램

```mermaid
sequenceDiagram
    participant User as 사용자 (카카오톡)
    participant Phone as 📱 스마트폰 (메신저봇 앱)
    participant N8N as 🧠 n8n (Local)

    User->>+Phone: 카톡방에 메시지 전송 ("?봇 안녕")
    Note right of Phone: 메신저봇 앱이 메시지를 감지<br/>관리자 권한 확인
    Phone->>+N8N: Webhook으로 메시지 정보 전달 (room, sender, msg)
    Note right of N8N: n8n 워크플로우 실행<br/>명령어에 따라 외부 API 호출 또는 로직 수행
    N8N-->>-Phone: Webhook 응답으로 최종 답장 전달
    Phone-->>-User: 카톡방에 답장 메시지 입력 (포맷팅 적용)
```

### 데이터 흐름

1. **메시지 수신**: 카카오톡에서 특정 키워드로 시작하는 메시지 감지
2. **권한 확인**: 관리자 목록에 등록된 사용자인지 확인
3. **데이터 전송**: 메시지 정보를 JSON으로 n8n 웹훅에 POST 요청
4. **워크플로우 처리**: n8n에서 메시지 처리 및 응답 생성
5. **응답 회신**: 처리된 응답을 카카오톡으로 자동 전송 (포맷팅 적용)

## 🛠️ 설치 및 설정

### 필요 환경

- **메신저봇R**: API2 지원 버전
- **n8n**: 자동화 워크플로우 플랫폼
- **안드로이드 기기**: 메신저봇 실행용

### 메신저봇 설정

1. 메신저봇R 앱 설치 및 권한 설정
2. `n8n-webhook-msgbot-src.js` 파일을 메신저봇에 로드
3. CONFIG 섹션에서 설정 수정:

```javascript
var CONFIG = {
    BOT_NAME: "n8n 웹훅 연동봇 v3.1",
    VERSION: "3.1.0",
    WEBHOOK_URL: "http://your-n8n-server:5678/webhook/n8n-kakaotalk-from-msg", // 실제 서버 주소로 변경
    TARGET_ROOMS: ["테스트방1","테스트방2","테스트방3"], // 연동할 카톡방 이름들
    CALL_KEYWORD: "?봇", // 봇이 반응할 키워드
    BUTLER_LIST: ['관리자1', '관리자2'], // 봇을 사용할 수 있는 관리자 목록
    TIMEOUT: 45000,  // 45초
    DEBUG_MODE: true
};
```

### n8n 설정

1. n8n 서버 설치 및 실행
2. 제공된 워크플로우 JSON을 n8n에 임포트:
   - `n8n-workflow-for-msgbot.json` 파일을 n8n으로 임포트
3. 웹훅 URL을 메신저봇 설정과 일치시키기

## 📖 사용법

### 기본 사용법

1. 설정된 카카오톡 방에서 키워드로 메시지 전송:
   ```
   ?봇 안녕하세요!
   ```

2. 메신저봇이 자동으로 n8n에 다음 데이터 전송:
   ```json
   {
     "msg": "?봇 안녕하세요!",
     "room": "방이름",
     "sender": "보낸사람"
   }
   ```

3. n8n에서 처리 후 응답을 카카오톡으로 자동 전송

### 설정 커스터마이징

#### 대상 방 변경
```javascript
TARGET_ROOMS: ["새로운방", "다른방", "테스트방"]
```

#### 키워드 변경
```javascript
CALL_KEYWORD: "!키워드"
```

#### 관리자 목록 설정
```javascript
BUTLER_LIST: ['사용자1', '사용자2', '관리자닉네임']
```

#### 타임아웃 조정
```javascript
TIMEOUT: 30000  // 30초
```

## 🔧 n8n 워크플로우 설정

### 기본 워크플로우 구조

n8n에서 다음 3개의 노드로 구성된 워크플로우를 생성합니다:

#### 1. Webhook 노드 - 메시지 수신
![Webhook Node Setup](asset/1-n8n-webhook-node.png)

- **HTTP Method**: POST
- **Path**: `n8n-kakaotalk-from-msg`
- **Response Mode**: Response Node로 설정

#### 2. Edit Fields 노드 - 응답 메시지 생성
![Edit Fields Node Setup](asset/2-edit-fields-setup.png)

- **Mode**: Manual Mapping
- **Fields to Set**: 
  - Name: `response_text`
  - Value: `안녕하세요! 메시지 {{ $json.body.msg }} 를 잘 받았습니다 :)`

이 노드에서 다양한 응답 로직을 구현할 수 있습니다:

```javascript
// 조건부 응답 예시
{
  "response_text": "{{ $json.body.msg.includes('날씨') ? '오늘 날씨는 맑습니다!' : '안녕하세요! 메시지를 받았습니다.' }}"
}
```

#### 3. Respond to Webhook 노드 - 응답 전송
![Respond to Webhook Node Setup](asset/3-respond-to-webhook.png)

- **Respond With**: Text
- **Response Body**: `{{ $json.response_text }}`
- **Response Code**: 200

### 워크플로우 임포트 방법

1. n8n 대시보드에서 "New Workflow" 클릭
2. 우상단 메뉴에서 "Import from JSON" 선택
3. `n8n-workflow-for-msgbot.json` 파일 내용을 붙여넣기
4. "Import" 클릭하여 워크플로우 로드
5. 각 노드의 설정을 환경에 맞게 조정
6. "Activate" 버튼을 클릭하여 워크플로우 활성화

### 고급 워크플로우 예시

#### 외부 API 연동
워크플로우에 HTTP Request 노드를 추가하여 외부 API와 연동 가능:

1. **HTTP Request 노드** 추가 (Edit Fields와 Respond to Webhook 사이)
2. **외부 API 호출** (날씨, 번역, AI 등)
3. **응답 데이터 가공** 후 메신저봇에 전송

#### 조건부 처리
메시지 내용에 따라 다른 처리 로직 적용:

```javascript
// Switch 노드를 사용한 조건부 분기
{
  "rules": {
    "0": "{{ $json.body.msg.includes('날씨') }}",
    "1": "{{ $json.body.msg.includes('번역') }}",
    "2": "{{ $json.body.msg.includes('검색') }}"
  }
}
```

## 🔍 트러블슈팅

### 일반적인 문제

#### "메신저봇 오류" 메시지가 나타날 때

1. **네트워크 연결 확인**
   - n8n 서버가 실행 중인지 확인
   - 웹훅 URL이 정확한지 확인
   - 방화벽 설정 확인

2. **로그 확인**
   ```
   [DEBUG] 모드를 활성화하여 상세 로그 확인
   ```

3. **타임아웃 조정**
   ```javascript
   TIMEOUT: 60000  // 더 긴 타임아웃 설정
   ```

#### 메시지가 전송되지 않을 때

1. **방 이름 확인**: `TARGET_ROOMS`에 정확한 방 이름 등록
2. **키워드 확인**: 메시지가 `CALL_KEYWORD`로 시작하는지 확인
3. **권한 확인**: 메신저봇 접근성 권한 활성화
4. **관리자 목록 확인**: `BUTLER_LIST`에 올바른 사용자명 등록 (v3.1 강화)

#### n8n에서 빈 데이터를 받을 때

1. **메신저봇 코드 버전 확인**: Ver 3.1 사용 권장
2. **웹훅 URL 일치 확인**: 메신저봇과 n8n 설정 비교
3. **Content-Type 헤더 확인**: `application/json` 설정
4. **워크플로우 활성화 확인**: n8n에서 워크플로우가 활성화되어 있는지 확인

### 로그 분석

#### 정상 동작 로그 예시 (v3.1)
```
[INFO] 메시지 수신 - 방: 테스트방, 발신자: 사용자, 내용: ?봇 안녕
[DEBUG] 필터링 체크 - 방: 테스트방 (유효: true), 키워드: true, 발신자: 사용자 (집사: true)
[INFO] 웹훅 호출 시작: http://server:5678/webhook/n8n-kakaotalk-from-msg
[INFO] 웹훅 응답 수신 - 상태코드: 200
[DEBUG] 응답 원본 (순수 텍스트): 안녕하세요! 메시지를 받았습니다.
[INFO] 최종 전송 메시지 미리보기: 안녕하세요! 메시지를 받았습니다...
```

#### 에러 로그 분석
- `[ERROR]`: 시스템 오류 발생
- `timeout`: 응답 시간 초과
- `connect`: 네트워크 연결 실패
- `파싱 실패`: 응답 데이터 처리 오류
- `집사: false`: 권한이 없는 사용자의 요청

### URL 설정 주의사항

메신저봇 코드에서 테스트용과 프로덕션용 URL을 구분해서 사용:

```javascript
// 테스트용 (워크플로우 비활성화 상태에서 테스트)
WEBHOOK_URL: "http://server:5678/webhook-test/n8n-kakaotalk-from-msg"

// 프로덕션용 (워크플로우 활성화 후)
WEBHOOK_URL: "http://server:5678/webhook/n8n-kakaotalk-from-msg"
```

## 🚀 추후 고급 활용

### 다중 워크플로우 연동

```javascript
// 메시지 내용에 따라 다른 웹훅 호출
var webhookUrls = {
    "날씨": "http://server:5678/webhook/weather",
    "번역": "http://server:5678/webhook/translate", 
    "기본": "http://server:5678/webhook/default"
};
```

### 관리자 전용 기능 (v3.1 강화)

```javascript
// 강화된 관리자 확인 함수 사용
function isButler(userName) {
    if (!userName) return false;
    
    // 정확한 매칭 확인
    for (var i = 0; i < CONFIG.BUTLER_LIST.length; i++) {
        if (userName === CONFIG.BUTLER_LIST[i]) {
            return true;
        }
    }
    
    // 특정 문자열 포함 여부 확인
    if (userName.indexOf('관리자') !== -1) {
        return true;
    }
    
    return false;
}
```

### 메시지 형식 검증

```javascript
// 특정 형식의 메시지만 처리
var messagePattern = /^키워드\s+(.*)/;
if (messagePattern.test(msg.content)) {
    var command = messagePattern.exec(msg.content)[1];
    // 명령어 처리
}
```

## 📝 버전 히스토리

### v3.1 (2025-01-15)
- 🔧 **웹훅 클라이언트 개선**: `.post()` → `.execute()` 방식으로 변경하여 안정성 향상
- 👥 **관리자 권한 시스템 강화**: `isButler()` 함수 추가로 더 정교한 사용자 관리
- 📝 **응답 처리 로직 최적화**: JSON 파싱 및 포맷팅 로직 개선
- 🎨 **카카오톡 포맷팅 적용**: 보이지 않는 문자(`\u200b`) 추가로 메시지 표시 개선
- 🛡️ **에러 핸들링 강화**: `Utils.isEmpty()` 함수에서 null/undefined 처리 개선

### v3.0 (2025-01-15)
- 🚀 **jsoup 웹훅 전송 방식 도입**: 데이터 전송 안정성 확보
- 📊 **향상된 응답 처리 로직**: 다단계 응답 파싱 시스템
- 🔍 **JSON 파싱 및 에러 핸들링 개선**: 다양한 응답 형식 지원
- 📝 **상세한 로깅 시스템**: 디버깅 및 모니터링 강화

### v1.0 (2025-07-15)
- 🎉 **초기 릴리즈**: 기본 웹훅 연동 시스템 구현
- 🔄 **실시간 메시지 처리**: 카카오톡-n8n 기본 연동
- 🎯 **선택적 메시지 필터링**: 방/키워드 기반 처리

## 📁 프로젝트 파일 구조

```
n8n-webhook-kakaotalk-msgbot-integration/
├── asset/                              # 문서용 이미지 파일들
│   ├── 1-n8n-webhook-node.png         # Webhook 노드 설정 스크린샷
│   ├── 2-edit-fields-setup.png        # Edit Fields 노드 설정 스크린샷
│   ├── 3-respond-to-webhook.png       # Respond to Webhook 노드 설정 스크린샷
│   └── system-overview.png            # 전체 시스템 개요 다이어그램
├── n8n-webhook-msgbot-src.js          # 메신저봇용 JavaScript 코드 (v3.1)
├── n8n-workflow-for-msgbot.json       # n8n 워크플로우 JSON 파일
├── README.md                           # 프로젝트 문서 (현재 파일)
└── LICENSE                             # 라이선스 파일
```

---

⭐ 이 프로젝트가 도움이 되었다면 스타를 눌러주세요! 

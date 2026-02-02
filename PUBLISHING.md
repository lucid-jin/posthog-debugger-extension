# Chrome Web Store 퍼블리싱 가이드

## 사전 준비

### 1. 개발자 계정 등록
1. [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole) 접속
2. Google 계정으로 로그인
3. 등록비 **$5** (일회성) 결제
4. 개발자 정보 입력 (개인 또는 회사)

### 2. 필요한 에셋

| 항목 | 사양 | 필수 |
|------|------|:----:|
| 확장 프로그램 아이콘 | 128x128 PNG | O (완료) |
| 스크린샷 | 1280x800 또는 640x400, 최소 1장 | O |
| Small promo tile | 440x280 PNG | - |
| 상세 설명 | 텍스트 | O |
| 개인정보 처리방침 URL | 웹 페이지 | O |

> `<all_urls>` 호스트 권한을 사용하므로 **개인정보 처리방침이 필수**입니다.
> GitHub Pages나 Notion 페이지로 간단히 작성해도 됩니다.

### 3. 스크린샷 준비
확장 프로그램을 로드한 상태에서 다음 화면을 캡처합니다:
- Events 탭에서 이벤트 목록이 표시된 화면
- 이벤트 상세 보기 (JSON 트리 펼친 상태)
- User Data 탭에서 사용자 정보가 표시된 화면
- 독립 창 모드 동작 화면

## 퍼블리싱 절차

### Step 1: ZIP 패키징

```bash
cd posthog-debugger-extension

zip -r posthog-debugger.zip . \
  -x ".git/*" \
  -x "node_modules/*" \
  -x ".DS_Store" \
  -x "*.md" \
  -x ".github/*" \
  -x ".claude/*"
```

### Step 2: 업로드
1. [Developer Dashboard](https://chrome.google.com/webstore/devconsole) 접속
2. **"New Item"** 클릭
3. `posthog-debugger.zip` 파일 업로드

### Step 3: 스토어 등록 정보 입력

**기본 정보:**
- **이름**: PostHog/Zetta Debugger
- **설명**: Debug PostHog/Zetta analytics events in real-time. Captures identify calls, person properties, and all tracked events with LZ64/gzip decompression support.
- **카테고리**: Developer Tools
- **언어**: English (+ Korean)

**권한 정당화 (Justification):**

심사 시 `<all_urls>` 권한에 대해 설명을 요구할 수 있습니다:

> This extension intercepts network requests to PostHog analytics endpoints (app.posthog.com, us.posthog.com, eu.posthog.com, ingestion.zetta.so) to display captured events in a debugging panel. The broad host permission is required because PostHog analytics can be embedded on any website, and the extension needs to inject a content script to intercept fetch/XHR/sendBeacon calls to these endpoints regardless of the host page.

### Step 4: 개인정보 처리방침

아래 내용으로 간단한 Privacy Policy 페이지를 만듭니다:

> **Privacy Policy - PostHog/Zetta Debugger**
>
> This extension does not collect, store, or transmit any personal data to external servers.
> All captured analytics events are stored locally in the browser's memory and are cleared when the tab is closed.
> No data leaves the user's browser. The extension only reads network requests directed to PostHog analytics endpoints for debugging purposes.

### Step 5: 제출
1. 모든 정보 입력 확인
2. **"Submit for review"** 클릭

## 심사

- 일반적으로 **1~3 영업일** 소요
- `<all_urls>` + `webRequest` 권한 사용 시 추가 검토가 있을 수 있음
- 거부 시 사유가 이메일로 전달되며, 수정 후 재제출 가능

## 업데이트 배포

1. `manifest.json`의 `version`을 올림 (예: `1.1.0` → `1.2.0`)
2. 동일한 방법으로 ZIP 생성
3. Developer Dashboard에서 해당 확장 프로그램 선택 → **"Package"** 탭 → **"Upload new package"**
4. 재심사 후 자동 배포

# PostHog/Zetta Debugger

Chrome extension for debugging PostHog/Zetta analytics events in real-time.

**[한국어](#한국어)** | **[English](#english)**

---

## 한국어

### 소개

PostHog/Zetta Debugger는 웹 페이지에서 발생하는 PostHog 분석 이벤트를 실시간으로 캡처하고 확인할 수 있는 Chrome 확장 프로그램입니다.

### 주요 기능

- **실시간 이벤트 캡처** - fetch, XHR, sendBeacon 요청을 자동으로 인터셉트
- **압축 해제 지원** - LZ64, gzip, base64 압축 데이터 자동 디코딩
- **듀얼 모드** - DevTools 패널 + 독립 창 동시 지원
- **사용자 식별 추적** - `posthog.identify()` 호출 시 사용자 데이터 표시
- **이벤트 필터링** - 이벤트명, 속성값으로 검색
- **다중 소비자** - 패널과 독립 창에서 동일한 이벤트를 동시에 확인 가능

### 지원 엔드포인트

- `ingestion.zetta.so`
- `app.posthog.com`
- `us.posthog.com`
- `eu.posthog.com`

### 설치 방법

1. 이 레포를 클론합니다:
   ```bash
   git clone https://github.com/lucid-jin/posthog-debugger-extension.git
   ```
2. Chrome에서 `chrome://extensions` 페이지를 엽니다
3. 우측 상단 **개발자 모드**를 켭니다
4. **"압축해제된 확장 프로그램을 로드합니다"** 클릭
5. 클론한 `posthog-debugger-extension` 폴더를 선택합니다

### 사용 방법

#### 독립 창 모드
- 툴바의 확장 프로그램 아이콘을 클릭하면 별도 창이 열립니다
- 자유롭게 드래그, 리사이즈 가능
- 다른 곳을 클릭해도 닫히지 않습니다

#### DevTools 패널 모드
- `F12`로 개발자 도구를 엽니다
- **PostHog** 탭을 선택합니다

두 모드를 동시에 사용할 수 있으며, 이벤트가 양쪽에 모두 실시간으로 표시됩니다.

### 구조

```
├── manifest.json        # Extension manifest (v3)
├── src/
│   ├── background.js    # 서비스 워커, 이벤트 저장/브로드캐스트
│   ├── content.js       # 페이지 ↔ 확장 프로그램 브릿지
│   ├── inject.js        # 네트워크 요청 인터셉트 (페이지 컨텍스트)
│   ├── shared-ui.js     # 공용 UI 렌더링 모듈
│   ├── panel.html/js    # DevTools 패널
│   ├── popup.html/js    # 독립 창
│   ├── panel.css        # 공용 스타일
│   ├── devtools.html/js # DevTools 진입점
```

---

## English

### Introduction

PostHog/Zetta Debugger is a Chrome extension that captures and displays PostHog analytics events from web pages in real-time.

### Features

- **Real-time event capture** - Automatically intercepts fetch, XHR, and sendBeacon requests
- **Decompression support** - Automatically decodes LZ64, gzip, and base64 compressed data
- **Dual mode** - DevTools panel + independent window simultaneously
- **User identity tracking** - Displays user data when `posthog.identify()` is called
- **Event filtering** - Search by event name or properties
- **Multi-consumer** - View the same events in both panel and independent window at once

### Supported Endpoints

- `ingestion.zetta.so`
- `app.posthog.com`
- `us.posthog.com`
- `eu.posthog.com`

### Installation

1. Clone this repo:
   ```bash
   git clone https://github.com/lucid-jin/posthog-debugger-extension.git
   ```
2. Open `chrome://extensions` in Chrome
3. Enable **Developer mode** (top right)
4. Click **"Load unpacked"**
5. Select the cloned `posthog-debugger-extension` folder

### Usage

#### Independent Window Mode
- Click the extension icon in the toolbar to open a separate window
- Freely drag and resize
- Stays open when clicking elsewhere

#### DevTools Panel Mode
- Open DevTools with `F12`
- Select the **PostHog** tab

Both modes can be used simultaneously — events appear in real-time on both.

### Structure

```
├── manifest.json        # Extension manifest (v3)
├── src/
│   ├── background.js    # Service worker, event storage/broadcast
│   ├── content.js       # Page ↔ extension bridge
│   ├── inject.js        # Network request interception (page context)
│   ├── shared-ui.js     # Shared UI rendering module
│   ├── panel.html/js    # DevTools panel
│   ├── popup.html/js    # Independent window
│   ├── panel.css        # Shared styles
│   ├── devtools.html/js # DevTools entry point
```

### License

MIT

# KOREAN AIR 퇴근 후 · 연차 1일 탈출 시뮬레이터 (`ke-sky-concierge`)

4K NASA Black Marble 야간 3D 지구본 위에서 퇴근·연차 일정(연차 0일~2일)을 고르면, 대한항공 실제 국제선 운항 스케줄 기준으로 비행·출입국 시간을 뺀 **순수 현지 체류 시간**을 계산해 다녀올 수 있는 도시와 YouTube 기내·라운지 영상, `gemini-4-hydrogen` 단기 탈출 인사이트를 함께 보여주는 웹 앱입니다.

## 주요 기능

- **NASA Black Marble 4K 3D 지구본 (`GlobalNetworkGlobe`)**: 로컬 저장된 `earth-night.jpg`(4096×2048)와 `earth-topology.png` 범프맵으로 야간 지구를 렌더링하며, 선택한 연차 일정으로 다녀올 수 있는 도시만 스카이 블루 항로와 체류 시간(`Nh`) 태그로 강조합니다.
- **퇴근·연차 일정 시뮬레이터 (`escapeEngine.ts`, `TopPipelineHud`)**: `연차 0일 (금~일)`부터 `연차 2일 (목~월)`까지 5개 일정을 전환하며 인천 T2 출국 수속(2시간), 현지 입출국(2.5시간), 귀국 이동(1.5시간)을 제외한 순수 현지 체류 시간을 계산합니다.
- **상단 `gemini-4-hydrogen` 단기 탈출 인사이트 (`bffPlugin.ts`, `RoutePulsePanel`)**: 선택한 일정의 가는 편·오는 편·체류 시간과 국토교통부·인천공항 통계를 `gemini-4-hydrogen`에 전달해 2문장 조언을 생성합니다.
- **참고 데이터 출처 링크**: 국토교통부 항공정보포털(`airportal.go.kr`), 인천국제공항공사 여객편 운항현황(`B551177`), YouTube Data API v3, NASA Earth Observatory (Black Marble) 링크를 표시합니다.

## 환경 설정 (`.env`)

`gemini-4-hydrogen` 호출은 API 키 없이 Google Cloud ADC(로컬 `gcloud auth application-default login`) 및 Cloud Run 서비스 계정 IAM(`roles/aiplatform.user`)을 사용합니다. 공공데이터·YouTube 실시간 키를 연결할 때만 `.env`에 아래 항목을 입력합니다.

```env
GOOGLE_CLOUD_PROJECT=YOUR_GCP_PROJECT_ID
DATA_GO_KR_SERVICE_KEY=
YOUTUBE_API_KEY=
```

## 실행 방법

```bash
npm install
npm run dev
```

로컬 서버는 `http://127.0.0.1:5173`에서 실행됩니다.

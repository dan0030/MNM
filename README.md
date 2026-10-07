# our diary — 드림 페어 아카이브

Cloudflare Workers + D1으로 돌아가는 개인 홈페이지입니다. 디자인은 삼성 One UI를 바탕으로 했습니다.

- **홈 화면**: 스마트폰 홈 화면처럼 여러 페이지를 옆으로 넘겨 보고, 페이지마다 위젯을 놓습니다. 위젯은 21종입니다. 프로필(페어), 앱 아이콘, 디데이, 시계, 최근 글, 인기글, 공지, 배너, 플레이리스트, 캘린더, 갤러리, 흐르는 갤러리, 투두, 태그, 랜덤 한마디, 메모, HTML, 링크, 사진, 숫자 요약, BGM이 있어요.
- **글쓰기**: 직접 만든 리치 에디터와 HTML 직접 입력을 오가며 쓸 수 있습니다.
  - 서식: 글꼴 30종, 글자 크기와 색, 형광펜
  - 넣기: 사진 업로드·붙여넣기·끌어놓기, 유튜브
  - 블록: 대화(메신저·문자), 대사, 편지지, 메모지, 접은 글, 스포일러, 표 등
  - 이름 변환: 글 속 `{{나}}` `{{상대}}` `{{페어}}`가 프로필 이름으로 바뀌어요.
  - 공개 범위: 공개 / 보호(비밀번호) / 비공개
  - 기록 날짜를 직접 정할 수 있고, 쓰는 중에는 자동으로 임시저장돼요.
- **디자인 편집**:
  - 프리셋 13종
  - 라이트·다크 색 12가지씩
  - 배경: 단색 / 그라데이션 / 패턴 7종 / 이미지
  - 글꼴: 30종, 직접 올린 글꼴도 쓸 수 있어요.
  - 카드 스타일 6종, 모서리, 간격, 너비
  - 큰 제목 / 서랍 / 하단 탭 배치
  - 페이지 점 모양, 목록 모양 5종(리스트·갤러리·메모·카드·타임라인)
  - 사용자 CSS를 넣을 수 있고, 디자인 코드로 복사·붙여넣기도 돼요.
  - 위젯마다 배경과 글자색도 따로 정할 수 있어요.
- **그 밖의 기능**: 카테고리(하위 포함, 카테고리별 목록 모양), 태그, 검색, 캘린더, 공지, 방명록·댓글(비밀글, 답글), 글 반응 이모지, BGM 플레이어, 백업 내보내기·불러오기가 있어요.

## 배포하기 (처음 한 번)

[Node.js](https://nodejs.org) 18 이상과 Cloudflare 계정이 필요합니다.

```bash
npm install
npx wrangler login                     # 브라우저에서 Cloudflare 로그인
npx wrangler d1 create our-diary       # 나온 database_id를 wrangler.jsonc에 붙여넣기
npx wrangler secret put ADMIN_PASSWORD # 관리자 비밀번호 입력 (길고 어렵게!)
npm run deploy                         # 빌드 + 배포
```

배포가 끝나면 `https://our-diary.<내계정>.workers.dev`로 접속할 수 있어요.

- 메뉴의 열쇠 아이콘이나 `/login`에서 로그인하면 글쓰기·관리·홈 편집이 열립니다.
- 데이터베이스 테이블은 첫 접속 때 자동으로 만들어져요.
- 사이트 이름은 `wrangler.jsonc`의 `name`을 바꾸면 달라져요.
- 내 도메인은 Cloudflare 대시보드 > Workers > 설정 > 도메인에서 연결해요.

### GitHub에 올릴 때마다 자동 배포하기 (선택)

Cloudflare 대시보드 > Workers & Pages > 만들기 > **Git 저장소 가져오기**에서 이 저장소를 연결하세요.

- 빌드 명령: `npm run build`
- 배포 명령: `npx wrangler deploy`

`ADMIN_PASSWORD`는 Worker 설정 > 변수 및 비밀에 넣어주세요.

### 이미지 저장소

기본적으로 올린 이미지는 D1에 저장되며, 파일당 최대 약 1.9MB입니다. 사진은 올리기 전에 자동으로 줄여서 대부분 이 안에 들어가요.

더 큰 파일을 쓰고 싶다면 R2를 켜세요.

1. `npx wrangler r2 bucket create our-diary-files`
2. `wrangler.jsonc` 맨 아래 `r2_buckets` 주석을 풀어요.
3. 다시 배포해요.

## 내 컴퓨터에서 실행하기

```bash
cp .dev.vars.example .dev.vars   # 로컬 관리자 비밀번호 설정
npm run dev                      # http://localhost:8787
```

화면만 고칠 때는 `npx wrangler dev`를 켜둔 채 다른 창에서 `npm run dev:ui`를 실행하면 바로바로 새로고침돼요.

## 폴더 구조

| 경로 | 내용 |
| --- | --- |
| `worker/` | Cloudflare Worker: API, 로그인, D1 테이블, 파일 업로드 |
| `src/lib/defaults.js` | 사이트·디자인·홈 화면 기본값, 테마 프리셋, 글꼴 목록 |
| `src/widgets/index.jsx` | 홈 위젯 전부 (새 위젯은 여기 `WIDGETS`에 추가) |
| `src/editor/RichEditor.jsx` | 글쓰기 에디터와 블록 템플릿 |
| `src/admin/` | 관리 화면과 설정 항목 정의 |
| `src/styles/` | One UI 스타일 (색·모양은 전부 CSS 변수) |

이전 버전(GitHub 저장소 기반 교환 일기)은 git 기록에 남아 있습니다.

# 포트폴리오 CMS 설정

## 사이트 수정
기존 순수 HTML/CSS/JS를 유지합니다. 메인은 index.html, 스타일은 css/, 동작은 js/입니다.
MAIN/ABOUT와 기존 카드 CSS는 유지했습니다. 작업 전 버전은 before-cms-setup 브랜치에 있습니다.

## 작품 관리
1. https://app.pagescms.org 에서 GitHub 로그인 → Pages CMS GitHub App 설치.
2. Rin0573/portfolio → main 선택.
3. Works에서 작품 추가·수정·삭제, 대표 이미지 업로드, 공개 여부, 노출 순서를 설정하고 저장.
4. 작은 order가 먼저 나옵니다. 모든 공개 작품은 기존 WORKS 슬라이더에 표시됩니다.
5. featured와 year는 관리용이며, 현재 디자인에 별도 표시 영역이 없어 외관에는 반영하지 않습니다.
6. 대표 이미지는 images 아래에서 선택·업로드합니다. 새 업로드는 images/uploads 폴더를 만들어 쓰면 됩니다.

Works 저장 대상은 data/works.json입니다. 기존 예시 작품 7개를 보존했습니다.
비공개 작품은 배포 파일에서 제외되지만 공개 GitHub 저장소의 원본에는 남습니다.

## 상세페이지 제작·연결
1. GitHub에 실제 HTML 상세페이지를 추가합니다. 예: details/branding.html.
2. Pages CMS → Detail Pages → 새 항목 → 페이지명과 실제 HTML 경로 입력 → 저장.
3. Works → 해당 작품 → 상세 페이지에서 항목 선택 → 저장.
경로는 저장소 기준이며 details/branding.html처럼 입력합니다.
HTML 자체는 CMS가 변경하지 않습니다. 경로 또는 파일명을 바꾸면 Works에서도 다시 선택하세요.
현재 저장소에는 상세 HTML이 하나도 없어 Detail Pages 목록은 비어 있습니다.
기존 링크는 있지만 파일이 없음:
detail-video.html, detail-motion.html, detail-poster.html, detail-branding.html,
detail-cardnews.html, detail-brochure.html, detail-leaflet.html.
원래 경로는 legacyDetailPage에 보존했고, 연결 전 클릭 시 안내가 나옵니다.

## 방명록 확인
방문자 → CONTACT 작성 → /api/guestbook → GitHub content/guestbook/*.json 저장.
Pages CMS → Guestbook에서 확인·승인(approved=true)·삭제합니다. 별도 공개 목록은 없습니다.
승인은 관리 상태만 바꿉니다. 승인 전 파일도 GitHub에서는 공개됩니다.
이 저장소는 공개이므로 방명록은 비밀 메시지가 아닙니다. 이름/메시지에 개인정보를 적지 않도록 안내했습니다.
삭제 후에도 Git 기록에 남을 수 있습니다. 비공개 접수는 비공개 저장소 또는 별도 저장소 설계가 필요합니다.
배포에는 content/guestbook을 복사하지 않습니다.

## Cloudflare Pages 배포
Cloudflare → Workers & Pages → Create → Pages → Import existing Git repository
→ GitHub 연결 → Rin0573/portfolio 선택.
- Production branch: main
- Framework preset: None
- Root directory: 비워두기 (저장소 루트)
- Build command: node scripts/build.mjs
- Build output directory: dist
간단한 파일 복사 스크립트만 쓰며 프레임워크·의존성 설치는 필요 없습니다.
루트 functions/api/guestbook.js가 Pages Function으로 인식됩니다.
GitHub main push 및 Pages CMS 저장 → Cloudflare 자동 배포.
Git 연동 방식으로 배포하세요. 대시보드 파일 드래그 업로드는 이 Functions 구성에 적합하지 않습니다.

## Cloudflare Variables / Secrets
Pages 프로젝트 → Settings → Variables and Secrets에서 Production에 등록하고 재배포합니다.
| 이름 | 종류 | 값 |
| --- | --- | --- |
| GITHUB_TOKEN | Secret | 아래 최소 권한 토큰 |
| GITHUB_OWNER | Variable | Rin0573 |
| GITHUB_REPO | Variable | portfolio |
| GITHUB_BRANCH | Variable | main |
| TURNSTILE_SITE_KEY | Variable | Turnstile 공개 사이트 키 |
| TURNSTILE_SECRET_KEY | Secret | 같은 위젯의 비밀 키 |

GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens:
Rin0573/portfolio만 선택, Repository permissions → Contents: Read and write.
토큰은 Cloudflare Secret에만 넣습니다. 저장소·HTML·브라우저 JS에 넣지 않습니다.
토큰 만료 시 갱신하세요. GitHub App 연결과 이 서버용 토큰은 별개입니다.
main에 직접 쓰기를 막는 브랜치 규칙이 있으면 서버 토큰 저장이 실패하므로 접근 정책을 확인하세요.

Cloudflare → Turnstile → 위젯 추가 → 배포된 pages.dev 도메인과 사용자 도메인 등록.
Site Key와 Secret Key를 위 변수에 넣고 재배포합니다.
운영에서는 두 키가 없으면 방명록을 비활성화합니다. 서버에서 토큰·hostname·action을 검증합니다.
Preview 환경에는 운영 GitHub Token을 넣지 않는 것을 권장합니다.

## 로컬 테스트
node scripts/build.mjs
npx wrangler pages dev dist
루트 .dev.vars에 개발용 변수와 GUESTBOOK_DEV_MODE="true"를 넣으면 localhost에서만 Turnstile 없이 테스트 가능합니다.
이 모드도 실제 GitHub 파일을 생성하므로 테스트 브랜치를 사용하세요.
.dev.vars는 Git에서 제외됩니다. 운영 호스트에서는 개발 모드가 작동하지 않습니다.
API 단위 테스트: node --test tests/guestbook.test.mjs

## 확인할 사항
- images/bg2.mp4가 원래부터 없습니다. 실제 영상을 해당 경로에 추가하세요.
- 작품 썸네일 7개는 기존 picsum 예시 이미지입니다. Works에서 실제 이미지로 교체하세요.
- 박예란/박민서 이름 불일치와 예시 연락처는 원본대로 유지했습니다.
- CMS 로그인·GitHub App 설치·Cloudflare 계정 연결·Secret 등록은 계정 소유자가 해야 합니다.
- 최초 배포 후 Works 임시 항목을 저장해 data/works.json 변경과 자동 배포를 확인한 뒤 삭제하세요.
- 방명록 테스트 메시지 전송 → Guestbook 새 항목 → 승인 → 삭제를 확인하세요.
- 실제 Cloudflare 배포·실제 토큰 쓰기·실제 Turnstile 성공은 계정 설정 후 확인해야 합니다.

공식 문서:
https://pagescms.org/docs/configuration/
https://pagescms.org/docs/configuration/fields/reference/
https://developers.cloudflare.com/pages/framework-guides/deploy-anything/
https://developers.cloudflare.com/turnstile/get-started/server-side-validation/

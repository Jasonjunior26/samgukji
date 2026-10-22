# samgukji — 작업 규칙

> 2026-10-22부터 최신 게임 파일은 `samguk_v108.html`(구 samguk_v107.html 개명). 옛 문서의 v107 경로는 같은 파일을 가리킨다. 배포: https://jasonjunior26.github.io/samgukji/samguk_v108.html

단일 파일 게임 `samguk_v108.html`(약 8.5MB, 13,000줄+). 통째로 읽지 말고 `grep -n`·줄 범위로만 본다. 줄 번호와 모듈 위치는 `docs/코드지도.md`에 있다.

## 문서 갱신 규칙 (필수)
요소(전투 / 내정 / 외교·계략 / 인사·장수 / AI / UI·저장·음악)를 **버전업할 때마다**:
1. 해당 `docs/변화_*.md` **맨 위**에 새 항목을 추가한다 — `## vX.Y (YYYY-MM-DD) — 제목` / 변경 사항 / 시뮬레이션·검증 결과(수치, 도구·명령, 시드) / 알려진 문제 / 관련 커밋 해시. "현재 상태 요약" 단락도 고친다.
2. 줄 번호가 밀렸으면 `docs/코드지도.md`를 갱신한다.
3. 전투 재측정은 **변경이 V4 전투 코드(`V4.*`·`autoUnits`·병종 수치 등 battle_sim이 실제로 거치는 경로)를 건드릴 때만** `node tools/battle_sim.js 20`(시드 고정 `BSEED`, 기본 1 — 같은 코드면 같은 결과)으로 돌려 기준선과 비교한다. 교역·내정·UI·`startBattle`/`autoBattle` 래퍼만 바뀌면 돌리지 않고 "해당 없음"으로 적는다.
4. 시뮬레이션은 묻는 질문 하나에 필요한 판만, 다른 시뮬과 겹치지 않게 차례로 돌린다(`root_sim` 16판 통째 실행 금지 — 필요한 뿌리만).
5. 그 뒤 커밋한다. 확인 못 한 것은 "미확인"으로 적고 지어내지 않는다.

형식과 문서 지도는 `docs/README.md`.

## 빌드·모델 운영
- **BUILD 갱신(필수)**: 게임 html을 빌드·커밋할 때마다 커밋 직전에 `node tools/bump_build.js`를 돌린다(현재 시각으로 `samguk_v108.html` `const BUILD`·`version.json`·`docs/README.md` 현재 BUILD를 한 번에 맞춤). 타이틀 화면 하단 "버전"에 표시되고, 게임은 켤 때 `version.json`(캐시 안 씀)과 비교해 다르면 `?b=새빌드`로 다시 열어 옛 캐시를 피한다. `version.json`이 `BUILD`와 다르면 이 안전장치가 오작동하니 html만 고치고 커밋하지 않는다.
- **빌드는 지시 후에**: 변경을 곧바로 `samguk_v108.html`에 반영하지 않는다. 충분히 숙고하고 시뮬레이션(`tools/`)과 결과 기록(`docs/변화_*.md`)을 끝낸 뒤, 사용자가 "빌드하자"고 할 때만 html을 고치고 커밋한다.
- **모델**: 기본은 Sonnet(`.claude/settings.json`), 서브에이전트도 모델을 따로 지정하지 않는다. 요청이 다른 모델에 맞으면 작업 전에 먼저 알린다: 단순 잡무만이면 Haiku, 구조를 크게 바꾸는 설계면 Opus. 이때 "`/model <모델>`로 바꾸세요"를 함께 말한다.

## 환경
- Windows. 파이썬은 `PYTHONIOENCODING=utf-8`, 긴 스크립트는 파일로 만들어 실행.
- 시뮬레이션: `node tools/battle_sim.js`, `node tools/battle_calib.js`. 출력은 파일로 저장 후 `head`/`grep`.
- `screenshots/`, `assets/`는 커밋하지 않는다. `<script id="jojo-*">` 블록은 코에이 원본 자료(개인 플레이 전용)라 공개 배포 시 제거.

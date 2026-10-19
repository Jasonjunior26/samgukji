# samgukji — 작업 규칙

단일 파일 게임 `samguk_v105.html`(약 8.5MB, 13,000줄+). 통째로 읽지 말고 `grep -n`·줄 범위로만 본다. 줄 번호와 모듈 위치는 `docs/코드지도.md`에 있다.

## 문서 갱신 규칙 (필수)
요소(전투 / 내정 / 외교·계략 / 인사·장수 / AI / UI·저장·음악)를 **버전업할 때마다**:
1. 해당 `docs/변화_*.md` **맨 위**에 새 항목을 추가한다 — `## vX.Y (YYYY-MM-DD) — 제목` / 변경 사항 / 시뮬레이션·검증 결과(수치, 도구·명령, 시드) / 알려진 문제 / 관련 커밋 해시. "현재 상태 요약" 단락도 고친다.
2. 줄 번호가 밀렸으면 `docs/코드지도.md`를 갱신한다.
3. 전투면 `node tools/battle_sim.js 20`을 돌려 기준선과 비교해 적는다.
4. 그 뒤 커밋한다. 확인 못 한 것은 "미확인"으로 적고 지어내지 않는다.

형식과 문서 지도는 `docs/README.md`.

## 환경
- Windows. 파이썬은 `PYTHONIOENCODING=utf-8`, 긴 스크립트는 파일로 만들어 실행.
- 시뮬레이션: `node tools/battle_sim.js`, `node tools/battle_calib.js`. 출력은 파일로 저장 후 `head`/`grep`.
- `screenshots/`, `assets/`는 커밋하지 않는다. `<script id="jojo-*">` 블록은 코에이 원본 자료(개인 플레이 전용)라 공개 배포 시 제거.

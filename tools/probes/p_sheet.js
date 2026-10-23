// 탐침 S1-g: 수도 개발 시트 본문 해시 (기준 길이 58,232, keepT 없음)
(() => {
  newGame('조조'); UI.city = capitalOf(S.player); UI.sheets = []; openDevMulti('개발');
  const b = String(UI.sheets.at(-1).body()); let h = 0; for (let i = 0; i < b.length; i++) h = (h * 31 + b.charCodeAt(i)) | 0;
  return [b.length, h, b.includes('keepT')];
})()

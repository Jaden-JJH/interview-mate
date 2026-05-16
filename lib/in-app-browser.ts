// 인앱 브라우저(카카오톡·네이버·인스타 등) 감지 유틸리티
export function isInAppBrowser(ua: string): boolean {
  const patterns = [
    /KAKAOTALK/i,
    /NAVER\(/i,
    /Instagram/i,
    /FBAN|FBAV/i,
    /Line\//i,
    /DaumApps/i,
    /Twitter/i,
    /wv\)/,
  ];
  return patterns.some((p) => p.test(ua));
}

export function getInAppBrowserName(ua: string): string {
  if (/KAKAOTALK/i.test(ua)) return "카카오톡";
  if (/NAVER\(/i.test(ua)) return "네이버";
  if (/Instagram/i.test(ua)) return "인스타그램";
  if (/FBAN|FBAV/i.test(ua)) return "페이스북";
  if (/Line\//i.test(ua)) return "라인";
  if (/DaumApps/i.test(ua)) return "다음";
  if (/Twitter/i.test(ua)) return "트위터";
  return "앱 내 브라우저";
}

export function isAndroid(ua: string): boolean {
  return /Android/i.test(ua);
}

export function isIOS(ua: string): boolean {
  return /iPhone|iPad|iPod/i.test(ua);
}

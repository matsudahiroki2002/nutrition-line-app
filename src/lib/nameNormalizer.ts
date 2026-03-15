const WHITESPACE_REGEX = /[\p{White_Space}\u3000]+/gu;
const ASCII_VISIBLE_REGEX = /[\u0021-\u007E]/g;

function toFullWidthAscii(value: string): string {
  return value.replace(ASCII_VISIBLE_REGEX, (char) =>
    String.fromCharCode(char.charCodeAt(0) + 0xfee0)
  );
}

export function normalizeJapaneseName(name: string): string {
  // NFKC: half-width kana/ASCII variants -> canonical full-width kana or ASCII.
  const nfkc = name.normalize("NFKC");
  const withoutSpaces = nfkc.replace(WHITESPACE_REGEX, "");
  return toFullWidthAscii(withoutSpaces).normalize("NFC");
}

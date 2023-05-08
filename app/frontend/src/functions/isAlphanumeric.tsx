// the function also allows '-' because 42 logins might have it
export function isAlphanumeric(s: string) {
  let i,
    c,
    len = s.length;

  if (len > 12 || len < 1)
    return false;
  for (i = 0; i < len; i++) {
    c = s.charCodeAt(i);
    if (!(c >= 48 && c <= 57) && !(c >= 65 && c <= 90) && !(c >= 97 && c <= 122) && c != 45)
      return false;
  }
  return true;
}

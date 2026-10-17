import "server-only";

/** Known burner / temporary email domains. Filters these out before saving or sending. */
const DISPOSABLE = new Set([
  "mailinator.com", "tempmail.com", "temp-mail.org", "guerrillamail.com", "guerrillamail.net", "sharklasers.com", "10minutemail.com", "10minutemail.net",
  "throwawaymail.com", "trashmail.com", "trashmail.net", "yopmail.com", "yopmail.net", "maildrop.cc", "getnada.com", "nada.email", "dispostable.com",
  "mailnesia.com", "fakeinbox.com", "mytemp.email", "temp-mail.io", "moakt.com", "mohmal.com", "emailondeck.com", "spam4.me", "grr.la", "tmail.com",
  "tmpmail.org", "tmpmail.net", "mailcatch.com", "inboxkitten.com", "burnermail.io", "33mail.com", "anonbox.net", "maileater.com", "spamgourmet.com",
  "mintemail.com", "tempinbox.com", "tempail.com", "mail-temp.com", "harakirimail.com", "jetable.org", "mailtemp.net", "discard.email", "wegwerfmail.de",
]);

export function isDisposableEmail(email: string) {
  const d = email.toLowerCase().split("@")[1];
  return Boolean(d && DISPOSABLE.has(d));
}

export function dropDisposable(emails: string[]) {
  return emails.filter((e) => !isDisposableEmail(e));
}

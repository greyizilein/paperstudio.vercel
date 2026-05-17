export const ADMIN_EMAIL = "grey.izilein@gmail.com";

export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && email.toLowerCase() === ADMIN_EMAIL;
}

export function getUnlimitedPaperSubscription() {
  return { tier: "phd", word_limit: 999999, words_used: 0, status: "active" };
}

export function getUnlimitedCzarSubscription() {
  return {
    tier: "phd",
    word_limit: 999999,
    words_used: 0,
    bonus_words: 0,
    bonus_used: 0,
    status: "active",
  };
}

/** Clé AsyncStorage : l'utilisateur a choisi « Plus tard » à l'onboarding (évite de reboucler). */
export const onboardingSkippedKey = (userId: string) => `onboardingSkipped:${userId}`;

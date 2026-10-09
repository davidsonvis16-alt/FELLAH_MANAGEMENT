// Demo mode is ON unless DEMO_MODE="false". It enables one-click sign-in and,
// when AUTH_SECRET is not configured, a fixed signing key - acceptable only
// because a demo deployment holds nothing but seeded sample data.
export function isDemoMode(): boolean {
  return process.env.DEMO_MODE !== "false";
}

export const DEMO_AUTH_SECRET = "fellah-public-demo-signing-key-not-for-production";

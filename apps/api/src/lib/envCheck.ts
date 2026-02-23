const REQUIRED = [
  "DATABASE_URL",
  "JWT_SECRET",
];

const OPTIONAL: { key: string; desc: string }[] = [
  { key: "ANTHROPIC_API_KEY", desc: "AI scanner features will be disabled" },
  { key: "LAST_DEPLOYED_AT", desc: "set by deploy script" },
  { key: "TWILIO_ACCOUNT_SID", desc: "SMS features will be disabled" },
  { key: "TWILIO_AUTH_TOKEN", desc: "SMS features will be disabled" },
  { key: "TWILIO_PHONE_NUMBER", desc: "SMS features will be disabled" },
  { key: "GOOGLE_CLIENT_ID", desc: "Google OAuth will be disabled" },
  { key: "GOOGLE_CLIENT_SECRET", desc: "Google OAuth will be disabled" },
  { key: "GOOGLE_REDIRECT_URI", desc: "Google OAuth will be disabled" },
];

export function checkEnv(): void {
  let hasMissing = false;

  for (const key of REQUIRED) {
    if (!process.env[key]) {
      console.error(`FATAL: Missing required env: ${key} — cannot start`);
      hasMissing = true;
    }
  }

  if (hasMissing) {
    throw new Error("Missing required environment variables — see logs above");
  }

  for (const { key, desc } of OPTIONAL) {
    if (!process.env[key]) {
      console.warn(`Missing optional env: ${key} — ${desc}`);
    }
  }
}

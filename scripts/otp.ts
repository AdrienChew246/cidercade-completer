import { exchangeVerificationCode, extractVerificationCode } from "@/hang";

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set in the environment`);
  }
  return value;
}

const jwt = await exchangeVerificationCode(
  requireEnv("PHONE_NUMBER"),
  extractVerificationCode(requireEnv("VERIFICATION_MESSAGE")),
);

// stdout is captured by the workflow, so nothing else may be printed here.
console.log(jwt);

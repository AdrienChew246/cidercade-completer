import { exchangeVerificationCode } from "./auth";

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set in the environment`);
  }
  return value;
}

const jwt = await exchangeVerificationCode(
  requireEnv("PHONE_NUMBER"),
  requireEnv("OTP_CODE"),
);

// stdout is captured by the workflow, so nothing else may be printed here.
console.log(jwt);

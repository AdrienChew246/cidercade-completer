import { postEndUsers } from "./api";

type AuthenticateCodeResponse = {
  jwt: string;
  expires_at: number;
  user_id: string;
  user_wallet_address: string | null;
  program_membership_id: string;
};

export async function sendVerificationCode(phone: string) {
  await postEndUsers("authentication/send-code", {
    phone,
    program_slug: "cidercade",
  });
}

/** Resolves to a fresh Cidercade token. */
export async function exchangeVerificationCode(phone: string, code: string) {
  const { jwt } = await postEndUsers<AuthenticateCodeResponse>(
    "authentication/authenticate-code",
    {
      code,
      phone,
      program_slug: "cidercade",
      contract_chain_id: 137,
    },
  );
  return jwt;
}

/** Accepts the full SMS, e.g. "Your Cidercade verification code is: 123456". */
export function extractVerificationCode(message: string) {
  const code = message.match(/(?:^|\D)(\d{6})(?:\D|$)/)?.[1];
  if (!code) {
    throw new Error("No six digit verification code found in the message");
  }
  return code;
}

import { postEndUsers } from ".";

type AuthenticateCodeResponse = {
  jwt: string;
  expires_at: number;
  user_id: string;
  user_wallet_address: string | null;
  program_membership_id: string;
};

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set in the environment`);
  }
  return value;
}

const { jwt } = await postEndUsers<AuthenticateCodeResponse>(
  "authentication/authenticate-code",
  {
    code: requireEnv("OTP_CODE"),
    phone: requireEnv("PHONE_NUMBER"),
    program_slug: "cidercade",
    contract_chain_id: 137,
  },
);

// stdout is captured by the workflow, so nothing else may be printed here.
console.log(jwt);

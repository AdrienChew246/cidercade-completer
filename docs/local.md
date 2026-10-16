# Local setup

Run cidercade-completer on your own computer with [Bun](https://bun.sh). Most people should use [GitHub Actions](github-actions.md) or [Google Apps Script](apps-script.md) instead.

[Back to README](../README.md)

## Requirements

- [Bun](https://bun.sh)
- A [Cidercade Rewards](https://rewards.cidercade.com) account
- (Optional) A Discord server where you can create a webhook

## Setup

```bash
git clone https://github.com/dylan-dang/cidercade-completer.git
cd cidercade-completer
bun install
```

Create a `.env` file in the project root or set environment variables in your shell. `TOKEN` is your Cidercade token:

```env
TOKEN=your_cidercade_token
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
PHONE_NUMBER=(512) 555-0123
```

### Get your Cidercade token

1. Log in at [rewards.cidercade.com](https://rewards.cidercade.com)
2. Press `F12` (or right-click → **Inspect**) to open developer tools
3. Open the **Console** tab
4. Paste this and press Enter. It finds your Cidercade token and copies its value to the clipboard:

```js
copy(document.cookie.match(/(^| )jwt=([^;]+)/)?.[2]);
```

> Treat your Cidercade token like a password. Anyone who has it can use your Cidercade account until it expires.
>
> Some browsers block pasting into the console the first time. If yours shows a warning, type `allow pasting` and press Enter, then paste again.

`PHONE_NUMBER` is optional. If you set it and the token expires, a local run can text you a verification code. You still need to exchange that code yourself (for example with `bun run otp` after setting `OTP_CODE`).

## Run

```bash
bun start
```

| Command                           | Description                                  |
| --------------------------------- | -------------------------------------------- |
| `bun start`                       | Run all daily tasks                          |
| `bun run otp`                     | Exchange `OTP_CODE` for a Cidercade token    |
| `bun run test:wotd-solver <word>` | Test the Wordle solver against a target word |

## Schedule it

You can set up a cron job (on Unix-like systems) or use Windows Task Scheduler to automate running the script.

For example, with a cron job:

```cron
0 8 * * * cd /path/to/cidercade-completer && bun start
```

On Windows, create a scheduled task to run `bun start` daily at a specific time.

## Storage

Your phone number, Discord webhook URL, and Cidercade token live in the `.env` file (or your shell environment).

The overflowed admission piece count is stored in `.admission-pieces.json` in the project root. If you know your real count, edit the `count` value there. `totalEarned` is the running total and never goes down when you use pieces.

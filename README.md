# Cidercade Completer

Automatically completes your daily [Cidercade Rewards](https://rewards.cidercade.com) tasks and posts a summary to Discord.

Each day it:

1. Solves **Word of the Day**
2. Completes **Candy Blast** levels
3. Opens available **loot boxes**
4. Sends a summary to **Discord** (optional)

![Discord embed summary](https://github.com/user-attachments/assets/652b3e5a-0b09-4434-974d-3fb82cf6fb2a)

---

## Running using GitHub Actions (recommended)

This is the easiest way to setup cidercade completer and you do not need to install anything on your computer. GitHub will run the script for you every day at **9 AM Central** (14:00 UTC).

### What you need

- A free [GitHub](https://github.com) account
- A [Cidercade Rewards](https://rewards.cidercade.com) account
- (Optional) A Discord server where you can create a webhook

### Step 1: Fork this repo

1. On the top right of the repository page click "Fork" or [click here to go to the fork page directly](https://github.com/dylan-dang/cidercade-completer/fork)
2. Keep the defaults and click **Create fork**

You now have your own copy of the project.

### Step 2: Get your Cidercade token

You can skip this if you are going to set up [automatic OTP token refresh](#setting-up-automatic-otp-token-refresh). The token will be created for you the first time you run it.

1. Log in at [rewards.cidercade.com](https://rewards.cidercade.com)
2. Press `F12` (or right-click → **Inspect**) to open developer tools
3. Open the **Console** tab
4. Paste this and press Enter:

```js
copy(document.cookie.match(/(^| )jwt=([^;]+)/)?.[2])
```

1. Your token is now on your clipboard, keep it for the next step

> Tokens last about a month. If runs start failing, grab a fresh one the same way.



### Step 3: Create a Discord webhook

Skip this if you do not want Discord notifications.

1. Open your Discord server
2. Go to **Server Settings** → **Integrations** → **Webhooks**
3. Click **New Webhook**
4. Name it (e.g. `Cidercade`) and choose a channel
5. Click **Save Changes**
6. Click **Copy Webhook URL**

![Webhook settings](https://github.com/user-attachments/assets/bfebc1b2-9e99-4231-aa99-965c3e7354af)

### Step 4: Add secrets to your fork

Secrets store your private values so the script can acccess your Cidercade account.

1. On **your fork**, go to **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret** for each row below:


| Secret name           | What to paste                                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `TOKEN`               | Your Cidercade token from Step 2 (optional with [automatic token refresh](#setting-up-automatic-otp-token-refresh)) |
| `DISCORD_WEBHOOK_URL` | Your Discord webhook URL from Step 3 (optional)                                                                     |




### Step 5: Allow the keep-alive workflow to commit

GitHub turns off scheduled workflows after 60 days of no activity. A small “keep-alive” job prevents that, but it needs write access:

1. On your fork: **Settings** → **Actions** → **General**
2. Under **Workflow permissions** at the bottom of the page, choose **Read and write permissions**
3. Click **Save**

![Workflow permissions](https://github.com/user-attachments/assets/153aedd5-0180-4ded-b3a4-937f088eadc2)

### Step 6: Enable Actions on your fork

GitHub disables workflows on forks by default. You must turn them on once, then enable each workflow individually:

1. Open the **Actions** tab on your fork
2. Click **I understand my workflows, go ahead and enable them**

![Enabling Actions](https://github.com/user-attachments/assets/913c4d02-8dc4-4c83-9db2-e2940c967fb5)

1. In the left sidebar, click **Daily Cidercade**, then click **Enable workflow**
2. Do the same for **Keep GitHub Actions alive**

![Enabling Workflows](https://github.com/user-attachments/assets/af185cb6-eac3-45db-8e5f-e3c7ee84c86f)

### Step 7: Run it once to test

1. Still on the **Actions** tab, select **Daily Cidercade** in the left sidebar
2. Click **Run workflow** → **Run workflow**
3. Wait for the run to finish

If there is a green check, then the script succeeded.
Check Discord for the summary embed (if you set up a webhook).

> If you skipped `TOKEN`, set up [automatic OTP token refresh](#setting-up-automatic-otp-token-refresh) instead of running this step. It walks you through the first run.



### That’s it

After this, **Daily Cidercade** runs automatically every day. You only need to refresh `TOKEN` when it expires (about once a month). To have this done for you, set up [automatic OTP token refresh](#setting-up-automatic-otp-token-refresh) below.

---



## Setting up automatic OTP token refresh

Instead of copying a new token from your browser every month, your phone can refresh it for you using the verification code Cidercade texts you.

Once set up, it works like this with no input from you:

1. **Daily Cidercade** notices your token has expired and texts a verification code to your phone
2. An automation on your phone sees the text and runs the **Authenticate Cidercade** workflow with it
3. The workflow signs in, saves the new token to your `TOKEN` secret, and runs the daily tasks



### What you need

- One of:
  - An iPhone with the [GitHub app](https://apps.apple.com/app/github/id1477376905) installed and signed in
  - An Android phone with [MacroDroid](https://play.google.com/store/apps/details?id=com.arlosoft.macrodroid) installed
- The phone number on your Cidercade account



### Step 1: Create a GitHub personal access token

The workflow needs permission to update your `TOKEN` secret, which the default GitHub Actions token cannot do.

1. Go to [Settings → Developer settings → Fine-grained tokens → Generate new token](https://github.com/settings/personal-access-tokens/new)
2. Fill in:
  - **Token name:** anything, e.g. `cidercade-writer`
  - **Expiration:** your choice, Set it to `No Expiration` to forget about it. When it expires, generate a new one and update the `GH_PAT` secret
  - **Repository access:** **Only select repositories** → your fork of `cidercade-completer`
  - **Permissions** → **Repository permissions** → **Secrets:** **Read and write**, and **Variables:** **Read and write** (used for [admission piece tracking](#tracking-admission-pieces))
  ![{AC19BB1B-D248-4994-AC78-472EBE14C1D1}](https://github.com/user-attachments/assets/ca43fd3e-8ac8-4c46-9560-e2a73ba892d9)
3. Click **Generate token** and copy it. GitHub only shows it once
  ![image](https://github.com/user-attachments/assets/2a3a3d32-ccb1-43af-9d32-ec1876cb38c9)



### Step 2: Add the secrets

On **your fork**, go to **Settings** → **Secrets and variables** → **Actions** and add:


| Secret name    | What to paste                                                     |
| -------------- | ----------------------------------------------------------------- |
| `GH_PAT`       | The personal access token from Step 1                             |
| `PHONE_NUMBER` | The phone number on your Cidercade account, e.g. `(512) 555-0123` |




### Step 3: Create the phone automation

Follow the instructions for your phone.

#### iPhone

You may use this [Shortcut template](https://www.icloud.com/shortcuts/486ac665779d4ad8bf6dfc116fb99bfa) or create a shortcut manually as shown below

1. Open the **Shortcuts** app
2. Tap **+** (or **New Automation**), press edit, and search for Automation "When I recieve a message where"
3. Configure it where "Message" contains text `Your Cidercade verification code is:` and confirm

Add the GitHub **Dispatch Workflow** action and fill in:


| Field        | Value                                                                                              |
| ------------ | -------------------------------------------------------------------------------------------------- |
| Owner        | Your GitHub username (e.g. dylan-dang)                                                             |
| Workflow ID  | `authenticate.yml`                                                                                 |
| Repository   | `cidercade-completer` (your fork)                                                                  |
| Branch / ref | `master`                                                                                           |
| Inputs       | `{"message":"[Message]"}` (where `[Message]` is the variable created from the previous automation) |


It should look something like this:

![image](https://github.com/user-attachments/assets/9d78c641-b660-4676-9571-869529216052)

#### Android

Android has no GitHub app shortcut, so MacroDroid calls the GitHub API directly. It needs its own token that can only start workflows.

1. Create a second [fine-grained token](https://github.com/settings/personal-access-tokens/new) the same way as [Step 1](#step-1-create-a-github-personal-access-token), except:
  - **Token name:** e.g. `cidercade-phone`
  - **Permissions** → **Repository permissions** → **Actions:** **Read and write** (no Secrets access)
2. Open **MacroDroid** and tap **Add Macro**
3. Under **Triggers**, tap **+**, search for **SMS Received** and set:
  - **Incoming from:** Any number
  - **Message content:** Contains `Your Cidercade verification code is:`
4. Under **Actions**, tap **+**, search for **HTTP Request** and fill in:

  | Field        | Value                                                                                                            |
  | ------------ | ---------------------------------------------------------------------------------------------------------------- |
  | Method       | `POST`                                                                                                           |
  | URL          | `https://api.github.com/repos/<your-username>/cidercade-completer/actions/workflows/authenticate.yml/dispatches` |
  | Headers      | `Authorization`: `Bearer <token from step 1>` `Accept`: `application/vnd.github+json`                            |
  | Content type | `application/json`                                                                                               |
  | Body         | `{"ref": "master", "inputs": {"message": "[sms_message]"}}`                                                      |

   `[sms_message]` is MacroDroid's placeholder for the text of the SMS. You can insert it from the **...** menu next to the body field.
5. Name the macro (e.g. `Cidercade OTP`) and save it



### Step 4: Get your first token

If you skipped `TOKEN` earlier, run **Daily Cidercade** once (**Actions** tab → **Daily Cidercade** → **Run workflow**). It posts **Token Missing** to Discord and texts you a verification code. This run is marked as failed, which is expected.

Your phone automation picks up the text and runs **Authenticate Cidercade**. When that run has a green check in the **Actions** tab, your `TOKEN` secret is set and today's tasks are done.

If you already added `TOKEN`, there is nothing to do. The automation will take over the next time your token expires.

> Prefer not to use a phone automation? When you get the verification text, open **Actions** → **Authenticate Cidercade** → **Run workflow**, paste the text, and click **Run workflow**. Verification codes expire, so do this soon after the text arrives.

---



## Free admission puzzles

Free admission puzzles are **not** claimed automatically when they are completed the way they are when you obtain them normally. You can claim them at your discretion, so you do not have to worry about free admission expiration — just remember to tap **Claim now** for the puzzle in the app when you want to use them.

![Claiming puzzle pieces](https://github.com/user-attachments/assets/df6cbe53-75ee-4ec7-9878-e502973d9699)

Cidercade does not show overflowed puzzle pieces in their app or website. Therefore, you can only know how many you have by counting them manually, redeeming, or letting cidercade-completer track them for you.

### Tracking admission pieces

cidercade-completer can help count overflowed puzzle pieces. Each run adds the admission pieces it earned and subtracts any you used since the last run (from your Cidercade activity history). The loot box summary in Discord then shows something like:

> You have **9** admission puzzle pieces (**2** admissions)
> **25** pieces earned in total since tracking started

Tracking is off unless you turn it on. Without `GH_PAT`, the count line is left out of the summary. To turn it on, add a `GH_PAT` secret with **Variables: Read and write** permission (see [Step 1 of automatic OTP token refresh](#step-1-create-a-github-personal-access-token)). The count is stored in a repository variable called `ADMISSION_PIECES`, under **Settings** → **Secrets and variables** → **Actions** → **Variables**. If you know your real count, you can edit the `count` value there. `totalEarned` is the running total and never goes down when you use pieces.

When running locally, the count is stored in `.admission-pieces.json` instead.

---



## Troubleshooting


| Problem                                  | What to try                                                                                                                            |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Auth / 401 errors                        | Refresh your `TOKEN` secret with a new value from the browser, or run **Authenticate Cidercade** if you set up automatic token refresh |
| Authenticate fails saving the secret     | Check that `GH_PAT` is set, has **Secrets: Read and write**, and has not expired                                                       |
| "Could not update admission piece count" | Check that `GH_PAT` is set and has **Variables: Read and write**                                                                       |
| No Discord message                       | Confirm `DISCORD_WEBHOOK_URL` is set, or check the Actions log                                                                         |
| Scheduled runs stopped after ~2 months   | Confirm **Read and write permissions** (Step 5) so keep-alive can work                                                                 |


> Free-tier scheduled workflows can be a few minutes late. That is normal.

---



## Running locally



### Requirements

- [Bun](https://bun.sh)
- A [Cidercade Rewards](https://rewards.cidercade.com) account
- (Optional) A Discord server where you can create a webhook



### Setup

```bash
git clone https://github.com/dylan-dang/cidercade-completer.git
cd cidercade-clent
bun install
```

Create a `.env` file in the project root or set up environment variables from within your shell:

```env
TOKEN=your_api_token
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

Then run:

```bash
bun start
```


| Command                           | Description                                  |
| --------------------------------- | -------------------------------------------- |
| `bun start`                       | Run all daily tasks                          |
| `bun run test:wotd-solver <word>` | Test the Wordle solver against a target word |


From there, you can set up a cron job (on Unix-like systems) or use Windows Task Scheduler to automate running the script at your preferred intervals.

For example, with a cron job you might add:

```cron
0 8 * * * cd /path/to/cidercade-completer && bun start
```

Or on Windows, you can create a scheduled task to run `bun start` daily at a specific time.

---



## Disclaimer

This is an unofficial automation tool. Use at your own risk and in line with Cidercade's terms of service.
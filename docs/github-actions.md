# GitHub Actions setup

GitHub runs cidercade-completer for you every day. You do not need to install anything on your computer.

> As of 2026, free-tier scheduled GitHub Actions often start hours late, and there is a small chance a day’s run is skipped entirely. If you need the daily tasks to run close to on time, prefer [Google Apps Script](apps-script.md) or [local](local.md). To stay on Actions with more reliable timing, add a [self-hosted runner](https://docs.github.com/en/actions/hosting-your-own-runners/managing-self-hosted-runners/about-self-hosted-runners) or use a third-party runner provider.

[Back to README](../README.md)

## What you need

- A free [GitHub](https://github.com) account
- A [Cidercade Rewards](https://rewards.cidercade.com) account and the phone number you sign in with
- One of:
  - An iPhone with the [GitHub app](https://apps.apple.com/app/github/id1477376905) installed and signed in
  - An Android phone with [MacroDroid](https://play.google.com/store/apps/details?id=com.arlosoft.macrodroid) installed
  - If you don't want to set up phone automation, you can manually refresh your Cidercade token monthly by [entering your token manually](#entering-your-token-manually-not-recommended) (not recommended)
- (Optional) A Discord server where you can create a webhook

## Step 1: Fork this repo

1. On the top right of the repository page click "Fork" or [click here to go to the fork page directly](https://github.com/dylan-dang/cidercade-completer/fork)
2. Keep the defaults, choosing an owner if necessary, and click **Create fork**

You now have your own copy of the project. Proceed by using this guide on your fork so that links to your fork settings will work properly.

## Step 2: Create a Discord webhook

Skip this if you do not want Discord notifications.

1. Open your Discord server
2. Go to **Server Settings** → **Integrations** → **Webhooks**
3. Click **New Webhook**
4. Name it (e.g. `Cidercade`) and choose a channel
5. Click **Save Changes**
6. Click **Copy Webhook URL**

![Webhook settings](https://github.com/user-attachments/assets/bfebc1b2-9e99-4231-aa99-965c3e7354af)

## Step 3: Create a GitHub personal access token

This lets cidercade-completer update its secrets and variables.

1. Go to [Settings → Developer settings → Fine-grained tokens → Generate new token](https://github.com/settings/personal-access-tokens/new)
2. Fill in:

- **Token name:** anything, e.g. `cidercade-writer`
- **Expiration:** `No Expiration`
- **Repository access:** **Only select repositories** → your fork of `cidercade-completer`
- **Permissions** → **Repository permissions** → **Secrets:** **Read and write**, and **Variables:** **Read and write**
  <img width="794" height="909" alt="{222EB255-A47C-42E0-BD9B-AF2F257C630A}" src="https://github.com/user-attachments/assets/36a2d010-29e1-4802-88cd-05772d6ad1ea" />

3. Click **Generate token** and copy it. GitHub only shows it once
   ![{41D6FC52-D2F9-4B2B-AD9B-EF4D63B5AFFB}](https://github.com/user-attachments/assets/17eb710f-5ee7-4ca5-8b5c-5fd024a63455)

## Step 4: Add secrets to your fork

Secrets store your private values so the script can access your Cidercade account.

1. On **your fork**, go to [**Settings** → **Secrets and variables** → **Actions**](../../../settings/secrets/actions)
2. Click **New repository secret** for each row below:

| Secret name           | What to paste                                                               |
| --------------------- | --------------------------------------------------------------------------- |
| `GH_PAT`              | The personal access token from Step 3                                       |
| `PHONE_NUMBER`        | Your Cidercade account phone number, **formatted such as** `(512) 555-0123` |
| `DISCORD_WEBHOOK_URL` | Your Discord webhook URL from Step 2 (optional)                             |

## Step 5: Allow the daily workflow to commit

GitHub turns off scheduled workflows after 60 days of no activity. **Daily Cidercade** includes a small keep-alive step that commits so that does not happen, but it needs write access:

1. On your fork: [**Settings** → **Actions** → **General**](../../../settings/actions)
2. Under **Workflow permissions** at the bottom of the page, choose **Read and write permissions**
3. Click **Save**

![Workflow permissions](https://github.com/user-attachments/assets/153aedd5-0180-4ded-b3a4-937f088eadc2)

## Step 6: Enable Actions on your fork

GitHub disables workflows on forks by default. You must turn them on once, then enable each workflow individually:

1. Open the [**Actions**](../../../actions) tab on your fork
2. Click **I understand my workflows, go ahead and enable them**

![Enabling Actions](https://github.com/user-attachments/assets/913c4d02-8dc4-4c83-9db2-e2940c967fb5)

3. In the left sidebar, click [**Daily Cidercade**](../../../actions/workflows/daily.yml), then click **Enable workflow**

![Enabling Workflows](https://github.com/user-attachments/assets/af185cb6-eac3-45db-8e5f-e3c7ee84c86f)

4. Optional: enable [**Auto update**](../../../actions/workflows/auto-update.yml) the same way if you would like to receive automatic updates to sync to upstream weekly.

## Step 7: Create the phone automation

Open the instructions for your phone:

<details>
<summary>iOS 27 and later:</summary>

You may work off this [Shortcut template](https://www.icloud.com/shortcuts/64d997bbe64540f39e0ce45f77e5cfd4), replacing dylan-dang with your own username, or create it manually:

1. Open the **Shortcuts** app
2. Tap **+** at the bottom of your screen
3. Tap **Edit** at the top right of your screen
4. Tap **Automation**, then **Message**. The trigger is added as a block at the top of the shortcut
5. On that block, tap `Sender`, replace it with `Message`, and set it to contain:
   ```plaintext
   Your Cidercade verification code is:
   ```
   > Confirm that **Confirm Before Run** is off and **Automation** is on by tapping on the arrow on top of the block
6. Add the GitHub **Dispatch Workflow** action and fill in:

| Field        | Value                                                                                                                                                                  |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Owner        | Your GitHub username (e.g. dylan-dang, or owner you set when [creating the fork](#step-1-fork-this-repo))                                                              |
| Workflow ID  | `authenticate.yml`                                                                                                                                                     |
| Repository   | `cidercade-completer` (or your fork name when [creating the fork](#step-1-fork-this-repo))                                                                             |
| Branch / ref | `master`                                                                                                                                                               |
| Inputs       | `{"message":"[Message]"}` (for `[Message]` press "Select Variable" when focused on the Inputs field and press the `Message` output from the previous block from above) |
| Account      | Select your GitHub account                                                                                                                                             |

It should look something like this:

<img width="302" height="460" alt="image" src="https://github.com/user-attachments/assets/e76be96d-cf6f-4a1b-ab89-b639f21b8af4" />

</details>

<details>
<summary>iOS 26 and earlier:</summary>

1. Open the **Shortcuts** app
2. Tap the **Automation** tab, then **+** (or **New Automation**)
3. Search for **Message** and select **When I receive a message**
4. Set **Message Contains** to:
   ```plaintext
   Your Cidercade verification code is:
   ```
5. choose **Run Immediately**, and confirm
6. Add the GitHub **Dispatch Workflow** action and fill in:

| Field        | Value                                                                                                              |
| ------------ | ------------------------------------------------------------------------------------------------------------------ |
| Owner        | Your GitHub username (e.g. dylan-dang, or owner you set when [creating the fork](#step-1-fork-this-repo))          |
| Workflow ID  | `authenticate.yml`                                                                                                 |
| Repository   | `cidercade-completer` (or your fork name when [creating the fork](#step-1-fork-this-repo))                         |
| Branch / ref | `master`                                                                                                           |
| Inputs       | `{"message":"[Shortcut Input]"}` (for `[Shortcut Input]` press "Select Variable" when focused on the Inputs field) |
| Account      | Select your GitHub account                                                                                         |

It should look something like this:

<img width="302" height="339" alt="image" src="https://github.com/user-attachments/assets/26c75416-fc0d-4456-a4fd-226924441f42" />

</details>

<details>
<summary>Android:</summary>

Android has no GitHub app shortcut, so MacroDroid calls the GitHub API directly. It needs its own token that can only start workflows.

1. Create a second [fine-grained token](https://github.com/settings/personal-access-tokens/new) the same way as [Step 3](#step-3-create-a-github-personal-access-token), except:

- **Token name:** e.g. `cidercade-phone`
- **Permissions** → **Repository permissions** → **Actions:** **Read and write**

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

</details>

> Prefer not to use a phone automation? When you get the verification text, open [**Actions** → **Authenticate Cidercade**](../../../actions/workflows/authenticate.yml) → **Run workflow**, paste the text, and click **Run workflow**. Verification codes expire, so do this soon after the text arrives.

## Step 8: Run it for the first time

1. On the [**Actions**](../../../actions) tab, select [**Daily Cidercade**](../../../actions/workflows/daily.yml) in the left sidebar
2. Click **Run workflow** → **Run workflow**

Since there is no token yet, this run posts **Token Missing** to Discord, texts you a verification code, and is marked as failed. That is expected.

Your phone automation picks up the text and runs **Authenticate Cidercade**. When that run has a green check in the [**Actions**](../../../actions) tab, your token is saved and today's tasks are done. Check Discord for the summary embed (if you set up a webhook).

## That’s it

**Daily Cidercade** now runs automatically every day. When your Cidercade token expires (about once a month), your phone will run **Authenticate Cidercade**.

---

## Entering your token manually (Not recommended)

If you do not want to set up a phone automation, you can supply a Cidercade token yourself manually. However it will expire about once a month, so you will need to repeat this each time it does or else cidercade-completer will encounter authentication errors.

> Treat your Cidercade token like a password. Anyone who has it can use your Cidercade account until it expires, so only paste it into your [fork's secrets](../../../settings/secrets/actions).

Follow Steps 1, 2, 5 and 6 above, then:

### Get your Cidercade token

1. Log in at [rewards.cidercade.com](https://rewards.cidercade.com)
2. Press `F12` (or right-click → **Inspect**) to open developer tools
3. Open the **Console** tab
4. Paste this and press Enter. It finds your Cidercade token and copies its value to the clipboard:

```js
copy(document.cookie.match(/(^| )jwt=([^;]+)/)?.[2]);
```

> Some browsers block pasting into the console the first time. If yours shows a warning, type `allow pasting` and press Enter, then paste again.

### Add it as a secret

On **your fork**, go to [**Settings** → **Secrets and variables** → **Actions**](../../../settings/secrets/actions) and add a repository secret named `TOKEN` with your token as the value.

### Run it once to test

1. On the [**Actions**](../../../actions) tab, select [**Daily Cidercade**](../../../actions/workflows/daily.yml) in the left sidebar
2. Click **Run workflow** → **Run workflow**
3. Wait for the run to finish

If there is a green check, the script succeeded and will now run every day. When runs start failing with auth errors, get a fresh token the same way and update the `TOKEN` secret.

---

## Storage

Your phone number, Discord webhook URL, and Cidercade token live as repository secrets under [**Settings** → **Secrets and variables** → **Actions**](../../../settings/secrets/actions).

The overflowed admission piece count is a repository variable called `ADMISSION_PIECES`, under [**Variables**](../../../settings/variables/actions). That needs `GH_PAT` with **Variables: Read and write**. Without it, the count line is left out of the Discord summary. If you know your real count, edit the `count` value there. `totalEarned` is the running total and never goes down when you use pieces.

---

## Troubleshooting

| Problem                                                          | What to try                                                                                                                                                                          |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Auth / 401 errors                                                | Check that your phone automation ran **Authenticate Cidercade** after the verification text. If you enter your token manually, replace `TOKEN` with a fresh one from the browser     |
| No verification text after **Token Missing** / **Token Expired** | Check that `PHONE_NUMBER` matches the number on your Cidercade account                                                                                                               |
| Authenticate fails saving the secret                             | Check that `GH_PAT` is set, has **Secrets: Read and write**, and has not expired                                                                                                     |
| "Could not update admission piece count"                         | Check that `GH_PAT` is set and has **Variables: Read and write**                                                                                                                     |
| No Discord message                                               | Confirm `DISCORD_WEBHOOK_URL` is set, or check the [Actions log](../../../actions)                                                                                                   |
| Scheduled runs stopped after ~2 months                           | Confirm [**Read and write permissions**](../../../settings/actions) (Step 5) so the daily workflow's keep-alive step can commit                                                      |
| Scheduled run hours late or missing                              | Common on free-tier Actions as of 2026. Re-run **Daily Cidercade** manually, add a self-hosted or third-party runner, or switch to [Apps Script](apps-script.md) / [local](local.md) |

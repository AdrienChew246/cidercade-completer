# Google Apps Script setup

Runs cidercade-completer from a Google Doc with a bound Apps Script. This is the easiest method to setting up Cidercade Completer.

[Back to README](../README.md)

## What you need

- A free [Google](https://accounts.google.com) account
- A [Cidercade Rewards](https://rewards.cidercade.com) account and the phone number you sign in with
- One of:
  - An iPhone with the **Shortcuts** app
  - An Android phone with [MacroDroid](https://play.google.com/store/apps/details?id=com.arlosoft.macrodroid) (or another HTTP automation app)
- (Optional) A Discord server where you can create a webhook



## Step 1: Copy the document

1. Open the [Cidercade Completer document copy page](https://docs.google.com/document/d/1uh-Hst3CkF594n6qLMcT97CNUQiYLpTkLrPIZWhKByc/copy)
2. Click **Make a copy** and keep the copy in your Google Drive

The bound Apps Script will copied with the document.

<img width="664" height="336" alt="{2413382E-03BE-4A75-88D2-298E92D5ADAC}" src="https://github.com/user-attachments/assets/f8f88641-ebf0-48d0-a2a2-a94ddb00fe64" />

## Step 2: Create a Discord webhook

Skip this if you do not want Discord notifications.

1. Open your Discord server
2. Go to **Server Settings** → **Integrations** → **Webhooks**
3. Click **New Webhook**
4. Name it (e.g. `Cidercade`) and choose a channel
5. Click **Save Changes**
6. Click **Copy Webhook URL**

![Webhook settings](https://github.com/user-attachments/assets/bfebc1b2-9e99-4231-aa99-965c3e7354af)

## Step 3: Open Set up

1. Open **your copy** of the document in [Google Docs](https://docs.google.com/document/)
2. In the top navigation bar, click **Cidercade Completer** → **Set up**, Refresh the page if this it hasn't shown up
3. Accept the warning "Google hasn't verified this app" by clicking <ins>Advanced</ins> and then <ins>Go to Cidercade Completer (unsafe)</ins>
    <img width="500" height="356" alt="image" src="https://github.com/user-attachments/assets/1edd77fb-0ad9-43fd-93cb-d3fd805981e0" />
4. Approve the Google permission prompts the first time (documents, forms, triggers, and external requests)
    <img width="387" height="726" alt="image" src="https://github.com/user-attachments/assets/80180925-6273-4179-814a-e3e7ab7bc7b8" />

## Step 4: Save your phone number

In the setup dialog:

1. Enter the phone number on your Cidercade account, e.g. `(512) 555-0123` (use `+` for a country code outside the US)
2. Paste your Discord webhook URL if you created one
3. Click **Save and schedule**

Setup schedules daily runs around midnight, and creates (or reuses) a verification Form with a form-submit trigger. A submission URL will be shown. Copy it. Your phone automation will use it to submit its verification SMS to it.

<img width="510" height="449" alt="image" src="https://github.com/user-attachments/assets/7c48d937-0a02-4a82-8d2e-08a5c20385db" />


## Step 5: Create the phone automation

Open the instructions for your phone:

<details>
<summary>iOS 27 and later:</summary>

1. Open the **Shortcuts** app
2. Tap **+** at the bottom of your screen
3. Tap **Edit** at the top right of your screen
4. Tap **Automation**, then **Message**. The trigger is added as a block at the top of the shortcut
5. On that block, tap `Sender`, replace it with `Message`, and set it to contain:
   ```plaintext
   Your Cidercade verification code is:
   ```
   > Confirm that **Confirm Before Run** is off and **Automation** is on by tapping on the arrow on top of the block
6. Add **URL Encode** and set its text to the **Message** variable from the automation block
7. Add **Get Contents of URL**. For the URL, use the Shortcut URL from setup, then append the **URL Encode** result. The Shortcut URL already ends with `entry…=`, so the encoded SMS becomes the field value

It should look something like this:

<img width="398" height="567" alt="image" src="https://github.com/user-attachments/assets/7911b126-0afc-44d4-9e51-5f4e2118926a" />

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
5. Choose **Run Immediately**, and confirm
6. Add **URL Encode** with **Shortcut Input** as the text
7. Add **Get Contents of URL**. For the URL, use the Shortcut URL from setup, then append the **URL Encode** result

</details>

<details>
<summary>Android:</summary>

1. Open **MacroDroid** and tap **Add Macro**
2. Under **Triggers**, tap **+**, search for **SMS Received** and set:

- **Incoming from:** Any number
- **Message content:** Contains `Your Cidercade verification code is:`

3. Under **Actions**, tap **+**, search for **HTTP Request** and fill in:

| Field  | Value                                                     |
| ------ | --------------------------------------------------------- |
| Method | `GET`                                                     |
| URL    | `<Shortcut URL from setup>` + URL-encoded `[sms_message]` |

`[sms_message]` is MacroDroid's placeholder for the text of the SMS. The Shortcut URL already ends with `entry…=`, so append only the encoded message. MacroDroid can URL-encode from the **...** menu next to the URL field.

4. Name the macro (e.g. `Cidercade OTP`) and save it

</details>

> Prefer not to use a phone automation? When you get the verification text, open the **Cidercade Completer** form in your Google Drive, paste the SMS into **Verification SMS**, and submit. Verification codes expire, so do this soon after the text arrives.



## Step 6: Run it for the first time

1. In the document, click **Cidercade Completer** → **Run daily tasks**

Since there is no token yet, this run posts **Token Missing** to Discord (if you set a webhook), texts you a verification code, and stops. That is expected.

Your phone automation picks up the text and submits it to the verification form. The form trigger exchanges the code, saves the token, and runs today's tasks. Check Discord for the summary embed (if you set up a webhook).

## That’s it

Daily tasks now run automatically every day around midnight. When your Cidercade token expires (about once a month), the same verification flow runs again on its own.

---



## Storage

Your phone number, Discord webhook URL, Cidercade token, admission piece count, and verification form ID are stored as script properties on the bound Apps Script project (**Extensions** → **Apps Script** → **Project Settings** → **Script properties**).

The admission piece property is named `ADMISSION_PIECES`. If you know your real count, edit the `count` value there. `totalEarned` is the running total and never goes down when you use pieces.

---



## Troubleshooting


| Problem                                                          | What to try                                                                                           |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Auth / 401 errors                                                | Check that your phone automation submitted the verification SMS to the form after the text arrived    |
| No verification text after **Token Missing** / **Token Expired** | Check that the phone number in **Set up** matches the number on your Cidercade account                |
| Form submission does nothing                                     | Re-run **Cidercade Completer** → **Set up** so the form-submit trigger is installed                   |
| Deleted or missing verification form                             | Re-run **Set up**. It creates a new form and Shortcut URL; update your phone automation with that URL |
| No Discord message                                               | Confirm the webhook URL in **Set up**, or check **Executions** under the Apps Script project          |
| Menu missing                                                     | Refresh the document. The **Cidercade Completer** menu appears after `onOpen` runs                    |
| Stuck on an old version                                          | Confirm a [GitHub release](https://github.com/dylan-dang/cidercade-completer/releases) exists with asset `cidercade-apps-script.js`, then run **Run daily tasks** and check Apps Script **Executions** for a “Loaded … from GitHub” log |


---



## Updating

Menu actions, daily runs, and form verification **auto-update** from the latest [GitHub release](https://github.com/dylan-dang/cidercade-completer/releases) when that release is newer than the copy embedded in your Doc. If GitHub is unreachable or there is no newer release, the embedded bundle runs instead.

`onOpen` (the menu) always uses the embedded bundle so the document stays fast to open.

You only need a fresh [template copy](https://docs.google.com/document/d/1uh-Hst3CkF594n6qLMcT97CNUQiYLpTkLrPIZWhKByc/copy) or a clasp push when the loader itself changes—or if you want a newer embedded fallback offline.

---



## Build your own with clasp

Most people should [copy the template document](#step-1-copy-the-document). Use this if you want to deploy from this repo yourself.

1. Install [Bun](https://bun.sh), clone this repo, and run `bun install`
2. Create a blank [Google Doc](https://docs.google.com/document/) and copy its ID from the URL (`docs.google.com/document/d/<docId>/edit`)
3. Log in and create a script bound to that document:

```bash
bunx clasp login
bunx clasp create --type docs --title "Cidercade Completer" --parentId <docId>
```

1. Point `.clasp.json` at the new script. Keep `"rootDir": "dist/apps-script"` (or `dist\\apps-script` on Windows) and set `scriptId` / `parentId` to the values clasp printed
2. Push the bundle:

```bash
bun run gs:push
```

1. Open the document, then continue from [Step 3: Open Set up](#step-3-open-set-up)

Later, run `bun run gs:push` again to refresh the embedded fallback and loader. Day-to-day fixes still arrive from [GitHub releases](https://github.com/dylan-dang/cidercade-completer/releases) without a push. The first **Set up** run creates the verification Form automatically.

To publish an Apps Script update for everyone: bump `version` in `package.json` and merge to `master`. The **Release Apps Script** workflow tags `v<version>`, creates the GitHub release, and attaches `cidercade-apps-script.js`. You can also run that workflow manually from the Actions tab.

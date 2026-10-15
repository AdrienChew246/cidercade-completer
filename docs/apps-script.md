# Google Apps Script setup

Runs cidercade-completer on a Google Form with a bound Apps Script. No GitHub fork, personal access token, or Actions minutes. Setup happens in a dialog on the form, and your phone posts verification texts to a form URL.

[Back to README](../README.md)

## What you need

- A free [Google](https://accounts.google.com) account
- A [Cidercade Rewards](https://rewards.cidercade.com) account and the phone number you sign in with
- One of:
  - An iPhone with the **Shortcuts** app
  - An Android phone with [MacroDroid](https://play.google.com/store/apps/details?id=com.arlosoft.macrodroid) (or another HTTP automation app)
- (Optional) A Discord server where you can create a webhook



## Step 1: Copy the form

1. Open the [Cidercade Completer form](https://docs.google.com/forms/d/1256fPxpAwvN5h3d951TjTCA1vnohQqgr9CnleQkpvnc/copy)
2. Click **Make a copy** and keep the copy in your Google Drive

The bound Apps Script is copied with the form.

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

1. Open **your copy** of the form in the [Google Forms editor](https://docs.google.com/forms/)
2. Refresh the page if you do not see a **Cidercade Completer** menu yet
3. Click **Cidercade Completer** → **Set up**
4. Approve the Google permission prompts the first time (forms, triggers, and external requests)



## Step 4: Save your phone number

In the setup dialog:

1. Enter the phone number on your Cidercade account, e.g. `(512) 555-0123` (use `+` and the country code outside the US)
2. Paste your Discord webhook URL if you created one
3. Click **Save and schedule**

Setup schedules daily runs around midnight, wires the form to accept verification texts, and shows a **Shortcut URL**. Copy that URL. Your phone automation will append the verification SMS to it.

## Step 5: Create the phone automation

The automation runs when a text contains `Your Cidercade verification code is:`, URL-encodes the full SMS, and requests the Shortcut URL with that text appended.

iOS 27 and later:

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



iOS 26 and earlier:

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



Android:

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

1. Name the macro (e.g. `Cidercade OTP`) and save it



> Prefer not to use a phone automation? When you get the verification text, open the live form, paste the SMS into **Verification SMS**, and submit. Verification codes expire, so do this soon after the text arrives.



## Step 6: Run it for the first time

1. In the form editor, click **Cidercade Completer** → **Run daily tasks**

Since there is no token yet, this run posts **Token Missing** to Discord (if you set a webhook), texts you a verification code, and stops. That is expected.

Your phone automation picks up the text and submits it to the form. The form trigger exchanges the code, saves the token, and runs today's tasks. Check Discord for the summary embed (if you set up a webhook).

## That’s it

Daily tasks now run automatically every day around midnight. When your Cidercade token expires (about once a month), the same verification flow runs again on its own.

---



## Troubleshooting


| Problem                                                          | What to try                                                                                        |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Auth / 401 errors                                                | Check that your phone automation submitted the verification SMS to the form after the text arrived |
| No verification text after **Token Missing** / **Token Expired** | Check that the phone number in **Set up** matches the number on your Cidercade account             |
| Form submission does nothing                                     | Re-run **Cidercade Completer** → **Set up** so the form-submit trigger is installed                |
| No Discord message                                               | Confirm the webhook URL in **Set up**, or check **Executions** under the Apps Script project       |
| Menu missing                                                     | Refresh the form editor. The **Cidercade Completer** menu appears after `onOpen` runs              |


---



## Updating

This path does not auto-sync from GitHub. When the project ships fixes, make a fresh copy of the [template form](https://docs.google.com/forms/d/1256fPxpAwvN5h3d951TjTCA1vnohQqgr9CnleQkpvnc/copy) or ask the maintainer how to push an update into your existing script.
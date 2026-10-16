# Cidercade Completer

Automatically completes your daily [Cidercade Rewards](https://rewards.cidercade.com) tasks and posts a summary to Discord.

Each day it:

1. Solves **Word of the Day**
2. Completes **Candy Blast** levels
3. Opens available **loot boxes**
4. Sends a summary to **Discord** (optional)

![discord embed summary](https://github.com/user-attachments/assets/639039da-4d0b-4837-a20a-b9e3af8db3df)

---

## Pick a setup

| Method                 | Best when                                                           | Guide                                            |
| ---------------------- | ------------------------------------------------------------------- | ------------------------------------------------ |
| **Google Apps Script** | You want a Google Doc with a setup dialog; auto-updates from GitHub releases | [docs/apps-script.md](docs/apps-script.md)       |
| **GitHub Actions**     | You want a fork that runs itself and can auto-update from this repo | [docs/github-actions.md](docs/github-actions.md) |
| **Local**              | You want to run it on your own computer or service                  | [docs/local.md](docs/local.md)                   |

---

## Tracking admission puzzles

Free admission puzzles are **not** claimed automatically when they are completed the way they are when you obtain them normally. You can claim them at your discretion, so you do not have to worry about free admission expiration — just remember to tap **Claim now** for the puzzle in the app when you want to use them.

![Claiming puzzle pieces](https://github.com/user-attachments/assets/df6cbe53-75ee-4ec7-9878-e502973d9699)

Cidercade does not show overflowed admission puzzle pieces in their app or website, so cidercade-completer helps you count overflowed puzzle pieces.
Each run will add to a running total of admission pieces earned and subtracts any you used since the last run (from your Cidercade activity history) and log it in your discord embed summaries.

On your first run, cidercade-completer will seed your starting amount of incomplete pieces. However, it won't be able to see any overflowed pieces earned before tracking started, so you may need to update the count if you already had overflowed pieces (e.g. by running an older version of cidercade-completer before piece counting was implemented). Additionally, cidercade-completer will not be able see any pieces not earned by cidercade-completer, so please update your count if that occurs.

Where the count is stored depends on how you run it; see the setup guide you followed.

---

## Disclaimer

This is an unofficial automation tool. Use at your own risk and in line with Cidercade's terms of service.

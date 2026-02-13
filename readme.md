# GitMark

> Bookmark links in a git repo.

A Chrome extension that bookmarks any webpage to a GitHub repo. Press a shortcut, edit the title and description, and it gets committed as markdown organized by date.

## Install

1. Download or clone this repo
2. Open `chrome://extensions` in Chrome
3. Enable **Developer mode** (top right)
4. Click **Load unpacked** and select this folder

## Setup

1. Create a GitHub repo for your bookmarks (e.g. `likes`)
2. Add a file like `README.md` to it — this is where links get saved
3. Generate a token (see below)
4. Right-click the extension icon > **Options** and fill in your details

### Token setup

**Fine-grained token (recommended)** — scoped to one repo, minimal permissions:

1. Go to [Settings > Developer Settings > Personal Access Tokens > Fine-grained tokens](https://github.com/settings/personal-access-tokens)
2. Click **Generate new token**
3. Name it `gitmark`, set expiration
4. **Repository access** → Only select repositories → pick your bookmarks repo
5. **Permissions** → Repository permissions → search **Contents** → set to **Read and write**
6. Generate and paste into GitMark options

**Classic token** — broader access, simpler setup:

1. Go to [Settings > Developer Settings > Personal Access Tokens > Tokens (classic)](https://github.com/settings/tokens/new)
2. Name it `gitmark`, set expiration
3. Check the **repo** scope
4. Generate and paste into GitMark options

## Usage

- Press `Cmd+Shift+G` (Mac) or `Ctrl+Shift+G` (Windows/Linux)
- A popup appears with the page title, description, and URL pre-filled
- Edit if needed, then click **Save** (or `Cmd+Enter`)
- Pick a custom date to file the link under a different day
- Press `Escape` or click outside to close

You can also click the extension icon to toggle the popup.

## Format

Links are saved as markdown, organized by date (newest first):

```md
### February 13, 2026
- [Page Title](https://example.com) — Description

### February 12, 2026
- [Another Page](https://example.com/other) — Another description
```

## License

MIT &copy; [Ahmad Awais](https://github.com/ahmadawais)

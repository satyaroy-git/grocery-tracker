---
inclusion: always
---

# Testing Workflow Preference

The user tests this app via Expo Go on a physical device, pulling code by
downloading a zip archive from GitHub rather than using a persistent git
clone.

**Rule: After making any code change and pushing it to the remote branch,
always provide the curl command to download and test the latest change.**

Standard format (replace branch name if different from `feature/invoice-parsing`):

```bash
curl -L https://github.com/satyaroy-git/grocery-tracker/archive/refs/heads/<branch-name>.zip -o grocery-tracker.zip
unzip grocery-tracker.zip
cd grocery-tracker-<branch-name-with-dashes-instead-of-slashes>
npm install
npx expo start -c
```

Notes:
- GitHub replaces `/` in branch names with `-` in the extracted folder name
  (e.g. `feature/invoice-parsing` → `grocery-tracker-feature-invoice-parsing`).
- Always use `-c` on `expo start` after dependency changes to clear the
  Metro cache.
- If only providing the command once per session isn't enough, repeat it
  after every subsequent push in the same conversation.

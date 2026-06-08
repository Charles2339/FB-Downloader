# FBDL — Deployment Guide
## GitHub → Cloudflare Pages + Workers

---

## How it works

```
GitHub repo (your code)
    │
    ├── index.html  ──→  Cloudflare Pages  (your website, auto-deploys on push)
    │
    └── worker.js   ──→  Cloudflare Worker (your backend, deployed once via terminal)
```

Every time you push a change to GitHub, Cloudflare Pages rebuilds your site automatically.
The Worker is separate — you only redeploy it when `worker.js` changes.

---

## Your files

| File | What it does |
|---|---|
| `worker.js` | Backend. Runs on Cloudflare's servers, fetches Facebook server-side, extracts video links. |
| `index.html` | Frontend. Your website, hosted on Cloudflare Pages. |
| `wrangler.toml` | Config that tells Cloudflare your Worker's name. |

---

## Prerequisites (one-time setup)

> **On Android phone?** Skip to the [Termux setup](#termux-android-phone-setup) section below first, then come back here.

### 1. Create a free Cloudflare account
Go to https://cloudflare.com → Sign Up. No credit card needed.

### 2. Create a free GitHub account
Go to https://github.com → Sign Up (if you don't have one).

### 3. Install Node.js
Download from https://nodejs.org → choose the **LTS** version → install it.

Verify in your terminal:
```
node --version
```
You should see something like `v20.x.x`.

### 4. Install Wrangler (Cloudflare's deploy tool)
```
npm install -g wrangler
```

### 5. Log Wrangler into Cloudflare
```
wrangler login
```
A browser window opens → click **Allow**.

---

## Termux (Android phone) setup

Termux is a free Linux terminal app for Android. It lets you run all the same commands as a computer — no PC needed.

### 1. Install Termux
**Important:** Install from **F-Droid**, not the Play Store. The Play Store version is outdated and broken.

- Install F-Droid: https://f-droid.org
- Open F-Droid → search **Termux** → install it

### 2. Open Termux and run initial setup
```
pkg update && pkg upgrade
```
Press `Y` when prompted. This may take a few minutes.

### 3. Install Node.js and Git
```
pkg install nodejs git
```
Press `Y` when prompted. Verify both installed:
```
node --version
git --version
```

### 4. Install Wrangler
```
npm install -g wrangler
```

### 5. Give Termux access to your phone storage
You'll need this to access your project files:
```
termux-setup-storage
```
Tap **Allow** when Android asks for permission.

Your phone storage is now at `~/storage/shared/` in Termux.
For example, if your files are in Downloads:
```
cd ~/storage/shared/Downloads/fbdl-cloudflare
```

### 6. Log Wrangler into Cloudflare
```
wrangler login
```
Termux will print a URL — it should automatically open in Chrome. If it doesn't, long-press the URL and open it manually. Tap **Allow** on the Cloudflare page.

### 7. Configure Git with your GitHub details
```
git config --global user.name "Your Name"
git config --global user.email "your@email.com"
```
Use the same email as your GitHub account.

### 8. Set up GitHub authentication
GitHub no longer accepts passwords over HTTPS — you need a Personal Access Token.

1. Go to https://github.com/settings/tokens
2. Click **Generate new token (classic)**
3. Give it a name like `termux`
4. Check the **repo** scope
5. Click **Generate token**
6. Copy the token (you won't see it again)

When Git asks for your password during `git push`, paste this token instead.

To avoid typing it every time:
```
git config --global credential.helper store
```
Git will save your token after the first successful push.

**You're all set. Continue from Step 1 below — all commands work the same in Termux.**

---

## Step 1 — Push your files to GitHub

### Create a new repository
1. Go to https://github.com/new
2. Name it `fbdl` (or anything you like)
3. Set it to **Public** or **Private** — either works
4. Click **Create repository**

### Push your files
In your terminal, navigate to your project folder:
```
cd /path/to/fbdl-cloudflare
```
(Termux users: `cd ~/storage/shared/Downloads/fbdl-cloudflare` or wherever you saved the files)

Then run these commands one by one:
```
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/fbdl.git
git push -u origin main
```
Replace `YOUR-USERNAME` with your actual GitHub username.

Your files are now on GitHub. ✅

---

## Step 2 — Deploy the Worker (backend)

The Worker must be deployed via terminal — it's not part of Pages.

Make sure you're still in your project folder, then run:
```
wrangler deploy
```

After it finishes you'll see:
```
✅  Deployed to: https://fbdl-worker.YOUR-NAME.workers.dev
```

**Copy that URL — you need it in the next step.**

Test it works by opening this in your browser (use a real public FB video ID):
```
https://fbdl-worker.YOUR-NAME.workers.dev/extract?url=https://www.facebook.com/watch?v=123456789
```
You should see a JSON response with video links.

---

## Step 3 — Update index.html with your Worker URL

Open `index.html` in any text editor. Find this line near the bottom:
```javascript
const WORKER_URL = "https://fbdl-worker.YOUR-SUBDOMAIN.workers.dev";
```

Replace it with your actual Worker URL from Step 2. Example:
```javascript
const WORKER_URL = "https://fbdl-worker.john123.workers.dev";
```

Save the file, then push the change to GitHub:
```
git add index.html
git commit -m "Set Worker URL"
git push
```

> **Termux tip:** To edit files in Termux, you can use the `nano` editor:
> ```
> nano index.html
> ```
> Find the WORKER_URL line, edit it, then press `Ctrl+X` → `Y` → `Enter` to save.

---

## Step 4 — Connect GitHub to Cloudflare Pages

This is a one-time setup. After this, every `git push` auto-deploys your site.

1. Go to https://dash.cloudflare.com
2. Click **Workers & Pages** in the left sidebar
3. Click **Create application** → **Pages** → **Connect to Git**
4. Click **Connect GitHub** → authorize Cloudflare to access your repos
5. Select your `fbdl` repository → click **Begin setup**
6. Configure the build:
   - **Project name:** `fbdl` (or anything)
   - **Production branch:** `main`
   - **Build command:** *(leave empty)*
   - **Build output directory:** `/` *(or leave as default)*
7. Click **Save and Deploy**

Cloudflare will pull your repo and deploy. In about 60 seconds your site is live at:
```
https://fbdl.pages.dev
```

---

## Step 5 — Test everything

1. Open your Pages URL (e.g. `https://fbdl.pages.dev`)
2. Paste a **public** Facebook video URL
3. Click **FETCH VIDEO**
4. HD and SD download links should appear ✅

---

## Making changes later

**Changed `index.html`** (or any frontend file):
```
git add .
git commit -m "Your change description"
git push
```
Cloudflare Pages auto-deploys within ~60 seconds. No manual steps.

**Changed `worker.js`:**
```
wrangler deploy
git add worker.js
git commit -m "Update worker"
git push
```
Workers are not auto-deployed from GitHub — always run `wrangler deploy` for Worker changes.

---

## Troubleshooting

**"Could not reach Worker"**
→ Check WORKER_URL in index.html is correct and you pushed the change.
→ Check the Worker deployed successfully: `wrangler deployments list`.

**"No video streams found"**
→ The video must be **public**. Friends-only and private videos cannot be extracted.
→ Some videos use DRM — those cannot be downloaded by any tool.

**Pages shows old version**
→ Go to Cloudflare Dashboard → Workers & Pages → fbdl → Deployments and check the latest build status.

**"wrangler: command not found"**
→ Close and reopen your terminal after installing Node.js.
→ Try `npx wrangler deploy` instead.

**Worker error in browser**
→ Go to Cloudflare Dashboard → Workers & Pages → fbdl-worker → **Logs** for detailed errors.

**Termux: "permission denied" accessing files**
→ Run `termux-setup-storage` again and tap Allow.
→ Make sure you're navigating via `~/storage/shared/` not direct paths.

**Termux: wrangler login URL doesn't open**
→ Long-press the URL in Termux → tap Open in Browser.
→ Or manually copy and paste it into Chrome.

---

## Free tier limits

| Resource | Free limit |
|---|---|
| Worker requests | 100,000 / day |
| Pages deployments | 500 / month |
| Pages requests | Unlimited |
| GitHub integration | Free |

More than enough for personal use.

---

## File checklist

- [ ] Files pushed to GitHub
- [ ] `wrangler deploy` run successfully
- [ ] `index.html` updated with correct WORKER_URL and pushed
- [ ] Cloudflare Pages connected to GitHub repo
- [ ] Site live and tested
 

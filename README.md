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
(On Windows: right-click the folder → "Open in Terminal")

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

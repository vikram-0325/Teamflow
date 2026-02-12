# 🚀 TeamFlow — Deploy Guide (Today)

## Team
| Name | Role | Email | Admin |
|------|------|-------|-------|
| Yulissa | Founder & CEO | yulissa@teamflow.dev | ✅ |
| Vikram | Co-Founder & COO | vikram@teamflow.dev | ✅ |
| Esha | Creative Director | esha@teamflow.dev | — |
| Pranish | Web Developer | pranish@teamflow.dev | — |
| Ayush | UI/UX Designer | ayush@teamflow.dev | — |
| Kushal | Data Analyst | kushal@teamflow.dev | — |

---

## ⚡ Deploy in 4 Steps (30–60 mins total)

### STEP 1 — Create Firebase Project (10 min)

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Click **"Add project"** → Name it `teamflow-app`
3. Enable Google Analytics (optional)
4. Once created:

**Enable Authentication:**
- Build → Authentication → Get Started
- Sign-in method → **Email/Password** → Enable ✅

**Create Firestore Database:**
- Build → Firestore Database → Create database
- Start in **production mode**
- Choose a region (us-east1 recommended)

**Create Realtime Database:**
- Build → Realtime Database → Create database
- Start in **test mode** (we'll update rules)
- Copy the Database URL: `https://your-project-default-rtdb.firebaseio.com`

**Get your config:**
- Project Settings → General → Your apps → Add app (Web)
- Register app as `teamflow-web`
- Copy the firebaseConfig object

---

### STEP 2 — Configure Environment (5 min)

```bash
# In your project folder:
cp .env.example .env.local
```

Edit `.env.local` with your Firebase config:
```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=teamflow-app.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=teamflow-app
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=teamflow-app.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123...
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://teamflow-app-default-rtdb.firebaseio.com
```

---

### STEP 3 — Create Team User Accounts (10 min)

**Option A: Firebase Console (Easiest)**

1. Go to Firebase → Authentication → Users → Add User
2. Add each member:

| Email | Password (set your own) |
|-------|------------------------|
| yulissa@teamflow.dev | YourPassword123! |
| vikram@teamflow.dev | YourPassword123! |
| esha@teamflow.dev | YourPassword123! |
| pranish@teamflow.dev | YourPassword123! |
| ayush@teamflow.dev | YourPassword123! |
| kushal@teamflow.dev | YourPassword123! |

**Option B: Script (Automated)**

```bash
# Install firebase-admin
npm install firebase-admin

# Download service account key from:
# Firebase Console → Project Settings → Service Accounts → Generate new private key
# Save as: scripts/serviceAccountKey.json

# Run setup script
node scripts/setup-firebase-users.js
```

---

### STEP 4 — Deploy to Vercel (10 min) 🎯

**Fastest option — Vercel (recommended):**

```bash
# Install dependencies
npm install

# Test locally first
npm run dev
# Visit http://localhost:3000 ✅

# Install Vercel CLI
npm install -g vercel

# Deploy!
vercel

# Follow prompts:
# ? Set up and deploy? Y
# ? Which scope? (your account)
# ? Link to existing project? N
# ? Project name: teamflow
# ? Directory: ./
```

**Add environment variables in Vercel:**
1. Go to vercel.com → Your project → Settings → Environment Variables
2. Add all variables from `.env.local`

**Your site will be live at:**
`https://teamflow.vercel.app` (or custom domain)

---

### STEP 5 — Set Firebase Security Rules

**Firestore Rules:**
1. Firebase Console → Firestore → Rules tab
2. Replace with contents of `firestore.rules`
3. Click Publish

**Realtime Database Rules:**
1. Firebase Console → Realtime Database → Rules tab
2. Replace with contents of `database.rules.json`
3. Click Publish

---

## 🔒 Security Notes

- Only Vikram and Yulissa have admin access
- Admins can see all sessions, force clock-out, approve reports
- Members can only see/edit their own data
- Milestones can only be created/edited by admins
- All data secured by Firebase Security Rules

---

## 📱 Features Overview

| Feature | Description |
|---------|-------------|
| **Dashboard** | Time tracker, team live status, today's sessions |
| **Task Board** | Kanban: Backlog → Todo → In Progress → Review → Done |
| **Git Commits** | Per-member commit/PR tracking with heat bars |
| **Weekly Reports** | Submit, admin review/approve/revision |
| **Milestones** | Admin-created with progress rings and status |
| **Efficiency Graph** | Recharts dashboards: hours, commits, velocity, radar |
| **Team / XP** | Gamified levels: Bronze → Silver → Gold → Platinum → Elite |
| **Admin: Sessions** | Full session log, force clock-out, daily summaries |
| **Admin: Leaderboard** | TF Score™ formula with breakdown per member |

---

## 🛠 Local Development

```bash
npm install
npm run dev
# → http://localhost:3000
```

## 🌐 Custom Domain (Optional)

1. Buy domain (e.g., teamflow.dev on Namecheap)
2. Vercel → Project → Settings → Domains → Add domain
3. Update DNS records as instructed

---

## 📞 Support

Built for: Vikram & Yulissa — TeamFlow Founders
Architecture: Next.js 14 + Firebase + Recharts + Tailwind

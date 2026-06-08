# 🎓 SmartExam — AI-Powered Exam Platform

A free, full-stack exam platform for teachers and students.
Built with React + Supabase + Google Gemini AI.

---

## ✨ Features

| Feature | Details |
|---|---|
| 👨‍🏫 Teacher Dashboard | Create tests, view results, export Excel |
| 🎓 Student Dashboard | Take tests, view scores, get AI feedback |
| 🤖 AI Question Generator | Generate MCQs instantly with Gemini AI |
| 📊 Analytics | Class performance, grade distribution, weak topics |
| 🛡️ Anti-Cheat | Tab-switch detection, randomised questions/options |
| 📥 Excel Export | Real .xlsx with grades, remarks, summary sheet |
| ✨ AI Feedback | Personalised student feedback after each test |
| 🔒 Secure | Row-level security via Supabase |

---

## 🚀 Setup Guide (Step by Step)

### STEP 1 — Create Supabase Project (Free)

1. Go to [supabase.com](https://supabase.com) → Sign up free
2. Click **New Project** → give it a name → set a DB password → Create
3. Wait ~2 minutes for it to set up
4. Go to **SQL Editor** → click **New Query**
5. Open the file `supabase/schema.sql` from this project
6. Copy everything and paste it into the SQL editor → click **Run**
7. You should see "Success" — your database is ready!

### STEP 2 — Get Supabase Keys

1. In your Supabase project → go to **Settings** (gear icon) → **API**
2. Copy:
   - **Project URL** → looks like `https://abcxyz.supabase.co`
   - **anon public** key → long string starting with `eyJ...`

### STEP 3 — Get Free Gemini API Key

1. Go to [aistudio.google.com](https://aistudio.google.com)
2. Sign in with your Google account
3. Click **Get API Key** → **Create API Key**
4. Copy the key (starts with `AIza...`)
5. Free tier: 15 requests/min, more than enough for classroom use

### STEP 4 — Configure the Project

1. In the project folder, find `.env.example`
2. **Copy** it and rename the copy to `.env`
3. Open `.env` and fill in your values:

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5c...
VITE_GEMINI_API_KEY=AIzaSyD...
```

### STEP 5 — Install & Run Locally

Make sure you have **Node.js** installed ([nodejs.org](https://nodejs.org) — download LTS version).

Open a terminal in the project folder and run:

```bash
npm install
npm run dev
```

Open your browser at: **http://localhost:5173**

That's it! The app is running locally.

---

## 🌐 Deploy Free (Vercel)

1. Push your project to **GitHub** (create a free account if needed)
2. Go to [vercel.com](https://vercel.com) → Sign up with GitHub
3. Click **New Project** → Import your GitHub repo
4. In **Environment Variables**, add these 3 variables:
   - `VITE_SUPABASE_URL` → your Supabase URL
   - `VITE_SUPABASE_ANON_KEY` → your Supabase anon key
   - `VITE_GEMINI_API_KEY` → your Gemini API key
5. Click **Deploy**
6. Your app is live at `https://your-app.vercel.app` 🎉

**Important:** After deploying, go to your Supabase project →
**Authentication** → **URL Configuration** →
Add your Vercel URL to **Allowed Redirect URLs**.

---

## 📖 How to Use

### As a Teacher

1. Register with role **Teacher**
2. Click **Create New Test**
3. Fill in title, subject, duration
4. Add questions manually OR click **✨ AI Generate** to let Gemini create them
5. Click **Publish Test** — students can now take it
6. Share the **class code** (shown on each test card) with students
7. Go to **Results** to see all submissions
8. Click **Export Excel** to download the gradebook

### As a Student

1. Register with role **Student**
2. Available tests show on your dashboard automatically
3. OR click **Join by Code** and enter the teacher's class code
4. Click **Start** — answer all questions at your own pace
5. Click the **Submit Test** button when done (no auto-submit on option click!)
6. See your score, grade, and get **AI personalised feedback**

---

## 🗂️ Project Structure

```
smartexam/
├── src/
│   ├── lib/
│   │   ├── supabase.js          # Supabase client
│   │   └── gemini.js            # Gemini AI helpers
│   ├── context/
│   │   └── AuthContext.jsx      # Auth state & methods
│   ├── components/
│   │   ├── Navbar.jsx           # Top navigation
│   │   ├── ProtectedRoute.jsx   # Route guards
│   │   └── UI.jsx               # Spinner, Toast, Modal, etc.
│   ├── pages/
│   │   ├── Landing.jsx          # Home page
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   │   ├── teacher/
│   │   │   ├── Dashboard.jsx    # Teacher home
│   │   │   ├── CreateTest.jsx   # Test builder + AI
│   │   │   ├── TestDetails.jsx  # Results + export
│   │   │   └── Analytics.jsx    # Class analytics
│   │   └── student/
│   │       ├── Dashboard.jsx    # Student home
│   │       ├── TakeTest.jsx     # Test-taking UI
│   │       ├── Results.jsx      # Score + AI feedback
│   │       └── History.jsx      # All past results
│   ├── utils/
│   │   └── excel.js             # Excel export utility
│   ├── App.jsx                  # Router
│   ├── main.jsx                 # Entry point
│   └── index.css                # Global styles + Tailwind
├── supabase/
│   └── schema.sql               # Full DB schema + RLS
├── .env.example                 # Environment variables template
├── index.html
├── package.json
├── tailwind.config.js
└── vite.config.js
```

---

## 🛠️ Tech Stack

| Layer | Technology | Cost |
|---|---|---|
| Frontend | React 18 + Vite | Free |
| Styling | Tailwind CSS | Free |
| Icons | Lucide React | Free |
| Database | Supabase (PostgreSQL) | Free |
| Auth | Supabase Auth | Free |
| AI | Google Gemini 1.5 Flash | Free |
| Excel | SheetJS | Free |
| Hosting | Vercel | Free |

**Total cost: ₹0** 🎉

---

## 🔑 Default Password / Security

- There is no default password — each teacher/student creates their own account
- Database is secured with Supabase Row Level Security (RLS)
- Teachers can only see their own tests and students
- Students can only see their own submissions
- Change `TEACHER_PASS` references are not applicable here — auth is handled by Supabase

---

## 🐛 Troubleshooting

**"Cannot connect to Supabase"**
→ Check that your `.env` file has the correct URL and key, and no extra spaces.

**"AI generation failed"**
→ Check your `VITE_GEMINI_API_KEY` is valid. Test it at [aistudio.google.com](https://aistudio.google.com).

**"Email not confirmed" on login**
→ Go to Supabase → Authentication → Settings → Disable "Email confirmation" for development.

**Blank page after deploy**
→ Make sure all 3 environment variables are set in Vercel dashboard.

---

## 📞 Future Features (Phase 2)

- [ ] WhatsApp notifications
- [ ] PDF result download
- [ ] Image-based questions
- [ ] Timer per question
- [ ] Webcam proctoring
- [ ] Parent portal
- [ ] Mobile app (React Native)

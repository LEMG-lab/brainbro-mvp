# 🧠 BrainBro

BrainBro is a direct, no-BS English coach designed for teenagers. It focuses on listening comprehension, vocabulary building, and direct feedback that explains what teachers often don't.

## Features (MVP v1)
- **Practice Sessions (Listening):** 10 curated teen-relevant topics with varying difficulties (1-5).
- **Native Audio:** Uses Web Speech API (SpeechSynthesis) to read passages aloud in US or UK accents.
- **Hidden Scripts & Quizzes:** Scripts are hidden while listening. Test your ear with 5 questions per session.
- **Direct Feedback:** Show scores, reveal the script, highlight mistakes with Spanish explanations, and extract key vocabulary.
- **Coach Tips:** Get exactly ONE short, actionable tip based on the session's topic (e.g., vocabulary confusion, tense misuse).
- **Local History:** Saves session results locally so you can track progress.

## Run Instructions
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
3. Open the provided `http://localhost:5173` link in your browser.

## Create GitHub repo & push
You can push this project to GitHub using one of two methods:

### Option A: Using GitHub CLI (Recommended)
If you have `gh` installed and authenticated:
```bash
gh repo create brainbro-mvp --public --source=. --remote=origin
git push -u origin main
```

### Option B: Manual steps (GitHub UI)
1. Go to GitHub and click **New Repository**.
2. Name it `brainbro-mvp` (leave it empty, do not add README/gitignore).
3. Copy the repo URL, then run these commands in the terminal:
```bash
git remote add origin https://github.com/YOUR_USERNAME/brainbro-mvp.git
git branch -M main
git push -u origin main
```

## Next Iteration Plan (v2)
- [ ] **User Authentication:** Add Clerk or Supabase Auth for cloud syncing.
- [ ] **Database Integration:** Replace localStorage with Supabase (PostgreSQL) for cross-device progress.
- [ ] **Speech Recognition:** Allow users to speak answers and get pronunciation feedback.
- [ ] **Expanded Subjects:** Structure the database to support Math and Spanish.
- [ ] **Spaced Repetition:** Implement an SRS algorithm for the vocabulary learned.
- [ ] **Gamification:** Add streaks and an XP system.
- [ ] **Voice Cloning:** Integrate ElevenLabs for more natural, teen-friendly "Bro" voices.

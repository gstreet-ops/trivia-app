# User Guide

This guide covers everything a regular user needs to know to use the Trivia Quiz App.

---

## Getting Started

### Creating an Account

1. Go to the live app at https://gstreet-ops.github.io/trivia-app
2. The login screen shows two tabs: **Login** and **Sign Up**
3. Click **Sign Up**
4. Enter:
   - **Username** — your display name shown on leaderboards and to other users
   - **Email** — used for login and password reset
   - **Password**
5. Click **Sign Up**

You will be taken directly to your Dashboard.

### Logging In

1. Enter your **Email** and **Password**
2. Click **Login**

### Forgot Password

1. On the login screen, click **Forgot Password?**
2. Enter your email address
3. Click **Send Reset Link**
4. Check your email for a reset link from Supabase (check spam if not received)
5. Click the link to reset your password, then log in normally

---

## The Dashboard

After logging in you land on your personal Dashboard. It shows:

- **Stats bar** — Total Games, Average Score %, Best Score %
- **Start New Quiz** button
- **Achievement Badges** — badges you have earned
- **Performance Charts** — score trend over time and average % by category
- **Community Leaderboard** — top 10 players on the platform (public games only)
- **Recent Games** — your last 5 games, click any to review answers

### Navigation

The persistent top bar (visible on every screen) contains:
- **Your avatar and username** (left side)
- **Your active community** (if you belong to one) — click it to jump directly to that community
- **Menu button** (right side) — opens a dropdown with:
  - My Leagues
  - Community Feed
  - Create Question
  - Settings
  - Admin Panel (admins only)

---

## Playing a Quiz

### Starting a Quiz

1. Click **Start New Quiz** on the Dashboard (or **Start Quiz** from a community detail page)
2. The **Configure Quiz** screen appears with options:
   - **Question Source** — where questions come from:
     - *Trivia API* — live questions from The Trivia API (always available)
     - *Community Questions Only* — questions uploaded by your community commissioner (only available if you're in a community)
     - *Approved Custom Questions* — platform-approved user-submitted questions
     - *Mixed (All Sources)* — admins only
   - **Category** — General Knowledge, Film, Music, Geography, History, Sports, Science & Nature, Arts & Literature
   - **Difficulty** — Easy, Medium, or Hard
   - **Number of Questions** — 3, 5, 10, 15, or 20
3. Click **Start Quiz**

### During the Quiz

- Each question shows 4 answer choices in a grid
- Click your answer to submit it
- After answering:
  - Your selected answer shows **red** if wrong, **green** if correct
  - The correct answer is always highlighted green
- **Hint (50/50)** button: available once per question before you answer. Clicking it removes 2 incorrect answers from the grid
- After answering, click **Next Question** to proceed (or **See Results** on the last question)

### Quiz Results

After the final question, your score is automatically saved to your history. You are returned to the Dashboard.

---

## Reviewing a Game

On the Dashboard, click any game in the **Recent Games** section to open the Game Review screen. It shows each question with:
- The question text
- All answer choices
- Which answer you selected (highlighted)
- The correct answer
- Whether you got it right or wrong

---

## Achievements

Achievements are badges earned for hitting milestones. They appear on your Dashboard. Current badges:

| Badge | How to Earn |
|-------|-------------|
| **Perfect Score** | Score 10/10 on any game |
| **5 Games Played** | Complete 5 games total |
| **10 Games Played** | Complete 10 games total |
| **Category Master** | Score 10/10 on the same category 3 or more times |
| **Speed Demon** | Play 5 or more games in a single day |
| **Triple Perfect** | Score 10/10 on any game 3 or more times |

---

## Performance Charts

The **Performance Charts** section on your Dashboard shows two charts (requires at least 1 game):

- **Score Trend** — line chart of your score % over every game you've played, oldest to newest
- **Performance by Category** — bar chart of your average % per category across all games

---

## Community Leaderboard

The leaderboard on your Dashboard ranks players by average score % across all their public games. Only players who have opted into leaderboard visibility are shown. You can click on any other player's name to view their public profile.

### Viewing Another User's Profile

Click a player's name in the leaderboard. Their profile shows:
- Their overall stats
- Their game history (if their profile is public)

---

## Leagues (Communities)

Communities (also called Leagues) are groups where you share a question bank and compete on a community-specific leaderboard.

### Viewing Your Leagues

Click **Menu → My Leagues** (or **My Communities**) to see all leagues you belong to.

Each league card shows:
- Community name
- Commissioner (creator/manager)
- Season dates
- Invite code

### Creating a League

1. Go to **My Leagues**
2. Click **Create Community**
3. Enter a community name
4. Click **Create**

You are automatically added as the commissioner and a member. An 8-character invite code is generated automatically. The default season runs 30 days from today.

### Joining a League

1. Go to **My Leagues**
2. Click **Join Community**
3. Enter the invite code (provided by the commissioner)
4. Click **Join**

### Community Detail Page

Click any league card to open its detail page, which shows:
- Commissioner name
- Season dates
- Invite code
- Member count
- Community leaderboard (top 10 members by average score)
- Question bank count
- **Start Quiz** button (to play community questions)
- **Manage Community** button (commissioners only)

---

## Community Feed

**Menu → Community Feed** shows a public activity feed of recent games from all users who have set their games to public visibility. You can click on games or players to explore their results.

---

## Submitting a Custom Question

Any logged-in user can submit trivia questions for the platform.

1. Click **Menu → Create Question**
2. Fill in:
   - **Category** — select from the 8 available categories
   - **Difficulty** — Easy, Medium, or Hard
   - **Question** — the trivia question text
   - **Correct Answer** — the right answer
   - **Incorrect Answer 1, 2, 3** — three wrong answers
3. Click **Submit Question for Review**

Your question enters a pending queue. Platform admins review and either approve or reject it. Approved questions become available in the "Approved Custom Questions" quiz source.

---

## Settings

**Menu → Settings** lets you:

- **Change your username** — updates how you appear on leaderboards and to other users
- **Privacy controls:**
  - *Show my profile to other users* — if unchecked, your profile page is hidden
  - *Show me on leaderboards* — if unchecked, you are excluded from all leaderboards
- **Logout** — signs you out and returns to the login screen

Click **Save Settings** to apply changes.

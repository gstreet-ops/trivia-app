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
5. Click the link — you will be taken to a **Set New Password** screen
6. Enter and confirm your new password, then click **Update Password**
7. You will be automatically redirected to the Dashboard

---

## The Dashboard

After logging in you land on your personal Dashboard. It shows:

- **Stats bar** — Total Games, Average Score %, Best Score %
- **Start New Quiz** button
- **Achievement Badges** — badges you have earned
- **Community Leaderboard** — top 10 players on the platform (public games only)
- **Recent Games** — your last 5 games, click any to review answers

### Navigation

The persistent top bar (visible on every screen) contains:
- **Your avatar and username** (left side)
- **Your active community** (if you belong to one) — click it to jump directly to that community. If you belong to multiple communities, this becomes a dropdown: click to open, select a different community to switch your active one, or click the current one to view its detail page. Your active community persists across sessions.
- **Dark mode toggle** — sun/moon icon to switch between light and dark themes
- **Notification bell** — shows unread count badge; click to open notification dropdown
- **Menu button** (right side) — opens a dropdown with:
  - My Stats
  - My Leagues
  - Community Feed
  - Create Question
  - Help
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
- If the question has an **image** or **YouTube video**, it appears above the question text
- A **countdown timer** bar runs at the top of each question (if enabled by the community commissioner). When time runs out, your answer is auto-submitted. The bar pulses red when 5 seconds or fewer remain.
- Click your answer to submit it
- After answering:
  - Your selected answer shows **red** if wrong, **green** if correct
  - The correct answer is always highlighted green
  - If an **explanation** is available (community questions), a "Why?" panel fades in below the answers
- **Hint (50/50)** button: available once per question before you answer. Clicking it removes 2 incorrect answers from the grid and adds 3 bonus seconds to the timer.
- After answering, click **Next Question** to proceed (or **See Results** on the last question)

### Quiz Results

After the final question, your score is automatically saved to your history. You are returned to the Dashboard.

---

## Reviewing a Game

On the Dashboard, click any game in the **Recent Games** section to open the Game Review screen. It shows each question with:
- Any attached image or YouTube video (displayed above the question)
- The question text
- All answer choices
- Which answer you selected (highlighted)
- The correct answer
- Whether you got it right or wrong
- The explanation (if available for community questions)

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

## My Stats

Access **My Stats** from the **Menu** dropdown. This dedicated page shows your performance charts (requires at least 1 game):

- **Score Trend** — line chart of your score % over every game you've played, oldest to newest
- **Performance by Category** — bar chart of your average % per category across all games

Click **Back to Dashboard** to return.

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
- Commissioner name, season dates, member count, question bank count
- Invite code (visible to commissioner only)
- Community theming (custom color, logo, banner, welcome message — set by commissioner)
- **Community Leaderboard** — top 10 members by average score (filtered to current season)
- **Announcements** — pinned and recent posts from the commissioner; "New" badge for posts less than 48 hours old
- **Community Chat** — real-time chat with all community members (see below)
- **Season History** — past season leaderboards (if the commissioner has reset seasons)
- **Start Quiz** button (to play community questions)
- **Manage Community** button (commissioners only)

### Community Chat

Each community has a real-time chat visible on the community detail page:
- Messages appear as bubbles (your messages on the right in navy, others on the left in gray)
- Messages are limited to 500 characters
- Click **Load Older** to see message history
- The commissioner can delete inappropriate messages (shown as "[Message removed by commissioner]")

---

## Community Feed

**Menu → Community Feed** shows a public activity feed of recent games from all users who have set their games to public visibility. You can click on games or players to explore their results.

---

## Community Marketplace

The **Community Marketplace** lets you discover and join public communities without needing an invite code.

1. Go to **My Leagues**
2. Click **Browse Marketplace**
3. Browse communities with filters by category and sorting options
4. Click **Join** on any public community to join instantly

Commissioners control whether their community appears in the marketplace via a public/private visibility toggle in Settings.

### Requesting a New Community

Any user can request a new community:

1. Go to **My Leagues**
2. Click **Request a Community**
3. Fill in:
   - **Community Name** — the name you'd like for your community
   - **Description** (optional) — what the community is about
   - **Reason** — why you want to create this community
4. Click **Submit Request**

A platform admin will review your request. You'll receive an in-app notification when it's approved or rejected. If approved, the community is created automatically and you become its commissioner.

You can view your past requests by clicking the **My Requests** toggle on the My Leagues page. Each request shows its status (pending/approved/rejected), and rejected requests include the rejection reason if one was provided.

---

## Multiplayer Quiz

Play trivia in real time with other users.

### Creating a Room

1. Click **Multiplayer** from the Dashboard or menu
2. Click **Create Room**
3. Configure:
   - **Room Name** — display name for your room
   - **Question Source** — Trivia API or Community Questions
   - **Category**, **Difficulty**, **Question Count**
   - **Timer** — seconds per question (default 20)
   - **Speed Bonus** — faster correct answers earn more points
   - **Max Players** — maximum participants (default 12)
4. Click **Create Room**
5. Share the 6-character room code with other players

### Joining a Room

- **By Code**: Click **Join Room**, enter the 6-character room code
- **Open Rooms**: Click **Open Rooms** to browse all waiting rooms (auto-refreshes every 10 seconds) and join directly

### In the Lobby

- See all players and their ready status in real time
- Toggle **Ready/Unready**
- Host can **Start Game** when at least 2 players are present
- Host can **Cancel Room** to close it

### During Multiplayer

- All players answer the same questions simultaneously
- A countdown timer bar shows time remaining per question
- Answer grid highlights correct/wrong after selection
- Player dots at the bottom show who has answered
- After each question, a round scoreboard shows points and rankings
- **Scoring:** 100 points per correct answer + up to 100 speed bonus points (if enabled)
- The host clicks **Next Question** to advance everyone

### Final Results

After the last question, a final leaderboard shows all players ranked by total points with medal indicators for the top 3.

---

## Notifications

The **notification bell** in the top bar shows a badge with your unread count. Click it to open the notification dropdown.

Notifications are sent when:
- Your submitted custom question is approved or rejected by an admin
- Your AI generation request (submitted through your commissioner) is approved or rejected

Click any notification to navigate to the relevant screen. Use **Mark All Read** to clear the unread badge.

Notifications are checked automatically every 30 seconds.

---

## Dark Mode

Toggle dark mode using the **sun/moon icon** in the top bar or from **Settings**. Your preference is saved to your account and persists across sessions and devices.

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
- **Theme** — toggle Dark Mode on/off
- **Change Password** — enter a new password and confirm it to update your password
- **Legal** — links to Terms of Service and Privacy Policy
- **Logout** — signs you out and returns to the login screen

Click **Save Settings** to apply profile/privacy changes. Password changes are saved with the **Update Password** button.

A footer with **Terms of Service** and **Privacy Policy** links also appears at the bottom of every screen (except during an active quiz).

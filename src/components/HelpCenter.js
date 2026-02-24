import React, { useState } from 'react';
import './HelpCenter.css';

// ── User Guide Sections ──────────────────────────────────────────────────────
const userGuideSections = [
  {
    id: 'ug-getting-started',
    tab: 'User Guide',
    title: 'Getting Started',
    searchText: 'account signup sign up login password reset email username create register authentication',
    content: (
      <div>
        <h3>Creating an Account</h3>
        <ol>
          <li>On the login screen, click the <strong>Sign Up</strong> tab</li>
          <li>Enter a <strong>Username</strong> — this is shown on leaderboards and to other users</li>
          <li>Enter your <strong>Email</strong> and <strong>Password</strong></li>
          <li>Click <strong>Sign Up</strong> — you land on your Dashboard immediately</li>
        </ol>
        <h3>Logging In</h3>
        <ol>
          <li>Enter your email and password on the Login tab</li>
          <li>Click <strong>Login</strong></li>
        </ol>
        <h3>Forgot Password</h3>
        <ol>
          <li>Click <strong>Forgot Password?</strong> below the login form</li>
          <li>Enter your email and click <strong>Send Reset Link</strong></li>
          <li>Check your email (including spam folder) for the reset link</li>
          <li>Click the link, set a new password, then log in normally</li>
        </ol>
      </div>
    )
  },
  {
    id: 'ug-dashboard',
    tab: 'User Guide',
    title: 'The Dashboard',
    searchText: 'dashboard home stats total games average score best score navigation menu top bar community',
    content: (
      <div>
        <p>After logging in you land on your personal Dashboard. It shows:</p>
        <ul>
          <li><strong>Stats bar</strong> — Total Games played, Average Score %, Best Score %</li>
          <li><strong>Start New Quiz</strong> button</li>
          <li><strong>Achievement Badges</strong> — badges you have earned</li>
          <li><strong>Performance Charts</strong> — score trend and category breakdown</li>
          <li><strong>Community Leaderboard</strong> — top 10 players on the platform</li>
          <li><strong>Recent Games</strong> — your last 5 games; click any to review answers</li>
        </ul>
        <h3>Navigation</h3>
        <p>The persistent top bar (visible on every screen) contains:</p>
        <ul>
          <li><strong>Your avatar and username</strong> on the left</li>
          <li><strong>Active community badge</strong> — click it to jump to that community</li>
          <li><strong>Menu button</strong> on the right — opens a dropdown with: My Stats, Multiplayer, My Leagues, Help, Settings, and Super Admin (admins only)</li>
        </ul>
      </div>
    )
  },
  {
    id: 'ug-quiz',
    tab: 'User Guide',
    title: 'Playing a Quiz',
    searchText: 'quiz start configure category difficulty question count source trivia api community questions hint 50 50 answer correct wrong results',
    content: (
      <div>
        <h3>Configuring a Quiz</h3>
        <p>Click <strong>Start New Quiz</strong> to open the configuration screen. Choose:</p>
        <table>
          <thead><tr><th>Option</th><th>Choices</th></tr></thead>
          <tbody>
            <tr><td>Question Source</td><td>Trivia API · Community Questions · Approved Custom · Mixed (admins)</td></tr>
            <tr><td>Category</td><td>General Knowledge · Film · Music · Geography · History · Sports · Science &amp; Nature · Arts &amp; Literature</td></tr>
            <tr><td>Difficulty</td><td>Easy · Medium · Hard</td></tr>
            <tr><td>Question Count</td><td>3 · 5 · 10 · 15 · 20</td></tr>
          </tbody>
        </table>
        <h3>During the Quiz</h3>
        <ul>
          <li>Four answer choices appear for each question — click to submit</li>
          <li>After answering: your choice highlights <strong>red</strong> if wrong, <strong>green</strong> if correct; the correct answer is always shown</li>
          <li><strong>Hint (50/50)</strong> — available once per question <em>before</em> you answer; removes 2 incorrect choices and adds 3 bonus seconds to the timer</li>
          <li>Click <strong>Next Question</strong> to proceed; on the last question click <strong>See Results</strong></li>
        </ul>
        <h3>Per-Question Timer</h3>
        <p>If your community commissioner has enabled a timer, each question has a countdown bar at the top of the screen:</p>
        <ul>
          <li>The bar counts down from the configured time (e.g. 20 seconds)</li>
          <li>When under 5 seconds remaining, the bar turns <strong>red</strong> as a warning</li>
          <li>If time runs out before you answer, the question is automatically submitted as unanswered (counted as wrong)</li>
          <li>Using the 50/50 hint adds <strong>3 bonus seconds</strong> to the current timer</li>
        </ul>
        <p>Your score is automatically saved to your history when you finish.</p>
      </div>
    )
  },
  {
    id: 'ug-review',
    tab: 'User Guide',
    title: 'Reviewing a Game',
    searchText: 'review game answers history correct wrong question replay look back results',
    content: (
      <div>
        <p>On the Dashboard, click any game in the <strong>Recent Games</strong> section to open the Game Review screen.</p>
        <p>It shows every question from that game with:</p>
        <ul>
          <li>The question text</li>
          <li>All four answer choices</li>
          <li>Your selected answer (highlighted)</li>
          <li>The correct answer</li>
          <li>A checkmark or X indicating whether you got it right</li>
        </ul>
      </div>
    )
  },
  {
    id: 'ug-achievements',
    tab: 'User Guide',
    title: 'Achievements',
    searchText: 'achievements badges unlock earn perfect score games played category master speed demon hat trick triple',
    content: (
      <div>
        <p>Achievements are badges unlocked by hitting milestones. They appear on your Dashboard.</p>
        <table>
          <thead><tr><th>Badge</th><th>How to Earn</th></tr></thead>
          <tbody>
            <tr><td>🎯 Perfect Score</td><td>Score 10/10 on any game</td></tr>
            <tr><td>🎮 Getting Started</td><td>Complete 5 games total</td></tr>
            <tr><td>🔥 Dedicated Player</td><td>Complete 10 games total</td></tr>
            <tr><td>👑 Category Master</td><td>Score 10/10 in the same category 3 or more times</td></tr>
            <tr><td>⚡ Speed Demon</td><td>Play 5 or more games in a single day</td></tr>
            <tr><td>🎩 Hat Trick</td><td>Score 10/10 on any game 3 or more times</td></tr>
          </tbody>
        </table>
        <p><strong>Note:</strong> Perfect score badges require exactly a 10-question game.</p>
      </div>
    )
  },
  {
    id: 'ug-communities',
    tab: 'User Guide',
    title: 'Leagues & Communities',
    searchText: 'community league join create invite code commissioner member leaderboard season questions',
    content: (
      <div>
        <h3>What is a League?</h3>
        <p>A league (community) groups members together with a shared question bank and a community-specific leaderboard.</p>
        <h3>Creating a League</h3>
        <ol>
          <li>Click <strong>Menu → My Leagues</strong></li>
          <li>Click <strong>Create Community</strong></li>
          <li>Enter a community name and click <strong>Create</strong></li>
        </ol>
        <p>You become the Commissioner automatically. An 8-character invite code is generated — share it with others to invite them.</p>
        <h3>Joining a League</h3>
        <ol>
          <li>Click <strong>Menu → My Leagues</strong></li>
          <li>Click <strong>Join Community</strong></li>
          <li>Enter the invite code and click <strong>Join</strong></li>
        </ol>
        <h3>Community Detail Page</h3>
        <p>Click any league card to see the commissioner name, season dates, invite code, member count, community leaderboard, and a <strong>Start Quiz</strong> button to play community questions.</p>
        <h3>Community Announcements</h3>
        <p>Commissioners can post announcements that appear on the community detail page. Look for the <strong>Announcements</strong> section — recent posts (less than 48 hours old) display a <strong>"New"</strong> badge. Pinned announcements always appear at the top.</p>
      </div>
    )
  },
  {
    id: 'ug-marketplace',
    tab: 'User Guide',
    title: 'Community Marketplace',
    searchText: 'marketplace browse discover public communities join category filter sort search',
    content: (
      <div>
        <p>The Community Marketplace lets you discover and join public communities without needing an invite code.</p>
        <h3>Browsing the Marketplace</h3>
        <ol>
          <li>Click <strong>Menu → My Leagues</strong></li>
          <li>Click <strong>Browse Marketplace</strong></li>
        </ol>
        <h3>Finding Communities</h3>
        <ul>
          <li><strong>Search bar</strong> — search by community name or description</li>
          <li><strong>Category filter chips</strong> — filter by community category (e.g. Science, History, Sports)</li>
          <li><strong>Sort dropdown</strong> — sort by Newest, Most Members, or A–Z</li>
        </ul>
        <h3>Joining</h3>
        <p>Click <strong>Join</strong> on any community card to join instantly — no invite code needed for public communities.</p>
      </div>
    )
  },
  {
    id: 'ug-multiplayer',
    tab: 'User Guide',
    title: 'Multiplayer Quiz',
    searchText: 'multiplayer room create join lobby code real-time live players host ready start open rooms',
    content: (
      <div>
        <p>Challenge friends to real-time trivia. Access via <strong>Menu → Multiplayer</strong>.</p>
        <h3>Creating a Room</h3>
        <ol>
          <li>Click <strong>Create Room</strong> on the multiplayer screen</li>
          <li>Set a <strong>Room Name</strong>, choose question source (Trivia API or Community), category, difficulty, question count, timer, and max players</li>
          <li>Optionally enable <strong>Speed Bonus</strong> (faster correct answers earn more points)</li>
          <li>Click <strong>Create Room</strong> — you enter the lobby with a 6-character room code</li>
          <li>Share the room code with friends so they can join</li>
        </ol>
        <h3>Joining a Room</h3>
        <p>Two ways to join:</p>
        <ul>
          <li><strong>By code</strong> — Click <strong>Join Room</strong>, enter the 6-character code, and click Join</li>
          <li><strong>Open Rooms list</strong> — Scroll down to see all waiting rooms. Click <strong>Join</strong> on any room card. The list auto-refreshes every 10 seconds.</li>
        </ul>
        <h3>In the Lobby</h3>
        <ul>
          <li>See all players with their ready status in real time</li>
          <li>Click <strong>Ready Up</strong> to signal you are ready</li>
          <li>The room code is displayed with a <strong>Copy</strong> button for easy sharing</li>
          <li>Settings summary shows question count, difficulty, timer, and source</li>
        </ul>
        <h3>Host Controls</h3>
        <ul>
          <li><strong>Start Game</strong> — requires at least 2 players</li>
          <li><strong>Cancel Room</strong> — closes the room and removes all players</li>
        </ul>
      </div>
    )
  },
  {
    id: 'ug-settings',
    tab: 'User Guide',
    title: 'Settings',
    searchText: 'settings username privacy profile visible leaderboard opt out logout sign out change name',
    content: (
      <div>
        <p>Access via <strong>Menu → Settings</strong>.</p>
        <table>
          <thead><tr><th>Setting</th><th>What it does</th></tr></thead>
          <tbody>
            <tr><td>Username</td><td>Change your display name shown on leaderboards</td></tr>
            <tr><td>Show my profile to other users</td><td>If off, your profile page is hidden from other players</td></tr>
            <tr><td>Show me on leaderboards</td><td>If off, you are excluded from all leaderboards</td></tr>
          </tbody>
        </table>
        <p>Click <strong>Save Settings</strong> to apply changes. Use the <strong>Logout</strong> button to sign out.</p>
      </div>
    )
  },
  {
    id: 'ug-admin',
    tab: 'User Guide',
    title: 'Admin User Management',
    searchText: 'admin super admin promote demote user management roles toggle users search filter',
    content: (
      <div>
        <p>Super Admins have access to the <strong>Super Admin</strong> panel via the navigation menu.</p>
        <h3>Users Tab</h3>
        <p>The Users tab provides full user management:</p>
        <ul>
          <li><strong>Search</strong> — find users by username</li>
          <li><strong>Filter</strong> — filter by role (All, User, Admin, Super Admin)</li>
          <li><strong>Sort</strong> — click column headers to sort by username, role, or join date</li>
          <li><strong>Promote / Demote</strong> — change a user&apos;s role between User and Admin</li>
          <li><strong>Toggle Super Admin</strong> — grant or revoke platform-wide super admin access</li>
          <li><strong>View Activity</strong> — expand a user row to see games played, communities joined, and account creation date</li>
        </ul>
        <p>The table uses pagination for large user lists. You cannot demote yourself.</p>
      </div>
    )
  },
];

// ── Commissioner Guide Sections ──────────────────────────────────────────────
const commissionerSections = [
  {
    id: 'cm-intro',
    tab: 'Commissioner Guide',
    title: 'Becoming a Commissioner',
    searchText: 'commissioner create community league manage dashboard access overview',
    content: (
      <div>
        <p>When you <strong>create</strong> a community, you automatically become its Commissioner. Only the Commissioner can access the Commissioner Dashboard.</p>
        <h3>Opening the Commissioner Dashboard</h3>
        <ol>
          <li>Click <strong>Menu → My Leagues</strong></li>
          <li>Click your community card</li>
          <li>Click <strong>Manage Community</strong> on the detail page</li>
        </ol>
        <p>The dashboard has six tabs: <strong>Overview · Announcements · Questions · Members · Settings · Analytics</strong></p>
      </div>
    )
  },
  {
    id: 'cm-overview',
    tab: 'Commissioner Guide',
    title: 'Overview Tab',
    searchText: 'overview stats total games active members question bank size import history',
    content: (
      <div>
        <p>The Overview tab shows three key stats:</p>
        <ul>
          <li><strong>Total Games</strong> — games played using community questions</li>
          <li><strong>Active Members</strong> — members who have played at least one community game</li>
          <li><strong>Question Bank Size</strong> — total questions in the bank</li>
        </ul>
        <p>It also shows an <strong>Import History</strong> log of recent bulk CSV uploads with timestamps and counts.</p>
      </div>
    )
  },
  {
    id: 'cm-questions',
    tab: 'Commissioner Guide',
    title: 'Questions Tab',
    searchText: 'questions tab manage search filter category difficulty view add edit delete question bank',
    content: (
      <div>
        <p>The Questions tab is the main question management area.</p>
        <h3>Search &amp; Filter</h3>
        <ul>
          <li><strong>Search bar</strong> — searches question text, answers, and category simultaneously</li>
          <li><strong>Category filter</strong> — show only a specific category</li>
          <li><strong>Difficulty filter</strong> — filter by Easy / Medium / Hard</li>
          <li><strong>Tag filter</strong> — click any tag chip to filter to questions with that tag</li>
        </ul>
        <p>All filters combine. The count of matching questions updates in real time.</p>
        <h3>Selecting Questions for Bulk Actions</h3>
        <ul>
          <li>Check the checkbox on any question card to select it</li>
          <li>Use <strong>Select All</strong> to select all visible (filtered) questions</li>
          <li>With questions selected: <strong>Delete Selected</strong> or <strong>Bulk Tag</strong> buttons appear</li>
        </ul>
      </div>
    )
  },
  {
    id: 'cm-csv',
    tab: 'Commissioner Guide',
    title: 'CSV Bulk Upload',
    searchText: 'csv bulk upload import questions template download validate preview file format columns',
    content: (
      <div>
        <h3>Required CSV Columns</h3>
        <table>
          <thead><tr><th>Column</th><th>Example</th></tr></thead>
          <tbody>
            <tr><td><code>question_text</code></td><td>What is the capital of France?</td></tr>
            <tr><td><code>correct_answer</code></td><td>Paris</td></tr>
            <tr><td><code>incorrect_answer_1</code></td><td>London</td></tr>
            <tr><td><code>incorrect_answer_2</code></td><td>Berlin</td></tr>
            <tr><td><code>incorrect_answer_3</code></td><td>Madrid</td></tr>
            <tr><td><code>category</code></td><td>Geography</td></tr>
            <tr><td><code>difficulty</code></td><td>easy (must be easy, medium, or hard)</td></tr>
          </tbody>
        </table>
        <h3>Upload Process</h3>
        <ol>
          <li>Click <strong>Download Template</strong> to get the correct CSV format</li>
          <li>Fill in your questions and save as <code>.csv</code></li>
          <li>Click <strong>Upload CSV</strong> and select your file</li>
          <li>The app validates every row — errors are shown per-row</li>
          <li>A preview of the first 5 valid rows appears</li>
          <li>Click <strong>Import X Questions</strong> to confirm</li>
        </ol>
        <p>You can also <strong>Export to CSV</strong> to download your full question bank.</p>
      </div>
    )
  },
  {
    id: 'cm-tags',
    tab: 'Commissioner Guide',
    title: 'Tags & Bulk Operations',
    searchText: 'tags bulk tag add remove filter label organize selected questions bulk delete',
    content: (
      <div>
        <h3>Adding a Tag to One Question</h3>
        <ol>
          <li>Click <strong>+ Add Tag</strong> on any question card</li>
          <li>Type the tag name and press Enter</li>
        </ol>
        <h3>Bulk Tagging</h3>
        <ol>
          <li>Select one or more questions using the checkboxes</li>
          <li>Click <strong>Bulk Tag</strong></li>
          <li>Type a tag name and click <strong>Add Tag to Selected</strong></li>
          <li>Or click an existing tag to <strong>Remove Tag from Selected</strong></li>
        </ol>
        <h3>Bulk Delete</h3>
        <p>Select questions and click <strong>Delete Selected</strong>. Confirm in the dialog. Deletion is permanent.</p>
      </div>
    )
  },
  {
    id: 'cm-versions',
    tab: 'Commissioner Guide',
    title: 'Version History',
    searchText: 'version history restore undo change edit question previous snapshot',
    content: (
      <div>
        <p>Each question stores up to 10 versions of its history (edits, tag changes, restores).</p>
        <h3>Viewing History</h3>
        <ol>
          <li>Click <strong>History</strong> on any question card</li>
          <li>A modal shows all recorded versions with timestamps and what changed</li>
        </ol>
        <h3>Restoring a Version</h3>
        <ol>
          <li>Click <strong>Restore</strong> on any version in the history modal</li>
          <li>Confirm in the dialog</li>
          <li>The question reverts to that version (a new history entry is created)</li>
        </ol>
      </div>
    )
  },
  {
    id: 'cm-templates',
    tab: 'Commissioner Guide',
    title: 'Question Templates',
    searchText: 'templates save template create from template reuse question structure',
    content: (
      <div>
        <p>Templates let you save question structures for reuse within your community.</p>
        <h3>Saving a Template</h3>
        <ol>
          <li>Click <strong>Save as Template</strong> on any question card</li>
          <li>Enter a name and click OK</li>
        </ol>
        <h3>Creating a Question from a Template</h3>
        <ol>
          <li>Find the template in the Templates section of the Questions tab</li>
          <li>Click <strong>Use Template</strong> and confirm</li>
          <li>A new question is added with the template&apos;s content</li>
        </ol>
        <p>Deleting a template does not affect questions already created from it.</p>
      </div>
    )
  },
  {
    id: 'cm-members-settings',
    tab: 'Commissioner Guide',
    title: 'Members & Settings Tabs',
    searchText: 'members remove kick settings name season dates max members cap invite code regenerate timer marketplace visibility description',
    content: (
      <div>
        <h3>Members Tab</h3>
        <p>Shows all members with their username and join date. To remove a member:</p>
        <ol>
          <li>Find the member in the table</li>
          <li>Click <strong>Remove</strong> and confirm</li>
        </ol>
        <p>Removing a member does not delete their past game history.</p>
        <h3>Settings Tab</h3>
        <table>
          <thead><tr><th>Field</th><th>Description</th></tr></thead>
          <tbody>
            <tr><td>Community Name</td><td>Display name shown to all members</td></tr>
            <tr><td>Season Start / End</td><td>Season date range</td></tr>
            <tr><td>Max Members</td><td>Member cap (default 50)</td></tr>
            <tr><td>Timer Enabled</td><td>Toggle to enable per-question countdown timer for community quizzes</td></tr>
            <tr><td>Timer Seconds</td><td>Time per question (15s–120s) when timer is enabled</td></tr>
            <tr><td>Marketplace Visibility</td><td>Toggle Public/Private — public communities appear in the Marketplace</td></tr>
            <tr><td>Description</td><td>Community description displayed on the Marketplace listing</td></tr>
            <tr><td>Invite Code</td><td>Displayed with a <strong>Regenerate</strong> button to create a new code</td></tr>
          </tbody>
        </table>
        <p>Click <strong>Save Settings</strong> to apply changes.</p>
        <h3>Regenerating the Invite Code</h3>
        <p>Click the <strong>Regenerate</strong> button next to the current invite code. Confirm in the dialog — the old code will <strong>stop working immediately</strong>. Share the new code with members who haven&apos;t joined yet.</p>
      </div>
    )
  },
  {
    id: 'cm-announcements',
    tab: 'Commissioner Guide',
    title: 'Announcements',
    searchText: 'announcements post pin unpin edit delete news community bulletin new badge',
    content: (
      <div>
        <p>The Announcements tab lets you post messages visible to all community members on the Community Detail page.</p>
        <h3>Posting an Announcement</h3>
        <ol>
          <li>Go to the <strong>Announcements</strong> tab in the Commissioner Dashboard</li>
          <li>Type a title and content in the form</li>
          <li>Click <strong>Post Announcement</strong></li>
        </ol>
        <h3>Managing Announcements</h3>
        <ul>
          <li><strong>Pin/Unpin</strong> — pinned announcements always appear at the top of the list</li>
          <li><strong>Edit</strong> — update the title or content of an existing announcement</li>
          <li><strong>Delete</strong> — permanently remove an announcement</li>
        </ul>
        <p>Announcements less than 48 hours old display a <strong>"New"</strong> badge to members.</p>
      </div>
    )
  },
  {
    id: 'cm-timer',
    tab: 'Commissioner Guide',
    title: 'Per-Question Timer Settings',
    searchText: 'timer countdown seconds per question auto submit timeout warning community settings configure',
    content: (
      <div>
        <p>You can configure a per-question countdown timer for all quizzes using your community&apos;s questions.</p>
        <h3>Enabling the Timer</h3>
        <ol>
          <li>Go to the <strong>Settings</strong> tab in the Commissioner Dashboard</li>
          <li>Toggle <strong>Timer Enabled</strong> on</li>
          <li>Set the <strong>Timer Seconds</strong> (15s to 120s)</li>
          <li>Click <strong>Save Settings</strong></li>
        </ol>
        <h3>How it Works for Players</h3>
        <ul>
          <li>A countdown bar appears at the top of each question</li>
          <li>The bar turns <strong>red</strong> when under 5 seconds remain</li>
          <li>If time runs out, the question auto-submits as unanswered</li>
          <li>Using the 50/50 hint adds 3 bonus seconds</li>
        </ul>
      </div>
    )
  },
  {
    id: 'cm-marketplace-visibility',
    tab: 'Commissioner Guide',
    title: 'Marketplace Visibility',
    searchText: 'marketplace visibility public private listing description browse discover',
    content: (
      <div>
        <p>Control whether your community appears in the public Community Marketplace.</p>
        <h3>Making Your Community Public</h3>
        <ol>
          <li>Go to the <strong>Settings</strong> tab in the Commissioner Dashboard</li>
          <li>Set <strong>Marketplace Visibility</strong> to <strong>Public</strong></li>
          <li>Add a <strong>Description</strong> so players know what your community is about</li>
          <li>Click <strong>Save Settings</strong></li>
        </ol>
        <p>Public communities can be found and joined by any user via Menu → My Leagues → Browse Marketplace, without needing an invite code.</p>
        <p>Set visibility to <strong>Private</strong> to hide from the marketplace — members can still join with an invite code.</p>
      </div>
    )
  },
];

// ── FAQ Sections ─────────────────────────────────────────────────────────────
const faqSections = [
  {
    id: 'faq-main',
    tab: 'FAQ',
    title: 'Frequently Asked Questions',
    searchText: 'faq frequently asked questions help common problems password leaderboard invite code achievement hint quiz source stats commissioner profile multiplayer room marketplace announcements timer admin',
    content: (
      <div>
        <p className="faq-q">How do I reset my password?</p>
        <p className="faq-a">On the login screen, click <strong>Forgot Password?</strong> below the login form. Enter your email and check your inbox for a reset link (check spam if it doesn&apos;t appear within a few minutes).</p>

        <p className="faq-q">Why am I not showing up on the leaderboard?</p>
        <p className="faq-a">Two reasons: (1) Your <strong>leaderboard visibility</strong> may be turned off — go to Menu → Settings and enable it. (2) Only <strong>public</strong> games count toward the leaderboard. The default visibility for new games is set at the platform level.</p>

        <p className="faq-q">Where do I find my community&apos;s invite code?</p>
        <p className="faq-a">Go to Menu → My Leagues, click your community card, and the invite code is shown on the detail page. Share this 8-character code with anyone you want to invite.</p>

        <p className="faq-q">Why isn&apos;t my Perfect Score badge unlocking?</p>
        <p className="faq-a">The Perfect Score badge requires scoring <strong>10/10 on a 10-question game</strong> specifically. Games with 3, 5, 15, or 20 questions do not count toward this badge. Set your question count to 10 when configuring a quiz.</p>

        <p className="faq-q">How does the 50/50 hint work?</p>
        <p className="faq-a">Click <strong>Use Hint (50/50)</strong> before selecting your answer. Two incorrect answer choices are removed from the grid, leaving the correct answer and one decoy. You get one hint per question — you cannot use it after selecting an answer.</p>

        <p className="faq-q">What are the different quiz sources?</p>
        <p className="faq-a">
          <strong>Trivia API</strong> — live questions from The Trivia API (always available, thousands of questions).<br />
          <strong>Community Questions Only</strong> — questions uploaded by your community commissioner (only available if you&apos;re in a community).<br />
          <strong>Approved Custom Questions</strong> — user-submitted questions that have been approved by an admin.<br />
          <strong>Mixed</strong> — all sources combined (admin accounts only).
        </p>

        <p className="faq-q">How do I submit my own trivia question?</p>
        <p className="faq-a">Click <strong>Menu → Create Question</strong>. Fill in the question, correct answer, three incorrect answers, category, and difficulty. Click <strong>Submit for Review</strong>. An admin will approve or reject it — approved questions appear in the Approved Custom Questions source.</p>

        <p className="faq-q">How do I become a Commissioner?</p>
        <p className="faq-a">Create a community. Go to Menu → My Leagues, click <strong>Create Community</strong>, enter a name, and click Create. You are automatically assigned as Commissioner of any community you create.</p>

        <p className="faq-q">My average score shows 0% even though I&apos;ve played games — why?</p>
        <p className="faq-a">This can happen if your games have no recorded answers or if there was a data sync issue. Try playing a new complete game. If it persists, check your internet connection during quiz completion — games need a stable connection to save properly.</p>

        <p className="faq-q">The app looks outdated / my recent changes aren&apos;t showing. What do I do?</p>
        <p className="faq-a">The app is hosted on GitHub Pages which caches files aggressively. Do a hard refresh: <code>Ctrl+Shift+R</code> on Windows/Linux, or <code>Cmd+Shift+R</code> on Mac. On mobile, clear the browser cache or open in a private/incognito window.</p>

        <p className="faq-q">How do I find communities to join without an invite code?</p>
        <p className="faq-a">Go to <strong>Menu → My Leagues → Browse Marketplace</strong>. Public communities are listed with their description, member count, and a Join button. Use the search bar and category filters to find communities that interest you.</p>

        <p className="faq-q">How do I create a multiplayer game room?</p>
        <p className="faq-a">Go to <strong>Menu → Multiplayer</strong> and click <strong>Create Room</strong>. Configure the game settings (source, category, difficulty, timer, etc.), then click <strong>Create Room</strong>. Share the 6-character room code with friends, or they can find your room in the Open Rooms list.</p>

        <p className="faq-q">Can I join a multiplayer room without a code?</p>
        <p className="faq-a">Yes! On the Multiplayer screen, scroll down to the <strong>Open Rooms</strong> section. It shows all rooms currently waiting for players, with the host name, player count, and settings. Click <strong>Join</strong> on any room. The list refreshes automatically every 10 seconds.</p>

        <p className="faq-q">Why is there a timer on my quiz questions?</p>
        <p className="faq-a">Your community commissioner has enabled a per-question countdown timer. Each question must be answered within the time limit, or it auto-submits as unanswered. The timer bar turns red when under 5 seconds remain. Using the 50/50 hint adds 3 bonus seconds.</p>

        <p className="faq-q">How do I post announcements to my community?</p>
        <p className="faq-a">Open the Commissioner Dashboard (Menu → My Leagues → your community → Manage Community). Go to the <strong>Announcements</strong> tab, type your title and content, and click <strong>Post Announcement</strong>. You can pin, edit, or delete announcements from the same tab.</p>

        <p className="faq-q">How do I regenerate my community&apos;s invite code?</p>
        <p className="faq-a">In the Commissioner Dashboard, go to the <strong>Settings</strong> tab. Next to the current invite code, click <strong>Regenerate</strong>. Confirm in the dialog — the old code stops working immediately. Share the new code with anyone who needs it.</p>

        <p className="faq-q">How do I promote or demote users? (Super Admins)</p>
        <p className="faq-a">Go to <strong>Menu → Super Admin</strong> and click the <strong>Users</strong> tab. Search for the user, then use the action buttons to promote/demote roles or toggle super admin status. You can also expand a user row to see their activity details (games played, communities, join date).</p>
      </div>
    )
  },
];

// ── About Section ────────────────────────────────────────────────────────────
const aboutContent = [
  {
    id: 'about-project',
    tab: 'About',
    title: 'About This App',
    searchText: 'about project trivia quiz app overview description',
    content: (
      <div>
        <p>The <strong>Trivia Quiz App</strong> is a full-featured trivia platform with community leagues, custom question banks, achievements, and performance analytics.</p>
        <p>It was built as a personal project and is hosted for free on GitHub Pages with Supabase as the backend.</p>
        <p>
          <a href="https://gstreet-ops.github.io/trivia-app" target="_blank" rel="noopener noreferrer">
            🔗 Open the live app
          </a>
        </p>
      </div>
    )
  },
  {
    id: 'about-tech',
    tab: 'About',
    title: 'Tech Stack',
    searchText: 'technology stack react supabase github pages recharts papaparse trivia api postgresql',
    content: (
      <div>
        <table>
          <thead><tr><th>Layer</th><th>Technology</th></tr></thead>
          <tbody>
            <tr><td>Frontend</td><td>React 18</td></tr>
            <tr><td>Database &amp; Auth</td><td>Supabase (PostgreSQL + Auth + RLS + Realtime)</td></tr>
            <tr><td>Charts</td><td>Recharts 3</td></tr>
            <tr><td>CSV Parsing</td><td>PapaParse 5</td></tr>
            <tr><td>Hosting</td><td>GitHub Pages</td></tr>
            <tr><td>Question API</td><td>The Trivia API v2 (https://the-trivia-api.com)</td></tr>
          </tbody>
        </table>
      </div>
    )
  },
  {
    id: 'about-github',
    tab: 'About',
    title: 'Source Code & Documentation',
    searchText: 'github source code documentation readme docs repository open source',
    content: (
      <div>
        <p>The source code and full documentation are available on GitHub:</p>
        <ul>
          <li>
            <a href="https://github.com/gstreet-ops/trivia-app" target="_blank" rel="noopener noreferrer">
              📂 GitHub Repository
            </a>
          </li>
          <li>
            <a href="https://github.com/gstreet-ops/trivia-app/blob/main/README.md" target="_blank" rel="noopener noreferrer">
              📄 README — Setup &amp; Deployment Guide
            </a>
          </li>
          <li>
            <a href="https://github.com/gstreet-ops/trivia-app/tree/main/docs" target="_blank" rel="noopener noreferrer">
              📁 Full Documentation (docs/)
            </a>
          </li>
          <li>
            <a href="https://github.com/gstreet-ops/trivia-app/blob/main/docs/DATABASE_SCHEMA.md" target="_blank" rel="noopener noreferrer">
              🗄️ Database Schema
            </a>
          </li>
          <li>
            <a href="https://github.com/gstreet-ops/trivia-app/blob/main/docs/ROADMAP.md" target="_blank" rel="noopener noreferrer">
              🗺️ Roadmap &amp; Known Issues
            </a>
          </li>
        </ul>
      </div>
    )
  },
];

// ── All sections combined for search ────────────────────────────────────────
const allSections = [...userGuideSections, ...commissionerSections, ...faqSections, ...aboutContent];

const TABS = [
  { key: 'user', label: 'User Guide', sections: userGuideSections },
  { key: 'commissioner', label: 'Commissioner Guide', sections: commissionerSections },
  { key: 'faq', label: 'FAQ', sections: faqSections },
  { key: 'about', label: 'About', sections: aboutContent },
];

// ── Component ────────────────────────────────────────────────────────────────
function HelpCenter({ onBack }) {
  const [activeTab, setActiveTab] = useState('user');
  const [searchQuery, setSearchQuery] = useState('');

  const trimmedQuery = searchQuery.trim().toLowerCase();

  const searchResults = trimmedQuery
    ? allSections.filter(s =>
        s.title.toLowerCase().includes(trimmedQuery) ||
        s.searchText.toLowerCase().includes(trimmedQuery)
      )
    : null;

  const displaySections = searchResults || TABS.find(t => t.key === activeTab).sections;

  return (
    <div className="help-center">
      <button className="back-btn" onClick={onBack}>← Back to Dashboard</button>

      <div className="help-header">
        <h1 className="help-title">Help Center</h1>
        <a
          href="https://github.com/gstreet-ops/trivia-app/tree/main/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="help-github-link"
        >
          View Full Docs on GitHub <span aria-hidden="true">↗</span>
        </a>
      </div>

      <div className="help-search-bar">
        <span className="help-search-icon" aria-hidden="true">🔍</span>
        <input
          type="search"
          className="help-search-input"
          placeholder="Search help topics... (e.g. quiz, leaderboard, invite code)"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          aria-label="Search help topics"
        />
        {searchQuery && (
          <button className="help-search-clear" onClick={() => setSearchQuery('')} aria-label="Clear search">✕</button>
        )}
      </div>

      {!searchQuery && (
        <div className="help-tabs" role="tablist" aria-label="Help topics">
          {TABS.map(tab => (
            <button
              key={tab.key}
              id={`help-tab-${tab.key}`}
              className={`help-tab${activeTab === tab.key ? ' active' : ''}`}
              role="tab"
              aria-selected={activeTab === tab.key}
              aria-controls={`help-panel-${tab.key}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {searchQuery && (
        <p className="help-search-count">
          {searchResults.length === 0
            ? `No results for "${searchQuery}"`
            : `${searchResults.length} result${searchResults.length !== 1 ? 's' : ''} for "${searchQuery}"`}
        </p>
      )}

      <div
        className="help-content"
        {...(!searchQuery ? {
          role: 'tabpanel',
          id: `help-panel-${activeTab}`,
          'aria-labelledby': `help-tab-${activeTab}`
        } : {})}
      >
        {displaySections.length === 0 && searchQuery && (
          <div className="help-no-results">
            <p>No results found for <strong>"{searchQuery}"</strong>.</p>
            <p>Try different keywords, or browse a tab above by clearing the search.</p>
          </div>
        )}

        {displaySections.map(section => (
          <div key={section.id} className="help-section">
            {searchQuery && <span className="help-source-tag">{section.tab}</span>}
            <h2 className="help-section-title">{section.title}</h2>
            <div className="help-section-body">{section.content}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default HelpCenter;

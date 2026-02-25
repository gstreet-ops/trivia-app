# Commissioner Guide

A Commissioner is the creator and manager of a community (league). This guide covers all Commissioner Dashboard features.

---

## Becoming a Commissioner

When you **create** a community (via My Leagues → Create Community), you automatically become its Commissioner. The community creator is stored as `commissioner_id` on the communities table.

Only the Commissioner of a community can access its Commissioner Dashboard.

---

## Accessing the Commissioner Dashboard

1. Click **Menu → My Leagues**
2. Click on your community card
3. On the Community Detail page, click **Manage Community**

The Commissioner Dashboard is organized into six tabs:

| Tab | Contents |
|-----|---------|
| **Overview** | Stats summary + import history |
| **Announcements** | Post, edit, pin/unpin, delete announcements |
| **Questions** | Full question bank management (action bar with Add, Import CSV, Generate with AI, Export) |
| **Members** | Member list + remove member |
| **Settings** | Edit community name, dates, member cap, appearance |
| **Analytics** | Per-category and per-difficulty performance charts |

---

## Overview Tab

Displays three key stats:

- **Total Games** — number of games played by any member using community questions
- **Active Members** — members who have played at least one community game
- **Question Bank Size** — total questions in the community question bank

Also shows an **Import History** log of recent bulk CSV imports (timestamp and count).

---

## Questions Tab

The Questions tab is the main question management area. At the top is an **action bar** with four buttons:

- **➕ Add** — opens a modal to add a single question (question text, answers, category, difficulty, tags, image, video, explanation)
- **📥 Import CSV** — opens a modal to upload a CSV file with bulk questions
- **✨ Generate with AI** — opens the Question Generator wizard (build AI prompts from 7 source types, copy to your AI tool, import results via CSV)
- **📤 Export** — exports all questions to CSV directly (no modal)

Below the action bar is the question list displayed as compact table rows. Each row shows the question text (truncated), correct answer, category, difficulty, source, and media indicators at a glance. Click any row to expand it and see full details.

### Viewing and Filtering Questions

- **Search bar** — searches question text, answers, and category simultaneously
- **Category filter** — dropdown to show only a specific category
- **Difficulty filter** — dropdown to filter by Easy / Medium / Hard
- **Tag filter** — click any tag chip to filter to questions with that tag
- **Source filter** — filter by Manual, CSV Import, or AI Generated
- **Pagination** — results are paginated (25, 50, or 100 per page) with Previous/Next controls

All filters can be combined. Changing any filter resets to page 1.

### Expanding a Question

Click any question row to expand it inline. The expanded panel shows:
- Full question text (no truncation)
- All 4 answers as colored pills (green = correct, pink = incorrect)
- Tags with add/remove capability
- Explanation (if present) in a highlighted box
- Media thumbnails (images and YouTube videos)
- Metadata row (date added, source, version number)
- Action buttons: Media, Template, History, Delete

Only one question can be expanded at a time — clicking another row collapses the previous one.

### Adding a Single Question

Click **➕ Add** in the action bar to open the Add Question modal. Fill in:
- **Question text**, **Correct answer**, **3 incorrect answers** (required)
- **Category** and **Difficulty** (required)
- **Tags** (optional)
- **Explanation** — optional text explaining why the correct answer is right (shown to players after answering)
- **Image** — upload an image to display above the question
- **Video** — paste a YouTube URL to embed above the question

Click "Add Question". On success, the modal closes and the question appears in the list.

### Bulk CSV Upload

Click **📥 Import CSV** in the action bar to open the import modal:

1. Click **Download Template** to get the correct CSV format
2. Fill in your questions spreadsheet with these required columns:

   | Column | Example |
   |--------|---------|
   | `question_text` | `What is the capital of France?` |
   | `correct_answer` | `Paris` |
   | `incorrect_answer_1` | `London` |
   | `incorrect_answer_2` | `Berlin` |
   | `incorrect_answer_3` | `Madrid` |
   | `category` | `Geography` |
   | `difficulty` | `easy` |

   - `difficulty` must be exactly `easy`, `medium`, or `hard` (lowercase)
   - All 7 columns are required; rows with missing fields will be flagged as errors

   Optional columns: `explanation`, `image_url`, `video_url`

3. Save as `.csv` format
4. Click **Upload CSV** and select your file
5. The app validates every row and shows:
   - Row-level errors (any invalid rows)
   - A preview of the first 5 valid rows
6. If the preview looks correct, click **Import X Questions**
7. Confirm the import in the dialog

### Exporting Questions

Click **Export to CSV** to download the full question bank as a CSV file. The filename includes the community name and today's date.

### Selecting Questions (Bulk Operations)

- Check the checkbox on any question row to select it
- Check the header checkbox to select all questions on the current page
- When all on the current page are selected, a banner offers to **select all questions across all pages**
- When questions are selected, a floating action bar appears at the bottom with:
  - **Add Tag** — type a tag name to add to all selected questions
  - **Remove Tag** — click existing tag chips to remove from selected questions
  - **Delete Selected** — permanently deletes all selected questions (with confirmation)
  - **Deselect All** — clears the selection

### Editing a Question

Click the **Edit** button on any question card to enter inline editing mode for that question. Edit text, correct answer, incorrect answers, category, difficulty, then save.

Each edit creates a version history entry automatically.

### Deleting a Single Question

Click the **Delete** button on any question card. Confirm the deletion in the dialog.

### Tags

Tags are custom labels you can add to questions to organize them (e.g., `season-1`, `difficult`, `review`).

**Adding a tag to one question:**
1. Click **+ Add Tag** on any question card
2. Type the tag name
3. Press Enter or click the add button

**Removing a tag from one question:**
Click the × on any tag chip on the question card.

**Bulk tagging:**
1. Select one or more questions
2. Click **Bulk Tag**
3. Type the tag name and click **Add Tag to Selected** or click an existing tag to **Remove Tag from Selected**

---

## Version History

Each question maintains a history of up to 10 changes (edits, tag additions, tag removals, version restores).

To view version history for a question:
1. Click **History** on the question card
2. A modal shows all recorded versions with timestamps and what changed
3. Click **Restore** on any version to revert the question to that state

Restoring a version creates a new version history entry with `change_type: 'version_restored'`.

---

## Templates

Templates let you save question structures for reuse.

**Saving a question as a template:**
1. Click **Save as Template** on any question card
2. Enter a name for the template
3. Click OK

**Creating a question from a template:**
1. In the Templates section (Questions tab), find the template
2. Click **Use Template**
3. A new question is created with the template's content (confirm in the dialog)

**Deleting a template:**
Click **Delete** on any template. This only removes the template, not any questions created from it.

---

## Question Generator (Generate with AI)

Click **Generate with AI** in the Questions tab action bar to open the Question Generator wizard. This tool builds optimized AI prompts that you copy into your preferred AI chat tool (ChatGPT, Claude, Gemini, etc.) to generate CSV-formatted questions ready for bulk import. The generator makes zero API calls — it only builds prompt strings.

### Step 1: Choose a Source

Select one of 7 source types. Each card shows a badge indicating its mode:

| Source | Mode | Description |
|--------|------|-------------|
| **Web Search** | AI-accessible | Generate from any topic using AI web search |
| **Website URL** | AI-accessible | Generate from a specific webpage |
| **YouTube Video** | AI-accessible | Generate from video transcripts |
| **Document / Text** | Paste-assisted | Generate from pasted or uploaded document content |
| **Spreadsheet / CSV** | Paste-assisted | Transform existing data into questions |
| **Study Notes** | Paste-assisted | Create questions from notes or outlines |
| **Social Media** | Paste-assisted | Generate from social media posts |

- **AI-accessible** sources — the AI will access the content directly from the prompt
- **Paste-assisted** sources — upload your content to the AI chat first, or paste it into the generator

Clicking a source card automatically advances to Step 2.

### Step 2: Source Details

A mode-specific tip appears at the top explaining whether to paste content directly or upload to the AI chat separately. Fill in the source-specific fields (topic, URL, pasted content, platform, etc.). Required fields are marked with an asterisk. Click **Next** to continue.

### Step 3: Question Settings

Configure your generation parameters:

- **Category** — dropdown with preset categories (General Knowledge, Film, Music, Geography, History, Sports, Science & Nature, Arts & Literature) or choose **Custom** to enter your own
- **Number of Questions** — pill-shaped button group: 10, 20, 30, or 60
- **Difficulty Distribution** — toggle between **Equal** (auto-balanced across easy/medium/hard with remainder to easy first) and **Custom** (set exact counts per difficulty level; must sum to total)
- **Include Explanations** — toggle on/off (default: on); adds a 1-2 sentence explanation column to the CSV output
- **Additional Instructions** — optional free-text for extra guidance (e.g., "avoid date questions", "include humor")

Click **Generate Prompt** to build the prompt.

### Step 4: Your Prompt is Ready

The final step shows three sections:
1. **How to Use This Prompt** — numbered instructions specific to your source type and mode
2. **Your Generated Prompt** — displayed in a monospace code block with a **Copy** button (shows "Copied!" for 2 seconds)
3. **After You Get Results** — step-by-step instructions to import the CSV output into your question bank

The generated prompt includes CSV format rules, quality requirements, and difficulty definitions to ensure high-quality output from any AI tool.

### Navigation

- Use **Back** buttons to return to previous steps and adjust settings without losing your choices
- **Generate Another** resets the wizard to start fresh from Step 1
- **Back to Settings** returns to Step 3 to tweak parameters
- **Back to Questions** (top of page) closes the generator and returns to the normal Questions tab

---

## Media Questions

You can attach images and YouTube videos to questions. Media appears above the question text during quizzes and multiplayer.

### Adding Media to a Question

1. Expand a question in the Questions tab
2. Click **Media**
3. **Image**: Click **Upload Image** to select a file. The image is uploaded to Supabase Storage and a thumbnail preview appears.
4. **Video**: Paste a YouTube URL. A thumbnail preview appears.

Media indicators (image and video icons) are shown on compact question rows so you can see at a glance which questions have media.

### Removing Media

In the media editor, click **Remove** next to the image or video to remove it from the question.

---

## Members Tab

Shows a table of all current community members with their username and join date.

**Removing a member:**
1. Find the member in the table
2. Click **Remove**
3. Confirm the removal in the dialog

The member is immediately removed from `community_members`. They will no longer appear on the community leaderboard and cannot access community questions.

> Removing a member does not delete their game history. Their past community games remain in the database.

---

## Settings Tab

Edit community configuration:

| Field | Description |
|-------|-------------|
| **Community Name** | The display name shown to all members |
| **Season Start** | Season start date (date picker) |
| **Season End** | Season end date (date picker) |
| **Max Members** | Member cap (default: 50) |
| **Timer** | Enable/disable per-question countdown timer and set duration (15–120 seconds) |
| **Marketplace Visibility** | Toggle between public (listed in Marketplace) and private (invite-only) |
| **Description** | Community description shown in the Marketplace |

Click **Save Settings** to apply. Changes take effect immediately for all members.

### Invite Code

The invite code is shown in Settings. Click **Regenerate** to generate a new 8-character invite code. The old code immediately stops working.

### Community Theming

Customize your community's appearance:

- **Theme Color** — pick a color from the color picker or select a preset. Applied to the community detail page header, marketplace card, and communities list card.
- **Logo** — upload a logo image displayed on the community detail page and cards
- **Banner** — upload a banner image shown at the top of the community detail page
- **Welcome Message** — custom text displayed to members on the community detail page

### Season Management

Commissioners can reset seasons to start fresh leaderboard rankings:

1. Go to the **Settings** tab
2. Click **Reset Season**
3. Confirm in the dialog

This:
- Archives the current season's leaderboard (viewable in Season History on the community detail page)
- Increments the season number
- Resets the season start/end dates
- The community leaderboard starts fresh — only games from the new season count

Past season leaderboards are preserved and viewable by all community members.

---

## Analytics Tab

Shows performance analytics for your community's question bank (requires at least one member to have played community questions).

Analytics include:

- **Games played** for this community
- **Performance by category** — bar chart showing average scores per category
- **Performance by difficulty** — breakdown of how members perform on Easy / Medium / Hard
- **Hardest questions** — questions with the lowest correct-answer rate
- **Easiest questions** — questions with the highest correct-answer rate
- **Most-used questions** — questions that have appeared most often in games

---

## Sharing Your Community

Share the **Invite Code** with anyone you want to invite. It's an 8-character uppercase code (e.g., `XK7P2QMN`). Members enter it on the **Join Community** screen.

The invite code is only visible to the commissioner. Other members see "Ask your commissioner for the invite code." You can regenerate the invite code from Settings if needed — the old code immediately stops working.

Alternatively, set your community to **public** visibility in Settings so it appears in the Community Marketplace, where users can join directly without a code.

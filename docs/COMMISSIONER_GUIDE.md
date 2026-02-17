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

The Commissioner Dashboard is organized into five tabs:

| Tab | Contents |
|-----|---------|
| **Overview** | Stats summary + import history |
| **Questions** | Full question bank management |
| **Members** | Member list + remove member |
| **Settings** | Edit community name, dates, member cap |
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

The Questions tab is the main question management area.

### Viewing and Filtering Questions

- **Search bar** — searches question text, answers, and category simultaneously
- **Category filter** — dropdown to show only a specific category
- **Difficulty filter** — dropdown to filter by Easy / Medium / Hard
- **Tag filter** — click any tag chip to filter to questions with that tag

All filters can be combined.

### Adding a Single Question

Questions can be added individually by creating from a template (see Templates section below). To add a raw single question, use the bulk upload with a 1-row CSV.

### Bulk CSV Upload

To import many questions at once:

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

- Check the checkbox on any question card to select it
- Check **Select All** to select all visible (filtered) questions
- When questions are selected, bulk action buttons appear:
  - **Delete Selected** — permanently deletes all selected questions (with confirmation)
  - **Bulk Tag** — opens a panel to add or remove a tag across all selected questions

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

Click **Save Settings** to apply. Changes take effect immediately for all members.

> The **Invite Code** is generated at creation and cannot be changed through the UI.

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

Share the **Invite Code** shown on the community detail page with anyone you want to invite. It's an 8-character uppercase code (e.g., `XK7P2QMN`). Members enter it on the **Join Community** screen.

The invite code cannot be changed once the community is created. Keep it secure — anyone with the code can join.

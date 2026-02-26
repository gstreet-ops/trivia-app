---
name: trivia-question-generator
description: >
  Generates trivia questions for the GStreet trivia platform. Use this skill whenever the user
  wants to create, generate, or add trivia questions to a community — especially when they mention
  a topic, category, subject area, or say things like "generate questions about X", "make me some
  trivia for Y", "create questions for my community", "I need questions on Z", or "bulk generate
  questions". This skill web-searches the topic for accuracy, produces balanced easy/medium/hard
  difficulty distributions, adds answer explanations, and outputs SQL or JSON ready to insert into
  the Supabase community_questions table. Always use this skill for any question generation task,
  even if the user only asks for a few questions or mentions a specific category.
---

# Trivia Question Generator

Generates accurate, well-crafted trivia questions ready for the community_questions table.
Questions are research-backed, balanced across difficulty levels, and include explanations.

## Parameters

Collect before generating (ask if missing):

| Parameter | Required | Default | Notes |
|-----------|----------|---------|-------|
| topic | Yes | — | Subject to generate questions about |
| community_id | Yes | — | UUID of the target community |
| count | No | 9 | Total questions — rounds up to multiple of 3 |
| category | No | Inferred | Must match community categories or sensible label |
| custom_categories | No | — | Community-specific category names if provided |

## Workflow

### Step 1 — Read question rules
Read references/question-rules.md before generating anything.

### Step 2 — Research the topic
Use web_search to research the topic before generating. Run 2-4 searches minimum:
- "[topic] facts trivia"
- "[topic] [specific subtopic]" for harder questions
- Verify any facts you are uncertain about

### Step 3 — Generate questions
Produce exactly count questions split evenly: one third easy, one third medium, one third hard.
Generate in order: all easy first, then medium, then hard.

### Step 4 — Output both formats

JSON array:
[
  {
    "community_id": "<UUID>",
    "question_text": "...",
    "correct_answer": "...",
    "incorrect_answers": ["...", "...", "..."],
    "category": "...",
    "difficulty": "easy|medium|hard",
    "explanation": "..."
  }
]

SQL INSERT:
INSERT INTO community_questions
  (community_id, question_text, correct_answer, incorrect_answers, category, difficulty, explanation)
VALUES
  ('<community_id>', 'Question text', 'Correct', ARRAY['Wrong1', 'Wrong2', 'Wrong3'], 'Category', 'easy', 'Explanation here');

Note: escape single quotes in SQL by doubling them.

## Quality Checklist
Before finalizing, verify each question:
- Answer confirmed via web search
- All 4 choices are plausible
- Only one unambiguously correct answer
- Explanation adds context beyond restating the answer
- Difficulty label is accurate
- No duplicates in the batch
- SQL single quotes properly escaped

## Custom Categories
If the user provides community-specific category names use those exactly.
Check communities.settings.categories for the community's defined categories.
If no category specified, infer from topic and inform the user.

## Reference Files
- references/question-rules.md — difficulty guidelines, writing rules, distractor rules
- assets/csv-template.csv — CSV format for bulk upload

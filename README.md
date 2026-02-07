# Trivia Quiz App

A modern, interactive trivia quiz application built with React. Test your knowledge across multiple categories with 10 questions per game!

## Features

✅ **10 Questions Per Game** - Each quiz contains exactly 10 questions
✅ **Multiple Categories** - Choose from General Knowledge, Science & Nature, Sports, History, Film, Music, Geography, and Computers
✅ **Three Difficulty Levels** - Easy, Medium, and Hard
✅ **Hint System** - Use a 50/50 hint once per question to remove 2 wrong answers
✅ **Score Tracking** - Track your score throughout the game
✅ **Local Leaderboard** - Save your scores and compete with yourself
✅ **Modern UI** - Clean, minimal design with smooth animations
✅ **Powered by Open Trivia Database** - Thousands of questions from a free API

## Getting Started

### Prerequisites

You need to have Node.js and npm installed on your computer. You can download them from [nodejs.org](https://nodejs.org/).

To check if you have them installed, run these commands in your terminal:

```bash
node --version
npm --version
```

### Installation

1. **Download the app files** - Extract the trivia-app folder to your computer

2. **Navigate to the project folder** in your terminal:
   ```bash
   cd trivia-app
   ```

3. **Install dependencies**:
   ```bash
   npm install
   ```
   This will download all the necessary packages. It may take a few minutes.

4. **Start the app**:
   ```bash
   npm start
   ```

5. **Open your browser** - The app should automatically open at `http://localhost:3000`

If it doesn't open automatically, just open your browser and go to that address.

## How to Play

1. **Choose a Category** - Select from 8 different trivia categories
2. **Select Difficulty** - Pick Easy, Medium, or Hard
3. **Click Start Quiz** - Begin your 10-question challenge
4. **Answer Questions** - Click on your answer choice
5. **Use Hints** - Click "Use Hint (50/50)" to eliminate 2 wrong answers (once per question)
6. **View Results** - See your final score and save it to the leaderboard
7. **Play Again** - Try to beat your high score!

## Project Structure

```
trivia-app/
├── public/
│   └── index.html          # HTML template
├── src/
│   ├── components/
│   │   ├── StartScreen.js  # Category and difficulty selection
│   │   ├── StartScreen.css
│   │   ├── QuizScreen.js   # Main quiz interface
│   │   ├── QuizScreen.css
│   │   ├── ResultsScreen.js # Results and leaderboard
│   │   └── ResultsScreen.css
│   ├── App.js              # Main app component
│   ├── App.css
│   ├── index.js            # Entry point
│   └── index.css
├── package.json            # Dependencies and scripts
└── README.md              # This file
```

## Technologies Used

- **React** - JavaScript library for building user interfaces
- **Open Trivia Database API** - Free trivia questions API
- **Local Storage** - Browser storage for leaderboard persistence
- **CSS3** - Modern styling with gradients and animations

## Customization Ideas

Want to enhance your app? Here are some ideas:

- Add a timer for each question
- Include more categories
- Add sound effects
- Create a dark mode toggle
- Add multiplayer functionality
- Integrate a backend for global leaderboards
- Add achievements/badges
- Include question explanations after answering

## Troubleshooting

**App won't start?**
- Make sure you ran `npm install` first
- Check that you're in the correct directory
- Try deleting the `node_modules` folder and running `npm install` again

**Questions not loading?**
- Check your internet connection (the app needs to connect to the Open Trivia Database API)
- Try refreshing the page

**Leaderboard not saving?**
- Make sure you're not in incognito/private browsing mode
- Check that your browser allows local storage

## License

This project is open source and available for personal and educational use.

## Credits

Questions provided by [Open Trivia Database](https://opentdb.com/)

---

Enjoy your trivia quiz! 🎯

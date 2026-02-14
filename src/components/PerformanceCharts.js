import React from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './PerformanceCharts.css';

function PerformanceCharts({ games }) {
  if (!games || games.length === 0) {
    return (<div className="performance-charts"><h3>Performance Over Time</h3><p className="no-data">Play more games to see your performance charts!</p></div>);
  }
  const scoreData = games.slice().reverse().map((game, index) => ({ game: index + 1, score: Math.round((game.score / game.total_questions) * 100), date: new Date(game.created_at).toLocaleDateString() }));
  const categoryStats = {};
  games.forEach(game => { if (!categoryStats[game.category]) categoryStats[game.category] = { total: 0, correct: 0 }; categoryStats[game.category].total += game.total_questions; categoryStats[game.category].correct += game.score; });
  const categoryData = Object.keys(categoryStats).map(category => ({ category: category.length > 15 ? category.substring(0, 15) + '...' : category, percentage: Math.round((categoryStats[category].correct / categoryStats[category].total) * 100) }));
  return (
    <div className="performance-charts">
      <h3>Performance Over Time</h3>
      <div className="chart-container">
        <h4>Score Trend</h4>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={scoreData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="game" label={{ value: 'Game #', position: 'insideBottom', offset: -5 }} />
            <YAxis label={{ value: 'Score %', angle: -90, position: 'insideLeft' }} domain={[0, 100]} />
            <Tooltip formatter={(value) => `${value}%`} />
            <Legend />
            <Line type="monotone" dataKey="score" stroke="#667eea" strokeWidth={3} dot={{ fill: '#667eea', r: 5 }} name="Score %" />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="chart-container">
        <h4>Performance by Category</h4>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={categoryData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="category" angle={-45} textAnchor="end" height={100} />
            <YAxis domain={[0, 100]} label={{ value: 'Average %', angle: -90, position: 'insideLeft' }} />
            <Tooltip formatter={(value) => `${value}%`} />
            <Legend />
            <Bar dataKey="percentage" fill="#764ba2" name="Average %" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default PerformanceCharts;

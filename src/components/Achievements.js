import React from 'react';
import './Achievements.css';
import { TargetIcon, GamepadIcon, BoltIcon, TrophyIcon, StarIcon } from './Icons';

const BADGES = {
  perfect_score: { id: 'perfect_score', name: 'Perfect Score', icon: <TargetIcon size={24} />, description: 'Get 10/10 on any quiz', color: '#f39c12' },
  five_games: { id: 'five_games', name: 'Getting Started', icon: <GamepadIcon size={24} />, description: 'Play 5 games', color: '#3498db' },
  ten_games: { id: 'ten_games', name: 'Dedicated Player', icon: <BoltIcon size={24} />, description: 'Play 10 games', color: '#e74c3c' },
  category_master: { id: 'category_master', name: 'Category Master', icon: <TrophyIcon size={24} />, description: 'Get 3 perfect scores in one category', color: '#9b59b6' },
  speed_demon: { id: 'speed_demon', name: 'Speed Demon', icon: <BoltIcon size={24} />, description: 'Complete 5 games in one day', color: '#f1c40f' },
  triple_perfect: { id: 'triple_perfect', name: 'Hat Trick', icon: <StarIcon size={24} />, description: 'Get 3 perfect scores', color: '#1abc9c' }
};

function Achievements({ earnedBadges = [] }) {
  const badges = Object.values(BADGES);
  return (
    <div className="achievements-section">
      <h3><TrophyIcon size={18} /> Achievements</h3>
      <div className="badges-grid">
        {badges.map(badge => {
          const earned = earnedBadges.includes(badge.id);
          return (
            <div key={badge.id} className={`badge-card ${earned ? 'earned' : 'locked'}`} style={{ borderColor: earned ? badge.color : '#ccc' }}>
              <div className="badge-icon" style={{ opacity: earned ? 1 : 0.3 }}>{badge.icon}</div>
              <div className="badge-name">{badge.name}</div>
              <div className="badge-description">{badge.description}</div>
              {earned && <div className="badge-earned">✓</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Achievements;
export { BADGES };

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './CommunityDetail.css';

function CommunityDetail({ communityId, currentUserId, onBack, onStartQuiz, onManageCommunity }) {
  const [community, setCommunity] = useState(null);
  const [members, setMembers] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [showAllAnnouncements, setShowAllAnnouncements] = useState(false);
  const [seasonArchives, setSeasonArchives] = useState([]);
  const [expandedArchive, setExpandedArchive] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCommunityData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [communityId]);

  const fetchCommunityData = async () => {
    try {
      const { data: communityData } = await supabase
        .from('communities')
        .select('*, profiles!communities_commissioner_id_fkey(username)')
        .eq('id', communityId)
        .single();
      setCommunity(communityData);

      const { data: membersData } = await supabase
        .from('community_members')
        .select('user_id, joined_at, profiles(username)')
        .eq('community_id', communityId)
        .order('joined_at', { ascending: true });
      setMembers(membersData || []);

      // Fetch leaderboard — filter by season_start if available
      if (communityData?.season_start) {
        const { data: seasonGames } = await supabase
          .from('games')
          .select('user_id, score, total_questions, profiles(username)')
          .eq('community_id', communityId)
          .gte('created_at', communityData.season_start);

        const playerMap = {};
        (seasonGames || []).forEach(g => {
          const uid = g.user_id;
          if (!playerMap[uid]) playerMap[uid] = { user_id: uid, username: g.profiles?.username || 'Unknown', total_score: 0, totalQ: 0, games_played: 0 };
          playerMap[uid].total_score += g.score;
          playerMap[uid].totalQ += g.total_questions;
          playerMap[uid].games_played += 1;
        });

        const lb = Object.values(playerMap)
          .map(p => ({
            ...p,
            avg_percentage: p.totalQ > 0 ? Math.round((p.total_score / p.totalQ) * 100) : 0
          }))
          .sort((a, b) => b.avg_percentage - a.avg_percentage || b.games_played - a.games_played)
          .slice(0, 10)
          .map((p, i) => ({ ...p, rank: i + 1 }));

        setLeaderboard(lb);
      } else {
        const { data: leaderboardData } = await supabase
          .from('community_leaderboards')
          .select('*')
          .eq('community_id', communityId)
          .order('rank', { ascending: true })
          .limit(10);
        setLeaderboard(leaderboardData || []);
      }

      // Fetch season archives
      const { data: archives } = await supabase
        .from('season_archives')
        .select('*')
        .eq('community_id', communityId)
        .order('season_number', { ascending: false });
      setSeasonArchives(archives || []);

      const { data: questionsData } = await supabase
        .from('community_questions')
        .select('*')
        .eq('community_id', communityId);
      setQuestions(questionsData || []);

      // Fetch announcements
      const { data: annData } = await supabase
        .from('community_announcements')
        .select('*')
        .eq('community_id', communityId)
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false });
      setAnnouncements(annData || []);

      // Fetch recent community member activity
      const memberIds = (membersData || []).map(m => m.user_id);
      if (memberIds.length > 0) {
        const { data: activityData } = await supabase
          .from('games')
          .select('id, user_id, category, difficulty, score, total_questions, created_at, profiles(username)')
          .in('user_id', memberIds)
          .eq('visibility', 'public')
          .order('created_at', { ascending: false })
          .limit(10);
        setRecentActivity(activityData || []);
      }
    } catch (error) {
      console.error('Error fetching community:', error);
    }
    setLoading(false);
  };

  const formatRelativeTime = (dateStr) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const isNew = (dateStr) => {
    return (new Date() - new Date(dateStr)) < 48 * 60 * 60 * 1000;
  };

  const isCommissioner = community?.commissioner_id === currentUserId;

  if (loading) return <div className="community-detail"><p>Loading...</p></div>;
  if (!community) return <div className="community-detail"><p>Community not found</p></div>;

  return (
    <div className="community-detail">
      <button className="back-btn" onClick={onBack}>← Back to My Leagues</button>
      
      <div className="community-header">
        <h1>{community.name}</h1>
        {community.current_season && <span className="cd-season-badge">Season {community.current_season}</span>}
        {isCommissioner && <span className="commissioner-badge">Commissioner</span>}
      </div>

      <div className="community-info">
        <div className="info-item">
          <span className="label">Commissioner:</span>
          <span className="value">{community.profiles?.username}</span>
        </div>
        <div className="info-item">
          <span className="label">Season {community.current_season || ''} Dates:</span>
          <span className="value">{new Date(community.season_start).toLocaleDateString()} – {new Date(community.season_end).toLocaleDateString()}</span>
        </div>
        <div className="info-item">
          <span className="label">Invite Code:</span>
          <span className="value code">{community.invite_code}</span>
        </div>
        <div className="info-item">
          <span className="label">Members:</span>
          <span className="value">{members.length}</span>
        </div>
        <div className="info-item">
          <span className="label">Questions:</span>
          <span className="value">{questions.length}</span>
        </div>
      </div>

      {isCommissioner && (
        <button className="manage-community-btn" onClick={() => onManageCommunity(communityId)}>
          ⚙️ Manage Community
        </button>
      )}

      <button className="start-community-quiz-btn" onClick={() => onStartQuiz(communityId)}>
        Play Community Quiz
      </button>

      {announcements.length > 0 && (
        <div className="cd-announcements">
          <h2 className="cd-ann-header">Announcements</h2>
          <div className="cd-ann-list">
            {(showAllAnnouncements ? announcements : announcements.slice(0, 5)).map(ann => (
              <div key={ann.id} className={`cd-ann-card ${ann.pinned ? 'pinned' : ''}`}>
                <div className="cd-ann-top">
                  <div className="cd-ann-title-row">
                    {ann.pinned && <span className="cd-ann-pin-icon" title="Pinned">📌</span>}
                    <strong className="cd-ann-title">{ann.title}</strong>
                    {isNew(ann.created_at) && <span className="cd-ann-new-badge">New</span>}
                  </div>
                  <span className="cd-ann-time">{formatRelativeTime(ann.created_at)}</span>
                </div>
                <p className="cd-ann-body">{ann.body}</p>
              </div>
            ))}
          </div>
          {announcements.length > 5 && !showAllAnnouncements && (
            <button className="cd-ann-view-all" onClick={() => setShowAllAnnouncements(true)}>
              View all {announcements.length} announcements
            </button>
          )}
        </div>
      )}

      <div className="community-sections">
        <div className="section">
          <h2>🏆 {community.current_season ? `Season ${community.current_season} ` : ''}Leaderboard</h2>
          {leaderboard.length === 0 ? (
            <p className="empty-message">No games played yet</p>
          ) : (
            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Player</th>
                  <th>Games</th>
                  <th>Total Score</th>
                  <th>Avg %</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map(player => (
                  <tr key={player.user_id} className={player.user_id === currentUserId ? 'current-user' : ''}>
                    <td>{player.rank}</td>
                    <td>{player.username}</td>
                    <td>{player.games_played}</td>
                    <td>{player.total_score}</td>
                    <td>{player.avg_percentage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="section">
          <h2>👥 Members ({members.length})</h2>
          <div className="members-list">
            {members.map(member => (
              <div key={member.user_id} className="member-card">
                <span className="member-name">{member.profiles?.username}</span>
                <span className="member-joined">Joined {new Date(member.joined_at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>

        {seasonArchives.length > 0 && (
          <div className="section">
            <h2>📜 Past Seasons</h2>
            {seasonArchives.map(archive => (
              <div key={archive.id} className="cd-archive-card">
                <button
                  className="cd-archive-header"
                  onClick={() => setExpandedArchive(expandedArchive === archive.id ? null : archive.id)}
                >
                  <span className="cd-archive-name">Season {archive.season_number}</span>
                  <span className="cd-archive-dates">
                    {new Date(archive.season_start).toLocaleDateString()} – {new Date(archive.season_end).toLocaleDateString()}
                  </span>
                  <span className="cd-archive-games">{archive.total_games} games</span>
                  <span className="cd-archive-chevron">{expandedArchive === archive.id ? '▾' : '▸'}</span>
                </button>
                {expandedArchive === archive.id && (
                  <div className="cd-archive-body">
                    {archive.top_player_username && (
                      <div className="cd-archive-mvp">
                        🏅 MVP: {archive.top_player_username} ({archive.top_player_avg != null ? Math.round(archive.top_player_avg) : '—'}%)
                      </div>
                    )}
                    {archive.leaderboard_snapshot && archive.leaderboard_snapshot.length > 0 ? (
                      <table className="leaderboard-table">
                        <thead>
                          <tr><th>Rank</th><th>Player</th><th>Games</th><th>Avg %</th></tr>
                        </thead>
                        <tbody>
                          {archive.leaderboard_snapshot.slice(0, 10).map((p, i) => (
                            <tr key={i}>
                              <td>{p.rank || i + 1}</td>
                              <td>{p.username}</td>
                              <td>{p.total_games}</td>
                              <td>{p.avg_score}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="empty-message">No leaderboard data</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="section">
          <h2>📋 Recent Activity</h2>
          {recentActivity.length === 0 ? (
            <p className="empty-message">No recent games from members yet</p>
          ) : (
            <div className="activity-list">
              {recentActivity.map(game => {
                const pct = game.total_questions > 0 ? Math.min(Math.round((game.score / game.total_questions) * 100), 100) : 0;
                return (
                  <div key={game.id} className="activity-card">
                    <div className="activity-top">
                      <span className="activity-user">{game.profiles?.username}</span>
                      <span className="activity-date">{new Date(game.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="activity-details">
                      <span className="activity-category">{game.category}</span>
                      <span className={`activity-difficulty diff-${game.difficulty}`}>{game.difficulty}</span>
                    </div>
                    <div className="activity-score">
                      <span className="activity-score-num">{game.score}/{game.total_questions}</span>
                      <span className="activity-pct">{pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CommunityDetail;

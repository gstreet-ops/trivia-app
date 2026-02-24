import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';
import decodeHtml from '../utils/decodeHtml';
import './MultiplayerLobby.css';

const CATEGORIES = ['General Knowledge', 'Film', 'Music', 'Geography', 'History', 'Sports', 'Science & Nature', 'Arts & Literature', 'Random/Mixed'];

const CATEGORY_API_MAP = {
  'General Knowledge': 'general_knowledge',
  'Film': 'film_and_tv',
  'Music': 'music',
  'Geography': 'geography',
  'History': 'history',
  'Sports': 'sport_and_leisure',
  'Science & Nature': 'science',
  'Arts & Literature': 'arts_and_literature',
  'Random/Mixed': null
};

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function MultiplayerLobby({ user, username, onBack }) {
  // View state
  const [view, setView] = useState('menu'); // 'menu' | 'lobby'
  const [activePanel, setActivePanel] = useState(null); // 'create' | 'join'

  // Create form
  const [roomName, setRoomName] = useState('');
  const [questionSource, setQuestionSource] = useState('trivia_api');
  const [selectedCommunity, setSelectedCommunity] = useState('');
  const [category, setCategory] = useState('General Knowledge');
  const [difficulty, setDifficulty] = useState('mixed');
  const [questionCount, setQuestionCount] = useState(10);
  const [timerSeconds, setTimerSeconds] = useState(20);
  const [speedBonus, setSpeedBonus] = useState(false);
  const [maxPlayers, setMaxPlayers] = useState(12);
  const [myCommunities, setMyCommunities] = useState([]);

  // Join form
  const [joinCode, setJoinCode] = useState('');

  // Lobby state
  const [room, setRoom] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [isHost, setIsHost] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [starting, setStarting] = useState(false);
  const [copied, setCopied] = useState(false);

  const channelRef = useRef(null);

  // Fetch communities for source selector
  useEffect(() => {
    const fetchCommunities = async () => {
      const { data } = await supabase
        .from('community_members')
        .select('community_id, communities(id, name)')
        .eq('user_id', user.id);
      setMyCommunities(data?.map(m => m.communities).filter(Boolean) || []);
    };
    fetchCommunities();
  }, [user.id]);

  // Cleanup subscriptions on unmount
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  const cleanup = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  const subscribeToRoom = useCallback((roomId) => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase.channel(`room-${roomId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'multiplayer_participants',
        filter: `room_id=eq.${roomId}`
      }, (payload) => {
        setParticipants(prev => {
          if (prev.some(p => p.id === payload.new.id)) return prev;
          return [...prev, payload.new];
        });
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'multiplayer_participants',
        filter: `room_id=eq.${roomId}`
      }, (payload) => {
        setParticipants(prev => prev.filter(p => p.id !== payload.old.id));
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'multiplayer_participants',
        filter: `room_id=eq.${roomId}`
      }, (payload) => {
        setParticipants(prev => prev.map(p => p.id === payload.new.id ? payload.new : p));
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'multiplayer_rooms',
        filter: `id=eq.${roomId}`
      }, (payload) => {
        setRoom(payload.new);
        if (payload.new.status === 'cancelled') {
          cleanup();
          setView('menu');
          setError('Room was cancelled by the host');
        }
      })
      .subscribe();

    channelRef.current = channel;
  }, [cleanup]);

  const handleCreateRoom = async () => {
    if (!roomName.trim()) { setError('Room name is required'); return; }
    if (questionSource === 'community' && !selectedCommunity) { setError('Select a community'); return; }
    setCreating(true);
    setError(null);

    try {
      // Generate unique room code with retry
      let code = generateRoomCode();
      let attempts = 0;
      while (attempts < 5) {
        const { data: existing } = await supabase
          .from('multiplayer_rooms')
          .select('id')
          .eq('room_code', code)
          .eq('status', 'waiting')
          .maybeSingle();
        if (!existing) break;
        code = generateRoomCode();
        attempts++;
      }

      const settings = {
        question_source: questionSource,
        community_id: questionSource === 'community' ? selectedCommunity : null,
        category,
        difficulty,
        question_count: questionCount,
        timer_seconds: timerSeconds,
        speed_bonus: speedBonus
      };

      const { data: newRoom, error: roomError } = await supabase
        .from('multiplayer_rooms')
        .insert([{
          room_code: code,
          room_name: roomName.trim(),
          host_id: user.id,
          status: 'waiting',
          max_players: maxPlayers,
          settings
        }])
        .select()
        .single();

      if (roomError) throw roomError;

      // Add host as participant
      await supabase.from('multiplayer_participants').insert([{
        room_id: newRoom.id,
        user_id: user.id,
        username: username,
        is_host: true,
        is_ready: true
      }]);

      setRoom(newRoom);
      setIsHost(true);
      setIsReady(true);

      // Fetch initial participants
      const { data: parts } = await supabase
        .from('multiplayer_participants')
        .select('*')
        .eq('room_id', newRoom.id);
      setParticipants(parts || []);

      subscribeToRoom(newRoom.id);
      setView('lobby');
    } catch (err) {
      setError('Failed to create room: ' + err.message);
    }
    setCreating(false);
  };

  const handleJoinRoom = async () => {
    if (joinCode.length !== 6) { setError('Enter a 6-character room code'); return; }
    setJoining(true);
    setError(null);

    try {
      const { data: foundRoom, error: findError } = await supabase
        .from('multiplayer_rooms')
        .select('*')
        .eq('room_code', joinCode.toUpperCase())
        .eq('status', 'waiting')
        .maybeSingle();

      if (findError) throw findError;
      if (!foundRoom) { setError('Room not found or game already started'); setJoining(false); return; }

      // Check if full
      const { data: existingParts } = await supabase
        .from('multiplayer_participants')
        .select('id, user_id')
        .eq('room_id', foundRoom.id);

      if ((existingParts?.length || 0) >= foundRoom.max_players) {
        setError('Room is full');
        setJoining(false);
        return;
      }

      // Check if already in room
      if (existingParts?.some(p => p.user_id === user.id)) {
        // Already in — just rejoin the lobby view
        setRoom(foundRoom);
        setIsHost(foundRoom.host_id === user.id);
        setParticipants(existingParts);
        subscribeToRoom(foundRoom.id);
        setView('lobby');
        setJoining(false);
        return;
      }

      const { error: joinError } = await supabase
        .from('multiplayer_participants')
        .insert([{
          room_id: foundRoom.id,
          user_id: user.id,
          username: username,
          is_host: false,
          is_ready: false
        }]);

      if (joinError) throw joinError;

      setRoom(foundRoom);
      setIsHost(false);
      setIsReady(false);

      // Fetch all participants
      const { data: parts } = await supabase
        .from('multiplayer_participants')
        .select('*')
        .eq('room_id', foundRoom.id);
      setParticipants(parts || []);

      subscribeToRoom(foundRoom.id);
      setView('lobby');
    } catch (err) {
      setError('Failed to join room: ' + err.message);
    }
    setJoining(false);
  };

  const handleToggleReady = async () => {
    const newReady = !isReady;
    setIsReady(newReady);
    await supabase
      .from('multiplayer_participants')
      .update({ is_ready: newReady })
      .eq('room_id', room.id)
      .eq('user_id', user.id);
  };

  const handleLeaveRoom = async () => {
    if (!room) return;
    await supabase
      .from('multiplayer_participants')
      .delete()
      .eq('room_id', room.id)
      .eq('user_id', user.id);
    cleanup();
    setRoom(null);
    setParticipants([]);
    setView('menu');
  };

  const handleCancelRoom = async () => {
    if (!window.confirm('Cancel this room? All players will be removed.')) return;
    await supabase
      .from('multiplayer_rooms')
      .update({ status: 'cancelled' })
      .eq('id', room.id);
    cleanup();
    setRoom(null);
    setParticipants([]);
    setView('menu');
  };

  const handleStartGame = async () => {
    if (participants.length < 2) { setError('Need at least 2 players to start'); return; }
    setStarting(true);
    setError(null);

    try {
      const settings = room.settings;
      let questions = [];

      if (settings.question_source === 'community' && settings.community_id) {
        // Fetch from community questions
        let query = supabase.from('community_questions').select('*').eq('community_id', settings.community_id);
        if (settings.difficulty && settings.difficulty !== 'mixed') {
          query = query.eq('difficulty', settings.difficulty);
        }
        const { data } = await query;
        if (!data || data.length < settings.question_count) {
          setError(`Only ${data?.length || 0} questions available. Need ${settings.question_count}.`);
          setStarting(false);
          return;
        }
        // Shuffle and pick
        const shuffled = data.sort(() => Math.random() - 0.5).slice(0, settings.question_count);
        questions = shuffled.map((q, i) => ({
          room_id: room.id,
          question_index: i,
          question_text: q.question_text,
          correct_answer: q.correct_answer,
          incorrect_answers: q.incorrect_answers,
          category: q.category,
          difficulty: q.difficulty
        }));
      } else {
        // Fetch from Trivia API
        const apiCat = CATEGORY_API_MAP[settings.category];
        let url = `https://the-trivia-api.com/v2/questions?limit=${settings.question_count}`;
        if (apiCat) url += `&categories=${apiCat}`;
        if (settings.difficulty && settings.difficulty !== 'mixed') url += `&difficulties=${settings.difficulty}`;
        const resp = await fetch(url);
        if (!resp.ok) throw new Error('Failed to fetch questions from API');
        const data = await resp.json();
        if (!data || data.length < settings.question_count) {
          setError('Not enough questions available from API. Try different settings.');
          setStarting(false);
          return;
        }
        questions = data.slice(0, settings.question_count).map((q, i) => ({
          room_id: room.id,
          question_index: i,
          question_text: decodeHtml(q.question.text),
          correct_answer: decodeHtml(q.correctAnswer),
          incorrect_answers: q.incorrectAnswers.map(decodeHtml),
          category: settings.category,
          difficulty: q.difficulty
        }));
      }

      // Insert questions
      const { error: qError } = await supabase
        .from('multiplayer_questions')
        .insert(questions);
      if (qError) throw qError;

      // Update room status
      const { error: rError } = await supabase
        .from('multiplayer_rooms')
        .update({ status: 'in_progress', started_at: new Date().toISOString() })
        .eq('id', room.id);
      if (rError) throw rError;

    } catch (err) {
      setError('Failed to start game: ' + err.message);
    }
    setStarting(false);
  };

  const handleCopyCode = () => {
    if (room?.room_code) {
      navigator.clipboard.writeText(room.room_code).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  const settingsSummary = room?.settings ? (
    <div className="mp-settings-summary">
      <span className="mp-setting-tag">{room.settings.question_count} Qs</span>
      <span className="mp-setting-tag">{room.settings.difficulty || 'mixed'}</span>
      <span className="mp-setting-tag">{room.settings.timer_seconds}s timer</span>
      {room.settings.speed_bonus && <span className="mp-setting-tag mp-speed">Speed Bonus</span>}
      <span className="mp-setting-tag">{room.settings.question_source === 'community' ? 'Community' : 'Trivia API'}</span>
    </div>
  ) : null;

  // Lobby view — game started detection
  if (view === 'lobby' && room?.status === 'in_progress') {
    return (
      <div className="mp-lobby">
        <div className="mp-started-message">
          <h2>Game is starting!</h2>
          <p>The multiplayer game screen will be available in Phase 2.</p>
          <button className="mp-btn mp-btn-primary" onClick={() => { cleanup(); onBack(); }}>Back to Dashboard</button>
        </div>
      </div>
    );
  }

  // Lobby view
  if (view === 'lobby' && room) {
    return (
      <div className="mp-lobby">
        <button className="mp-back-btn" onClick={handleLeaveRoom}>← Leave Room</button>

        <div className="mp-lobby-header">
          <h1>{room.room_name}</h1>
          <div className="mp-room-code-display">
            <span className="mp-room-code-label">Room Code</span>
            <div className="mp-room-code-box">
              <span className="mp-room-code">{room.room_code}</span>
              <button className="mp-copy-btn" onClick={handleCopyCode}>
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        </div>

        {settingsSummary}

        {error && <div className="mp-error">{error}</div>}

        <div className="mp-players-section">
          <h2>Players ({participants.length}/{room.max_players})</h2>
          <div className="mp-players-list">
            {participants.map(p => (
              <div key={p.id} className={`mp-player-card ${p.is_ready ? 'ready' : ''}`}>
                <div className="mp-player-avatar">{(p.username || '?')[0].toUpperCase()}</div>
                <span className="mp-player-name">{p.username || 'Unknown'}</span>
                {p.is_host && <span className="mp-host-badge">Host</span>}
                <span className={`mp-ready-indicator ${p.is_ready ? 'on' : ''}`}>
                  {p.is_ready ? 'Ready' : 'Not Ready'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="mp-lobby-actions">
          {isHost ? (
            <>
              <button
                className="mp-btn mp-btn-primary mp-btn-large"
                onClick={handleStartGame}
                disabled={participants.length < 2 || starting}
              >
                {starting ? 'Starting...' : 'Start Game'}
              </button>
              {participants.length < 2 && (
                <p className="mp-hint">Waiting for at least 2 players to start...</p>
              )}
              <button className="mp-btn mp-btn-danger" onClick={handleCancelRoom}>Cancel Room</button>
            </>
          ) : (
            <button
              className={`mp-btn ${isReady ? 'mp-btn-secondary' : 'mp-btn-primary'} mp-btn-large`}
              onClick={handleToggleReady}
            >
              {isReady ? 'Unready' : 'Ready Up'}
            </button>
          )}
        </div>
      </div>
    );
  }

  // Create/Join menu view
  return (
    <div className="mp-lobby">
      <button className="mp-back-btn" onClick={onBack}>← Back to Dashboard</button>

      <div className="mp-header">
        <h1>Multiplayer Quiz</h1>
        <p className="mp-subtitle">Challenge friends in real-time trivia</p>
      </div>

      {error && <div className="mp-error">{error}</div>}

      <div className="mp-menu-cards">
        {/* Create Room Card */}
        <div className={`mp-menu-card ${activePanel === 'create' ? 'expanded' : ''}`}>
          <button className="mp-menu-card-header" onClick={() => setActivePanel(activePanel === 'create' ? null : 'create')}>
            <span className="mp-menu-icon">🎯</span>
            <div>
              <h2>Create Room</h2>
              <p>Host a game for your friends</p>
            </div>
            <span className={`mp-expand-chevron ${activePanel === 'create' ? 'open' : ''}`}>▾</span>
          </button>

          {activePanel === 'create' && (
            <div className="mp-form">
              <div className="mp-form-group">
                <label>Room Name</label>
                <input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="e.g. Friday Night Trivia"
                  maxLength={40}
                />
              </div>

              <div className="mp-form-group">
                <label>Question Source</label>
                <div className="mp-radio-group">
                  <label className={`mp-radio ${questionSource === 'trivia_api' ? 'active' : ''}`}>
                    <input type="radio" name="source" value="trivia_api" checked={questionSource === 'trivia_api'} onChange={() => setQuestionSource('trivia_api')} />
                    Trivia API
                  </label>
                  <label className={`mp-radio ${questionSource === 'community' ? 'active' : ''}`}>
                    <input type="radio" name="source" value="community" checked={questionSource === 'community'} onChange={() => setQuestionSource('community')} />
                    Community
                  </label>
                </div>
              </div>

              {questionSource === 'community' && (
                <div className="mp-form-group">
                  <label>Community</label>
                  <select value={selectedCommunity} onChange={(e) => setSelectedCommunity(e.target.value)}>
                    <option value="">Select community...</option>
                    {myCommunities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}

              {questionSource === 'trivia_api' && (
                <div className="mp-form-group">
                  <label>Category</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              )}

              <div className="mp-form-group">
                <label>Difficulty</label>
                <div className="mp-radio-group">
                  {['easy', 'medium', 'hard', 'mixed'].map(d => (
                    <label key={d} className={`mp-radio ${difficulty === d ? 'active' : ''}`}>
                      <input type="radio" name="difficulty" value={d} checked={difficulty === d} onChange={() => setDifficulty(d)} />
                      {d.charAt(0).toUpperCase() + d.slice(1)}
                    </label>
                  ))}
                </div>
              </div>

              <div className="mp-form-group">
                <label>Questions</label>
                <div className="mp-toggle-group">
                  {[5, 10].map(n => (
                    <button key={n} className={`mp-toggle-btn ${questionCount === n ? 'active' : ''}`} onClick={() => setQuestionCount(n)}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mp-form-group">
                <label>Timer per Question</label>
                <div className="mp-toggle-group">
                  {[15, 20, 30].map(s => (
                    <button key={s} className={`mp-toggle-btn ${timerSeconds === s ? 'active' : ''}`} onClick={() => setTimerSeconds(s)}>
                      {s}s
                    </button>
                  ))}
                </div>
              </div>

              <div className="mp-form-group">
                <label className="mp-switch-label">
                  Speed Bonus
                  <span
                    className={`mp-switch ${speedBonus ? 'on' : ''}`}
                    onClick={() => setSpeedBonus(!speedBonus)}
                    role="switch"
                    aria-checked={speedBonus}
                    tabIndex={0}
                    onKeyPress={(e) => { if (e.key === 'Enter' || e.key === ' ') setSpeedBonus(!speedBonus); }}
                  >
                    <span className="mp-switch-knob" />
                  </span>
                  <span className="mp-switch-hint">Faster correct answers earn more points</span>
                </label>
              </div>

              <div className="mp-form-group">
                <label>Max Players</label>
                <select value={maxPlayers} onChange={(e) => setMaxPlayers(parseInt(e.target.value))}>
                  {Array.from({ length: 11 }, (_, i) => i + 2).map(n => (
                    <option key={n} value={n}>{n} players</option>
                  ))}
                </select>
              </div>

              <button className="mp-btn mp-btn-primary mp-btn-large" onClick={handleCreateRoom} disabled={creating}>
                {creating ? 'Creating...' : 'Create Room'}
              </button>
            </div>
          )}
        </div>

        {/* Join Room Card */}
        <div className={`mp-menu-card ${activePanel === 'join' ? 'expanded' : ''}`}>
          <button className="mp-menu-card-header" onClick={() => setActivePanel(activePanel === 'join' ? null : 'join')}>
            <span className="mp-menu-icon">🚀</span>
            <div>
              <h2>Join Room</h2>
              <p>Enter a room code to join</p>
            </div>
            <span className={`mp-expand-chevron ${activePanel === 'join' ? 'open' : ''}`}>▾</span>
          </button>

          {activePanel === 'join' && (
            <div className="mp-form">
              <div className="mp-form-group">
                <label>Room Code</label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                  placeholder="ABCDEF"
                  maxLength={6}
                  className="mp-code-input"
                />
              </div>
              <button className="mp-btn mp-btn-primary mp-btn-large" onClick={handleJoinRoom} disabled={joining || joinCode.length !== 6}>
                {joining ? 'Joining...' : 'Join Room'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MultiplayerLobby;

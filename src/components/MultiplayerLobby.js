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
  const [questionSource, setQuestionSource] = useState('api');
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

  // Open rooms browser
  const [openRooms, setOpenRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [joiningRoomId, setJoiningRoomId] = useState(null);

  // Game state
  const [gameQuestions, setGameQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [shuffledAnswers, setShuffledAnswers] = useState([]);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [answeredPlayers, setAnsweredPlayers] = useState([]);
  const [roundScores, setRoundScores] = useState([]);
  const [totalScores, setTotalScores] = useState({});
  const [gamePhase, setGamePhase] = useState('loading'); // 'loading' | 'active' | 'answered' | 'scoreboard' | 'finished'
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState(null);
  const [lastAnswerPoints, setLastAnswerPoints] = useState(0);

  const channelRef = useRef(null);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const answersChannelRef = useRef(null);
  const scoreboardTimerRef = useRef(null);
  const failsafeTimerRef = useRef(null);

  // --- Utility Functions ---
  const shuffleArray = (array) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  const calculatePoints = useCallback((answerTimeMs, isCorrect) => {
    if (!isCorrect) return 0;
    const base = 100;
    if (!room?.speed_bonus) return base;
    const timerMs = (room?.timer_seconds || 20) * 1000;
    const speedRatio = Math.max(0, 1 - (answerTimeMs / timerMs));
    return base + Math.round(speedRatio * 100);
  }, [room?.speed_bonus, room?.timer_seconds]);

  // --- Timer Functions ---
  const stopGameTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startGameTimer = useCallback(() => {
    stopGameTimer();
    const duration = room?.timer_seconds || 20;
    startTimeRef.current = Date.now();
    setTimeRemaining(duration);

    timerRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const remaining = duration - elapsed;
      if (remaining <= 0) {
        setTimeRemaining(0);
      } else {
        setTimeRemaining(remaining);
      }
    }, 100);
  }, [room?.timer_seconds, stopGameTimer]);

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

  // Fetch open rooms and auto-refresh every 10s when on menu view
  const fetchOpenRooms = useCallback(async () => {
    setLoadingRooms(true);
    const { data } = await supabase
      .from('multiplayer_rooms')
      .select('*, profiles:host_id(username)')
      .eq('status', 'waiting')
      .order('created_at', { ascending: false });

    if (data) {
      // Fetch participant counts for each room
      const roomIds = data.map(r => r.id);
      const { data: parts } = await supabase
        .from('multiplayer_participants')
        .select('room_id')
        .in('room_id', roomIds);

      const countMap = {};
      (parts || []).forEach(p => { countMap[p.room_id] = (countMap[p.room_id] || 0) + 1; });

      setOpenRooms(data.map(r => ({
        ...r,
        host_username: r.profiles?.username || 'Unknown',
        player_count: countMap[r.id] || 0
      })));
    }
    setLoadingRooms(false);
  }, []);

  useEffect(() => {
    if (view !== 'menu') return;
    fetchOpenRooms();
    const interval = setInterval(fetchOpenRooms, 10000);
    return () => clearInterval(interval);
  }, [view, fetchOpenRooms]);

  // Cleanup subscriptions on unmount
  useEffect(() => {
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      if (answersChannelRef.current) supabase.removeChannel(answersChannelRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      if (scoreboardTimerRef.current) clearTimeout(scoreboardTimerRef.current);
      if (failsafeTimerRef.current) clearTimeout(failsafeTimerRef.current);
    };
  }, []);

  const cleanup = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    if (answersChannelRef.current) {
      supabase.removeChannel(answersChannelRef.current);
      answersChannelRef.current = null;
    }
    stopGameTimer();
    if (scoreboardTimerRef.current) {
      clearTimeout(scoreboardTimerRef.current);
      scoreboardTimerRef.current = null;
    }
    if (failsafeTimerRef.current) {
      clearTimeout(failsafeTimerRef.current);
      failsafeTimerRef.current = null;
    }
  }, [stopGameTimer]);

  const subscribeToRoom = useCallback((roomId) => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase.channel(`room-${roomId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'multiplayer_participants',
        filter: `room_id=eq.${roomId}`
      }, async () => {
        // Re-fetch all participants on any change to ensure complete data (including usernames)
        const { data } = await supabase
          .from('multiplayer_participants')
          .select('*')
          .eq('room_id', roomId);
        if (data) setParticipants(data);
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

      const { data: newRoom, error: roomError } = await supabase
        .from('multiplayer_rooms')
        .insert([{
          room_code: code,
          room_name: roomName.trim(),
          host_id: user.id,
          status: 'waiting',
          max_players: maxPlayers,
          question_source: questionSource,
          community_id: questionSource === 'community' ? selectedCommunity : null,
          category,
          difficulty,
          question_count: questionCount,
          timer_seconds: timerSeconds,
          speed_bonus: speedBonus
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
        .select('*')
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

  const handleJoinRoomDirect = async (targetRoom) => {
    setJoiningRoomId(targetRoom.id);
    setError(null);

    try {
      // Check if full
      const { data: existingParts } = await supabase
        .from('multiplayer_participants')
        .select('*')
        .eq('room_id', targetRoom.id);

      if ((existingParts?.length || 0) >= targetRoom.max_players) {
        setError('Room is full');
        setJoiningRoomId(null);
        return;
      }

      // Check if already in room
      if (existingParts?.some(p => p.user_id === user.id)) {
        setRoom(targetRoom);
        setIsHost(targetRoom.host_id === user.id);
        setParticipants(existingParts);
        subscribeToRoom(targetRoom.id);
        setView('lobby');
        setJoiningRoomId(null);
        return;
      }

      const { error: joinError } = await supabase
        .from('multiplayer_participants')
        .insert([{
          room_id: targetRoom.id,
          user_id: user.id,
          username: username,
          is_host: false,
          is_ready: false
        }]);

      if (joinError) throw joinError;

      setRoom(targetRoom);
      setIsHost(false);
      setIsReady(false);

      const { data: parts } = await supabase
        .from('multiplayer_participants')
        .select('*')
        .eq('room_id', targetRoom.id);
      setParticipants(parts || []);

      subscribeToRoom(targetRoom.id);
      setView('lobby');
    } catch (err) {
      setError('Failed to join room: ' + err.message);
    }
    setJoiningRoomId(null);
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
      let questions = [];

      if (room.question_source === 'community' && room.community_id) {
        // Fetch from community questions
        let query = supabase.from('community_questions').select('*').eq('community_id', room.community_id);
        if (room.difficulty && room.difficulty !== 'mixed') {
          query = query.eq('difficulty', room.difficulty);
        }
        const { data } = await query;
        if (!data || data.length < room.question_count) {
          setError(`Only ${data?.length || 0} questions available. Need ${room.question_count}.`);
          setStarting(false);
          return;
        }
        // Shuffle and pick
        const shuffled = data.sort(() => Math.random() - 0.5).slice(0, room.question_count);
        questions = shuffled.map((q, i) => ({
          room_id: room.id,
          question_order: i,
          question_text: q.question_text,
          correct_answer: q.correct_answer,
          incorrect_answers: q.incorrect_answers,
          category: q.category,
          difficulty: q.difficulty
        }));
      } else {
        // Fetch from Trivia API
        const apiCat = CATEGORY_API_MAP[room.category];
        let url = `https://the-trivia-api.com/v2/questions?limit=${room.question_count}`;
        if (apiCat) url += `&categories=${apiCat}`;
        if (room.difficulty && room.difficulty !== 'mixed') url += `&difficulties=${room.difficulty}`;
        const resp = await fetch(url);
        if (!resp.ok) throw new Error('Failed to fetch questions from API');
        const data = await resp.json();
        if (!data || data.length < room.question_count) {
          setError('Not enough questions available from API. Try different settings.');
          setStarting(false);
          return;
        }
        questions = data.slice(0, room.question_count).map((q, i) => ({
          room_id: room.id,
          question_order: i,
          question_text: decodeHtml(q.question.text),
          correct_answer: decodeHtml(q.correctAnswer),
          incorrect_answers: q.incorrectAnswers.map(decodeHtml),
          category: room.category,
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

  // --- Game Initialization ---
  const initializeGame = useCallback(async (currentRoom, currentParticipants) => {
    setGamePhase('loading');
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setAnsweredPlayers([]);
    setRoundScores([]);
    setLastAnswerCorrect(null);
    setLastAnswerPoints(0);

    // Initialize total scores for all participants
    const scores = {};
    currentParticipants.forEach(p => {
      scores[p.user_id] = { points: 0, correct: 0, username: p.username || 'Unknown' };
    });
    setTotalScores(scores);

    // Fetch questions
    const { data: questions, error: qErr } = await supabase
      .from('multiplayer_questions')
      .select('*')
      .eq('room_id', currentRoom.id)
      .order('question_order', { ascending: true });

    if (qErr || !questions?.length) {
      setError('Failed to load questions');
      return;
    }

    setGameQuestions(questions);

    // Shuffle first question's answers
    const firstQ = questions[0];
    const answers = shuffleArray([firstQ.correct_answer, ...firstQ.incorrect_answers]);
    setShuffledAnswers(answers);

    // Subscribe to answers channel
    subscribeToAnswers(currentRoom.id);

    // Start the game
    setGamePhase('active');
    startGameTimer();
  }, [startGameTimer]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Realtime Answer Tracking ---
  const subscribeToAnswers = useCallback((roomId) => {
    if (answersChannelRef.current) {
      supabase.removeChannel(answersChannelRef.current);
    }

    const channel = supabase.channel(`answers-${roomId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'multiplayer_answers',
        filter: `room_id=eq.${roomId}`
      }, (payload) => {
        const answer = payload.new;
        setAnsweredPlayers(prev => {
          if (prev.includes(answer.user_id)) return prev;
          return [...prev, answer.user_id];
        });
      })
      .on('broadcast', { event: 'player_answer' }, (msg) => {
        const { user_id, is_correct, points } = msg.payload;
        // Track that this player answered
        setAnsweredPlayers(prev => {
          if (prev.includes(user_id)) return prev;
          return [...prev, user_id];
        });
        // Update their local score (skip self — already updated locally)
        setTotalScores(prev => {
          if (!prev[user_id]) return prev;
          const updated = { ...prev };
          updated[user_id] = {
            ...updated[user_id],
            points: updated[user_id].points + (points || 0),
            correct: updated[user_id].correct + (is_correct ? 1 : 0)
          };
          return updated;
        });
      })
      .subscribe();

    answersChannelRef.current = channel;
  }, []);

  // --- Answer Submission ---
  const submitAnswer = useCallback(async (answer) => {
    stopGameTimer();
    const q = gameQuestions[currentQuestionIndex];
    const isCorrect = answer === q.correct_answer;
    const answerTimeMs = startTimeRef.current ? Date.now() - startTimeRef.current : (room?.timer_seconds || 20) * 1000;
    const points = calculatePoints(answerTimeMs, isCorrect);

    setSelectedAnswer(answer);
    setShowResult(true);
    setLastAnswerCorrect(isCorrect);
    setLastAnswerPoints(points);

    // Update local total scores
    setTotalScores(prev => {
      const updated = { ...prev };
      if (updated[user.id]) {
        updated[user.id] = {
          ...updated[user.id],
          points: updated[user.id].points + points,
          correct: updated[user.id].correct + (isCorrect ? 1 : 0)
        };
      }
      return updated;
    });

    setGamePhase('answered');

    // Add self to answered players
    setAnsweredPlayers(prev => {
      if (prev.includes(user.id)) return prev;
      return [...prev, user.id];
    });

    // Broadcast answer to other players for local score tracking
    if (answersChannelRef.current) {
      supabase.channel(`answers-${room.id}`).send({
        type: 'broadcast',
        event: 'player_answer',
        payload: { user_id: user.id, question_index: currentQuestionIndex, is_correct: isCorrect, points }
      });
    }

    // Insert answer into DB (best-effort — game scoring works via broadcast)
    const { error: insertErr } = await supabase.from('multiplayer_answers').insert([{
      room_id: room.id,
      user_id: user.id,
      question_index: currentQuestionIndex,
      user_answer: answer,
      is_correct: isCorrect,
      answer_time_ms: answerTimeMs,
      points: points
    }]);
    if (insertErr) console.error('Failed to insert answer:', insertErr.message);
  }, [stopGameTimer, gameQuestions, currentQuestionIndex, room?.id, room?.timer_seconds, user.id, calculatePoints]);

  const handleAnswerClick = useCallback((answer) => {
    if (gamePhase !== 'active') return;
    submitAnswer(answer);
  }, [gamePhase, submitAnswer]);

  // Auto-submit on timeout
  const handleTimeout = useCallback(async () => {
    if (gamePhase !== 'active') return;
    stopGameTimer();

    setSelectedAnswer(null);
    setShowResult(true);
    setLastAnswerCorrect(false);
    setLastAnswerPoints(0);
    setGamePhase('answered');

    // Add self to answered players
    setAnsweredPlayers(prev => {
      if (prev.includes(user.id)) return prev;
      return [...prev, user.id];
    });

    // Broadcast timeout to other players
    if (answersChannelRef.current) {
      supabase.channel(`answers-${room.id}`).send({
        type: 'broadcast',
        event: 'player_answer',
        payload: { user_id: user.id, question_index: currentQuestionIndex, is_correct: false, points: 0 }
      });
    }

    // Insert timed-out answer (best-effort)
    const { error: insertErr } = await supabase.from('multiplayer_answers').insert([{
      room_id: room.id,
      user_id: user.id,
      question_index: currentQuestionIndex,
      user_answer: '(timed out)',
      is_correct: false,
      answer_time_ms: (room?.timer_seconds || 20) * 1000,
      points: 0
    }]);
    if (insertErr) console.error('Failed to insert timeout answer:', insertErr.message);
  }, [gamePhase, stopGameTimer, currentQuestionIndex, room?.id, room?.timer_seconds, user.id]);

  // Timer timeout effect
  useEffect(() => {
    if (view === 'game' && timeRemaining <= 0 && gamePhase === 'active' && gameQuestions.length > 0) {
      handleTimeout();
    }
  }, [timeRemaining, view, gamePhase, gameQuestions.length, handleTimeout]);

  // --- Round Scoreboard ---
  const showRoundScoreboard = useCallback(async () => {
    if (failsafeTimerRef.current) {
      clearTimeout(failsafeTimerRef.current);
      failsafeTimerRef.current = null;
    }

    // Use local totalScores as primary source (updated via broadcast + local tracking)
    const currentTotals = { ...totalScores };

    // Try to fetch round answers from DB to get per-round breakdown
    const { data: answers } = await supabase
      .from('multiplayer_answers')
      .select('*')
      .eq('room_id', room.id)
      .eq('question_index', currentQuestionIndex);

    // Build round data — prefer DB data for round points, fall back to 0
    const roundData = [];
    const dbAnswerMap = {};
    (answers || []).forEach(a => {
      dbAnswerMap[a.user_id] = a;
    });

    // Create entry for each participant
    participants.forEach(p => {
      const dbAnswer = dbAnswerMap[p.user_id];
      roundData.push({
        user_id: p.user_id,
        username: currentTotals[p.user_id]?.username || p.username || 'Unknown',
        round_points: dbAnswer ? (dbAnswer.points || 0) : 0,
        is_correct: dbAnswer ? dbAnswer.is_correct : false,
        total_points: currentTotals[p.user_id]?.points || 0
      });
    });

    // If DB had data, cross-check totals with DB for accuracy
    if (answers && answers.length > 0) {
      const { data: allAnswers } = await supabase
        .from('multiplayer_answers')
        .select('*')
        .eq('room_id', room.id)
        .lte('question_index', currentQuestionIndex);

      if (allAnswers && allAnswers.length > 0) {
        // DB has data — recalculate totals from DB for accuracy
        Object.keys(currentTotals).forEach(uid => {
          currentTotals[uid].points = 0;
          currentTotals[uid].correct = 0;
        });
        allAnswers.forEach(a => {
          if (currentTotals[a.user_id]) {
            currentTotals[a.user_id].points += (a.points || 0);
            currentTotals[a.user_id].correct += a.is_correct ? 1 : 0;
          }
        });
        // Update round data total_points from DB-corrected totals
        roundData.forEach(r => {
          r.total_points = currentTotals[r.user_id]?.points || 0;
        });
      }
    }

    // Sort by total points descending
    roundData.sort((a, b) => b.total_points - a.total_points);

    setTotalScores(currentTotals);
    setRoundScores(roundData);
    setGamePhase('scoreboard');
  }, [room?.id, currentQuestionIndex, totalScores, participants]);

  // Watch for all players answered → show scoreboard
  useEffect(() => {
    if (gamePhase !== 'answered') return;
    if (answeredPlayers.length >= participants.length && participants.length > 0) {
      showRoundScoreboard();
    }
  }, [answeredPlayers.length, participants.length, gamePhase, showRoundScoreboard]);

  // Failsafe: if timer expires + 5s and not all answered, force scoreboard
  useEffect(() => {
    if (gamePhase !== 'answered') return;
    if (failsafeTimerRef.current) return;

    failsafeTimerRef.current = setTimeout(() => {
      failsafeTimerRef.current = null;
      setGamePhase(prev => {
        if (prev === 'answered') {
          showRoundScoreboard();
        }
        return prev;
      });
    }, 5000);

    return () => {
      if (failsafeTimerRef.current) {
        clearTimeout(failsafeTimerRef.current);
        failsafeTimerRef.current = null;
      }
    };
  }, [gamePhase, showRoundScoreboard]);

  // --- Next Question ---
  const handleNextQuestion = useCallback(() => {
    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex >= gameQuestions.length) {
      finishGame();
      return;
    }

    setCurrentQuestionIndex(nextIndex);
    setSelectedAnswer(null);
    setShowResult(false);
    setLastAnswerCorrect(null);
    setLastAnswerPoints(0);
    setAnsweredPlayers([]);
    setRoundScores([]);

    // Shuffle next question's answers
    const nextQ = gameQuestions[nextIndex];
    const answers = shuffleArray([nextQ.correct_answer, ...nextQ.incorrect_answers]);
    setShuffledAnswers(answers);

    setGamePhase('active');
    startGameTimer();
  }, [currentQuestionIndex, gameQuestions, startGameTimer]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-advance scoreboard after 4 seconds
  useEffect(() => {
    if (gamePhase !== 'scoreboard') return;
    if (scoreboardTimerRef.current) clearTimeout(scoreboardTimerRef.current);

    // Only auto-advance for non-host. Host clicks "Next Question"
    if (isHost) return;

    scoreboardTimerRef.current = setTimeout(() => {
      scoreboardTimerRef.current = null;
      // If still on scoreboard and host hasn't advanced yet, the host will trigger it
    }, 4000);

    return () => {
      if (scoreboardTimerRef.current) {
        clearTimeout(scoreboardTimerRef.current);
        scoreboardTimerRef.current = null;
      }
    };
  }, [gamePhase, isHost]);

  // --- Game End ---
  const finishGame = useCallback(async () => {
    stopGameTimer();

    // Try to fetch all answers from DB for accurate totals
    const { data: allAnswers, error: fetchErr } = await supabase
      .from('multiplayer_answers')
      .select('*')
      .eq('room_id', room.id);

    if (fetchErr) console.error('Failed to fetch final answers:', fetchErr.message);

    if (allAnswers && allAnswers.length > 0) {
      // DB has data — use it for accurate cross-player totals
      const finalScores = {};
      participants.forEach(p => {
        finalScores[p.user_id] = { points: 0, correct: 0, username: p.username || 'Unknown' };
      });
      allAnswers.forEach(a => {
        if (finalScores[a.user_id]) {
          finalScores[a.user_id].points += (a.points || 0);
          finalScores[a.user_id].correct += a.is_correct ? 1 : 0;
        }
      });
      setTotalScores(finalScores);
    }
    // else: keep current totalScores (accumulated locally via broadcast + submitAnswer)

    setView('results');

    // Host updates room status to completed
    if (isHost) {
      await supabase
        .from('multiplayer_rooms')
        .update({ status: 'completed' })
        .eq('id', room.id);
    }
  }, [stopGameTimer, room?.id, participants, isHost]);

  // --- Game Start Detection ---
  useEffect(() => {
    if (view === 'lobby' && room?.status === 'in_progress') {
      setView('game');
      initializeGame(room, participants);
    }
  }, [room?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle host advancing to next question via room subscription
  // Non-host players listen for the host's scoreboard advance via a broadcast channel
  const advanceChannelRef = useRef(null);

  useEffect(() => {
    if (view !== 'game' || !room?.id) return;

    if (advanceChannelRef.current) {
      supabase.removeChannel(advanceChannelRef.current);
    }

    const channel = supabase.channel(`advance-${room.id}`)
      .on('broadcast', { event: 'next_question' }, () => {
        if (!isHost && gamePhase === 'scoreboard') {
          handleNextQuestion();
        }
      })
      .on('broadcast', { event: 'finish_game' }, () => {
        if (!isHost) {
          finishGame();
        }
      })
      .subscribe();

    advanceChannelRef.current = channel;

    return () => {
      if (advanceChannelRef.current) {
        supabase.removeChannel(advanceChannelRef.current);
        advanceChannelRef.current = null;
      }
    };
  }, [view, room?.id, isHost, gamePhase, handleNextQuestion, finishGame]);

  const handleHostNextQuestion = useCallback(async () => {
    const isLastQuestion = currentQuestionIndex + 1 >= gameQuestions.length;

    // Broadcast to other players
    if (advanceChannelRef.current) {
      await supabase.channel(`advance-${room.id}`).send({
        type: 'broadcast',
        event: isLastQuestion ? 'finish_game' : 'next_question',
        payload: {}
      });
    }

    if (isLastQuestion) {
      finishGame();
    } else {
      handleNextQuestion();
    }
  }, [currentQuestionIndex, gameQuestions.length, room?.id, handleNextQuestion, finishGame]);

  const handleBackToDashboard = useCallback(() => {
    cleanup();
    setRoom(null);
    setParticipants([]);
    setGameQuestions([]);
    setTotalScores({});
    setView('menu');
    onBack();
  }, [cleanup, onBack]);

  const settingsSummary = room ? (
    <div className="mp-settings-summary">
      <span className="mp-setting-tag">{room.question_count} Qs</span>
      <span className="mp-setting-tag">{room.difficulty || 'mixed'}</span>
      <span className="mp-setting-tag">{room.timer_seconds}s timer</span>
      {room.speed_bonus && <span className="mp-setting-tag mp-speed">Speed Bonus</span>}
      <span className="mp-setting-tag">{room.question_source === 'community' ? 'Community' : 'Trivia API'}</span>
    </div>
  ) : null;

  // Results view
  if (view === 'results') {
    const finalLeaderboard = Object.entries(totalScores)
      .map(([uid, data]) => ({ user_id: uid, ...data }))
      .sort((a, b) => b.points - a.points);

    const medals = ['🥇', '🥈', '🥉'];

    return (
      <div className="mp-lobby">
        <div className="mp-results">
          <h1 className="mp-results-title">Game Over!</h1>
          <p className="mp-results-room">{room?.room_name}</p>

          <div className="mp-results-table">
            {finalLeaderboard.map((entry, i) => (
              <div
                key={entry.user_id}
                className={`mp-results-row ${entry.user_id === user.id ? 'self' : ''} ${i < 3 ? `mp-medal-${i + 1}` : ''}`}
              >
                <span className="mp-results-rank">
                  {i < 3 ? medals[i] : `#${i + 1}`}
                </span>
                <span className="mp-results-name">{entry.username}</span>
                <span className="mp-results-correct">{entry.correct}/{gameQuestions.length}</span>
                <span className="mp-results-points">{entry.points} pts</span>
              </div>
            ))}
          </div>

          <button className="mp-btn mp-btn-primary mp-btn-large" onClick={handleBackToDashboard}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Game view
  if (view === 'game') {
    const currentQ = gameQuestions[currentQuestionIndex];
    const timerDuration = room?.timer_seconds || 20;
    const timerPercent = Math.max(0, (timeRemaining / timerDuration) * 100);
    const timerWarning = timeRemaining <= 5 && timeRemaining > 0;

    // Loading phase
    if (gamePhase === 'loading' || !currentQ) {
      return (
        <div className="mp-lobby">
          <div className="mp-game-loading">
            <div className="mp-spinner" />
            <p>Loading questions...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="mp-lobby">
        {/* Game Header */}
        <div className="mp-game-header">
          <span className="mp-game-progress">
            {currentQuestionIndex + 1} / {gameQuestions.length}
          </span>
          <span className="mp-game-room-name">{room?.room_name}</span>
          <span className="mp-game-score">
            {totalScores[user.id]?.points || 0} pts
          </span>
        </div>

        {/* Timer Bar */}
        <div className={`mp-timer-bar-track ${timerWarning ? 'warning' : ''}`}>
          <div
            className="mp-timer-bar-fill"
            style={{ width: `${timerPercent}%` }}
          />
        </div>
        <div className="mp-timer-text">{Math.ceil(timeRemaining)}s</div>

        {/* Question */}
        <div className="mp-question-card">
          <div className="mp-question-tags">
            {currentQ.category && <span className="mp-setting-tag">{currentQ.category}</span>}
            {currentQ.difficulty && <span className="mp-setting-tag">{currentQ.difficulty}</span>}
          </div>
          <p className="mp-question-text">{currentQ.question_text}</p>
        </div>

        {/* Answer Grid */}
        <div className="mp-answer-grid">
          {shuffledAnswers.map((answer, i) => {
            let cls = 'mp-answer-btn';
            if (showResult) {
              if (answer === currentQ.correct_answer) cls += ' correct';
              else if (answer === selectedAnswer) cls += ' wrong';
              else cls += ' dimmed';
            }
            return (
              <button
                key={i}
                className={cls}
                onClick={() => handleAnswerClick(answer)}
                disabled={gamePhase !== 'active'}
              >
                {answer}
              </button>
            );
          })}
        </div>

        {/* Timed out message */}
        {showResult && selectedAnswer === null && (
          <div className="mp-timeout-msg">Time's up!</div>
        )}

        {/* Result feedback */}
        {showResult && selectedAnswer !== null && (
          <div className={`mp-answer-feedback ${lastAnswerCorrect ? 'correct' : 'wrong'}`}>
            {lastAnswerCorrect ? `Correct! +${lastAnswerPoints}` : 'Wrong!'}
          </div>
        )}

        {/* Answered / Waiting Phase */}
        {gamePhase === 'answered' && (
          <div className="mp-waiting-section">
            <p className="mp-waiting-text">Waiting for other players...</p>
            <div className="mp-waiting-dots">
              {participants.map(p => (
                <div
                  key={p.user_id}
                  className={`mp-waiting-dot ${answeredPlayers.includes(p.user_id) ? 'answered' : ''}`}
                  title={p.username}
                >
                  <span className="mp-dot-avatar">{(p.username || '?')[0].toUpperCase()}</span>
                  {answeredPlayers.includes(p.user_id) && <span className="mp-dot-check">✓</span>}
                </div>
              ))}
            </div>
            <p className="mp-waiting-count">{answeredPlayers.length}/{participants.length} answered</p>
          </div>
        )}

        {/* Scoreboard Phase */}
        {gamePhase === 'scoreboard' && (
          <div className="mp-scoreboard">
            <h2 className="mp-scoreboard-title">Round {currentQuestionIndex + 1} Results</h2>
            <div className="mp-scoreboard-table">
              {roundScores.map((entry, i) => (
                <div
                  key={entry.user_id}
                  className={`mp-scoreboard-row ${entry.user_id === user.id ? 'self' : ''}`}
                >
                  <span className="mp-scoreboard-rank">#{i + 1}</span>
                  <span className="mp-scoreboard-name">{entry.username}</span>
                  <span className={`mp-scoreboard-round ${entry.is_correct ? 'positive' : 'zero'}`}>
                    +{entry.round_points}
                  </span>
                  <span className="mp-scoreboard-total">{entry.total_points} pts</span>
                </div>
              ))}
            </div>

            {isHost ? (
              <button className="mp-btn mp-btn-primary mp-btn-large" onClick={handleHostNextQuestion}>
                {currentQuestionIndex + 1 >= gameQuestions.length ? 'See Final Results' : 'Next Question'}
              </button>
            ) : (
              <p className="mp-hint">
                {currentQuestionIndex + 1 >= gameQuestions.length
                  ? 'Waiting for host to show final results...'
                  : 'Next question coming up...'}
              </p>
            )}
          </div>
        )}
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
                  <label className={`mp-radio ${questionSource === 'api' ? 'active' : ''}`}>
                    <input type="radio" name="source" value="trivia_api" checked={questionSource === 'api'} onChange={() => setQuestionSource('api')} />
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

              {questionSource === 'api' && (
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

      {/* Open Rooms Browser */}
      <div className="mp-open-rooms">
        <div className="mp-open-rooms-header">
          <h2>Open Rooms</h2>
          <button className="mp-refresh-btn" onClick={fetchOpenRooms} disabled={loadingRooms}>
            {loadingRooms ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
        {openRooms.length === 0 ? (
          <div className="mp-open-rooms-empty">
            {loadingRooms ? 'Loading rooms...' : 'No open rooms right now. Create one!'}
          </div>
        ) : (
          <div className="mp-open-rooms-list">
            {openRooms.map(r => (
              <div key={r.id} className="mp-open-room-card">
                <div className="mp-open-room-top">
                  <div className="mp-open-room-info">
                    <span className="mp-open-room-name">{r.room_name}</span>
                    <span className="mp-open-room-host">hosted by {r.host_username}</span>
                  </div>
                  <div className="mp-open-room-players">
                    {r.player_count}/{r.max_players}
                  </div>
                </div>
                <div className="mp-open-room-bottom">
                  <div className="mp-open-room-tags">
                    <span className="mp-setting-tag">{r.question_count} Qs</span>
                    <span className="mp-setting-tag">{r.difficulty || 'mixed'}</span>
                    <span className="mp-setting-tag">{r.timer_seconds}s</span>
                    {r.speed_bonus && <span className="mp-setting-tag mp-speed">Speed</span>}
                  </div>
                  <button
                    className="mp-btn mp-btn-primary"
                    onClick={() => handleJoinRoomDirect(r)}
                    disabled={joiningRoomId === r.id || r.player_count >= r.max_players}
                  >
                    {joiningRoomId === r.id ? 'Joining...' : r.player_count >= r.max_players ? 'Full' : 'Join'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default MultiplayerLobby;

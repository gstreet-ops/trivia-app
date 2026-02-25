import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import './CommunityChat.css';

const PAGE_SIZE = 50;
const MAX_MESSAGE_LENGTH = 500;

function CommunityChat({ communityId, session, isCommissioner }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [hasOlder, setHasOlder] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const username = session?.user?.user_metadata?.username || session?.user?.email?.split('@')[0] || 'User';

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  }, []);

  // Fetch initial messages
  useEffect(() => {
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('community_messages')
        .select('*')
        .eq('community_id', communityId)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);
      const msgs = (data || []).reverse();
      setMessages(msgs);
      setHasOlder(msgs.length === PAGE_SIZE);
      setLoading(false);
      scrollToBottom();
    };
    fetchMessages();
  }, [communityId, scrollToBottom]);

  // Fetch username from profile (more reliable than metadata)
  const [profileUsername, setProfileUsername] = useState('');
  useEffect(() => {
    const fetchUsername = async () => {
      const { data } = await supabase.from('profiles').select('username').eq('id', session.user.id).single();
      if (data?.username) setProfileUsername(data.username);
    };
    fetchUsername();
  }, [session.user.id]);

  const displayUsername = profileUsername || username;

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`chat-${communityId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'community_messages',
        filter: `community_id=eq.${communityId}`
      }, payload => {
        setMessages(prev => [...prev, payload.new]);
        scrollToBottom();
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'community_messages',
        filter: `community_id=eq.${communityId}`
      }, payload => {
        setMessages(prev => prev.map(m => m.id === payload.new.id ? payload.new : m));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [communityId, scrollToBottom]);

  const loadOlderMessages = async () => {
    if (messages.length === 0 || loadingOlder) return;
    setLoadingOlder(true);
    const oldest = messages[0];
    const { data } = await supabase
      .from('community_messages')
      .select('*')
      .eq('community_id', communityId)
      .lt('created_at', oldest.created_at)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE);
    const older = (data || []).reverse();
    setMessages(prev => [...older, ...prev]);
    setHasOlder(older.length === PAGE_SIZE);
    setLoadingOlder(false);
  };

  const sendMessage = async () => {
    const trimmed = newMessage.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setNewMessage('');
    await supabase.from('community_messages').insert([{
      community_id: communityId,
      user_id: session.user.id,
      username: displayUsername,
      message: trimmed
    }]);
    setSending(false);
  };

  const deleteMessage = async (messageId) => {
    await supabase.from('community_messages')
      .update({ is_deleted: true, deleted_by: session.user.id })
      .eq('id', messageId);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
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

  if (loading) {
    return (
      <div className="community-chat">
        <div className="chat-empty">Loading messages...</div>
      </div>
    );
  }

  return (
    <div className="community-chat">
      <div className="chat-messages" ref={chatContainerRef}>
        {hasOlder && (
          <div className="chat-load-older">
            <button onClick={loadOlderMessages} disabled={loadingOlder}>
              {loadingOlder ? 'Loading...' : 'Load older messages'}
            </button>
          </div>
        )}
        {messages.length === 0 ? (
          <div className="chat-empty">No messages yet. Start the conversation!</div>
        ) : (
          messages.map(msg => {
            if (msg.is_deleted) {
              return (
                <div key={msg.id} className="chat-deleted">
                  [Message removed by commissioner]
                </div>
              );
            }
            const isOwn = msg.user_id === session.user.id;
            return (
              <div key={msg.id} className={`chat-message ${isOwn ? 'own' : 'other'}`}>
                <div className="chat-message-header">
                  <span className="chat-username">{msg.username}</span>
                  <span className="chat-time">{formatRelativeTime(msg.created_at)}</span>
                </div>
                <div className="chat-message-text">{msg.message}</div>
                {isCommissioner && !isOwn && (
                  <button
                    className="chat-delete-btn"
                    onClick={() => deleteMessage(msg.id)}
                    title="Delete message"
                    aria-label="Delete message"
                  >
                    &#x1F5D1;
                  </button>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="chat-input-bar">
        <textarea
          className="chat-input"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          rows={1}
          maxLength={MAX_MESSAGE_LENGTH}
        />
        {newMessage.length > 400 && (
          <span className="chat-char-count">{newMessage.length}/{MAX_MESSAGE_LENGTH}</span>
        )}
        <button
          className="chat-send-btn"
          onClick={sendMessage}
          disabled={!newMessage.trim() || sending}
          aria-label="Send message"
        >
          &#x27A4;
        </button>
      </div>
    </div>
  );
}

export default CommunityChat;

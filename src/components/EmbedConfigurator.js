import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';

const EMBED_BASE_URL = 'https://gstreet-ops.github.io/gstreet-ops-quiz-embed';

const GOOGLE_FONTS = [
  'Inter',
  'Roboto',
  'Open Sans',
  'Lato',
  'Montserrat',
  'Poppins',
  'Raleway',
  'Playfair Display',
  'Merriweather',
  'Cormorant Garamond',
  'Oswald',
  'Nunito',
  'Source Sans 3',
  'PT Serif',
  'Libre Baskerville',
  'DM Sans',
  'Space Grotesk',
  'Archivo',
  'Crimson Text',
  'Work Sans'
];

const DEFAULT_THEME = {
  bg: '#0D0D0D',
  surface: '#1A1A2E',
  primary: '#6B2D5E',
  accent: '#8B0000',
  text: '#F5F0EB'
};

const DEFAULT_BEHAVIOR = {
  count: 10,
  difficulty: 'mixed',
  timer: 0,
  leaderboard: 'community',
  category: 'all',
  font: 'Inter'
};

function EmbedConfigurator({ communityId, community, showToast }) {
  const [theme, setTheme] = useState(DEFAULT_THEME);
  const [behavior, setBehavior] = useState(DEFAULT_BEHAVIOR);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [categories, setCategories] = useState([]);
  const [embedStats, setEmbedStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const iframeRef = useRef(null);

  // Fetch available categories for this community
  useEffect(() => {
    if (!communityId) return;
    const fetchCategories = async () => {
      const { data } = await supabase
        .from('community_questions')
        .select('category')
        .eq('community_id', communityId)
        .eq('status', 'active');
      if (data) {
        const unique = [...new Set(data.map(q => q.category).filter(Boolean))].sort();
        setCategories(unique);
      }
    };
    fetchCategories();
  }, [communityId]);

  // Fetch embed-specific analytics
  useEffect(() => {
    if (!communityId) return;
    const fetchEmbedStats = async () => {
      setStatsLoading(true);
      try {
        // All games for this community
        const { data: allGames } = await supabase
          .from('games')
          .select('id, source, host_origin, score, total_questions, created_at')
          .eq('community_id', communityId);

        if (!allGames || allGames.length === 0) {
          setEmbedStats({ totalGames: 0, embedGames: 0, appGames: 0, embedPct: 0, avgScore: 0, hostDomains: {}, recentTrend: [] });
          setStatsLoading(false);
          return;
        }

        const embedGames = allGames.filter(g => g.source === 'embed');
        const appGames = allGames.filter(g => g.source !== 'embed');

        // Host domain breakdown
        const hostDomains = {};
        embedGames.forEach(g => {
          const host = g.host_origin || 'Unknown';
          hostDomains[host] = (hostDomains[host] || 0) + 1;
        });

        // Average embed score
        const avgScore = embedGames.length > 0
          ? Math.round(embedGames.reduce((sum, g) => sum + (g.total_questions > 0 ? (g.score / g.total_questions) * 100 : 0), 0) / embedGames.length)
          : 0;

        // Last 7 days trend
        const now = new Date();
        const recentTrend = [];
        for (let i = 6; i >= 0; i--) {
          const day = new Date(now);
          day.setDate(day.getDate() - i);
          const dayStr = day.toISOString().slice(0, 10);
          const dayEmbed = embedGames.filter(g => g.created_at && g.created_at.slice(0, 10) === dayStr).length;
          const dayApp = appGames.filter(g => g.created_at && g.created_at.slice(0, 10) === dayStr).length;
          recentTrend.push({ date: dayStr, label: day.toLocaleDateString('en-US', { weekday: 'short' }), embed: dayEmbed, app: dayApp });
        }

        setEmbedStats({
          totalGames: allGames.length,
          embedGames: embedGames.length,
          appGames: appGames.length,
          embedPct: allGames.length > 0 ? Math.round((embedGames.length / allGames.length) * 100) : 0,
          avgScore,
          hostDomains,
          recentTrend,
        });
      } catch (err) {
        console.error('Error fetching embed stats:', err);
      } finally {
        setStatsLoading(false);
      }
    };
    fetchEmbedStats();
  }, [communityId]);

  // Load saved embed_theme from community settings on mount
  useEffect(() => {
    if (community?.settings?.embed_theme) {
      const saved = community.settings.embed_theme;
      if (saved.theme) setTheme(prev => ({ ...prev, ...saved.theme }));
      if (saved.behavior) setBehavior(prev => ({ ...prev, ...saved.behavior }));
    }
  }, [community]);

  // Auto-refresh preview when config changes (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      setPreviewKey(prev => prev + 1);
    }, 800);
    return () => clearTimeout(timer);
  }, [theme, behavior]);

  // Build embed URL from current config
  const buildEmbedUrl = () => {
    const params = new URLSearchParams();
    params.set('community', community?.slug || '');
    // Theme colors
    Object.entries(theme).forEach(([key, val]) => {
      if (val) params.set(key, val);
    });
    // Font
    if (behavior.font && behavior.font !== 'Inter') {
      params.set('font', behavior.font.replace(/ /g, '+'));
    }
    // Behavior
    if (behavior.count !== 10) params.set('count', behavior.count);
    if (behavior.difficulty !== 'mixed') params.set('difficulty', behavior.difficulty);
    if (behavior.timer > 0) params.set('timer', behavior.timer);
    if (behavior.leaderboard !== 'community') params.set('leaderboard', behavior.leaderboard);
    if (behavior.category !== 'all') params.set('category', behavior.category);
    return `${EMBED_BASE_URL}?${params.toString()}`;
  };

  const embedUrl = buildEmbedUrl();

  const iframeSnippet = `<iframe
  src="${embedUrl}"
  width="100%"
  height="600"
  frameborder="0"
  allowtransparency="true"
  style="border: none; border-radius: 8px;">
</iframe>
<script>
  window.addEventListener('message', (e) => {
    if (e.data.type === 'quiz-embed-resize') {
      document.querySelector('iframe[src*="quiz-embed"]').style.height = e.data.height + 'px';
    }
  });
</script>`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(iframeSnippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const ta = document.createElement('textarea');
      ta.value = iframeSnippet;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const currentSettings = community?.settings || {};
      const updatedSettings = {
        ...currentSettings,
        embed_theme: { theme, behavior }
      };
      const { error } = await supabase
        .from('communities')
        .update({ settings: updatedSettings })
        .eq('id', communityId);
      if (error) throw error;
      if (showToast) showToast('Embed theme saved!', 'success');
    } catch (err) {
      console.error('Failed to save embed theme:', err);
      if (showToast) showToast('Failed to save: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRefreshPreview = () => {
    setPreviewKey(prev => prev + 1);
  };

  const updateTheme = (key, value) => {
    setTheme(prev => ({ ...prev, [key]: value }));
  };

  const updateBehavior = (key, value) => {
    setBehavior(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="tab-pane">
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) minmax(300px, 1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>

        {/* LEFT: Controls */}
        <div>
          {/* Theme Colors */}
          <div className="card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 600 }}>🎨 Theme Colors</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {[
                { key: 'bg', label: 'Background' },
                { key: 'surface', label: 'Surface' },
                { key: 'primary', label: 'Primary' },
                { key: 'accent', label: 'Accent' },
                { key: 'text', label: 'Text' }
              ].map(({ key, label }) => (
                <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                  <input
                    type="color"
                    value={theme[key]}
                    onChange={(e) => updateTheme(key, e.target.value)}
                    style={{ width: '32px', height: '32px', border: 'none', borderRadius: '4px', cursor: 'pointer', padding: 0, background: 'none' }}
                  />
                  <span>{label}</span>
                  <code style={{ fontSize: '0.7rem', opacity: 0.5, marginLeft: 'auto' }}>{theme[key]}</code>
                </label>
              ))}
            </div>
          </div>

          {/* Typography */}
          <div className="card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 600 }}>🔤 Typography</h3>
            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Display Font</label>
            <select
              value={behavior.font}
              onChange={(e) => updateBehavior('font', e.target.value)}
              className="form-input"
              style={{ width: '100%' }}
            >
              {GOOGLE_FONTS.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          {/* Behavior */}
          <div className="card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 600 }}>⚙️ Behavior</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Questions</label>
                <select value={behavior.count} onChange={(e) => updateBehavior('count', Number(e.target.value))} className="form-input" style={{ width: '100%' }}>
                  {[5, 10, 15, 20].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Difficulty</label>
                <select value={behavior.difficulty} onChange={(e) => updateBehavior('difficulty', e.target.value)} className="form-input" style={{ width: '100%' }}>
                  {['mixed', 'easy', 'medium', 'hard'].map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Timer (sec)</label>
                <select value={behavior.timer} onChange={(e) => updateBehavior('timer', Number(e.target.value))} className="form-input" style={{ width: '100%' }}>
                  {[0, 10, 15, 20, 30, 45, 60].map(t => <option key={t} value={t}>{t === 0 ? 'No timer' : `${t}s`}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Leaderboard</label>
                <select value={behavior.leaderboard} onChange={(e) => updateBehavior('leaderboard', e.target.value)} className="form-input" style={{ width: '100%' }}>
                  {['community', 'platform', 'both'].map(l => <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>)}
                </select>
              </div>
              {categories.length > 0 && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Category</label>
                  <select value={behavior.category} onChange={(e) => updateBehavior('category', e.target.value)} className="form-input" style={{ width: '100%' }}>
                    <option value="all">All Categories</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ flex: 1 }}>
              {saving ? 'Saving...' : '💾 Save Theme'}
            </button>
            <button className="btn btn-secondary" onClick={handleRefreshPreview} style={{ flex: 1 }}>
              🔄 Refresh Preview
            </button>
          </div>
        </div>

        {/* RIGHT: Live Preview */}
        <div>
          <div className="card" style={{ padding: '1.25rem', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>👁️ Live Preview</h3>
              <span style={{ fontSize: '0.7rem', opacity: 0.4 }}>Actual embed</span>
            </div>
            <div style={{
              flex: 1,
              minHeight: '500px',
              borderRadius: '8px',
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.1)',
              background: theme.bg
            }}>
              <iframe
                key={previewKey}
                ref={iframeRef}
                src={embedUrl}
                width="100%"
                height="100%"
                frameBorder="0"
                style={{ border: 'none', display: 'block' }}
                title="Quiz Embed Preview"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Embed Code Output */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>📋 Embed Code</h3>
          <button className="btn btn-primary" onClick={handleCopy} style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}>
            {copied ? '✅ Copied!' : '📋 Copy to Clipboard'}
          </button>
        </div>
        <pre style={{
          background: 'rgba(0,0,0,0.3)',
          borderRadius: '6px',
          padding: '1rem',
          fontSize: '0.75rem',
          lineHeight: 1.5,
          overflow: 'auto',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
          margin: 0,
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <code>{iframeSnippet}</code>
        </pre>
      </div>

      {/* Mobile note */}
      <p style={{ fontSize: '0.75rem', opacity: 0.4, marginTop: '1rem', textAlign: 'center' }}>
        On mobile, this configurator stacks vertically. For best results, configure on desktop.
      </p>

      {/* Embed Analytics Section */}
      <div style={{ marginTop: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem' }}>📊 Embed Analytics</h2>

        {statsLoading ? (
          <p style={{ opacity: 0.5 }}>Loading analytics...</p>
        ) : !embedStats || embedStats.totalGames === 0 ? (
          <div className="card" style={{ padding: '2rem', textAlign: 'center', opacity: 0.6 }}>
            <p>No games played yet. Analytics will appear once players start using the embed.</p>
          </div>
        ) : (
          <>
            {/* Stat cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
              {[
                { label: 'Total Games', value: embedStats.totalGames },
                { label: 'Embed Plays', value: embedStats.embedGames },
                { label: 'App Plays', value: embedStats.appGames },
                { label: 'Embed Share', value: `${embedStats.embedPct}%` },
                { label: 'Avg Embed Score', value: `${embedStats.avgScore}%` },
              ].map(({ label, value }) => (
                <div key={label} className="card" style={{ padding: '1rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{value}</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: '0.25rem' }}>{label}</div>
                </div>
              ))}
            </div>

            {/* 7-day trend */}
            <div className="card" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: '0 0 0.75rem', fontSize: '1rem', fontWeight: 600 }}>Last 7 Days</h3>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '80px' }}>
                {embedStats.recentTrend.map(day => {
                  const total = day.embed + day.app;
                  const maxDay = Math.max(...embedStats.recentTrend.map(d => d.embed + d.app), 1);
                  const height = total > 0 ? Math.max((total / maxDay) * 100, 8) : 4;
                  const embedPct = total > 0 ? (day.embed / total) * 100 : 0;
                  return (
                    <div key={day.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                      <div
                        title={`${day.date}: ${day.embed} embed, ${day.app} app`}
                        style={{
                          width: '100%',
                          height: `${height}%`,
                          borderRadius: '3px',
                          background: total > 0
                            ? `linear-gradient(to top, var(--primary, #6B2D5E) ${embedPct}%, rgba(255,255,255,0.2) ${embedPct}%)`
                            : 'rgba(255,255,255,0.05)',
                          minHeight: '3px',
                          cursor: 'default',
                        }}
                      />
                      <span style={{ fontSize: '0.6rem', opacity: 0.5 }}>{day.label}</span>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.7rem', opacity: 0.5 }}>
                <span>■ Embed</span>
                <span style={{ opacity: 0.4 }}>■ App</span>
              </div>
            </div>

            {/* Host domains */}
            {Object.keys(embedStats.hostDomains).length > 0 && (
              <div className="card" style={{ padding: '1.25rem' }}>
                <h3 style={{ margin: '0 0 0.75rem', fontSize: '1rem', fontWeight: 600 }}>Embed Host Sites</h3>
                {Object.entries(embedStats.hostDomains)
                  .sort(([, a], [, b]) => b - a)
                  .map(([host, count]) => {
                    const maxCount = Math.max(...Object.values(embedStats.hostDomains));
                    return (
                      <div key={host} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.85rem', minWidth: '140px' }}>{host}</span>
                        <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${(count / maxCount) * 100}%`, height: '100%', background: 'var(--primary, #6B2D5E)', borderRadius: '3px' }} />
                        </div>
                        <span style={{ fontSize: '0.75rem', opacity: 0.6, minWidth: '40px', textAlign: 'right' }}>{count}</span>
                      </div>
                    );
                  })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default EmbedConfigurator;

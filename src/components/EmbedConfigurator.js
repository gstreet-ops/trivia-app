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
  const iframeRef = useRef(null);

  // Load saved embed_theme from community settings on mount
  useEffect(() => {
    if (community?.settings?.embed_theme) {
      const saved = community.settings.embed_theme;
      if (saved.theme) setTheme(prev => ({ ...prev, ...saved.theme }));
      if (saved.behavior) setBehavior(prev => ({ ...prev, ...saved.behavior }));
    }
  }, [community]);

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
    </div>
  );
}

export default EmbedConfigurator;

import React, { useState, useRef, useEffect } from 'react';
import Modal from '../components/Modal.jsx';
import { ConfirmModal } from '../components/Modal.jsx';
import TagPill from '../components/TagPill.jsx';
import {
  exportData,
  importData,
  clearAllData,
  getAllTags,
  addTag,
  renameTag,
  deleteTag,
  getSettings,
  updateSettings,
  replaceStorage,
} from '../utils/storage.js';
import {
  getGithubToken,
  saveGithubToken,
  fetchGistData,
  pushGistData,
} from '../utils/gist.js';
import { getStreakStatus } from '../utils/streak.js';
import { getTheme, setTheme } from '../utils/theme.js';
import { formatFileSize, getStorageSize } from '../utils/helpers.js';
import { showToast } from '../App.jsx';

export default function SettingsPage({ navigate }) {
  const [tags, setTags] = useState([]);
  const [settings, setSettings] = useState({ defaultLanguage: 'en', sortOrder: 'dateAdded' });
  const [storageSize, setStorageSize] = useState(0);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');
  const [renamingTag, setRenamingTag] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [githubToken, setGithubToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null); // null | 'syncing' | 'ok' | 'error'
  const [syncError, setSyncError] = useState('');
  const [streak, setStreak] = useState({ current: 0, longest: 0, doneToday: false, freezeAvailable: true });
  const [theme, setThemeState] = useState('auto');
  const [conflict, setConflict] = useState(null);
  const importRef = useRef(null);

  useEffect(() => {
    setTags(getAllTags());
    setSettings(getSettings());
    setStorageSize(getStorageSize());
    setGithubToken(getGithubToken());
    setStreak(getStreakStatus());
    setThemeState(getTheme());
  }, []);

  const adoptRemote = (data) => {
    replaceStorage(data);
    setTags(getAllTags());
    setSettings(getSettings());
    setStorageSize(getStorageSize());
    setStreak(getStreakStatus());
  };

  // Saving a token used to push unconditionally, which meant entering it on a
  // device with an empty library overwrote the good copy in the repo. Decide
  // the direction from what each side actually holds, and ask when both have
  // data.
  const handleSaveToken = async () => {
    saveGithubToken(githubToken);
    if (!githubToken.trim()) {
      setSyncStatus(null);
      return;
    }
    setSyncStatus('syncing');
    setSyncError('');
    try {
      const { getStorage } = await import('../utils/storage.js');
      const local = getStorage();
      let remote = null;
      try {
        remote = await fetchGistData();
      } catch {
        remote = null; // no file in the repo yet, or no read access
      }

      const lc = countItems(local);
      const rc = countItems(remote);

      if (rc > 0 && lc === 0) {
        adoptRemote(remote);
        setSyncStatus('ok');
        showToast(`Loaded ${rc} item${rc === 1 ? '' : 's'} from the repo.`);
        return;
      }
      if (lc > 0 && rc > 0 && !sameData(local, remote)) {
        setConflict({ local, remote, lc, rc });
        setSyncStatus(null);
        return;
      }
      await pushGistData(local);
      setSyncStatus('ok');
    } catch (e) {
      setSyncStatus('error');
      setSyncError(e.message);
    }
  };

  const resolveConflict = async (direction) => {
    const { local, remote } = conflict;
    setConflict(null);
    setSyncStatus('syncing');
    setSyncError('');
    try {
      if (direction === 'pull') {
        adoptRemote(remote);
        showToast('This device now matches the repo.');
      } else {
        await pushGistData(local);
        showToast('Repo now matches this device.');
      }
      setSyncStatus('ok');
    } catch (e) {
      setSyncStatus('error');
      setSyncError(e.message);
    }
  };

  const handleSyncNow = async () => {
    setSyncStatus('syncing');
    setSyncError('');
    try {
      const { getStorage } = await import('../utils/storage.js');
      const local = getStorage();
      const data = await fetchGistData();
      const lc = countItems(local);
      const rc = countItems(data);
      // Pulling replaces everything, so never silently drop a bigger library.
      if (lc > rc) {
        setConflict({ local, remote: data, lc, rc });
        setSyncStatus(null);
        return;
      }
      adoptRemote(data);
      setSyncStatus('ok');
    } catch (e) {
      setSyncStatus('error');
      setSyncError(e.message);
    }
  };

  const handleExport = () => {
    const json = exportData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bookmarks-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        importData(evt.target.result);
        setTags(getAllTags());
        setSettings(getSettings());
        setStorageSize(getStorageSize());
        showToast('Data imported successfully.');
      } catch (err) {
        showToast(err.message, 'error');
      }
    };
    reader.readAsText(file);

    // Reset file input
    e.target.value = '';
  };

  const handleClearData = () => {
    clearAllData();
    setTags([]);
    setStorageSize(getStorageSize());
  };

  const handleAddTag = () => {
    const trimmed = newTagInput.trim();
    if (!trimmed) return;
    addTag(trimmed);
    setTags(getAllTags());
    setNewTagInput('');
  };

  const handleRenameTag = () => {
    if (!renamingTag || !renameValue.trim()) return;
    renameTag(renamingTag, renameValue.trim());
    setTags(getAllTags());
    setRenamingTag(null);
    setRenameValue('');
  };

  const handleDeleteTag = (tag) => {
    deleteTag(tag);
    setTags(getAllTags());
  };

  const handleSettingChange = (key, value) => {
    const newSettings = updateSettings({ [key]: value });
    setSettings(newSettings);
  };

  const handleThemeChange = (value) => {
    setThemeState(setTheme(value));
  };

  const storagePct = Math.min((storageSize / (5 * 1024 * 1024)) * 100, 100);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div
        style={{
          padding: '20px 20px 16px',
          paddingTop: 'calc(20px + env(safe-area-inset-top, 0px))',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <h1
          style={{
            fontFamily: 'Lora, serif',
            fontSize: '26px',
            fontWeight: 700,
            color: 'var(--text-primary)',
            margin: 0,
          }}
        >
          Settings
        </h1>
      </div>

      <div style={{ padding: '20px' }}>
        {/* Storage info */}
        <Section title="Storage">
          <div style={{ marginBottom: '4px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '6px',
              }}
            >
              <span
                style={{
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '13px',
                  color: 'var(--text-secondary)',
                }}
              >
                Used
              </span>
              <span
                style={{
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '13px',
                  color: 'var(--text-primary)',
                  fontWeight: 500,
                }}
              >
                {formatFileSize(storageSize)} / ~5 MB
              </span>
            </div>
            <div
              style={{
                height: '6px',
                background: 'var(--bg-secondary)',
                borderRadius: '3px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: storagePct + '%',
                  background: storagePct > 80 ? 'var(--danger)' : 'var(--accent-primary)',
                  borderRadius: '3px',
                  transition: 'width 500ms ease',
                }}
              />
            </div>
          </div>
        </Section>

        {/* Preferences */}
        <Section title="Preferences">
          <SettingRow label="Appearance">
            <Segmented
              value={theme}
              onChange={handleThemeChange}
              options={[
                { value: 'light', label: '☀︎' },
                { value: 'dark', label: '☾' },
                { value: 'auto', label: 'Auto' },
              ]}
            />
          </SettingRow>
          <SettingRow label="Default Language">
            <Segmented
              value={settings.defaultLanguage}
              onChange={v => handleSettingChange('defaultLanguage', v)}
              options={[
                { value: 'en', label: 'EN' },
                { value: 'he', label: 'HE' },
              ]}
            />
          </SettingRow>
        </Section>

        {/* GitHub Sync */}
        <Section title="GitHub Sync">
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 12px', lineHeight: 1.5 }}>
            Sync your books and quotes across devices. Enter a GitHub Personal Access Token with <strong>repo</strong> scope (or <strong>public_repo</strong> for public repos).
          </p>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <input
                type={showToken ? 'text' : 'password'}
                className="input-field"
                placeholder="ghp_..."
                value={githubToken}
                onChange={e => setGithubToken(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSaveToken(); }}
                style={{ fontSize: '13px', paddingRight: '40px', width: '100%', boxSizing: 'border-box' }}
              />
              <button
                type="button"
                onClick={() => setShowToken(v => !v)}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, display: 'flex', alignItems: 'center' }}
              >
                {showToken ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            <button className="btn-primary" onClick={handleSaveToken} style={{ flexShrink: 0, padding: '0 16px' }}>
              {syncStatus === 'syncing' ? '...' : 'Save'}
            </button>
          </div>

          {syncStatus === 'ok' && (
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#16a34a', margin: '0 0 10px' }}>
              Connected — data saved to repo
            </p>
          )}
          {syncStatus === 'error' && (
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'var(--danger)', margin: '0 0 10px' }}>
              {syncError}
            </p>
          )}
          {!syncStatus && getGithubToken() && (
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#16a34a', margin: '0 0 10px' }}>
              Connected
            </p>
          )}
          {!syncStatus && !getGithubToken() && (
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 10px' }}>
              Not connected — data is only stored on this device.
            </p>
          )}

          {getGithubToken() && (
            <button className="btn-secondary" onClick={handleSyncNow} style={{ width: '100%' }} disabled={syncStatus === 'syncing'}>
              {syncStatus === 'syncing' ? 'Syncing…' : 'Pull Latest from Repo'}
            </button>
          )}
        </Section>

        {/* Reading Streak */}
        <Section title="Reading Streak">
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 14px', lineHeight: 1.5 }}>
            Swipe through all of the day's quotes to keep your streak alive.
          </p>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            <StreakStat label="Current" value={streak.current} accent />
            <StreakStat label="Longest" value={streak.longest} />
          </div>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', margin: 0, color: streak.doneToday ? '#16a34a' : 'var(--text-muted)' }}>
            {streak.doneToday
              ? 'Read today — streak safe.'
              : "Not read today yet."}
            {' '}
            {streak.freezeAvailable
              ? 'Streak freeze available (one per week).'
              : 'Streak freeze already used this week.'}
          </p>
        </Section>

        {/* Tags */}
        <Section title="Tags">
          <div style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
              {tags.length === 0 ? (
                <p
                  style={{
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: '13px',
                    color: 'var(--text-muted)',
                    margin: 0,
                  }}
                >
                  No tags yet. Add tags while reviewing highlights.
                </p>
              ) : (
                tags.map(tag => (
                  <div
                    key={tag}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {renamingTag === tag ? (
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        <input
                          type="text"
                          value={renameValue}
                          onChange={e => setRenameValue(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleRenameTag();
                            if (e.key === 'Escape') { setRenamingTag(null); setRenameValue(''); }
                          }}
                          autoFocus
                          style={{
                            border: '1px solid var(--accent-primary)',
                            borderRadius: '20px',
                            padding: '4px 10px',
                            fontSize: '12px',
                            fontFamily: 'DM Sans, sans-serif',
                            color: 'var(--text-primary)',
                            background: 'var(--bg-card)',
                            outline: 'none',
                            width: '100px',
                          }}
                        />
                        <button
                          onClick={handleRenameTag}
                          style={{
                            background: 'var(--accent-primary)',
                            border: 'none',
                            borderRadius: '50%',
                            width: '24px',
                            height: '24px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--on-accent)',
                            fontSize: '12px',
                          }}
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => { setRenamingTag(null); setRenameValue(''); }}
                          style={{
                            background: 'var(--bg-secondary)',
                            border: 'none',
                            borderRadius: '50%',
                            width: '24px',
                            height: '24px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--text-muted)',
                            fontSize: '12px',
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        <span className="tag-pill">{tag}</span>
                        <button
                          onClick={() => { setRenamingTag(tag); setRenameValue(tag); }}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--text-muted)',
                            padding: '4px',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                          title="Rename tag"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteTag(tag)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--text-muted)',
                            padding: '4px',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                          title="Delete tag"
                          onMouseEnter={e => { e.currentTarget.style.color = 'var(--danger)'; }}
                          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Add tag */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                className="input-field"
                placeholder="New tag name..."
                value={newTagInput}
                onChange={e => setNewTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddTag(); }}
                style={{ fontSize: '13px' }}
              />
              <button
                className="btn-secondary"
                onClick={handleAddTag}
                style={{ padding: '0 16px', flexShrink: 0 }}
              >
                Add
              </button>
            </div>
          </div>
        </Section>

        {/* Data management */}
        <Section title="Data">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              className="btn-secondary"
              onClick={handleExport}
              style={{ width: '100%' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export Data as JSON
            </button>

            <label
              htmlFor="import-input"
              className="btn-secondary"
              style={{ width: '100%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxSizing: 'border-box' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Import Data from JSON
            </label>
            <input
              id="import-input"
              ref={importRef}
              type="file"
              accept=".json,application/json"
              onChange={handleImport}
              style={{ display: 'none' }}
            />

            <button
              className="btn-danger"
              onClick={() => setShowClearConfirm(true)}
              style={{ width: '100%' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14H6L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4h6v2" />
              </svg>
              Clear All Data
            </button>
          </div>
        </Section>

        {/* About */}
        <Section title="About">
          <div
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '13px',
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
            }}
          >
            <p style={{ margin: '0 0 6px' }}>
              <strong style={{ color: 'var(--text-primary)', fontFamily: 'Lora, serif' }}>BookMarks</strong> — your personal reading journal
            </p>
            <p style={{ margin: 0, color: 'var(--text-muted)' }}>
              Your personal reading journal — books, highlights, and quotes in one place.
            </p>
          </div>
        </Section>
      </div>

      {conflict && (
        <Modal
          isOpen
          onClose={() => setConflict(null)}
          title="Both sides have data"
          footer={
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={() => resolveConflict('pull')}>
                Use repo
              </button>
              <button className="btn-primary" style={{ flex: 1 }} onClick={() => resolveConflict('push')}>
                Use this device
              </button>
            </div>
          }
        >
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
            This device has <strong>{conflict.lc}</strong> item{conflict.lc === 1 ? '' : 's'}; the repo has{' '}
            <strong>{conflict.rc}</strong>. Syncing replaces one with the other — there is no merge, so the side you
            don't pick is overwritten.
          </p>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6, margin: '10px 0 0' }}>
            Not sure? Cancel and use Export first.
          </p>
        </Modal>
      )}

      <ConfirmModal
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={handleClearData}
        title="Clear All Data"
        message="This will permanently delete all your books, highlights, and settings. This action cannot be undone. Consider exporting your data first."
        confirmLabel="Clear Everything"
        danger
      />
    </div>
  );
}

function countItems(data) {
  if (!data) return 0;
  return (data.books?.length || 0) + (data.highlights?.length || 0);
}

function sameData(a, b) {
  return (a.books?.length || 0) === (b.books?.length || 0)
    && (a.highlights?.length || 0) === (b.highlights?.length || 0)
    && (a.streak?.lastCompletedDate || null) === (b.streak?.lastCompletedDate || null)
    && (a.streak?.current || 0) === (b.streak?.current || 0);
}

function Segmented({ value, onChange, options }) {
  return (
    <div
      style={{
        display: 'flex',
        background: 'var(--bg-secondary)',
        borderRadius: '8px',
        padding: '3px',
        border: '1px solid var(--border)',
      }}
    >
      {options.map(opt => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(opt.value)}
            style={{
              padding: '6px 14px',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '13px',
              fontWeight: selected ? 600 : 400,
              background: selected ? 'var(--bg-card)' : 'transparent',
              color: selected ? 'var(--accent-primary)' : 'var(--text-secondary)',
              transition: 'all 200ms',
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function StreakStat({ label, value, accent }) {
  return (
    <div
      style={{
        flex: 1,
        textAlign: 'center',
        padding: '12px 8px',
        borderRadius: '10px',
        border: '1px solid rgba(196,147,58,0.22)',
        background: accent ? 'rgba(196,147,58,0.09)' : 'transparent',
      }}
    >
      <div style={{ fontSize: '22px', fontWeight: 700, color: accent ? '#C4933A' : 'var(--text-primary)', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.2 }}>
        {accent ? `🔥 ${value}` : value}
      </div>
      <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif', marginTop: '3px' }}>
        {label}
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: '24px' }}>
      <h2
        style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '11px',
          fontWeight: 700,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          margin: '0 0 12px',
        }}
      >
        {title}
      </h2>
      <div
        style={{
          background: 'var(--bg-card)',
          borderRadius: '12px',
          padding: '16px',
          boxShadow: '0 2px 8px rgba(44,36,32,0.06)',
        }}
      >
        {children}
      </div>
    </div>
  );
}

function SettingRow({ label, children }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
      }}
    >
      <span
        style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '14px',
          color: 'var(--text-primary)',
          flex: 1,
        }}
      >
        {label}
      </span>
      {children}
    </div>
  );
}

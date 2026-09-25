import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { createCollection, deleteDatabaseItem, isSupabaseConfigured, loadWorkspace, saveDatabaseItem, saveProfile, supabase } from './lib/supabase';

const defaultModules = [
  { name: 'Software Design', color: '#8b5cf6' },
  { name: 'Mathematics', color: '#3b82f6' },
  { name: 'Data Science', color: '#14b8a6' },
  { name: 'Psychology', color: '#ec4899' },
];

const defaultGroups = [
  { name: 'Friends', color: '#f97316' },
  { name: 'Family', color: '#eab308' },
  { name: 'Study group', color: '#06b6d4' },
];

const colourPalette = ['#ff4700', '#f97316', '#eab308', '#84cc16', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#ec4899', '#ef4444', '#a16207', '#64748b', '#ffffff'];

const initialAssignments = [
  { id: 1, title: 'Prototype submission', module: 'Software Design', date: '2026-09-28', time: '23:59', kind: 'assignment', dangerDays: 2, amberDays: 5 },
  { id: 2, title: 'Statistics problem set', module: 'Mathematics', date: '2026-10-02', time: '17:00', kind: 'assignment', dangerDays: 1, amberDays: 4 },
  { id: 3, title: 'Research paper outline', module: 'Psychology', date: '2026-10-06', time: '23:59', kind: 'assignment', dangerDays: 3, amberDays: 8 },
  { id: 4, title: 'Data visualisation report', module: 'Data Science', date: '2026-10-12', time: '23:59', kind: 'assignment', dangerDays: 2, amberDays: 7 },
];

const initialEvents = [
  { id: 11, title: 'Coffee with Maya', group: 'Friends', date: '2026-09-27', time: '10:30', kind: 'event' },
  { id: 12, title: 'Family dinner', group: 'Family', date: '2026-09-29', time: '19:00', kind: 'event' },
  { id: 13, title: 'Group study session', group: 'Study group', date: '2026-10-03', time: '14:00', kind: 'event' },
];

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const shortDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const localISO = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const today = localISO();
const currentMonth = today.slice(0, 7);

function useStoredState(key, fallback) {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : fallback;
    } catch {
      return fallback;
    }
  });
  useEffect(() => localStorage.setItem(key, JSON.stringify(value)), [key, value]);
  return [value, setValue];
}

function Logo() {
  return <div className="brand"><span className="brand-mark">●</span><span>do it</span></div>;
}

function ThemeToggle({ theme, onToggle, className = '' }) {
  return <button className={`theme-toggle ${className}`} onClick={onToggle} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}><span>{theme === 'dark' ? '☼' : '☾'}</span>{theme === 'dark' ? 'Light' : 'Dark'}</button>;
}

function Auth({ onDone, onRecoveryComplete, recoveryMode = false, theme, onThemeChange, demoMode }) {
  const [mode, setMode] = useState(recoveryMode ? 'recovery' : 'login');
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (recoveryMode) {
      setMode('recovery');
      setStep(1);
    }
  }, [recoveryMode]);

  const title = mode === 'login'
    ? 'Own your time.'
    : mode === 'signup'
      ? (step === 2 ? 'Check your inbox.' : 'Start planning.')
      : mode === 'recovery'
        ? 'Choose a new password.'
        : (step === 2 ? 'Check your inbox.' : 'Reset your password.');
  const subtitle = mode === 'login'
    ? 'One place for every deadline, study session, and plan.'
    : mode === 'signup' && step === 2
      ? `We sent a secure confirmation link to ${email || 'your email address'}.`
      : mode === 'forgot' && step === 2
        ? `We sent a secure password-reset link to ${email || 'your email address'}.`
        : mode === 'signup'
          ? 'Bring school and the rest of your life into one clear view.'
          : mode === 'recovery'
            ? 'Use at least eight characters and keep it unique to this account.'
            : 'Enter your email and we’ll send you a secure reset link.';

  async function submit(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    setWorking(true);
    try {
      if (demoMode) {
        if ((mode === 'signup' || mode === 'forgot') && step === 1) setStep(2);
        else if (mode === 'recovery') onRecoveryComplete?.();
        else onDone();
        return;
      }
      if (mode === 'login') {
        const { data, error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (authError) throw authError;
        onDone(data.session);
      } else if (mode === 'signup') {
        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: name.trim() }, emailRedirectTo: window.location.origin },
        });
        if (authError) throw authError;
        if (data.session) onDone(data.session);
        else setStep(2);
      } else if (mode === 'forgot') {
        const { error: authError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/?reset=1`,
        });
        if (authError) throw authError;
        setStep(2);
      } else {
        if (newPassword !== confirmPassword) throw new Error('The passwords do not match.');
        const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
        if (updateError) throw updateError;
        window.history.replaceState({}, '', window.location.pathname);
        setNotice('Password updated. Your account is ready.');
        onRecoveryComplete?.();
      }
    } catch (submitError) {
      setError(submitError.message || 'Something went wrong. Please try again.');
    } finally {
      setWorking(false);
    }
  }

  async function resendLink() {
    setError('');
    setNotice('');
    setWorking(true);
    try {
      if (!demoMode) {
        const result = mode === 'signup'
          ? await supabase.auth.resend({ type: 'signup', email: email.trim(), options: { emailRedirectTo: window.location.origin } })
          : await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/?reset=1` });
        if (result.error) throw result.error;
      }
      setNotice('A new secure link has been sent.');
    } catch (resendError) {
      setError(resendError.message || 'The email could not be sent.');
    } finally {
      setWorking(false);
    }
  }

  function changeMode(next) {
    setMode(next);
    setStep(1);
    setError('');
    setNotice('');
    setNewPassword('');
    setConfirmPassword('');
  }

  const awaitingEmail = (mode === 'signup' || mode === 'forgot') && step === 2;

  return <main className="auth-page">
    <section className="auth-promo">
      <Logo />
      <div className="promo-copy"><span className="announcement">Built for student life →</span><h1>Time for<br />everything.</h1><p>Deadlines and downtime, together in one calm calendar.</p></div>
      <div className="promo-card"><span>UP NEXT</span><b>Prototype submission</b><small>Monday · 11:59 PM</small></div>
    </section>
    <section className="auth-panel">
      <ThemeToggle theme={theme} onToggle={onThemeChange} className="auth-theme" />
      <div className="auth-box">
        <div className="mobile-logo"><Logo /></div>
        <button className="back-link" onClick={() => mode !== 'login' && mode !== 'recovery' && changeMode('login')}>{mode !== 'login' && mode !== 'recovery' ? '← Back to sign in' : ''}</button>
        <div className="auth-heading"><span className="eyebrow">DO IT CALENDAR</span><h2>{title}</h2><p>{subtitle}</p></div>
        {!awaitingEmail && <form onSubmit={submit}>
          {mode === 'signup' && <label>Full name<input required maxLength="100" autoComplete="name" placeholder="Alex Morgan" value={name} onChange={event => setName(event.target.value)} /></label>}
          {mode !== 'recovery' && <label>Email address<input type="email" autoComplete="email" required placeholder="you@school.edu" value={email} onChange={event => setEmail(event.target.value)} /></label>}
          {mode === 'login' && <><label>Password<input type="password" autoComplete="current-password" minLength="8" required placeholder="••••••••" value={password} onChange={event => setPassword(event.target.value)} /></label><button type="button" className="text-link forgot" onClick={() => changeMode('forgot')}>Forgot password?</button></>}
          {mode === 'signup' && <label>Password<input type="password" autoComplete="new-password" minLength="8" required placeholder="At least 8 characters" value={password} onChange={event => setPassword(event.target.value)} /></label>}
          {mode === 'recovery' && <><label>New password<input type="password" autoComplete="new-password" minLength="8" required placeholder="At least 8 characters" value={newPassword} onChange={event => setNewPassword(event.target.value)} /></label><label>Confirm new password<input type="password" autoComplete="new-password" minLength="8" required placeholder="Enter it again" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} /></label></>}
          {error && <div className="form-message error" role="alert">{error}</div>}
          <button className="primary wide" type="submit" disabled={working}>{working ? 'Please wait…' : mode === 'login' ? 'Sign in →' : mode === 'signup' ? 'Create account →' : mode === 'forgot' ? 'Send reset link →' : 'Update password →'}</button>
        </form>}
        {awaitingEmail && <div className="email-link-card"><span aria-hidden="true">✉</span><p>Open the email from Supabase and use its link. The link is single-purpose and expires automatically.</p><button type="button" className="secondary wide" disabled={working} onClick={resendLink}>{working ? 'Sending…' : 'Resend email'}</button><button type="button" className="text-link return-login" onClick={() => changeMode('login')}>Return to sign in</button>{error && <div className="form-message error" role="alert">{error}</div>}</div>}
        {notice && <div className="inline-notice" role="status">✓ {notice}</div>}
        {demoMode && mode === 'login' && <div className="demo-note"><span>LOCAL DEMO</span><p>Use <b>alex@school.edu</b> with <b>demo1234</b></p></div>}
        {mode === 'login' ? <p className="auth-switch">New here? <button className="text-link" onClick={() => changeMode('signup')}>Create an account</button></p> : !awaitingEmail && mode !== 'recovery' ? <p className="auth-switch">Already registered? <button className="text-link" onClick={() => changeMode('login')}>Sign in</button></p> : null}
      </div>
    </section>
  </main>;
}
function itemColor(item, moduleList, groupList) {
  const collection = item.kind === 'assignment' ? moduleList : groupList;
  return collection.find(entry => entry.name === (item.module || item.group))?.color || '#77726b';
}

function daysUntil(date) {
  const due = new Date(`${date}T12:00:00`);
  const now = new Date(`${today}T12:00:00`);
  return Math.ceil((due - now) / 86400000);
}

function urgency(item) {
  if (item.kind !== 'assignment') return 'event';
  const days = daysUntil(item.date);
  const dangerDays = Number(item.dangerDays ?? 2);
  const amberDays = Number(item.amberDays ?? 7);
  return days <= dangerDays ? 'danger' : days <= amberDays ? 'amber' : 'safe';
}

function statusLabel(item) {
  const status = urgency(item);
  return status === 'danger' ? 'Due soon' : status === 'amber' ? 'Coming up' : 'On track';
}

function dateText(date) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(`${date}T12:00`));
}

function initials(name) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'U';
}

function Sidebar({ tab, setTab, profile }) {
  return <aside className="sidebar">
    <Logo />
    <div className="workspace"><div className="avatar">{initials(profile.name)}</div><div><b>{profile.name}</b><small>{profile.course || 'Student workspace'}</small></div></div>
    <nav>{[['home', '⌂', 'Home'], ['assignments', '□', 'Assignments'], ['events', '◇', 'Events']].map(([key, icon, label]) =>
      <button key={key} className={tab === key ? 'nav-active' : ''} onClick={() => setTab(key)}><i>{icon}</i>{label}</button>)}</nav>
    <div className="side-spacer" />
    <div className="sidebar-meta"><span>●</span><div><b>All changes saved</b><small>Stored on this device</small></div></div>
  </aside>;
}

function Calendar({ items, month, moduleList, groupList, onEdit }) {
  const date = new Date(`${month}-01T12:00`);
  const year = date.getFullYear();
  const monthIndex = date.getMonth();
  const first = (date.getDay() + 6) % 7;
  const count = new Date(year, monthIndex + 1, 0).getDate();
  const cells = [...Array(first).fill(null), ...Array.from({ length: count }, (_, index) => index + 1)];
  const activeMonth = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;

  return <div className="calendar">
    <div className="weekdays">{shortDays.map(day => <span key={day}>{day}</span>)}</div>
    <div className="calendar-grid">{cells.map((day, index) => {
      if (!day) return <div className="cal-cell empty" key={`empty-${index}`} />;
      const iso = `${activeMonth}-${String(day).padStart(2, '0')}`;
      const dayItems = items.filter(item => item.date === iso);
      return <div className={`cal-cell ${iso === today ? 'today' : ''}`} key={iso}>
        <span className="day-number">{day}</span>
        {dayItems.slice(0, 3).map(item => <button className={`calendar-item ${urgency(item)}`} style={{ '--module-color': itemColor(item, moduleList, groupList) }} key={item.id} onClick={() => onEdit(item)}><span>●</span>{item.title}</button>)}
        {dayItems.length > 3 && <small>+ {dayItems.length - 3} more</small>}
      </div>;
    })}</div>
  </div>;
}

function TaskList({ items, moduleList, groupList, onEdit }) {
  const grouped = [...items]
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
    .reduce((result, item) => { (result[item.date] ??= []).push(item); return result; }, {});

  if (!items.length) return <div className="empty-state"><b>Nothing here yet.</b><span>Add something to your calendar to get started.</span></div>;

  return <div className="task-list">{Object.entries(grouped).map(([date, group]) =>
    <section className="task-day" key={date}>
      <div className="task-date"><b>{date === today ? 'Today' : dateText(date)}</b><span>{new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date(`${date}T12:00`))}</span></div>
      <div className="task-items">{group.map(item => <article className={`task-card ${urgency(item)}`} key={item.id}>
        <div className="item-dot" style={{ background: itemColor(item, moduleList, groupList) }} />
        <div className="task-main"><div className="task-title"><h4>{item.title}</h4>{item.kind === 'assignment' && <span className={`urgency ${urgency(item)}`}>{statusLabel(item)}</span>}</div><p>{item.kind === 'assignment' ? item.module : item.group} <i>·</i> {item.time}{item.kind === 'assignment' && <><i>·</i> alert at {item.amberDays ?? 7} / {item.dangerDays ?? 2} days</>}</p></div>
        <button className="more" aria-label={`Edit or delete ${item.title}`} title="Edit or delete" onClick={() => onEdit(item)}>•••</button>
      </article>)}</div>
    </section>)}</div>;
}

function AddModal({ type, collections, initialItem, onClose, onAdd, onDelete }) {
  const editing = Boolean(initialItem);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [working, setWorking] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [form, setForm] = useState({
    title: initialItem?.title ?? '',
    date: initialItem?.date ?? today,
    time: initialItem?.time ?? '17:00',
    collection: initialItem?.module ?? initialItem?.group ?? collections[0]?.name ?? '',
    dangerDays: initialItem?.dangerDays ?? 2,
    amberDays: initialItem?.amberDays ?? 7,
  });
  const thresholdError = type === 'assignment' && Number(form.amberDays) <= Number(form.dangerDays);

  async function submit(event) {
    event.preventDefault();
    if (thresholdError) return;
    setWorking(true);
    setSaveError('');
    try {
      await onAdd({ id: initialItem?.id ?? Date.now(), title: form.title, [type === 'assignment' ? 'module' : 'group']: form.collection, date: form.date, time: form.time, kind: type, ...(type === 'assignment' ? { dangerDays: Number(form.dangerDays), amberDays: Number(form.amberDays) } : {}) });
      onClose();
    } catch (error) {
      setSaveError(error.message || 'Could not save your changes.');
    } finally {
      setWorking(false);
    }
  }

  return <div className="modal-shade" onMouseDown={event => event.target === event.currentTarget && onClose()}>
    <form className="modal" onSubmit={submit}>
      <button className="close" type="button" onClick={onClose}>×</button>
      <span className="eyebrow">{editing ? 'EDIT' : 'NEW'} {type}</span>
      <h3>{editing ? `Edit ${type}` : type === 'assignment' ? 'Add an assignment' : 'Make a plan'}</h3>
      <label>{type === 'assignment' ? 'Assignment title' : 'Event name'}<input autoFocus required placeholder={type === 'assignment' ? 'e.g. Research essay' : 'e.g. Cinema with friends'} value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} /></label>
      <div className="input-row"><label>{type === 'assignment' ? 'Due date' : 'Date'}<input required type="date" value={form.date} onChange={event => setForm({ ...form, date: event.target.value })} /></label><label>Time<input required type="time" value={form.time} onChange={event => setForm({ ...form, time: event.target.value })} /></label></div>
      <label>{type === 'assignment' ? 'Module' : 'People'}<select value={form.collection} onChange={event => setForm({ ...form, collection: event.target.value })}>{collections.map(entry => <option key={entry.name}>{entry.name}</option>)}</select></label>
      <div className="colour-options">{collections.map(entry => <span title={entry.name} className={form.collection === entry.name ? 'chosen' : ''} style={{ background: entry.color }} key={entry.name} onClick={() => setForm({ ...form, collection: entry.name })} />)}</div>
      {type === 'assignment' && <fieldset className="deadline-rules"><legend>Deadline colour rules for this assignment</legend><div className="input-row"><label>Danger starts<input required type="number" min="0" value={form.dangerDays} onChange={event => setForm({ ...form, dangerDays: event.target.value })} /><small>days before</small></label><label>Amber starts<input required type="number" min="1" value={form.amberDays} onChange={event => setForm({ ...form, amberDays: event.target.value })} /><small>days before</small></label></div>{thresholdError && <p>Amber must start earlier than the danger zone.</p>}<div className="rule-preview"><span className="safe">Safe</span><i>→</i><span className="amber">Amber</span><i>→</i><span className="danger">Danger</span></div></fieldset>}
      {saveError && <div className="form-message error" role="alert">{saveError}</div>}
      <div className="modal-actions">{editing && (!confirmDelete ? <button className="delete-action" type="button" onClick={() => setConfirmDelete(true)}>Delete {type}</button> : <div className="delete-confirm"><span>Delete permanently?</span><button type="button" disabled={working} onClick={async () => { setWorking(true); setSaveError(''); try { await onDelete(initialItem); } catch (error) { setSaveError(error.message || 'Could not delete this item.'); setWorking(false); } }}>Yes, delete</button><button type="button" onClick={() => setConfirmDelete(false)}>Cancel</button></div>)}<button className="primary" disabled={thresholdError || working}>{working ? 'Saving…' : editing ? 'Save changes' : `Add ${type}`}</button></div>
    </form>
  </div>;
}

function CollectionModal({ type, existing, onClose, onAdd }) {
  const isModule = type === 'module';
  const [name, setName] = useState('');
  const [colour, setColour] = useState(isModule ? '#8b5cf6' : '#f97316');
  const [working, setWorking] = useState(false);
  const [saveError, setSaveError] = useState('');
  const duplicate = existing.some(entry => entry.name.trim().toLowerCase() === name.trim().toLowerCase());

  async function submit(event) {
    event.preventDefault();
    if (!name.trim() || duplicate) return;
    setWorking(true);
    setSaveError('');
    try {
      await onAdd({ name: name.trim(), color: colour });
      onClose();
    } catch (error) {
      setSaveError(error.message || 'Could not create this group.');
    } finally {
      setWorking(false);
    }
  }

  return <div className="modal-shade" onMouseDown={event => event.target === event.currentTarget && onClose()}>
    <form className="modal collection-modal" onSubmit={submit}>
      <button className="close" type="button" onClick={onClose}>×</button>
      <span className="eyebrow">NEW {isModule ? 'MODULE' : 'PEOPLE GROUP'}</span>
      <h3>{isModule ? 'Add a module' : 'Add people'}</h3>
      <p className="modal-intro">{isModule ? 'Create a subject and give it a colour that is easy to recognise.' : 'Create a friend, family, club, or custom group for your plans.'}</p>
      <label>{isModule ? 'Module name' : 'Group name'}<input autoFocus required placeholder={isModule ? 'e.g. Web Development' : 'e.g. Debate club'} value={name} onChange={event => setName(event.target.value)} /></label>
      {duplicate && <p className="form-error">That name already exists.</p>}
      <fieldset className="colour-fieldset">
        <legend>Choose a colour</legend>
        <div className="palette">{colourPalette.map(option => <button type="button" key={option} title={option} aria-label={`Use colour ${option}`} className={colour === option ? 'chosen' : ''} style={{ background: option }} onClick={() => setColour(option)} />)}</div>
        <label className="custom-colour"><span>Custom colour</span><input type="color" value={colour} onChange={event => setColour(event.target.value)} /><output>{colour.toUpperCase()}</output></label>
      </fieldset>
      <div className="collection-preview"><span style={{ background: colour }} /><div><small>PREVIEW</small><b>{name || (isModule ? 'New module' : 'New group')}</b></div></div>
      {saveError && <div className="form-message error" role="alert">{saveError}</div>}
      <button className="primary wide" disabled={!name.trim() || duplicate || working}>{working ? 'Saving…' : `Add ${isModule ? 'module' : 'people group'}`}</button>
    </form>
  </div>;
}

function ProfileModal({ profile, onClose, onSave, onSignOut }) {
  const [form, setForm] = useState(profile);
  const [error, setError] = useState('');
  const [working, setWorking] = useState(false);
  async function submit(event) {
    event.preventDefault();
    setWorking(true);
    setError('');
    try {
      await onSave(form);
      onClose();
    } catch (saveError) {
      setError(saveError.message || 'Could not save your profile.');
    } finally {
      setWorking(false);
    }
  }
  return <div className="modal-shade" onMouseDown={event => event.target === event.currentTarget && onClose()}>
    <form className="modal profile-modal" onSubmit={submit}>
      <button className="close" type="button" onClick={onClose}>×</button>
      <span className="eyebrow">YOUR PROFILE</span>
      <div className="profile-heading"><div className="profile-avatar">{initials(form.name)}</div><div><h3>{form.name || 'Your details'}</h3><p>Update the particulars shown in your workspace.</p></div></div>
      <label>Full name<input required value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /></label>
      <label>Email address<input required type="email" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} /></label>
      <div className="input-row"><label>School<input value={form.school} onChange={event => setForm({ ...form, school: event.target.value })} placeholder="Your school" /></label><label>Course or programme<input value={form.course} onChange={event => setForm({ ...form, course: event.target.value })} placeholder="Your course" /></label></div>
      {error && <div className="form-message error" role="alert">{error}</div>}
      <div className="profile-actions"><button className="sign-out" type="button" onClick={onSignOut}>Sign out</button><button className="primary" disabled={working}>{working ? 'Saving…' : 'Save profile'}</button></div>
    </form>
  </div>;
}

function HelpModal({ onClose }) {
  return <div className="modal-shade" onMouseDown={event => event.target === event.currentTarget && onClose()}>
    <section className="modal help-modal">
      <button className="close" type="button" onClick={onClose}>×</button>
      <span className="eyebrow">QUICK GUIDE</span><h3>How do it works</h3>
      <div className="help-list"><article><b>01</b><div><h4>Create your modules</h4><p>Give each subject a colour, then use it when creating assignments.</p></div></article><article><b>02</b><div><h4>Set deadline warnings</h4><p>Every assignment can have its own amber and danger timing.</p></div></article><article><b>03</b><div><h4>Plan the rest of life</h4><p>Create people groups and use Events to keep social plans visible.</p></div></article><article><b>04</b><div><h4>Edit anything</h4><p>Click a calendar entry or its three-dot button in Tasks to edit or delete it.</p></div></article></div>
      <button className="secondary wide" type="button" onClick={onClose}>Got it</button>
    </section>
  </div>;
}

function Dashboard({ theme, onThemeChange, user, demoMode, onSignOut }) {
  const [tab, setTabState] = useState('home');
  const [view, setView] = useState('calendar');
  const [month, setMonth] = useState(currentMonth);
  const [localAssignments, setLocalAssignments] = useStoredState('do-it-assignments', initialAssignments);
  const [localEvents, setLocalEvents] = useStoredState('do-it-events', initialEvents);
  const [localModules, setLocalModules] = useStoredState('do-it-modules', defaultModules);
  const [localGroups, setLocalGroups] = useStoredState('do-it-groups', defaultGroups);
  const [localProfile, setLocalProfile] = useStoredState('do-it-profile', { name: 'Alex Morgan', email: 'alex@school.edu', school: 'Northbridge School', course: 'Year 12' });
  const [cloudData, setCloudData] = useState({ assignments: [], events: [], modules: [], groups: [], profile: { name: user?.user_metadata?.full_name || 'Student', email: user?.email || '', school: '', course: '' } });
  const [loading, setLoading] = useState(!demoMode);
  const [appError, setAppError] = useState('');
  const [filter, setFilter] = useState('All');
  const [modal, setModal] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const assignments = demoMode ? localAssignments : cloudData.assignments;
  const events = demoMode ? localEvents : cloudData.events;
  const moduleList = demoMode ? localModules : cloudData.modules;
  const groupList = demoMode ? localGroups : cloudData.groups;
  const profile = demoMode ? localProfile : cloudData.profile;
  const baseItems = tab === 'assignments' ? assignments : tab === 'events' ? events : [...assignments, ...events];
  const items = filter === 'All' ? baseItems : baseItems.filter(item => (item.module || item.group) === filter);
  const firstName = profile.name.trim().split(/\s+/)[0] || 'there';
  const heading = tab === 'home' ? `${firstName}, here’s your week.` : tab === 'assignments' ? 'Assignments' : 'Events';
  const subheading = tab === 'home' ? 'School, plans, and everything between.' : tab === 'assignments' ? 'Keep every deadline in sight.' : 'Make time for life outside class.';
  const options = tab === 'assignments' ? moduleList : groupList;
  const todayLabel = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());

  useEffect(() => {
    if (demoMode || !user) return;
    let active = true;
    setLoading(true);
    loadWorkspace(user).then(data => { if (active) setCloudData(data); }).catch(error => { if (active) setAppError(error.message || 'Could not load your calendar.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [demoMode, user]);

  function setTab(next) { setTabState(next); setFilter('All'); }
  async function saveItem(item) {
    setAppError('');
    try {
      const saved = demoMode ? item : await saveDatabaseItem(item, user.id, item.kind === 'assignment' ? moduleList : groupList);
      if (saved.kind === 'assignment') {
        const next = assignments.some(entry => entry.id === saved.id) ? assignments.map(entry => entry.id === saved.id ? saved : entry) : [...assignments, saved];
        demoMode ? setLocalAssignments(next) : setCloudData(current => ({ ...current, assignments: next }));
      } else {
        const next = events.some(entry => entry.id === saved.id) ? events.map(entry => entry.id === saved.id ? saved : entry) : [...events, saved];
        demoMode ? setLocalEvents(next) : setCloudData(current => ({ ...current, events: next }));
      }
      setEditingItem(null);
    } catch (error) {
      setAppError(error.message || 'Could not save this item.');
      throw error;
    }
  }
  async function deleteItem(item) {
    setAppError('');
    try {
      if (!demoMode) await deleteDatabaseItem(item.id);
      if (item.kind === 'assignment') {
        const next = assignments.filter(entry => entry.id !== item.id);
        demoMode ? setLocalAssignments(next) : setCloudData(current => ({ ...current, assignments: next }));
      } else {
        const next = events.filter(entry => entry.id !== item.id);
        demoMode ? setLocalEvents(next) : setCloudData(current => ({ ...current, events: next }));
      }
      setEditingItem(null);
      setModal(null);
    } catch (error) {
      setAppError(error.message || 'Could not delete this item.');
      throw error;
    }
  }
  function openEdit(item) { setEditingItem(item); setModal(item.kind); }
  function openCreate(type) { setEditingItem(null); setModal(type); }
  async function addCollection(entry) {
    const type = modal === 'module' ? 'module' : 'group';
    try {
      const saved = demoMode ? entry : await createCollection(entry, type, user.id);
      if (type === 'module') {
        const next = [...moduleList, saved];
        demoMode ? setLocalModules(next) : setCloudData(current => ({ ...current, modules: next }));
      } else {
        const next = [...groupList, saved];
        demoMode ? setLocalGroups(next) : setCloudData(current => ({ ...current, groups: next }));
      }
    } catch (error) {
      setAppError(error.message || 'Could not create this group.');
      throw error;
    }
  }
  async function updateProfile(nextProfile) {
    try {
      const saved = demoMode ? nextProfile : await saveProfile(nextProfile, user.id);
      demoMode ? setLocalProfile(saved) : setCloudData(current => ({ ...current, profile: saved }));
    } catch (error) {
      setAppError(error.message || 'Could not update your profile.');
      throw error;
    }
  }
  function moveMonth(offset) {
    const date = new Date(`${month}-01T12:00`);
    date.setMonth(date.getMonth() + offset);
    setMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
  }

  return <div className="app">
    <Sidebar tab={tab} setTab={setTab} profile={profile} />
    <main className="content">
      <div className="content-inner">
        {appError && <div className="app-alert" role="alert"><span>{appError}</span><button onClick={() => setAppError('')}>Dismiss</button></div>}
        <header className="topbar"><div><span className="eyebrow">{tab === 'home' ? todayLabel.toUpperCase() : tab.toUpperCase()}</span><h1>{heading}</h1><p>{subheading}</p></div><div className="top-actions"><ThemeToggle theme={theme} onToggle={onThemeChange} /><button className="help" onClick={() => setModal('help')} aria-label="Open help">?</button><button className="profile" onClick={() => setModal('profile')} aria-label="Open profile" title="Profile details">{initials(profile.name)}</button></div></header>
        <section className="toolbar"><div className="toggle"><button className={view === 'calendar' ? 'selected' : ''} onClick={() => setView('calendar')}>▦ Calendar</button><button className={view === 'tasks' ? 'selected' : ''} onClick={() => setView('tasks')}>☷ Tasks</button></div><div className="toolbar-right">{tab !== 'home' && <select className="filter" aria-label={`Filter ${tab}`} value={filter} onChange={event => setFilter(event.target.value)}><option>All</option>{options.map(entry => <option key={entry.name}>{entry.name}</option>)}</select>}{tab === 'assignments' && <button className="secondary add" onClick={() => setModal('module')}>＋ Add module</button>}{tab === 'events' && <button className="secondary add" onClick={() => setModal('people')}>＋ Add people</button>}<button className="primary add" disabled={(tab === 'events' ? groupList : moduleList).length === 0} title={(tab === 'events' ? groupList : moduleList).length === 0 ? `Add a ${tab === 'events' ? 'people group' : 'module'} first` : ''} onClick={() => openCreate(tab === 'events' ? 'event' : 'assignment')}>＋ Add {tab === 'events' ? 'event' : 'assignment'}</button></div></section>
        <section className="dashboard-main">{loading ? <div className="loading-state"><span /><p>Loading your calendar…</p></div> : view === 'calendar' ? <><div className="month-bar"><button onClick={() => moveMonth(-1)}>‹</button><h2>{monthNames[Number(month.slice(5)) - 1]} {month.slice(0, 4)}</h2><button onClick={() => moveMonth(1)}>›</button><button className="today-button" onClick={() => setMonth(currentMonth)}>Today</button><div className="status-key"><span className="safe">Safe</span><span className="amber">Amber</span><span className="danger">Danger</span></div></div><Calendar items={items} month={month} moduleList={moduleList} groupList={groupList} onEdit={openEdit} /></> : <TaskList items={items} moduleList={moduleList} groupList={groupList} onEdit={openEdit} />}</section>
      </div>
    </main>
    {(modal === 'assignment' || modal === 'event') && <AddModal type={modal} collections={modal === 'assignment' ? moduleList : groupList} initialItem={editingItem} onClose={() => { setModal(null); setEditingItem(null); }} onAdd={saveItem} onDelete={deleteItem} />}
    {(modal === 'module' || modal === 'people') && <CollectionModal type={modal} existing={modal === 'module' ? moduleList : groupList} onClose={() => setModal(null)} onAdd={addCollection} />}
    {modal === 'profile' && <ProfileModal profile={profile} onClose={() => setModal(null)} onSave={updateProfile} onSignOut={onSignOut} />}
    {modal === 'help' && <HelpModal onClose={() => setModal(null)} />}
  </div>;
}

function SetupRequired({ theme, onThemeChange }) {
  return <main className="setup-page"><ThemeToggle theme={theme} onToggle={onThemeChange} /><section><Logo /><span className="eyebrow">DEPLOYMENT SETUP REQUIRED</span><h1>Connect your database.</h1><p>This deployment is intentionally locked because production credentials are missing. Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to the Vercel project, then redeploy.</p><a href="https://vercel.com/marketplace/supabase" target="_blank" rel="noreferrer">Open Supabase on Vercel →</a></section></main>;
}

function App() {
  const [demoLoggedIn, setDemoLoggedIn] = useState(false);
  const [session, setSession] = useState(null);
  const [recovering, setRecovering] = useState(() => new URLSearchParams(window.location.search).has('reset'));
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured);
  const [theme, setTheme] = useStoredState('do-it-theme', 'dark');
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setAuthLoading(false); });
    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
      setSession(nextSession);
      setAuthLoading(false);
    });
    return () => listener.subscription.unsubscribe();
  }, []);
  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');
  const demoMode = !isSupabaseConfigured && import.meta.env.DEV;
  async function signOut() {
    if (demoMode) setDemoLoggedIn(false);
    else await supabase.auth.signOut();
  }
  if (!isSupabaseConfigured && import.meta.env.PROD) return <SetupRequired theme={theme} onThemeChange={toggleTheme} />;
  if (authLoading) return <div className="boot-screen"><Logo /><span /></div>;
  const loggedIn = demoMode ? demoLoggedIn : Boolean(session);
  return loggedIn && !recovering
    ? <Dashboard theme={theme} onThemeChange={toggleTheme} user={session?.user} demoMode={demoMode} onSignOut={signOut} />
    : <Auth recoveryMode={recovering && Boolean(session)} onRecoveryComplete={() => setRecovering(false)} onDone={nextSession => { if (demoMode) setDemoLoggedIn(true); else if (nextSession) setSession(nextSession); }} theme={theme} onThemeChange={toggleTheme} demoMode={demoMode} />;
}

createRoot(document.getElementById('root')).render(<App />);

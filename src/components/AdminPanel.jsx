import { useEffect, useState } from 'react';
import { isConfigured } from '../lib/supabase';
import { fetchComplaints } from '../lib/complaints';
import {
  getSession,
  onAuthChange,
  signInWithEmail,
  signOut,
  checkIsAdmin,
  updateComplaintStatus,
} from '../lib/admin';

const STATUS_LABEL = {
  reported: 'Reported',
  in_progress: 'In progress',
  resolved: 'Resolved',
};
const STATUS_STYLE = {
  reported: 'bg-amber-100 text-amber-700',
  in_progress: 'bg-blue-100 text-blue-700',
  resolved: 'bg-green-100 text-green-700',
};

export default function AdminPanel() {
  const [session, setSession] = useState(null);
  const [admin, setAdmin] = useState(false);
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    getSession().then((s) => {
      setSession(s);
      setReady(true);
    });
    return onAuthChange(setSession);
  }, []);

  useEffect(() => {
    if (!session) {
      setAdmin(false);
      return;
    }
    checkIsAdmin().then(setAdmin);
    fetchComplaints({ limit: 1000 }).then(setComplaints).catch(() => {});
  }, [session]);

  async function handleSignIn(e) {
    e.preventDefault();
    setError(null);
    try {
      await signInWithEmail(email);
      setSent(true);
    } catch (err) {
      setError(err.message);
    }
  }

  async function setStatus(id, status) {
    setBusyId(id);
    setError(null);
    try {
      const updated = await updateComplaintStatus(id, status);
      setComplaints((prev) => prev.map((c) => (c.id === id ? { ...c, ...updated } : c)));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  const wrap = (children) => (
    <div className="min-h-screen bg-stone-50 font-body">
      <div className="max-w-2xl mx-auto px-5 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold font-display text-stone-900">
            Swaccho Purulia · Admin
          </h1>
          {session && (
            <button onClick={signOut} className="text-sm text-stone-500 underline">
              Sign out
            </button>
          )}
        </div>
        {children}
        <a href="./" className="inline-block mt-8 text-sm text-stone-400 underline">
          ← Back to the public site
        </a>
      </div>
    </div>
  );

  if (!isConfigured) {
    return wrap(
      <div className="rounded-2xl bg-amber-50 border border-amber-100 px-4 py-3 text-amber-700">
        Supabase isn't configured — set the VITE_SUPABASE_* env vars to use the admin panel.
      </div>
    );
  }

  if (!ready) return wrap(<div className="text-stone-400">Loading…</div>);

  // Signed out → magic-link sign in
  if (!session) {
    return wrap(
      sent ? (
        <div className="rounded-2xl bg-green-50 text-green-700 px-4 py-4">
          Check your email for a sign-in link.
        </div>
      ) : (
        <form onSubmit={handleSignIn} className="rounded-2xl border border-stone-200 bg-white p-5">
          <p className="text-stone-600 mb-4">
            Sign in with your official email to manage reports. Your email must be on the
            admin allowlist.
          </p>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="official@example.com"
            className="w-full px-4 py-3 rounded-xl border border-stone-300 mb-3"
          />
          <button className="w-full rounded-xl bg-red-600 text-white font-bold py-3">
            Send sign-in link
          </button>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </form>
      )
    );
  }

  // Signed in but not an admin
  if (!admin) {
    return wrap(
      <div className="rounded-2xl bg-stone-100 px-4 py-4 text-stone-600">
        Signed in as <b>{session.user?.email}</b>, but this account isn't on the admin
        allowlist. Ask an existing admin to add it:
        <pre className="mt-2 text-xs bg-white rounded-lg p-3 overflow-x-auto">
{`insert into public.admins (email)
values ('${session.user?.email}');`}
        </pre>
      </div>
    );
  }

  // Admin dashboard
  const open = complaints.filter((c) => c.status !== 'resolved');
  return wrap(
    <>
      <div className="text-sm text-stone-500 mb-4">
        Signed in as <b>{session.user?.email}</b> · {complaints.length} reports ·{' '}
        {open.length} open
      </div>
      {error && (
        <div className="mb-4 rounded-xl bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>
      )}
      {complaints.length === 0 ? (
        <div className="text-stone-400 py-10 text-center">No reports yet.</div>
      ) : (
        <div className="space-y-3">
          {complaints.map((c) => (
            <div key={c.id} className="flex gap-3 rounded-2xl border border-stone-200 bg-white p-3">
              {c.photo_url ? (
                <img src={c.photo_url} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0" />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-stone-100 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLE[c.status]}`}>
                    {STATUS_LABEL[c.status] || c.status}
                  </span>
                  <span className="text-sm font-semibold text-stone-800">{c.category}</span>
                  <span className="text-xs text-stone-400">
                    {c.ward_name || 'Unmapped'} · {c.created_at ? new Date(c.created_at).toLocaleString() : ''}
                  </span>
                </div>
                {c.note && <p className="text-sm text-stone-600 mt-1">{c.note}</p>}
                <div className="flex gap-2 mt-2">
                  {c.status !== 'in_progress' && c.status !== 'resolved' && (
                    <Btn disabled={busyId === c.id} onClick={() => setStatus(c.id, 'in_progress')}>
                      Start
                    </Btn>
                  )}
                  {c.status !== 'resolved' && (
                    <Btn disabled={busyId === c.id} onClick={() => setStatus(c.id, 'resolved')} primary>
                      Resolve
                    </Btn>
                  )}
                  {c.status !== 'reported' && (
                    <Btn disabled={busyId === c.id} onClick={() => setStatus(c.id, 'reported')}>
                      Reopen
                    </Btn>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function Btn({ children, onClick, disabled, primary }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-1.5 rounded-lg text-sm font-semibold disabled:opacity-50 ${
        primary ? 'bg-green-600 text-white' : 'bg-stone-100 text-stone-700'
      }`}
    >
      {children}
    </button>
  );
}

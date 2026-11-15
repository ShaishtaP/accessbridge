import { useState } from 'react';
import { useNavigate } from 'react-router';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import Alert from './Alert.jsx';
import TextField from './TextField.jsx';

const ROLES = ['member', 'admin'];

// Member list with invite, role change and remove for owners/admins, and "Leave" for everyone else.
export default function MembersSection({ workspace, canManage, onWorkspaceChange, announce }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [formError, setFormError] = useState('');
  const base = `/workspaces/${workspace.id}/members`;

  async function handleInvite(e) {
    e.preventDefault();
    if (!email.trim()) return setFormError('Enter the email of a registered user.');
    setFormError('');
    try {
      const data = await api(base, { method: 'POST', body: { email, role } });
      onWorkspaceChange(data.workspace);
      setEmail('');
      announce(`${email} added as ${role}.`);
    } catch (err) {
      setFormError(err.message);
    }
  }

  async function handleRole(member, newRole) {
    try {
      const data = await api(`${base}/${member.userId}`, { method: 'PATCH', body: { role: newRole } });
      onWorkspaceChange(data.workspace);
      announce(`${member.name} is now ${newRole}.`);
    } catch (err) {
      announce(err.message);
    }
  }

  async function handleRemove(member) {
    const isSelf = member.userId === user.id;
    const question = isSelf ? `Leave ${workspace.name}?` : `Remove ${member.name} from ${workspace.name}?`;
    if (!window.confirm(question)) return;
    try {
      await api(`${base}/${member.userId}`, { method: 'DELETE' });
      if (isSelf) return navigate('/');
      onWorkspaceChange({ ...workspace, members: workspace.members.filter((m) => m.userId !== member.userId) });
      announce(`${member.name} removed.`);
    } catch (err) {
      announce(err.message);
    }
  }

  return (
    <section aria-labelledby="members-heading" className="mt-8">
      <h2 id="members-heading" className="text-xl font-semibold">Members</h2>
      <ul className="mt-3 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
        {workspace.members.map((m) => {
          const isSelf = m.userId === user.id;
          const editable = canManage && m.role !== 'owner' && !isSelf;
          return (
            <li key={m.userId} className="flex flex-wrap items-center justify-between gap-2 p-3">
              <span>
                {m.name} {isSelf && <span className="text-sm text-slate-600">(you)</span>}{' '}
                <span className="text-sm text-slate-600">{m.email}</span>
              </span>
              <span className="flex items-center gap-2">
                {editable ? (
                  <>
                    <label htmlFor={`role-${m.userId}`} className="sr-only">Role for {m.name}</label>
                    <select id={`role-${m.userId}`} value={m.role} onChange={(e) => handleRole(m, e.target.value)}
                      className="rounded border border-slate-400 bg-white px-2 py-1">
                      {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <button type="button" onClick={() => handleRemove(m)} aria-label={`Remove ${m.name}`}
                      className="rounded border border-red-400 px-3 py-1 text-sm text-red-800 hover:bg-red-50">
                      Remove
                    </button>
                  </>
                ) : (
                  <span className="capitalize text-slate-700">{m.role}</span>
                )}
                {isSelf && m.role !== 'owner' && (
                  <button type="button" onClick={() => handleRemove(m)}
                    className="rounded border border-slate-400 px-3 py-1 text-sm hover:bg-slate-100">
                    Leave workspace
                  </button>
                )}
              </span>
            </li>
          );
        })}
      </ul>

      {canManage && (
        <form onSubmit={handleInvite} noValidate className="mt-4 max-w-md rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-lg font-semibold">Add a member</h3>
          <Alert>{formError}</Alert>
          <div className="mt-3 flex flex-col gap-4">
            <TextField id="member-email" label="Email" type="email" value={email} onChange={setEmail}
              autoComplete="off" hint="The person needs an AccessBridge account first." />
            <div className="flex flex-col gap-1">
              <label htmlFor="member-role" className="font-medium">Role</label>
              <select id="member-role" value={role} onChange={(e) => setRole(e.target.value)}
                className="rounded border border-slate-400 bg-white px-3 py-2">
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <button type="submit" className="self-start rounded bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800">
              Add member
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

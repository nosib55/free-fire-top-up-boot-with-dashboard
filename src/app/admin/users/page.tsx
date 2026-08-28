'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Phone,
  Mail,
  Edit,
  X,
  Shield,
  UserCheck,
  UserX,
} from 'lucide-react';

interface UserItem {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'admin' | 'reseller' | 'user';
  status: 'active' | 'suspended';
  balance?: number;
  hitBalance?: number;
  createdAt: string;
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Create User Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'admin' | 'reseller' | 'user'>('user');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Edit User State
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRole, setEditRole] = useState<'admin' | 'reseller' | 'user'>('user');
  const [editBalance, setEditBalance] = useState<number | string>(0);
  const [editHitBalance, setEditHitBalance] = useState<number | string>(1000);
  const [editPassword, setEditPassword] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (data.success) {
        setUsers(data.users || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, role, password }),
      });
      const data = await res.json();
      if (data.success) {
        setModalOpen(false);
        setName('');
        setEmail('');
        setPhone('');
        setPassword('');
        // Instant state update
        if (data.user) {
          setUsers((prev) => [data.user, ...prev]);
        }
        fetchUsers();
      } else {
        alert(data.message || 'User creation failed');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleStatus(userId: string) {
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'TOGGLE_STATUS' }),
      });
      const data = await res.json();
      if (data.success) {
        setUsers((prev) =>
          prev.map((u) =>
            u._id === userId
              ? { ...u, status: u.status === 'active' ? 'suspended' : 'active' }
              : u
          )
        );
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleSaveEditUser(e: React.FormEvent) {
    e.preventDefault();
    if (!editUserId) return;
    try {
      const res = await fetch(`/api/users/${editUserId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          phone: editPhone,
          role: editRole,
          balance: parseFloat(String(editBalance)) || 0,
          hitBalance: Number(editHitBalance),
          password: editPassword || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEditUserId(null);
        fetchUsers();
      } else {
        alert(data.message);
      }
    } catch (e) {
      console.error(e);
    }
  }

  function startEdit(u: UserItem) {
    setEditUserId(u._id);
    setEditName(u.name);
    setEditPhone(u.phone || '');
    setEditRole(u.role === 'admin' ? 'admin' : u.role === 'reseller' ? 'reseller' : 'user');
    setEditBalance(u.balance ?? 0);
    setEditHitBalance(u.hitBalance ?? 1000);
    setEditPassword('');
  }

  const filteredUsers = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6" suppressHydrationWarning>
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">User Management (3-Tier Roles)</h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage root administrators, B2B resellers, client users, role assignments, and account status.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 font-bold text-xs text-white shadow-md shadow-cyan-600/30 transition-all hover:scale-105"
        >
          <UserPlus className="w-4 h-4" />
          <span>Create New User</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users by name or email..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
        />
      </div>

      {/* User Table */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="p-4">User Details</th>
                <th className="p-4">Phone</th>
                <th className="p-4">Role</th>
                <th className="p-4">Account Status</th>
                <th className="p-4">Wallet Balance</th>
                <th className="p-4">Hit Balance</th>
                <th className="p-4">Created Date</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    {loading ? 'Loading users...' : 'No users found.'}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u._id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-cyan-600/10 border border-cyan-600/20 text-cyan-400 font-bold flex items-center justify-center text-xs">
                          {u.name?.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-white">{u.name}</p>
                          <p className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Mail className="w-3 h-3 text-slate-500" />
                            {u.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="p-4 font-mono text-slate-400">
                      {u.phone ? (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-500" />
                          {u.phone}
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>

                    <td className="p-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wider uppercase ${
                          u.role === 'admin'
                            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                            : u.role === 'reseller'
                            ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}
                      >
                        {u.role ? u.role.toUpperCase() : 'USER'}
                      </span>
                    </td>

                    <td className="p-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          u.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {u.status === 'active' ? 'Active' : 'Suspended'}
                      </span>
                    </td>

                    <td className="p-4 font-mono text-emerald-400 font-bold">
                      ৳{Number(u.balance ?? 0).toLocaleString()}
                    </td>

                    <td className="p-4 font-mono text-cyan-300 font-bold">
                      {u.hitBalance ?? 1000} Hits
                    </td>

                    <td className="p-4 text-slate-400 text-[11px]">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>

                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => startEdit(u)}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 font-semibold text-[11px]"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => handleToggleStatus(u._id)}
                        className={`px-2.5 py-1 rounded font-semibold text-[11px] ${
                          u.status === 'active'
                            ? 'bg-rose-950/60 text-rose-400 hover:bg-rose-900/60'
                            : 'bg-emerald-950/60 text-emerald-400 hover:bg-emerald-900/60'
                        }`}
                      >
                        {u.status === 'active' ? 'Suspend' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE USER MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="max-w-md w-full bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-extrabold text-base text-white">Create New User</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+880 1700 000000"
                  className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Role Selector</label>
                <select
                  value={role}
                  onChange={(e: any) => setRole(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-bold"
                >
                  <option value="user">User (Client / Developer)</option>
                  <option value="reseller">Reseller (B2B Partner)</option>
                  <option value="admin">Super Admin (Master Controller)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 font-bold text-white shadow-md shadow-cyan-600/30 transition-all"
              >
                {submitting ? 'Creating User...' : 'Submit & Create Account'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {editUserId && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="max-w-md w-full bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-extrabold text-base text-white">Edit User</h3>
              <button onClick={() => setEditUserId(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditUser} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Full Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Phone Number</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Role Selector</label>
                <select
                  value={editRole}
                  onChange={(e: any) => setEditRole(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-bold"
                >
                  <option value="user">User (Client / Developer)</option>
                  <option value="reseller">Reseller (B2B Partner)</option>
                  <option value="admin">Super Admin (Master Controller)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Wallet Balance (BDT ৳)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={editBalance}
                    onChange={(e) => setEditBalance(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-emerald-400 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">API Hit Quota</label>
                  <input
                    type="number"
                    min="0"
                    value={editHitBalance}
                    onChange={(e) => setEditHitBalance(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-cyan-300 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">New Password (Leave blank to keep current)</label>
                <input
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 font-bold text-white shadow-md shadow-cyan-600/30"
              >
                Save User Changes
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

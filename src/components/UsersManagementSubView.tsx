import React, { useState } from "react";
import { User, Role, AccessLevel, Team, UserStatus } from "../types";
import { 
  Users, 
  Plus, 
  Edit2, 
  Trash2, 
  Search, 
  Shield, 
  Award, 
  Target, 
  Mail, 
  X, 
  Save, 
  CheckCircle,
  AlertTriangle,
  Clock,
  UserCheck,
  Building
} from "lucide-react";

interface UsersManagementSubViewProps {
  users: User[];
  teams: Team[];
  activeUserId: string;
  onAddUser: (user: User) => Promise<void>;
  onUpdateUser: (userId: string, updates: Partial<User>) => Promise<void>;
  onDeleteUser: (userId: string) => Promise<void>;
  isAuthorized: boolean;
}

export default function UsersManagementSubView({
  users,
  teams,
  activeUserId,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  isAuthorized
}: UsersManagementSubViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("All Roles");
  const [teamFilter, setTeamFilter] = useState<string>("All Teams");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // In-App Deletion Modal State (replaces window.confirm)
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>(Role.User);
  const [accessLevel, setAccessLevel] = useState<AccessLevel>(AccessLevel.Editor);
  const [teamName, setTeamName] = useState("");
  const [targetQuota, setTargetQuota] = useState<number>(30000);
  const [reportsTo, setReportsTo] = useState("");
  const [status, setStatus] = useState<UserStatus>("active");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeUserRecord = users.find(u => u.id === activeUserId);
  const isAdmin = activeUserRecord?.role === Role.Admin || isAuthorized;

  const handleOpenAddModal = () => {
    setEditingUser(null);
    setName("");
    setEmail("");
    setRole(Role.User);
    setAccessLevel(AccessLevel.Editor);
    setTeamName(teams[0]?.name || "Executive");
    setTargetQuota(30000);
    setReportsTo("");
    setStatus("active");
    setAvatarUrl("");
    setErrorMsg("");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (user: User) => {
    setEditingUser(user);
    setName(user.name);
    setEmail(user.email);
    setRole(user.role);
    setAccessLevel(user.accessLevel);
    setTeamName(user.teamName || "");
    setTargetQuota(user.targetQuota || 30000);
    setReportsTo(user.reportsTo || "");
    setStatus(user.status || "active");
    setAvatarUrl(user.avatarUrl || "");
    setErrorMsg("");
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setErrorMsg("Name and email are required.");
      return;
    }
    setIsSubmitting(true);
    setErrorMsg("");
    try {
      const normalizedEmail = email.trim().toLowerCase();
      if (editingUser) {
        await onUpdateUser(editingUser.id, {
          name: name.trim(),
          email: normalizedEmail,
          role,
          accessLevel,
          teamName,
          targetQuota: Number(targetQuota),
          reportsTo: reportsTo || undefined,
          status,
          avatarUrl: avatarUrl.trim() || undefined
        });
      } else {
        if (users.some(u => (u.email || u.id).toLowerCase() === normalizedEmail)) {
          setErrorMsg("A user with this email already exists!");
          setIsSubmitting(false);
          return;
        }
        await onAddUser({
          id: normalizedEmail,
          name: name.trim(),
          email: normalizedEmail,
          role,
          accessLevel,
          teamName: teamName || teams[0]?.name || "Executive",
          targetQuota: Number(targetQuota),
          reportsTo: reportsTo || undefined,
          status,
          avatarUrl: avatarUrl.trim() || undefined
        });
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to save user details to database.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    setDeleteError("");
    try {
      await onDeleteUser(userToDelete.id);
      setUserToDelete(null);
    } catch (err) {
      console.error("Error deleting user:", err);
      setDeleteError("Failed to delete user from database. Please verify Firestore permissions or network connection.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter users
  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      (u.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.teamName && u.teamName.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesRole = roleFilter === "All Roles" || u.role === roleFilter;
    const matchesTeam = teamFilter === "All Teams" || u.teamName === teamFilter;

    return matchesSearch && matchesRole && matchesTeam;
  });

  const getRoleBadgeClasses = (r: Role) => {
    switch (r) {
      case Role.Admin: return "bg-purple-950 text-purple-200 border-purple-500/30";
      case Role.SeniorManager: return "bg-emerald-950 text-emerald-300 border-emerald-500/30";
      case Role.Manager: return "bg-teal-950 text-teal-300 border-teal-500/30";
      case Role.TeamLead: return "bg-cyan-950 text-cyan-300 border-cyan-500/30";
      default: return "bg-blue-950 text-blue-300 border-blue-500/30";
    }
  };

  const getStatusBadge = (st?: UserStatus) => {
    switch (st) {
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
            <Clock size={10} /> Pending Approval
          </span>
        );
      case "disabled":
        return (
          <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-300">
            <AlertTriangle size={10} /> Suspended
          </span>
        );
      case "active":
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle size={10} /> Active
          </span>
        );
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-slate-950 text-white rounded-xl p-5 border border-slate-800 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Users size={18} className="text-emerald-400" />
            <h2 className="text-xs font-extrabold uppercase font-mono tracking-wider">User Details & Auth Mapping Manager</h2>
          </div>
          <p className="text-[11px] text-slate-400 max-w-2xl leading-normal">
            Pre-register user emails, role assignments, reporting hierarchies, and quota targets. When a team member creates an account or logs in with their email, their profile maps automatically.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-extrabold text-[10px] uppercase font-mono px-3.5 py-2 rounded-lg transition cursor-pointer flex items-center gap-1.5 shadow-sm"
          >
            <Plus size={13} />
            Add New User Details
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users by name, email, or team..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">Role:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="All Roles">All Roles</option>
              {Object.values(Role).map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">Team:</span>
            <select
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="All Teams">All Teams</option>
              {teams.map(t => (
                <option key={t.id} value={t.name}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredUsers.length === 0 ? (
          <div className="col-span-full bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-400 text-xs italic font-medium">
            No registered users match your search or filter criteria.
          </div>
        ) : (
          filteredUsers.map((u) => {
            const managerName = users.find(mgr => mgr.id === u.reportsTo)?.name || "Top Matrix / Executive";
            const isSelf = u.id === activeUserId || u.email?.toLowerCase() === activeUserId.toLowerCase();
            return (
              <div key={u.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={u.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120"}
                        alt={u.name}
                        className="w-10 h-10 rounded-lg object-cover border border-slate-200 shadow-2xs shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div className="min-w-0">
                        <h4 className="font-extrabold text-xs text-slate-900 truncate">{u.name}</h4>
                        <span className="text-[10px] text-slate-500 font-mono block truncate max-w-[160px]">{u.email}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(u)}
                        title="Edit User Details"
                        className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg border border-blue-200 transition cursor-pointer"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteError("");
                          setUserToDelete(u);
                        }}
                        title={isSelf ? "Delete User (Current User)" : "Delete User Details"}
                        className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg border border-rose-200 transition cursor-pointer"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    {getStatusBadge(u.status)}
                    {isSelf && (
                      <span className="text-[9px] font-mono font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                        Current Session
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100 mb-3 text-[10px]">
                    <div>
                      <span className="text-[8.5px] uppercase font-mono text-slate-400 block font-bold">Assigned Role</span>
                      <span className={`inline-block px-1.5 py-0.5 rounded border text-[9px] font-bold font-mono mt-0.5 ${getRoleBadgeClasses(u.role)}`}>
                        {u.role}
                      </span>
                    </div>
                    <div>
                      <span className="text-[8.5px] uppercase font-mono text-slate-400 block font-bold">Access Level</span>
                      <span className="font-bold text-slate-700 block mt-0.5 font-mono">{u.accessLevel}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-[10.5px] text-slate-600 mb-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-mono text-[9px] uppercase">Team / Group:</span>
                      <span className="font-bold text-slate-800">{u.teamName || "General"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-mono text-[9px] uppercase">Target Quota:</span>
                      <span className="font-bold text-emerald-600 font-mono">${(u.targetQuota || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-mono text-[9px] uppercase">Reports To:</span>
                      <span className="font-medium text-slate-700 truncate max-w-[140px]">{managerName}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[9px] font-mono">
                  <span className="text-emerald-600 font-bold flex items-center gap-1 truncate max-w-[140px]">
                    <CheckCircle size={10} className="shrink-0" /> Auth Profile Mapped
                  </span>
                  <span className="text-slate-400 truncate max-w-[120px]">ID: {u.id}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Delete User Confirmation Modal (In-App Modal replacing window.confirm) */}
      {userToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden animate-scale-up">
            <div className="bg-rose-950 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-rose-600 text-white rounded-lg">
                  <AlertTriangle size={16} />
                </div>
                <h3 className="text-xs font-bold uppercase font-mono">Confirm User Account Deletion</h3>
              </div>
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                disabled={isDeleting}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer transition"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {deleteError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3 rounded-lg font-medium">
                  {deleteError}
                </div>
              )}

              <div className="space-y-2">
                <p className="text-xs text-slate-700 leading-relaxed">
                  Are you sure you want to permanently delete the user details for:
                </p>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1 font-mono text-xs">
                  <div className="font-extrabold text-slate-900">{userToDelete.name}</div>
                  <div className="text-slate-500 text-[11px]">{userToDelete.email}</div>
                  <div className="text-[10px] text-emerald-700 font-bold">Role: {userToDelete.role} • Team: {userToDelete.teamName || "Executive"}</div>
                </div>
                <p className="text-[11px] text-slate-500">
                  This will remove the user's role mapping and database profile.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setUserToDelete(null)}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase font-mono rounded-lg transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs uppercase font-mono rounded-lg transition cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <Trash2 size={13} />
                  {isDeleting ? "Deleting..." : "Delete User Details"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-scale-up">
            <div className="bg-slate-950 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-emerald-400" />
                <h3 className="text-xs font-bold uppercase font-mono">
                  {editingUser ? "Edit User Details" : "Register New User Details"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer transition"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {errorMsg && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3 rounded-lg font-medium">
                  {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-700 uppercase font-mono">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Sarah Jenkins"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-700 uppercase font-mono">Work Email *</label>
                  <input
                    type="email"
                    required
                    disabled={!!editingUser}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. sarah@aromaorganic.in"
                    className={`w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 ${editingUser ? 'opacity-60 cursor-not-allowed' : ''}`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-700 uppercase font-mono">Assigned Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as Role)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    {Object.values(Role).map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-700 uppercase font-mono">Access Level (ACL)</label>
                  <select
                    value={accessLevel}
                    onChange={(e) => setAccessLevel(e.target.value as AccessLevel)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    {Object.values(AccessLevel).map(a => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-700 uppercase font-mono">Team / Group</label>
                  <select
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="">Select Team</option>
                    {teams.map(t => (
                      <option key={t.id} value={t.name}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-700 uppercase font-mono">Account Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as UserStatus)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="active">Active (Full Access)</option>
                    <option value="pending">Pending Approval (Restricted)</option>
                    <option value="disabled">Disabled / Suspended</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-700 uppercase font-mono">Target Quota ($)</label>
                  <input
                    type="number"
                    value={targetQuota}
                    onChange={(e) => setTargetQuota(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-700 uppercase font-mono">Supervisor Line</label>
                  <select
                    value={reportsTo}
                    onChange={(e) => setReportsTo(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="">None (Top Matrix / Executive)</option>
                    {users
                      .filter(u => !editingUser || u.id !== editingUser.id)
                      .map(u => (
                        <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-700 uppercase font-mono">Avatar Image URL (Optional)</label>
                <input
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase font-mono rounded-lg transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-extrabold text-xs uppercase font-mono rounded-lg transition cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <Save size={13} />
                  {isSubmitting ? "Saving..." : editingUser ? "Update User" : "Save User Details"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

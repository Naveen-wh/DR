/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { User, Role, AccessLevel, UserStatus, TeamTabSettings, Team } from "../types";
import { 
  Shield, 
  ChevronDown, 
  CornerDownRight, 
  Users, 
  Mail, 
  Target, 
  Award, 
  Save, 
  Eye, 
  Settings, 
  Plus, 
  Trash2, 
  Edit2, 
  UserCheck, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  X, 
  UserPlus, 
  ShieldAlert, 
  Lock 
} from "lucide-react";
import { getReportingTreeUsers } from "../data";
import { TABS_CONFIG } from "../constants/tabs";

interface TeamDirectoryViewProps {
  users: User[];
  activeUserId: string;
  onUpdateUser?: (userId: string, updates: Partial<User>) => Promise<void>;
  onSaveUser?: (user: User) => Promise<void>;
  onDeleteUser?: (userId: string) => Promise<void>;
  tabSettings?: TeamTabSettings[];
  onUpdateTabSettings?: (
    teamName: string, 
    visibleTabs: string[], 
    visibleSubTabs: { [key: string]: string[] }, 
    visibleSubSubTabs: { [key: string]: { [key: string]: string[] } },
    permissions?: { [key: string]: { view: boolean; add: boolean; edit: boolean } }
  ) => Promise<void>;
  teams?: Team[];
  onSaveTeam?: (team: Team) => Promise<void>;
  onDeleteTeam?: (teamId: string) => Promise<void>;
}

export default function TeamDirectoryView({ 
  users, 
  activeUserId, 
  onUpdateUser,
  onSaveUser,
  onDeleteUser,
  tabSettings = [],
  onUpdateTabSettings,
  teams = [],
  onSaveTeam,
  onDeleteTeam
}: TeamDirectoryViewProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>(activeUserId);

  // Modal states for user creation & pending approval
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [approvingUser, setApprovingUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [userDeleteError, setUserDeleteError] = useState("");

  // Form states for creating a new user
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState<Role>(Role.User);
  const [newUserAccess, setNewUserAccess] = useState<AccessLevel>(AccessLevel.Editor);
  const [newUserTeam, setNewUserTeam] = useState("");
  const [newUserQuota, setNewUserQuota] = useState(30000);
  const [newUserReportsTo, setNewUserReportsTo] = useState("");
  const [newUserError, setNewUserError] = useState("");
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);

  // Form states for approving a pending user
  const [approveRole, setApproveRole] = useState<Role>(Role.User);
  const [approveAccess, setApproveAccess] = useState<AccessLevel>(AccessLevel.Editor);
  const [approveTeam, setApproveTeam] = useState("");
  const [approveQuota, setApproveQuota] = useState(30000);
  const [approveReportsTo, setApproveReportsTo] = useState("");
  const [isApproving, setIsApproving] = useState(false);

  // Team creation / editing local states
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamDesc, setNewTeamDesc] = useState("");
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);
  const [teamError, setTeamError] = useState("");
  const [activeConfigTeam, setActiveConfigTeam] = useState<string | null>(null);

  // Active user and permissions
  const activeUserRecord = users.find((u) => u.id === activeUserId);
  const isAdmin = activeUserRecord?.role === Role.Admin;

  // Split users into pending requests and active directory
  const pendingUsers = users.filter((u) => u.status === "pending");
  const activeUsers = users.filter((u) => u.status !== "pending");

  // Selected user resolution
  const selectedUser = users.find((u) => u.id === selectedUserId) || activeUsers[0] || users[0] || {
    id: "",
    name: "System Profile",
    role: Role.User,
    accessLevel: AccessLevel.Editor,
    email: "",
    teamName: "",
    targetQuota: 0,
    avatarUrl: "",
    status: "active" as UserStatus
  };

  // Local state for Admin edit forms in sidebar
  const [editName, setEditName] = useState(selectedUser.name);
  const [editRole, setEditRole] = useState(selectedUser.role);
  const [editAccess, setEditAccess] = useState(selectedUser.accessLevel);
  const [editTeam, setEditTeam] = useState(selectedUser.teamName || "");
  const [editQuota, setEditQuota] = useState(selectedUser.targetQuota || 0);
  const [editReportsTo, setEditReportsTo] = useState(selectedUser.reportsTo || "");
  const [editStatus, setEditStatus] = useState<UserStatus>(selectedUser.status || "active");
  const [isSaving, setIsSaving] = useState(false);

  // Sync edits state when selected user changes
  useEffect(() => {
    setEditName(selectedUser.name);
    setEditRole(selectedUser.role);
    setEditAccess(selectedUser.accessLevel);
    setEditTeam(selectedUser.teamName || "");
    setEditQuota(selectedUser.targetQuota || 0);
    setEditReportsTo(selectedUser.reportsTo || "");
    setEditStatus(selectedUser.status || "active");
  }, [selectedUser]);

  // Auto select active user on load if valid
  useEffect(() => {
    if (activeUserId && users.some(u => u.id === activeUserId)) {
      setSelectedUserId(activeUserId);
    }
  }, [activeUserId, users]);

  const reportingTeamIds = getReportingTreeUsers(selectedUser.id, users);
  const reportsCount = reportingTeamIds.length;

  const getManagerName = (reportsToId?: string) => {
    if (!reportsToId) return "Executive / Board";
    return users.find((u) => u.id === reportsToId)?.name || "N/A";
  };

  const handleSaveUser = async () => {
    if (!onUpdateUser || !selectedUser.id) return;
    setIsSaving(true);
    try {
      await onUpdateUser(selectedUser.id, {
        name: editName,
        role: editRole,
        accessLevel: editAccess,
        teamName: editTeam,
        targetQuota: Number(editQuota),
        reportsTo: editReportsTo || undefined,
        status: editStatus
      });
    } catch (err) {
      console.error("Failed to save changes:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteUserClick = (userId: string) => {
    const target = users.find(u => u.id === userId);
    if (!target) return;
    setUserDeleteError("");
    setUserToDelete(target);
  };

  const handleConfirmDeleteUser = async () => {
    if (!onDeleteUser || !userToDelete) return;
    setIsDeletingUser(true);
    setUserDeleteError("");
    try {
      await onDeleteUser(userToDelete.id);
      if (selectedUserId === userToDelete.id) {
        const remaining = users.filter(u => u.id !== userToDelete.id);
        if (remaining.length > 0) setSelectedUserId(remaining[0].id);
      }
      setUserToDelete(null);
    } catch (err) {
      console.error("Failed to delete user:", err);
      setUserDeleteError("Failed to delete user from database.");
    } finally {
      setIsDeletingUser(false);
    }
  };

  // Open approval modal for a pending user
  const handleOpenApproveModal = (u: User) => {
    setApprovingUser(u);
    setApproveRole(Role.User);
    setApproveAccess(AccessLevel.Editor);
    setApproveTeam(teams[0]?.name || "Executive");
    setApproveQuota(30000);
    setApproveReportsTo("");
  };

  const handleApproveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approvingUser) return;
    setIsApproving(true);
    try {
      if (onUpdateUser) {
        await onUpdateUser(approvingUser.id, {
          role: approveRole,
          accessLevel: approveAccess,
          teamName: approveTeam || "Executive",
          targetQuota: Number(approveQuota),
          reportsTo: approveReportsTo || undefined,
          status: "active"
        });
      } else if (onSaveUser) {
        await onSaveUser({
          ...approvingUser,
          role: approveRole,
          accessLevel: approveAccess,
          teamName: approveTeam || "Executive",
          targetQuota: Number(approveQuota),
          reportsTo: approveReportsTo || undefined,
          status: "active"
        });
      }
      setApprovingUser(null);
    } catch (err) {
      console.error("Error approving user:", err);
    } finally {
      setIsApproving(false);
    }
  };

  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) {
      setNewUserError("Name and Email are required.");
      return;
    }
    const normalizedEmail = newUserEmail.trim().toLowerCase();
    if (users.some((u) => (u.email || u.id).toLowerCase() === normalizedEmail)) {
      setNewUserError("A user with this email address already exists.");
      return;
    }

    if (!onSaveUser) return;
    setIsSubmittingUser(true);
    setNewUserError("");

    try {
      const newUser: User = {
        id: normalizedEmail,
        name: newUserName.trim(),
        email: normalizedEmail,
        role: newUserRole,
        accessLevel: newUserAccess,
        teamName: newUserTeam || teams[0]?.name || "Executive",
        targetQuota: Number(newUserQuota) || 0,
        reportsTo: newUserReportsTo || undefined,
        status: "active",
        avatarUrl: `https://images.unsplash.com/photo-${1535713875002 + Math.floor(Math.random() * 1000)}?auto=format&fit=crop&w=120`
      };

      await onSaveUser(newUser);
      setIsAddUserModalOpen(false);
      setNewUserName("");
      setNewUserEmail("");
      setNewUserRole(Role.User);
      setNewUserAccess(AccessLevel.Editor);
      setNewUserTeam("");
      setNewUserQuota(30000);
      setNewUserReportsTo("");
      setSelectedUserId(newUser.id);
    } catch (err) {
      console.error("Error adding user:", err);
      setNewUserError("Failed to add user to database.");
    } finally {
      setIsSubmittingUser(false);
    }
  };

  const handleAddTeamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    if (!onSaveTeam) return;
    setIsCreatingTeam(true);
    setTeamError("");
    try {
      if (editingTeamId) {
        // Update existing team
        await onSaveTeam({
          id: editingTeamId,
          name: newTeamName.trim(),
          description: newTeamDesc.trim() || undefined,
          createdAt: new Date().toISOString()
        });
        setEditingTeamId(null);
      } else {
        // Create new team
        const teamId = newTeamName.trim().toLowerCase().replace(/[^a-z0-9]/g, "-") || "team-" + Date.now();
        if (teams.some((t) => t.id === teamId)) {
          setTeamError("A team with this name or ID already exists!");
          setIsCreatingTeam(false);
          return;
        }
        await onSaveTeam({
          id: teamId,
          name: newTeamName.trim(),
          description: newTeamDesc.trim() || undefined,
          createdAt: new Date().toISOString()
        });
      }
      setNewTeamName("");
      setNewTeamDesc("");
    } catch (err) {
      setTeamError("Error saving team to Firestore.");
      console.error(err);
    } finally {
      setIsCreatingTeam(false);
    }
  };

  const handleEditTeamClick = (team: Team) => {
    setEditingTeamId(team.id);
    setNewTeamName(team.name);
    setNewTeamDesc(team.description || "");
    setTeamError("");
  };

  const handleCancelEditTeam = () => {
    setEditingTeamId(null);
    setNewTeamName("");
    setNewTeamDesc("");
    setTeamError("");
  };

  const handleDeleteTeamClick = async (teamId: string) => {
    if (!onDeleteTeam) return;
    setTeamError("");
    if (window.confirm("Are you sure you want to delete this team? Users assigned to this team will remain, but the team option will be removed from the database.")) {
      try {
        await onDeleteTeam(teamId);
        if (editingTeamId === teamId) {
          handleCancelEditTeam();
        }
      } catch (err) {
        console.error("Error deleting team:", err);
        setTeamError("Failed to delete team from database. Please check Firestore permissions or try again.");
      }
    }
  };

  // Styling helper for roles
  const getRoleBadgeClasses = (role: Role) => {
    switch (role) {
      case Role.Admin:
        return "bg-slate-900 text-purple-200 border-purple-500/30";
      case Role.SeniorManager:
        return "bg-emerald-950 text-emerald-300 border-emerald-500/30";
      case Role.Manager:
        return "bg-teal-950 text-teal-300 border-teal-500/30";
      case Role.TeamLead:
        return "bg-cyan-950 text-cyan-300 border-cyan-500/30";
      case Role.User:
        return "bg-blue-950 text-blue-300 border-blue-500/30";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  // Tab Visibility & Permissions helpers
  const uniqueTeams = teams.length > 0 
    ? teams.map(t => t.name) 
    : Array.from(new Set(users.map((u) => u.teamName).filter(Boolean)));
    
  const getTabPermission = (team: string, tabId: string, permissionType: "view" | "add" | "edit"): boolean => {
    const setting = tabSettings?.find((s) => s.teamName.toLowerCase() === team.toLowerCase());
    if (!setting) return true;

    if (tabId.includes("/")) {
      const [parent, child] = tabId.split("/");
      const isParentVisible = setting.visibleTabs.includes(parent);
      const isParentPermitted = setting.permissions?.[parent]?.view !== false;
      if (!isParentVisible || !isParentPermitted) return false;

      const isChildInSubTabs = setting.visibleSubTabs?.[parent]
        ? setting.visibleSubTabs[parent].includes(child)
        : true;
      const isChildPermitted = setting.permissions?.[tabId]?.[permissionType] !== undefined
        ? setting.permissions[tabId][permissionType]
        : true;

      return isChildInSubTabs && isChildPermitted;
    } else {
      const isParentVisible = setting.visibleTabs.includes(tabId);
      const isParentPermitted = setting.permissions?.[tabId]?.[permissionType] !== undefined
        ? setting.permissions[tabId][permissionType]
        : true;

      if (permissionType === "view") {
        if (!isParentVisible || !isParentPermitted) return false;
        const tabConfig = TABS_CONFIG.find(t => t.id === tabId);
        if (tabConfig?.subTabs && tabConfig.subTabs.length > 0) {
          const hasAnySubTabVisible = tabConfig.subTabs.some(st => {
            const subId = `${tabId}/${st.id}`;
            const subInSubTabs = setting.visibleSubTabs?.[tabId]
              ? setting.visibleSubTabs[tabId].includes(st.id)
              : true;
            const subPermitted = setting.permissions?.[subId]?.view !== false;
            return subInSubTabs && subPermitted;
          });
          if (!hasAnySubTabVisible) return false;
        }
      }

      return isParentVisible && isParentPermitted;
    }
  };

  const handleTogglePermission = async (team: string, tabId: string, permissionType: "view" | "add" | "edit") => {
    if (!onUpdateTabSettings) return;
    const setting = tabSettings?.find((s) => s.teamName.toLowerCase() === team.toLowerCase());
    
    const currentVisibleTabs = setting?.visibleTabs || TABS_CONFIG.map(t => t.id);
    const currentVisibleSubTabs = setting?.visibleSubTabs || {};
    const currentVisibleSubSubTabs = setting?.visibleSubSubTabs || {};
    const currentPermissions = { ...(setting?.permissions || {}) };
    
    const newVal = !getTabPermission(team, tabId, permissionType);
    
    let newVisibleTabs = [...currentVisibleTabs];
    let newVisibleSubTabs = { ...currentVisibleSubTabs };

    if (!tabId.includes("/")) {
      currentPermissions[tabId] = {
        ...(currentPermissions[tabId] || { view: true, add: true, edit: true }),
        [permissionType]: newVal
      };

      if (permissionType === "view") {
        const tabConfig = TABS_CONFIG.find(t => t.id === tabId);
        if (newVal) {
          if (!newVisibleTabs.includes(tabId)) newVisibleTabs.push(tabId);
          if (tabConfig?.subTabs) {
            newVisibleSubTabs[tabId] = tabConfig.subTabs.map(st => st.id);
            tabConfig.subTabs.forEach(st => {
              const subKey = `${tabId}/${st.id}`;
              currentPermissions[subKey] = {
                ...(currentPermissions[subKey] || { view: true, add: true, edit: true }),
                view: true
              };
            });
          }
        } else {
          newVisibleTabs = newVisibleTabs.filter(t => t !== tabId);
          if (tabConfig?.subTabs) {
            newVisibleSubTabs[tabId] = [];
            tabConfig.subTabs.forEach(st => {
              const subKey = `${tabId}/${st.id}`;
              currentPermissions[subKey] = {
                ...(currentPermissions[subKey] || { view: true, add: true, edit: true }),
                view: false
              };
            });
          }
        }
      }
    } else {
      const [parent, child] = tabId.split("/");
      const tabConfig = TABS_CONFIG.find(t => t.id === parent);

      currentPermissions[tabId] = {
        ...(currentPermissions[tabId] || { view: true, add: true, edit: true }),
        [permissionType]: newVal
      };

      if (permissionType === "view") {
        let subTabs = newVisibleSubTabs[parent] || tabConfig?.subTabs?.map(st => st.id) || [];
        if (newVal) {
          if (!subTabs.includes(child)) subTabs = [...subTabs, child];
          if (!newVisibleTabs.includes(parent)) newVisibleTabs.push(parent);
          currentPermissions[parent] = {
            ...(currentPermissions[parent] || { view: true, add: true, edit: true }),
            view: true
          };
        } else {
          subTabs = subTabs.filter(c => c !== child);
          if (subTabs.length === 0) {
            newVisibleTabs = newVisibleTabs.filter(t => t !== parent);
            currentPermissions[parent] = {
              ...(currentPermissions[parent] || { view: true, add: true, edit: true }),
              view: false
            };
          }
        }
        newVisibleSubTabs[parent] = subTabs;
      }
    }
    
    await onUpdateTabSettings(team, newVisibleTabs, newVisibleSubTabs, currentVisibleSubSubTabs, currentPermissions);
  };

  const handleAllowAllForTeam = async (team: string) => {
    if (!onUpdateTabSettings) return;
    const newVisibleTabs = TABS_CONFIG.map(t => t.id);
    const newVisibleSubTabs: { [key: string]: string[] } = {};
    const newVisibleSubSubTabs: { [key: string]: { [key: string]: string[] } } = {};
    const newPermissions: { [key: string]: { view: boolean; add: boolean; edit: boolean } } = {};

    TABS_CONFIG.forEach(tab => {
      newPermissions[tab.id] = { view: true, add: true, edit: true };
      if (tab.subTabs) {
        newVisibleSubTabs[tab.id] = tab.subTabs.map(st => st.id);
        tab.subTabs.forEach(subTab => {
          newPermissions[`${tab.id}/${subTab.id}`] = { view: true, add: true, edit: true };
        });
      }
    });

    await onUpdateTabSettings(team, newVisibleTabs, newVisibleSubTabs, newVisibleSubSubTabs, newPermissions);
  };

  const handleBlockAllForTeam = async (team: string) => {
    if (!onUpdateTabSettings) return;
    const newPermissions: { [key: string]: { view: boolean; add: boolean; edit: boolean } } = {};
    TABS_CONFIG.forEach(tab => {
      newPermissions[tab.id] = { view: false, add: false, edit: false };
      if (tab.subTabs) {
        tab.subTabs.forEach(subTab => {
          newPermissions[`${tab.id}/${subTab.id}`] = { view: false, add: false, edit: false };
        });
      }
    });
    await onUpdateTabSettings(team, [], {}, {}, newPermissions);
  };

  const getVisibleTabsForTeam = (team: string) => {
    return TABS_CONFIG.filter((t) => getTabPermission(team, t.id, "view")).map((t) => t.id);
  };

  return (
    <div className="space-y-4">
      {/* Top Header Row with Add User Trigger */}
      <div className="bg-white p-3 rounded-lg border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div>
          <h3 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
            <Award className="text-emerald-600" size={15} /> Organizational Hierarchy & User Matrix
          </h3>
          <p className="text-[10px] text-slate-500 leading-normal max-w-3xl mt-0.5">
            Centralized User Identity Management, Hierarchy Tree, and Department Tab Access Control Matrix.
          </p>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setIsAddUserModalOpen(true);
                setNewUserError("");
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-md shadow-xs transition cursor-pointer"
            >
              <UserPlus size={13} />
              Add New User
            </button>
          </div>
        )}
      </div>

      {/* Pending Account Requests Banner for Admins */}
      {isAdmin && pendingUsers.length > 0 && (
        <div className="bg-amber-50/80 border border-amber-300 rounded-xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-amber-500 text-white rounded-lg shadow-xs">
                <Clock size={16} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                  Pending Account Registration Requests
                  <span className="bg-amber-200 text-amber-900 text-[10px] px-2 py-0.2 rounded-full font-mono font-extrabold">
                    {pendingUsers.length} Pending
                  </span>
                </h4>
                <p className="text-[10px] text-amber-800 font-medium">
                  These users registered/logged in and require role & department configuration before they can access the portal.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {pendingUsers.map((pending) => (
              <div 
                key={pending.id}
                className="bg-white border border-amber-200 rounded-lg p-3 flex flex-col justify-between shadow-2xs space-y-2.5"
              >
                <div className="space-y-1">
                  <div className="flex items-start justify-between gap-1">
                    <span className="font-extrabold text-xs text-slate-900 leading-tight block">
                      {pending.name || pending.email.split("@")[0]}
                    </span>
                    <span className="text-[8.5px] font-mono px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold uppercase shrink-0">
                      Unapproved
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 block truncate">
                    {pending.email}
                  </span>
                  <span className="text-[9px] text-slate-400 font-mono block">
                    Requested: {pending.requestedAt ? new Date(pending.requestedAt).toLocaleDateString() : "Recent"}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => handleOpenApproveModal(pending)}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10.5px] font-bold py-1.5 px-2 rounded flex items-center justify-center gap-1 transition cursor-pointer"
                  >
                    <UserCheck size={12} />
                    Configure & Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteUserClick(pending.id)}
                    title="Reject & Delete Request"
                    className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded border border-rose-200 transition cursor-pointer"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Hierarchy & User Detail Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Hierarchical Structure Tree list */}
        <div className="lg:col-span-7 bg-white p-3 rounded-lg border border-slate-200 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h4 className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">
              Active Organizational Reporting Structure ({activeUsers.length} Active Members)
            </h4>
          </div>

          {/* Graphical Hierarchy Tree */}
          <div className="space-y-2.5">
            {/* Level 1: Admins */}
            {activeUsers.filter((u) => u.role === Role.Admin).map((admin) => (
              <div key={admin.id} className="space-y-2">
                <button
                  type="button"
                  onClick={() => setSelectedUserId(admin.id)}
                  className={`w-full flex items-center justify-between p-2 rounded-md border transition-all text-left cursor-pointer ${
                    selectedUserId === admin.id
                      ? "bg-purple-950/5 border-purple-500"
                      : "bg-slate-50 border-slate-200 hover:bg-slate-100/50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <img
                      src={admin.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120"}
                      alt={admin.name}
                      className="w-8 h-8 rounded border border-purple-200 object-cover shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <span className="font-extrabold text-slate-950 block text-[11.5px] leading-none">{admin.name}</span>
                      <span className="text-[8.5px] uppercase font-bold text-purple-700 tracking-wider block mt-0.5 font-mono">
                        Level 1 • Platform Administrator ({admin.email})
                      </span>
                    </div>
                  </div>
                  <span className="text-[9px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded border border-purple-200 font-bold font-mono">
                    Super Admin
                  </span>
                </button>

                {/* Level 2: Senior Manager */}
                <div className="pl-4 border-l border-slate-200 space-y-2">
                  {activeUsers.filter((u) => u.role === Role.SeniorManager && u.reportsTo === admin.id).map((srMgr) => (
                    <div key={srMgr.id} className="space-y-2">
                      <div className="flex items-start gap-1">
                        <CornerDownRight size={12} className="text-slate-300 mt-2 shrink-0" />
                        <button
                          type="button"
                          onClick={() => setSelectedUserId(srMgr.id)}
                          className={`w-full flex items-center justify-between p-1.5 rounded-md border transition-all text-left cursor-pointer ${
                            selectedUserId === srMgr.id
                              ? "bg-emerald-950/5 border-emerald-500"
                              : "bg-slate-50/40 border-slate-200 hover:bg-slate-100/30"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <img
                              src={srMgr.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120"}
                              alt={srMgr.name}
                              className="w-6.5 h-6.5 rounded border border-emerald-250 object-cover shrink-0"
                              referrerPolicy="no-referrer"
                            />
                            <div>
                              <span className="font-bold text-slate-900 block text-[11px] leading-none">{srMgr.name}</span>
                              <span className="text-[8px] uppercase font-bold text-emerald-700 tracking-wider block mt-0.5 font-mono">
                                Level 2 • Senior Manager ({srMgr.teamName})
                              </span>
                            </div>
                          </div>
                          <span className="text-[8px] font-mono text-slate-500">${(srMgr.targetQuota || 0).toLocaleString()}</span>
                        </button>
                      </div>

                      {/* Level 3: Manager */}
                      <div className="pl-4 border-l border-slate-200 space-y-2">
                        {activeUsers.filter((u) => u.role === Role.Manager && u.reportsTo === srMgr.id).map((mgr) => (
                          <div key={mgr.id} className="space-y-2">
                            <div className="flex items-start gap-1">
                              <CornerDownRight size={12} className="text-slate-300 mt-2 shrink-0" />
                              <button
                                type="button"
                                onClick={() => setSelectedUserId(mgr.id)}
                                className={`w-full flex items-center justify-between p-1.5 rounded-md border transition-all text-left cursor-pointer ${
                                  selectedUserId === mgr.id
                                    ? "bg-teal-950/5 border-teal-500"
                                    : "bg-slate-50/40 border-slate-200 hover:bg-slate-100/30"
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <img
                                    src={mgr.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120"}
                                    alt={mgr.name}
                                    className="w-6 h-6 rounded border border-teal-250 object-cover shrink-0"
                                    referrerPolicy="no-referrer"
                                  />
                                  <div>
                                    <span className="font-bold text-slate-900 block text-[11px] leading-none">{mgr.name}</span>
                                    <span className="text-[8px] uppercase font-bold text-teal-700 tracking-wider block mt-0.5 font-mono">
                                      Level 3 • Manager
                                    </span>
                                  </div>
                                </div>
                              </button>
                            </div>

                            {/* Level 4: Team Lead */}
                            <div className="pl-4 border-l border-slate-200 space-y-2">
                              {activeUsers.filter((u) => u.role === Role.TeamLead && u.reportsTo === mgr.id).map((tl) => (
                                <div key={tl.id} className="space-y-2">
                                  <div className="flex items-start gap-1">
                                    <CornerDownRight size={12} className="text-slate-300 mt-2 shrink-0" />
                                    <button
                                      type="button"
                                      onClick={() => setSelectedUserId(tl.id)}
                                      className={`w-full flex items-center justify-between p-1.5 rounded-md border transition-all text-left cursor-pointer ${
                                        selectedUserId === tl.id
                                          ? "bg-cyan-950/5 border-cyan-500"
                                          : "bg-slate-50/40 border-slate-200 hover:bg-slate-100/30"
                                      }`}
                                    >
                                      <div className="flex items-center gap-2">
                                        <img
                                          src={tl.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120"}
                                          alt={tl.name}
                                          className="w-5.5 h-5.5 rounded border border-cyan-250 object-cover shrink-0"
                                          referrerPolicy="no-referrer"
                                        />
                                        <div>
                                          <span className="font-bold text-slate-900 block text-[10.5px] leading-none">{tl.name}</span>
                                          <span className="text-[8px] uppercase font-bold text-cyan-700 tracking-wider block mt-0.5 font-mono">
                                            Level 4 • Team Lead ({tl.teamName})
                                          </span>
                                        </div>
                                      </div>
                                    </button>
                                  </div>

                                  {/* Level 5: Sales Users */}
                                  <div className="pl-4 border-l border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                    {activeUsers.filter((u) => u.role === Role.User && u.reportsTo === tl.id).map((rep) => (
                                      <div key={rep.id} className="flex items-center gap-1">
                                        <CornerDownRight size={10} className="text-slate-300 shrink-0" />
                                        <button
                                          type="button"
                                          onClick={() => setSelectedUserId(rep.id)}
                                          className={`w-full text-left px-1.5 py-1 rounded text-[10.5px] font-medium border cursor-pointer ${
                                            selectedUserId === rep.id
                                              ? "bg-blue-50 border-blue-450 text-blue-700 font-bold"
                                              : "bg-slate-50/50 border-slate-100 hover:bg-slate-50 text-slate-600"
                                          }`}
                                        >
                                          {rep.name} <span className="text-[8px] text-slate-400 font-mono font-normal">({rep.teamName || "User"})</span>
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Other Active Users Section (Any users not strictly in the admin-1 tree branch) */}
            {(() => {
              const treeUserIds = new Set(
                activeUsers.filter(u => u.role === Role.Admin || u.reportsTo).map(u => u.id)
              );
              const otherUsers = activeUsers.filter(u => u.role !== Role.Admin && (!u.reportsTo || !treeUserIds.has(u.reportsTo)));
              if (otherUsers.length === 0) return null;

              return (
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <span className="text-[9px] font-mono font-bold uppercase text-slate-400 block mb-2">
                    Direct & Department Members
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {otherUsers.map((ou) => (
                      <button
                        key={ou.id}
                        type="button"
                        onClick={() => setSelectedUserId(ou.id)}
                        className={`p-2 rounded-md border text-left transition cursor-pointer flex items-center justify-between ${
                          selectedUserId === ou.id
                            ? "bg-emerald-50 border-emerald-400 text-emerald-950 font-bold"
                            : "bg-slate-50 hover:bg-slate-100/60 border-slate-200 text-slate-700"
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <span className="text-xs font-bold block truncate">{ou.name}</span>
                          <span className="text-[9px] text-slate-400 font-mono block truncate">{ou.email}</span>
                          <span className="text-[8px] uppercase font-mono font-bold text-emerald-600 mt-0.5 block">
                            {ou.role} • {ou.teamName || "General"}
                          </span>
                        </div>
                        <span className="text-[8px] px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-600 shrink-0 font-mono">
                          {ou.accessLevel}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Selected Member Detail/Edit Panel */}
        <div className="lg:col-span-5 bg-slate-950 text-white p-3.5 rounded-lg border border-slate-800 flex flex-col justify-between space-y-4">
          <div>
            <div className="text-center pb-3 border-b border-slate-850 mb-3">
              <div className="relative inline-block mx-auto mb-1.5">
                <img
                  src={selectedUser.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120"}
                  alt={selectedUser.name}
                  className="w-14 h-14 rounded border-2 border-emerald-400 object-cover"
                  referrerPolicy="no-referrer"
                />
                <span className="absolute bottom-0 right-0 bg-emerald-500 text-slate-950 p-1 rounded-full border border-slate-900">
                  <Shield size={10} />
                </span>
              </div>
              
              {isAdmin ? (
                <div className="px-2 space-y-1.5">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full text-center bg-slate-900 border border-slate-800 rounded px-2 py-0.5 text-xs text-white font-bold focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    placeholder="User Name"
                  />
                  <span className="text-[8px] text-emerald-400 font-mono font-bold block">ADMIN EDITING CONSOLE</span>
                </div>
              ) : (
                <>
                  <h4 id="detail-member-name" className="text-xs font-bold tracking-tight leading-tight">{selectedUser.name}</h4>
                  <span className={`inline-block border text-[8px] px-1.5 py-0.2 rounded-full mt-1.5 font-bold font-mono tracking-wider uppercase ${getRoleBadgeClasses(selectedUser.role)}`}>
                    {selectedUser.role}
                  </span>
                </>
              )}
            </div>

            {/* Profile specifications */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <Mail className="text-slate-500 shrink-0" size={13} />
                <div className="min-w-0 flex-1">
                  <span className="text-[8px] uppercase font-mono text-slate-400 block leading-none">Work Email</span>
                  <span className="text-[10px] font-bold text-slate-300 truncate block font-mono leading-none mt-1">{selectedUser.email}</span>
                </div>
              </div>

              {/* Status Selector */}
              {isAdmin && (
                <div className="bg-slate-900/60 p-2 rounded border border-slate-900 space-y-1">
                  <span className="text-[8px] uppercase font-mono text-amber-400 block font-bold leading-none">Account Activation Status</span>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as UserStatus)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[10px] font-bold text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="active">Active (Access Allowed)</option>
                    <option value="pending">Pending Approval (Blocked from Portal)</option>
                    <option value="disabled">Disabled / Suspended</option>
                  </select>
                </div>
              )}

              {/* Editable or Static Role Selector */}
              {isAdmin && (
                <div className="grid grid-cols-2 gap-2 bg-slate-900/60 p-1.5 rounded border border-slate-900">
                  <div className="space-y-0.5">
                    <span className="text-[8px] uppercase font-mono text-emerald-400 block leading-none">Assigned Role</span>
                    <select
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value as Role)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-[10px] font-bold text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 mt-1"
                    >
                      {Object.values(Role).map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[8px] uppercase font-mono text-emerald-400 block leading-none">Acl Matrix</span>
                    <select
                      value={editAccess}
                      onChange={(e) => setEditAccess(e.target.value as AccessLevel)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-[10px] font-bold text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 mt-1"
                    >
                      {Object.values(AccessLevel).map((a) => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Users className="text-slate-500 shrink-0" size={13} />
                <div className="flex-1">
                  <span className="text-[8px] uppercase font-mono text-slate-400 block leading-none">Supervisor reporting anchor</span>
                  {isAdmin ? (
                    <select
                      value={editReportsTo}
                      onChange={(e) => setEditReportsTo(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-0.5 text-[10px] font-bold text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 mt-1"
                    >
                      <option value="">None (Executive / Board)</option>
                      {activeUsers
                        .filter((u) => u.id !== selectedUser.id) // Cannot report to self
                        .map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name} ({u.role})
                          </option>
                        ))}
                    </select>
                  ) : (
                    <span className="text-[10px] font-bold text-slate-300 block leading-none mt-1">{getManagerName(selectedUser.reportsTo)}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Shield className="text-slate-500 shrink-0" size={13} />
                <div className="flex-1">
                  <span className="text-[8px] uppercase font-mono text-slate-400 block leading-none">Designated Team Group</span>
                  {isAdmin ? (
                    <select
                      value={editTeam}
                      onChange={(e) => setEditTeam(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-0.5 text-[10px] font-bold text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 mt-1"
                    >
                      <option value="">Select Team / Group</option>
                      {Array.from(new Set([
                        ...teams.map((t) => t.name),
                        ...(editTeam ? [editTeam] : [])
                      ])).map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-[10px] font-bold text-slate-300 block leading-none mt-1">{selectedUser.teamName || "General Executive"}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Target className="text-slate-500 shrink-0" size={13} />
                <div className="flex-1">
                  <span className="text-[8px] uppercase font-mono text-slate-400 block leading-none">Individual Quota Target</span>
                  {isAdmin ? (
                    <input
                      type="number"
                      value={editQuota}
                      onChange={(e) => setEditQuota(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-0.5 text-[10px] font-bold text-emerald-400 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500 mt-1"
                    />
                  ) : (
                    <span className="text-[11px] font-bold text-emerald-400 block font-mono leading-none mt-1">
                      ${(selectedUser.targetQuota || 0).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>

              {/* Admin Save Action Button & Delete Option */}
              {isAdmin && (
                <div className="space-y-1.5 mt-3 pt-2 border-t border-slate-850">
                  <button
                    type="button"
                    onClick={handleSaveUser}
                    disabled={isSaving}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] uppercase font-mono py-1.5 rounded flex items-center justify-center gap-1 leading-none shadow-sm cursor-pointer"
                  >
                    <Save size={11} />
                    {isSaving ? "Saving changes..." : "Persist details & Access Matrix"}
                  </button>

                  {selectedUser.id !== activeUserId && (
                    <button
                      type="button"
                      onClick={() => handleDeleteUserClick(selectedUser.id)}
                      className="w-full bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-900/50 font-bold text-[9px] uppercase font-mono py-1 rounded flex items-center justify-center gap-1 transition cursor-pointer"
                    >
                      <Trash2 size={10} />
                      Delete User Account
                    </button>
                  )}
                </div>
              )}

              <div className="bg-slate-900 p-2 rounded-md border border-slate-800 mt-2">
                <span className="text-[8px] uppercase font-mono text-emerald-400 font-bold block mb-0.5">Authorization Matrix Coverage</span>
                <span className="text-[9.5px] font-bold block uppercase text-slate-100">{selectedUser.accessLevel || AccessLevel.Editor} Access level</span>
                <p className="text-[9px] text-slate-400 leading-normal font-mono mt-0.5">
                  {(selectedUser.accessLevel === AccessLevel.Editor || !selectedUser.accessLevel) && "Authorized to ADD and VIEW Leads. Can EDIT Leads ONLY if they created them. No deletion rights."}
                  {selectedUser.accessLevel === AccessLevel.Contributor && "Authorized to ADD and VIEW Leads. Can EDIT Leads created by themselves or anyone in their hierarchical reports subtree. No deletion rights."}
                  {selectedUser.accessLevel === AccessLevel.Manager && "Super Admin clearance. Authorized to VIEW, EDIT, and DELETE Leads and Tasks across all departments."}
                </p>
              </div>

              {selectedUser.teamName && (
                <div className="bg-slate-900 p-2 rounded-md border border-slate-800 mt-2 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[8px] uppercase font-mono text-cyan-400 font-bold block">
                      Team Tab Clearance ({selectedUser.teamName})
                    </span>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleAllowAllForTeam(selectedUser.teamName || "")}
                        className="text-[7.5px] bg-cyan-950 hover:bg-cyan-900 text-cyan-400 border border-cyan-800 rounded px-1.5 py-0.5 font-mono font-bold uppercase cursor-pointer"
                        title="Enable all workspace tabs and sub-tabs for this team instantly"
                      >
                        Allow All
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {TABS_CONFIG.map((tab) => {
                      const isTabEnabled = getVisibleTabsForTeam(selectedUser.teamName || "").includes(tab.id);
                      return (
                        <span
                          key={tab.id}
                          className={`text-[8.5px] font-mono px-1.5 py-0.5 rounded font-bold border ${
                            isTabEnabled
                              ? "bg-emerald-950/40 border-emerald-800/40 text-emerald-400"
                              : "bg-rose-950/20 border-rose-900/30 text-rose-400"
                          }`}
                        >
                          {tab.id === "indent" ? "Indent" : tab.label}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="pt-2 mt-3 border-t border-slate-850 text-[10px] text-slate-500 bg-slate-900/40 p-2 rounded flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
            <span>Subtree supervised: <strong className="text-slate-200">{reportsCount} nodes</strong>.</span>
          </div>
        </div>
      </div>

      {/* Admin Team Tab Visibility Management Panel */}
      {isAdmin && (
        <div id="team-tab-permissions-panel" className="bg-white rounded-lg border border-slate-200 p-4 mt-3 shadow-2xs">
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-emerald-50 text-emerald-700 p-1.5 rounded-md">
              <Settings size={15} />
            </div>
            <div>
              <h3 className="text-xs font-extrabold text-slate-900">Team Workspace Tab Visibility Console</h3>
              <p className="text-[9px] text-emerald-600 font-mono leading-none mt-0.5 uppercase tracking-wider font-bold">
                Clearance Level: Platform Administrator
              </p>
            </div>
          </div>

          <p className="text-[10px] text-slate-500 mb-4 max-w-3xl leading-normal">
            Configure View, Add, and Edit access privileges for each workspace tab and sub-tab team-wise.
            When view access is toggled off, team members are restricted from accessing that tab. 
            <strong className="text-emerald-700 ml-1">Note: Users with the Admin role always retain full access to all tabs.</strong>
          </p>

          <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden bg-slate-50/20">
            {uniqueTeams.map((team) => {
              const visibleTabs = getVisibleTabsForTeam(team);
              const isConfiguringThisTeam = activeConfigTeam === team;
              return (
                <div key={team} className="flex flex-col p-3 hover:bg-slate-50/20 transition-colors">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                    <div className="md:col-span-4">
                      <span className="font-extrabold text-[11px] text-slate-900 block leading-tight">{team}</span>
                      <span className="text-[9px] font-mono font-medium text-slate-400 block mt-0.5">
                        {visibleTabs.length} of {TABS_CONFIG.length} tabs enabled
                      </span>
                    </div>
                    <div className="md:col-span-8 flex flex-wrap items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleAllowAllForTeam(team)}
                        className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 hover:border-emerald-300 rounded text-[8px] font-mono font-bold uppercase transition-all cursor-pointer"
                        title={`Enable all tabs, sub-tabs and operations for ${team} instantly`}
                      >
                        Allow All
                      </button>
                      <button
                        type="button"
                        onClick={() => handleBlockAllForTeam(team)}
                        className="px-2 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 hover:border-rose-300 rounded text-[8px] font-mono font-bold uppercase transition-all cursor-pointer"
                        title={`Block all tabs and sub-tabs for ${team}`}
                      >
                        Block All
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveConfigTeam(isConfiguringThisTeam ? null : team)}
                        className={`px-2.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase transition-all cursor-pointer flex items-center gap-1 ${
                          isConfiguringThisTeam
                            ? "bg-slate-800 text-white"
                            : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                        }`}
                      >
                        {isConfiguringThisTeam ? "Close Config" : "Configure Permissions"}
                      </button>
                    </div>
                  </div>

                  {/* Detailed Tab & Sub-tab Matrix Config Drawer */}
                  {isConfiguringThisTeam && (
                    <div className="mt-3 pt-3 border-t border-slate-200 bg-white p-3 rounded-lg overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 text-[10px] font-mono uppercase text-slate-400">
                            <th className="py-1 px-2">Tab / Sub-Tab</th>
                            <th className="py-1 px-4 text-center">View</th>
                            <th className="py-1 px-4 text-center">Add</th>
                            <th className="py-1 px-4 text-center">Edit</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {TABS_CONFIG.map((tab) => {
                            const isParentChecked = getTabPermission(team, tab.id, "view");
                            return (
                              <React.Fragment key={tab.id}>
                                <tr className="bg-slate-50/50 font-bold text-slate-800">
                                  <td className="py-1.5 px-2">{tab.label}</td>
                                  <td className="px-4 py-1.5 text-center">
                                    <input
                                      type="checkbox"
                                      checked={isParentChecked}
                                      onChange={() => handleTogglePermission(team, tab.id, "view")}
                                      className="w-3.5 h-3.5 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer"
                                    />
                                  </td>
                                  <td className="px-4 py-1.5 text-center">
                                    <input
                                      type="checkbox"
                                      checked={getTabPermission(team, tab.id, "add")}
                                      onChange={() => handleTogglePermission(team, tab.id, "add")}
                                      className="w-3.5 h-3.5 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer"
                                    />
                                  </td>
                                  <td className="px-4 py-1.5 text-center">
                                    <input
                                      type="checkbox"
                                      checked={getTabPermission(team, tab.id, "edit")}
                                      onChange={() => handleTogglePermission(team, tab.id, "edit")}
                                      className="w-3.5 h-3.5 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer"
                                    />
                                  </td>
                                </tr>

                                {tab.subTabs?.map((sub) => {
                                  const subTabId = `${tab.id}/${sub.id}`;
                                  const parentViewDisabled = !isParentChecked;
                                  return (
                                    <tr key={sub.id} className="text-slate-600 hover:bg-slate-50/30">
                                      <td className="py-1 px-2 pl-6 text-[11px] font-mono flex items-center gap-1">
                                        <CornerDownRight size={10} className="text-slate-400" />
                                        {sub.label}
                                      </td>
                                      <td className="px-4 py-1 text-center">
                                        <input
                                          type="checkbox"
                                          disabled={parentViewDisabled}
                                          checked={!parentViewDisabled && getTabPermission(team, subTabId, "view")}
                                          onChange={() => handleTogglePermission(team, subTabId, "view")}
                                          className="w-3 h-3 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer disabled:opacity-30"
                                        />
                                      </td>
                                      <td className="px-4 py-1 text-center">
                                        <input
                                          type="checkbox"
                                          disabled={parentViewDisabled}
                                          checked={!parentViewDisabled && getTabPermission(team, subTabId, "add")}
                                          onChange={() => handleTogglePermission(team, subTabId, "add")}
                                          className="w-3 h-3 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer disabled:opacity-30"
                                        />
                                      </td>
                                      <td className="px-4 py-1 text-center">
                                        <input
                                          type="checkbox"
                                          disabled={parentViewDisabled}
                                          checked={!parentViewDisabled && getTabPermission(team, subTabId, "edit")}
                                          onChange={() => handleTogglePermission(team, subTabId, "edit")}
                                          className="w-3 h-3 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer disabled:opacity-30"
                                        />
                                      </td>
                                    </tr>
                                  );
                                })}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Admin Teams Management Database Panel */}
      {isAdmin && (
        <div id="teams-database-management-panel" className="bg-white rounded-lg border border-slate-200 p-4 mt-3 shadow-2xs">
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-purple-50 text-purple-700 p-1.5 rounded-md">
              <Users size={15} />
            </div>
            <div>
              <h3 className="text-xs font-extrabold text-slate-900">Teams Database Registry Console</h3>
              <p className="text-[9px] text-purple-600 font-mono leading-none mt-0.5 uppercase tracking-wider font-bold">
                Create & Manage Firestore Teams Database
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left Column: Register New Team Form */}
            <form onSubmit={handleAddTeamSubmit} className="lg:col-span-4 bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[9px] uppercase font-mono text-slate-400 block font-bold">
                  {editingTeamId ? "Edit Team Details" : "Register New Team"}
                </span>
                {editingTeamId && (
                  <button
                    type="button"
                    onClick={handleCancelEditTeam}
                    className="text-[9px] font-mono text-rose-600 hover:underline font-bold"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>

              {teamError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 text-[9.5px] p-2 rounded font-medium">
                  {teamError}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-600 block uppercase">Team Group Name</label>
                <input
                  type="text"
                  required
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-purple-500 font-medium"
                  placeholder="e.g. Sales APAC"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-600 block uppercase">Group Description</label>
                <textarea
                  value={newTeamDesc}
                  onChange={(e) => setNewTeamDesc(e.target.value)}
                  rows={2}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-purple-500 font-medium resize-none"
                  placeholder="e.g. Asia-Pacific regional enterprise sales office"
                />
              </div>

              <button
                type="submit"
                disabled={isCreatingTeam}
                className="w-full bg-purple-700 hover:bg-purple-800 text-white font-extrabold text-[9px] uppercase font-mono py-1.5 rounded flex items-center justify-center gap-1.5 leading-none shadow-sm cursor-pointer"
              >
                {editingTeamId ? <Edit2 size={11} /> : <Plus size={11} />}
                {isCreatingTeam ? "Processing..." : editingTeamId ? "Update Team" : "Add to Database"}
              </button>
            </form>

            {/* Right Column: Active Teams Database Table */}
            <div className="lg:col-span-8 border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 flex justify-between items-center">
                <span className="text-[9.5px] uppercase font-mono text-slate-500 block font-bold">
                  Registered Firestore Teams ({teams.length})
                </span>
              </div>
              
              <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 bg-white">
                {teams.length === 0 ? (
                  <div className="p-4 text-center text-slate-400 text-xs italic">
                    No teams registered in Firestore.
                  </div>
                ) : (
                  teams.map((team) => {
                    const memberCount = users.filter((u) => u.teamName === team.name).length;
                    const isBeingEdited = editingTeamId === team.id;
                    return (
                      <div key={team.id} className={`flex items-center justify-between p-3 transition-colors ${isBeingEdited ? 'bg-purple-50/60' : 'hover:bg-slate-50/50'}`}>
                        <div className="min-w-0 pr-3">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-xs text-slate-900">{team.name}</span>
                            <span className="text-[9px] font-mono bg-slate-100 text-slate-600 px-1 rounded-sm border border-slate-200">
                              ID: {team.id}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 truncate mt-0.5">{team.description || "No description provided."}</p>
                          <span className="text-[8.5px] text-emerald-600 font-bold block mt-1 uppercase tracking-wider font-mono">
                            {memberCount} active team members assigned
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleEditTeamClick(team)}
                            title={`Edit ${team.name}`}
                            className={`p-1.5 rounded-md border transition-all cursor-pointer inline-flex items-center ${
                              isBeingEdited
                                ? 'bg-purple-700 text-white border-purple-800'
                                : 'text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border-blue-200'
                            }`}
                          >
                            <Edit2 size={12} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteTeamClick(team.id)}
                            title={`Delete ${team.name} from Database`}
                            className="text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 p-1.5 rounded-md border border-rose-200 transition-all cursor-pointer inline-flex items-center"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add New User Account */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-emerald-500 text-slate-950 rounded">
                  <UserPlus size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Create New User Account</h3>
                  <p className="text-[10px] text-slate-400 font-mono">Assign role & department permissions</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddUserModalOpen(false)}
                className="text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddUserSubmit} className="p-5 space-y-4">
              {newUserError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-md text-xs font-medium">
                  {newUserError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase font-mono text-slate-600">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase font-mono text-slate-600">Work Email *</label>
                  <input
                    type="email"
                    required
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="e.g. jdoe@aromaorganic.in"
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase font-mono text-slate-600">Assigned Role</label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as Role)}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                  >
                    {Object.values(Role).map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase font-mono text-slate-600">Access Level</label>
                  <select
                    value={newUserAccess}
                    onChange={(e) => setNewUserAccess(e.target.value as AccessLevel)}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                  >
                    {Object.values(AccessLevel).map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase font-mono text-slate-600">Team / Department</label>
                  <select
                    value={newUserTeam}
                    onChange={(e) => setNewUserTeam(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                  >
                    <option value="">Select Team</option>
                    {uniqueTeams.map((teamName) => (
                      <option key={teamName} value={teamName}>{teamName}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase font-mono text-slate-600">Reports To</label>
                  <select
                    value={newUserReportsTo}
                    onChange={(e) => setNewUserReportsTo(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                  >
                    <option value="">None (Executive / Board)</option>
                    {activeUsers.map((u) => (
                      <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase font-mono text-slate-600">Target Sales Quota ($)</label>
                <input
                  type="number"
                  value={newUserQuota}
                  onChange={(e) => setNewUserQuota(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingUser}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingUser ? "Creating User..." : "Create Active User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Configure & Approve Pending User */}
      {approvingUser && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="bg-amber-600 text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-white/20 text-white rounded">
                  <UserCheck size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Approve & Configure User Account</h3>
                  <p className="text-[10px] text-amber-100 font-mono">{approvingUser.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setApprovingUser(null)}
                className="text-amber-100 hover:text-white transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleApproveSubmit} className="p-5 space-y-4">
              <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-xs text-amber-900 space-y-1">
                <div className="font-bold">User Information:</div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>Name: <strong>{approvingUser.name || "N/A"}</strong></div>
                  <div>Email: <strong className="font-mono">{approvingUser.email}</strong></div>
                  <div>Requested: {approvingUser.requestedAt ? new Date(approvingUser.requestedAt).toLocaleString() : "Recently"}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase font-mono text-slate-600">Assign Role *</label>
                  <select
                    value={approveRole}
                    onChange={(e) => setApproveRole(e.target.value as Role)}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                  >
                    {Object.values(Role).map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase font-mono text-slate-600">Access Matrix Clearance</label>
                  <select
                    value={approveAccess}
                    onChange={(e) => setApproveAccess(e.target.value as AccessLevel)}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                  >
                    {Object.values(AccessLevel).map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase font-mono text-slate-600">Assign Department / Team</label>
                  <select
                    value={approveTeam}
                    onChange={(e) => setApproveTeam(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                  >
                    <option value="">Select Team</option>
                    {uniqueTeams.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase font-mono text-slate-600">Supervisor Reporting Line</label>
                  <select
                    value={approveReportsTo}
                    onChange={(e) => setApproveReportsTo(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                  >
                    <option value="">None (Executive / Board)</option>
                    {activeUsers.map((u) => (
                      <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase font-mono text-slate-600">Sales Quota Target ($)</label>
                <input
                  type="number"
                  value={approveQuota}
                  onChange={(e) => setApproveQuota(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setApprovingUser(null)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isApproving}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded shadow-xs transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <CheckCircle2 size={14} />
                  {isApproving ? "Activating..." : "Approve & Activate Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
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
                disabled={isDeletingUser}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer transition"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {userDeleteError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3 rounded-lg font-medium">
                  {userDeleteError}
                </div>
              )}

              <div className="space-y-2">
                <p className="text-xs text-slate-700 leading-relaxed">
                  Are you sure you want to permanently delete user account:
                </p>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1 font-mono text-xs">
                  <div className="font-extrabold text-slate-900">{userToDelete.name}</div>
                  <div className="text-slate-500 text-[11px]">{userToDelete.email}</div>
                  <div className="text-[10px] text-emerald-700 font-bold">Role: {userToDelete.role} • Team: {userToDelete.teamName || "Executive"}</div>
                </div>
                <p className="text-[11px] text-slate-500">
                  This action will permanently remove this user and their access rights from the directory.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setUserToDelete(null)}
                  disabled={isDeletingUser}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase font-mono rounded-lg transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteUser}
                  disabled={isDeletingUser}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs uppercase font-mono rounded-lg transition cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <Trash2 size={13} />
                  {isDeletingUser ? "Deleting..." : "Delete User Account"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

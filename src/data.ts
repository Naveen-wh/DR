/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { User, Role, AccessLevel, SalesLead, ProjectWorkflow, SalesTask, ActionLog, Client, Product, OrderOffer, OrderItem } from "./types";

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: "proj-1",
    name: "Cloud Migration Suite",
    category: "Cloud Services",
    group: "Infrastructure",
    manufacturer: "Apex Systems",
    hsnCode: "8471.30.10",
    teamName: "SME West Coast",
    createdAt: "2026-06-01T00:00:00-07:00"
  },
  {
    id: "proj-2",
    name: "SaaS Enterprise Licensing",
    category: "Software",
    group: "Applications",
    manufacturer: "Apex Systems",
    hsnCode: "8523.51.00",
    teamName: "Enterprise Sales",
    createdAt: "2026-06-01T00:00:00-07:00"
  },
  {
    id: "proj-3",
    name: "AI Copilot Integration Pro",
    category: "AI Solutions",
    group: "Analytics",
    manufacturer: "Apex AI Labs",
    hsnCode: "8471.50.00",
    teamName: "Executive",
    createdAt: "2026-06-01T00:00:00-07:00"
  }
];

export const INITIAL_USERS: User[] = [
  {
    id: "admin-1",
    name: "Robert Sterling",
    role: Role.Admin,
    accessLevel: AccessLevel.Manager,
    teamName: "Executive",
    email: "robert.sterling@apex.com",
    avatarUrl: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=120",
    targetQuota: 250000,
  },
  {
    id: "sr-mgr-1",
    name: "Sarah Jenkins",
    role: Role.SeniorManager,
    accessLevel: AccessLevel.Contributor,
    reportsTo: "admin-1",
    teamName: "Enterprise Sales",
    email: "sarah.jenkins@apex.com",
    avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=120",
    targetQuota: 180000,
  },
  {
    id: "mgr-1",
    name: "Michael Chang",
    role: Role.Manager,
    accessLevel: AccessLevel.Contributor,
    reportsTo: "sr-mgr-1",
    teamName: "Mid-Market Team A",
    email: "michael.chang@apex.com",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120",
    targetQuota: 100000,
  },
  {
    id: "mgr-2",
    name: "Elena Rostova",
    role: Role.Manager,
    accessLevel: AccessLevel.Contributor,
    reportsTo: "sr-mgr-1",
    teamName: "Mid-Market Team B",
    email: "elena.rostova@apex.com",
    avatarUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=120",
    targetQuota: 95000,
  },
  {
    id: "tl-1",
    name: "Tina Lopez",
    role: Role.TeamLead,
    accessLevel: AccessLevel.Contributor,
    reportsTo: "mgr-1",
    teamName: "SME West Coast",
    email: "tina.lopez@apex.com",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120",
    targetQuota: 60000,
  },
  {
    id: "tl-2",
    name: "Tom Harris",
    role: Role.TeamLead,
    accessLevel: AccessLevel.Contributor,
    reportsTo: "mgr-2",
    teamName: "SME East Coast",
    email: "tom.harris@apex.com",
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=120",
    targetQuota: 55000,
  },
  {
    id: "user-1",
    name: "John Doe",
    role: Role.User,
    accessLevel: AccessLevel.Editor,
    reportsTo: "tl-1",
    teamName: "SME West Coast",
    email: "john.doe@apex.com",
    avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=120",
    targetQuota: 30000,
  },
  {
    id: "user-2",
    name: "Jane Smith",
    role: Role.User,
    accessLevel: AccessLevel.Editor,
    reportsTo: "tl-1",
    teamName: "SME West Coast",
    email: "jane.smith@apex.com",
    avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=120",
    targetQuota: 30000,
  },
  {
    id: "user-3",
    name: "Jack Wilson",
    role: Role.User,
    accessLevel: AccessLevel.Editor,
    reportsTo: "tl-2",
    teamName: "SME East Coast",
    email: "jack.wilson@apex.com",
    avatarUrl: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=120",
    targetQuota: 28000,
  }
];

export const INITIAL_WORKFLOWS: ProjectWorkflow[] = [
  {
    id: "proj-1",
    name: "Cloud Migration Pipeline",
    description: "Migration of legacy on-premises databases to secure cloud infrastructure for healthcare clients.",
    status: "Active",
    clientName: "Sovereign Health Inc.",
    leadsCount: 3
  },
  {
    id: "proj-2",
    name: "SaaS Enterprise Deal Flow",
    description: "Multi-year seat licensing workflow for financial analytics tools.",
    status: "Active",
    clientName: "Apex Capital S.A.",
    leadsCount: 2
  },
  {
    id: "proj-3",
    name: "AI Copilot Integration Projects",
    description: "PoC and pilots of customizable generative AI assistant solutions for operations.",
    status: "Planning",
    clientName: "Beacon Logistics Ltd.",
    leadsCount: 1
  }
];

export const INITIAL_LEADS: SalesLead[] = [];

export const INITIAL_TASKS: SalesTask[] = [
  {
    id: "task-1",
    title: "Draft Discount SLA Proposal",
    description: "Write custom SLA clauses adapting requested 10% discount framework for approval.",
    dueDate: "2026-06-25",
    priority: "High",
    status: "In Progress",
    assignedToUserId: "user-1", // John Doe
    createdByUserId: "user-1",
    projectId: "proj-1",
    leadId: "lead-1"
  },
  {
    id: "task-2",
    title: "Prepare Cloud Architecture Slides",
    description: "Build 5-slide architectural deck illustrating data security measures during cloud migration.",
    dueDate: "2026-06-28",
    priority: "High",
    status: "To Do",
    assignedToUserId: "user-1", // John Doe
    createdByUserId: "tl-1", // Tina created & assigned
    projectId: "proj-1",
    leadId: "lead-2"
  },
  {
    id: "task-3",
    title: "Conduct Security Questionnaire Review",
    description: "Approve answers for BioMedical HIPAA requirements.",
    dueDate: "2026-06-24",
    priority: "Medium",
    status: "Review",
    assignedToUserId: "user-2", // Jane Smith
    createdByUserId: "user-2",
    projectId: "proj-1",
    leadId: "lead-3"
  },
  {
    id: "task-4",
    title: "Draft Venture Licenses Contract",
    description: "Liaise with legal team to prepare custom venture scope rider.",
    dueDate: "2026-06-29",
    priority: "High",
    status: "To Do",
    assignedToUserId: "tl-1", // Tina Lopez
    createdByUserId: "tl-1",
    projectId: "proj-2",
    leadId: "lead-4"
  },
  {
    id: "task-5",
    title: "Approve High Value Enterprise Draft",
    description: "Review Global Wealth proposal before Sarah presents to the advisory board.",
    dueDate: "2026-06-23",
    priority: "High",
    status: "In Progress",
    assignedToUserId: "admin-1", // Admin Robert
    createdByUserId: "sr-mgr-1", // Sarah requested
    projectId: "proj-2",
    leadId: "lead-7"
  }
];

export const INITIAL_LOGS: ActionLog[] = [
  {
    id: "log-1",
    timestamp: "2026-06-18T16:45:00-07:00",
    userId: "tl-1",
    userName: "Tina Lopez",
    actionType: "Create Lead",
    targetType: "Lead",
    targetId: "lead-4",
    targetName: "Silicon Hills Ventures",
    details: "Created high priority lead under SaaS Enterprise Deal Flow."
  },
  {
    id: "log-2",
    timestamp: "2026-06-19T13:20:00-07:00",
    userId: "tl-2",
    userName: "Tom Harris",
    actionType: "Create Lead",
    targetType: "Lead",
    targetId: "lead-6",
    targetName: "Empire Logistics Group",
    details: "Created proposal trial pipeline lead for East Coast."
  },
  {
    id: "log-3",
    timestamp: "2026-06-20T10:00:00-07:00",
    userId: "user-1",
    userName: "John Doe",
    actionType: "Edit Lead",
    targetType: "Lead",
    targetId: "lead-1",
    targetName: "Vanguard Tech Solutions",
    details: "Modified notes about discount discussions."
  }
];

/**
 * Calculates all team members under a user recursively.
 */
export function getReportingTreeUsers(userId: string, users: User[] = INITIAL_USERS): string[] {
  const targetUser = users.find((u) => u.id === userId || u.email === userId);
  if (!targetUser) return [userId];

  const treeIds: string[] = [targetUser.id];
  if (targetUser.email) treeIds.push(targetUser.email);

  // Get users who report to targetUser (matching either id or email)
  const directReports = users.filter(
    (u) =>
      u.reportsTo === targetUser.id ||
      (!!targetUser.email && u.reportsTo === targetUser.email)
  );

  for (const report of directReports) {
    if (report.id) treeIds.push(report.id);
    if (report.email) treeIds.push(report.email);
    const subReports = users.filter(
      (u) => u.reportsTo === report.id || (!!report.email && u.reportsTo === report.email)
    );
    for (const sr of subReports) {
      if (sr.id) treeIds.push(sr.id);
      if (sr.email) treeIds.push(sr.email);
    }
  }

  // Include members of the same teamName (if specified and not Executive)
  if (targetUser.teamName) {
    const sameTeamUsers = users.filter(
      (u) => u.teamName && u.teamName.toLowerCase() === targetUser.teamName.toLowerCase()
    );
    for (const tu of sameTeamUsers) {
      if (tu.id) treeIds.push(tu.id);
      if (tu.email) treeIds.push(tu.email);
    }
  }

  return Array.from(new Set(treeIds.filter(Boolean)));
}

/**
 * Helper to check access levels based on permissions:
 * - Editor: Add, View, Edit (Only self created)
 * - Contributor: Add, View, Edit (self and its team)
 * - Manager: View, Edit, Delete (for all)
 */

export function canViewLead(userId: string, lead: SalesLead, users: User[] = INITIAL_USERS): boolean {
  const activeUser = users.find((u) => u.id === userId || u.email === userId);
  if (!activeUser) return false;

  // Admin / Manager access has rights for everyone
  if (activeUser.role === Role.Admin || activeUser.teamName === "Executive" || activeUser.accessLevel === AccessLevel.Manager) {
    return true;
  }

  // Self created or self assigned is always visible
  if (lead.createdByUserId === activeUser.id || lead.createdByUserId === activeUser.email ||
      lead.assignedToUserId === activeUser.id || lead.assignedToUserId === activeUser.email) {
    return true;
  }

  // Contributor: self and its reporting team
  if (activeUser.accessLevel === AccessLevel.Contributor || activeUser.role === Role.TeamLead || activeUser.role === Role.SeniorManager) {
    const reportingTree = getReportingTreeUsers(userId, users);
    return (
      reportingTree.includes(lead.createdByUserId) ||
      reportingTree.includes(lead.assignedToUserId)
    );
  }

  // Editor: Only self created or assigned leads are visible
  return false;
}

export function canEditLead(userId: string, lead: SalesLead, users: User[] = INITIAL_USERS): boolean {
  const activeUser = users.find((u) => u.id === userId || u.email === userId);
  if (!activeUser) return false;

  if (!canViewLead(userId, lead, users)) return false;

  // Manager: View, Edit, Delete (for all)
  if (activeUser.role === Role.Admin || activeUser.accessLevel === AccessLevel.Manager) {
    return true;
  }

  // Self assigned leads are editable
  if (lead.assignedToUserId === activeUser.id || lead.assignedToUserId === activeUser.email) {
    return true;
  }

  // Editor: Add, View, Edit (Only self created)
  if (activeUser.accessLevel === AccessLevel.Editor) {
    return lead.createdByUserId === activeUser.id || lead.createdByUserId === activeUser.email;
  }

  // Contributor: Add, View, Edit (self and its team)
  if (activeUser.accessLevel === AccessLevel.Contributor || activeUser.role === Role.TeamLead) {
    if (lead.createdByUserId === activeUser.id || lead.createdByUserId === activeUser.email) return true;
    const reportingTree = getReportingTreeUsers(userId, users);
    return reportingTree.includes(lead.createdByUserId) || reportingTree.includes(lead.assignedToUserId);
  }

  return false;
}

export function canDeleteLead(userId: string, _lead: SalesLead, users: User[] = INITIAL_USERS): boolean {
  const activeUser = users.find((u) => u.id === userId);
  if (!activeUser) return false;

  // Only Manager access level can delete
  return activeUser.accessLevel === AccessLevel.Manager;
}

// Similar wrappers for Tasks
export function canViewTask(userId: string, task: SalesTask, users: User[] = INITIAL_USERS): boolean {
  const activeUser = users.find((u) => u.id === userId || u.email === userId);
  if (!activeUser) return false;

  if (activeUser.role === Role.Admin || activeUser.teamName === "Executive" || activeUser.accessLevel === AccessLevel.Manager) {
    return true;
  }

  if (task.createdByUserId === activeUser.id || task.createdByUserId === activeUser.email ||
      task.assignedToUserId === activeUser.id || task.assignedToUserId === activeUser.email) {
    return true;
  }

  if (activeUser.accessLevel === AccessLevel.Contributor || activeUser.role === Role.TeamLead || activeUser.role === Role.SeniorManager) {
    const reportingTree = getReportingTreeUsers(userId, users);
    return (
      reportingTree.includes(task.createdByUserId) ||
      reportingTree.includes(task.assignedToUserId)
    );
  }

  return false;
}

export function canEditTask(userId: string, task: SalesTask, users: User[] = INITIAL_USERS): boolean {
  const activeUser = users.find((u) => u.id === userId || u.email === userId);
  if (!activeUser) return false;

  if (!canViewTask(userId, task, users)) return false;

  if (activeUser.role === Role.Admin || activeUser.accessLevel === AccessLevel.Manager) {
    return true;
  }

  if (task.assignedToUserId === activeUser.id || task.assignedToUserId === activeUser.email) {
    return true;
  }

  if (activeUser.accessLevel === AccessLevel.Editor) {
    return task.createdByUserId === activeUser.id || task.createdByUserId === activeUser.email;
  }

  if (activeUser.accessLevel === AccessLevel.Contributor || activeUser.role === Role.TeamLead) {
    if (task.createdByUserId === activeUser.id || task.createdByUserId === activeUser.email) return true;
    const reportingTree = getReportingTreeUsers(userId, users);
    return reportingTree.includes(task.createdByUserId) || reportingTree.includes(task.assignedToUserId);
  }

  return false;
}

export function canDeleteTask(userId: string, _task: SalesTask, users: User[] = INITIAL_USERS): boolean {
  const activeUser = users.find((u) => u.id === userId || u.email === userId);
  if (!activeUser) return false;

  return activeUser.role === Role.Admin || activeUser.accessLevel === AccessLevel.Manager;
}

export function canViewClient(userId: string, client: Client, users: User[] = INITIAL_USERS): boolean {
  const activeUser = users.find((u) => u.id === userId || u.email === userId);
  if (!activeUser) return false;

  // 1. Admin, Manager accessLevel or 'Executive' team members can view all clients
  if (activeUser.role === Role.Admin || activeUser.teamName === "Executive" || activeUser.accessLevel === AccessLevel.Manager) {
    return true;
  }

  // 2. If the client is associated with a team:
  if (client.teamName && activeUser.teamName) {
    if (client.teamName.toLowerCase() === activeUser.teamName.toLowerCase()) {
      return true;
    }
  }

  // 3. For unassigned clients or matching creator/tree
  if (client.createdByUserId === activeUser.id || client.createdByUserId === activeUser.email) {
    return true;
  }

  if (activeUser.accessLevel === AccessLevel.Contributor || activeUser.role === Role.TeamLead || activeUser.role === Role.SeniorManager) {
    const reportingTree = getReportingTreeUsers(userId, users);
    return client.createdByUserId ? reportingTree.includes(client.createdByUserId) : false;
  }

  return false;
}

export function canEditClient(userId: string, client: Client, users: User[] = INITIAL_USERS): boolean {
  const activeUser = users.find((u) => u.id === userId || u.email === userId);
  if (!activeUser) return false;

  if (!canViewClient(userId, client, users)) {
    return false;
  }

  if (activeUser.role === Role.Admin || activeUser.accessLevel === AccessLevel.Manager) {
    return true;
  }

  if (client.createdByUserId === activeUser.id || client.createdByUserId === activeUser.email) {
    return true;
  }

  if (activeUser.accessLevel === AccessLevel.Contributor || activeUser.role === Role.TeamLead) {
    const reportingTree = getReportingTreeUsers(userId, users);
    return client.createdByUserId ? reportingTree.includes(client.createdByUserId) : false;
  }

  return false;
}

export function canDeleteClient(userId: string, _client: Client, users: User[] = INITIAL_USERS): boolean {
  const activeUser = users.find((u) => u.id === userId);
  if (!activeUser) return false;

  // Only Manager access level can delete
  return activeUser.accessLevel === AccessLevel.Manager;
}

export const INITIAL_ORDERS: OrderOffer[] = [
  {
    id: "order-1",
    clientName: "Amanda Ramirez",
    companyName: "Vanguard Tech Solutions",
    email: "amanda@vanguardtech.com",
    phone: "+1 (555) 234-5678",
    status: "Negotiation",
    totalValue: 70000,
    items: [
      {
        productId: "proj-1",
        productName: "Cloud Migration Suite",
        quantity: 1,
        rate: 45000,
        amount: 45000,
      },
      {
        productId: "proj-2",
        productName: "SaaS Enterprise Licensing",
        quantity: 1,
        rate: 25000,
        amount: 25000,
      }
    ],
    assignedToUserId: "user-1", // John Doe
    createdByUserId: "user-1",
    notes: "Negotiating standard bundle discount with the IT lead.",
    createdAt: "2026-06-20T10:00:00-07:00",
    payment: "Net 30",
    delivery: "Standard",
    otherTerms: "None"
  },
  {
    id: "order-2",
    clientName: "Elena Rostova",
    companyName: "Apex Capital S.A.",
    email: "elena.rostova@apex.com",
    phone: "+1 (555) 901-2345",
    status: "Closed Won",
    totalValue: 90000,
    items: [
      {
        productId: "proj-3",
        productName: "AI Copilot Integration Pro",
        quantity: 3,
        rate: 30000,
        amount: 90000,
      }
    ],
    assignedToUserId: "tl-1", // Tina Lopez
    createdByUserId: "tl-1",
    notes: "Customer ordered 3 enterprise licenses for their AI integration division.",
    createdAt: "2026-06-22T14:30:00-07:00",
    payment: "Net 15",
    delivery: "Express",
    otherTerms: "None"
  }
];

export function canViewOrderOffer(userId: string, order: OrderOffer, users: User[] = INITIAL_USERS): boolean {
  const activeUser = users.find((u) => u.id === userId || u.email === userId);
  if (!activeUser) return false;

  if (activeUser.role === Role.Admin || activeUser.teamName === "Executive" || activeUser.accessLevel === AccessLevel.Manager) {
    return true;
  }

  if (order.createdByUserId === activeUser.id || order.createdByUserId === activeUser.email ||
      order.assignedToUserId === activeUser.id || order.assignedToUserId === activeUser.email) {
    return true;
  }

  if (activeUser.accessLevel === AccessLevel.Contributor || activeUser.role === Role.TeamLead || activeUser.role === Role.SeniorManager) {
    const reportingTree = getReportingTreeUsers(userId, users);
    return (
      reportingTree.includes(order.createdByUserId) ||
      reportingTree.includes(order.assignedToUserId)
    );
  }

  return false;
}

export function canEditOrderOffer(userId: string, order: OrderOffer, users: User[] = INITIAL_USERS): boolean {
  const activeUser = users.find((u) => u.id === userId || u.email === userId);
  if (!activeUser) return false;

  if (!canViewOrderOffer(userId, order, users)) return false;

  if (activeUser.role === Role.Admin || activeUser.accessLevel === AccessLevel.Manager) {
    return true;
  }

  if (order.assignedToUserId === activeUser.id || order.assignedToUserId === activeUser.email) {
    return true;
  }

  if (activeUser.accessLevel === AccessLevel.Editor) {
    return order.createdByUserId === activeUser.id || order.createdByUserId === activeUser.email;
  }

  if (activeUser.accessLevel === AccessLevel.Contributor || activeUser.role === Role.TeamLead) {
    if (order.createdByUserId === activeUser.id || order.createdByUserId === activeUser.email) return true;
    const reportingTree = getReportingTreeUsers(userId, users);
    return reportingTree.includes(order.createdByUserId) || reportingTree.includes(order.assignedToUserId);
  }

  return false;
}

export function canDeleteOrderOffer(userId: string, _order: OrderOffer, users: User[] = INITIAL_USERS): boolean {
  const activeUser = users.find((u) => u.id === userId || u.email === userId);
  if (!activeUser) return false;

  return activeUser.role === Role.Admin || activeUser.accessLevel === AccessLevel.Manager;
}

export function canEditProduct(userId: string, product: Product, users: User[] = INITIAL_USERS): boolean {
  const activeUser = users.find((u) => u.id === userId || u.email === userId);
  if (!activeUser) return false;

  // Manager/Admin can edit any product
  if (activeUser.accessLevel === AccessLevel.Manager || activeUser.role === Role.Admin) {
    return true;
  }

  // Contributor can edit if product is self-created or in the user's team
  if (activeUser.accessLevel === AccessLevel.Contributor || activeUser.role === Role.TeamLead) {
    return (
      product.createdByUserId === activeUser.id ||
      product.createdByUserId === activeUser.email ||
      (!!product.teamName && !!activeUser.teamName && product.teamName.toLowerCase() === activeUser.teamName.toLowerCase())
    );
  }

  // Editor can only edit self-created products
  if (activeUser.accessLevel === AccessLevel.Editor) {
    return product.createdByUserId === activeUser.id || product.createdByUserId === activeUser.email;
  }

  return false;
}

export function canDeleteProduct(userId: string, _product: Product, users: User[] = INITIAL_USERS): boolean {
  const activeUser = users.find((u) => u.id === userId);
  if (!activeUser) return false;

  // Only Manager access level or Admin role can delete products
  return activeUser.accessLevel === AccessLevel.Manager || activeUser.role === Role.Admin;
}


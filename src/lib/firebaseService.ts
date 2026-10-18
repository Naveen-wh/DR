/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { User, Role, AccessLevel, ProjectWorkflow, SalesTask, ActionLog, TeamTabSettings, Client, Team, Product, OrderOffer, PaymentBank, ProductCategory, ProductGroup, Manufacturer, FreightTerm, TransporterName, WarehouseManagedBy, DispatchLocation, AolBranchName, SupplierName, ClearingCat, ImportPiRecord, ImportLcRecord, ImportEtaRecord, ImportBoeRecord, ImportContainerRecord, ImportClearingRecord, DrcBankChargesType, DrcBankCharges1, ImportDrcRecord, ImportTptiRecord, ImportCiRecord, AolGodown, DomesticSupplierName, ShipToParty, DomesticPdRecord, DomesticTptdRecord, TptdCategory, PidRecord, AccountsStRecord, OpeningStockRecord, AccountsSalesRecord, AccountsDrumingRecord, ExpenseLedgerItem, AccountsOfficeExpRecord, AccountsMeisRecord, OtherIncomeLedgerItem, AccountsOtherIncomeRecord, AccountsFdrRecord, AccountsCsdIsdRecord, AccountsTptSRecord, AccountsTptStRecord, LedgerCrDrCategory, AccountsSupplierCrDrRecord, AccountsCustomerCrDrRecord } from "../types";
import {
  auth,
  db,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  writeBatch
} from "../firebase";
import {
  INITIAL_USERS,
  INITIAL_WORKFLOWS,
  INITIAL_TASKS,
  INITIAL_LOGS,
  INITIAL_PRODUCTS,
  INITIAL_ORDERS
} from "../data";

// --- Firestore Error Handling per Firebase Integration Skill ---

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('[Firestore Error] Structured Diagnostics:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Recursively remove properties with undefined values from objects and arrays,
 * so Firestore doesn't throw unsupported field errors.
 */
export function cleanUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => cleanUndefined(item)) as unknown as T;
  }
  if (typeof obj === 'object') {
    const result: Record<string, any> = {};
    for (const key of Object.keys(obj)) {
      const val = (obj as Record<string, any>)[key];
      if (val !== undefined) {
        result[key] = cleanUndefined(val);
      }
    }
    return result as T;
  }
  return obj;
}

// Mapping from old string IDs to email keys to implement "role assigned to email id"
const ID_TO_EMAIL: Record<string, string> = {
  "admin-1": "robert.sterling@apex.com",
  "sr-mgr-1": "sarah.jenkins@apex.com",
  "mgr-1": "michael.chang@apex.com",
  "mgr-2": "elena.rostova@apex.com",
  "tl-1": "tina.lopez@apex.com",
  "tl-2": "tom.harris@apex.com",
  "user-1": "john.doe@apex.com",
  "user-2": "jane.smith@apex.com",
  "user-3": "jack.wilson@apex.com"
};

// Helper: map a user ID or email to email
export function mapIdToEmail(id: string): string {
  if (id.includes("@")) return id.toLowerCase();
  return (ID_TO_EMAIL[id] || id).toLowerCase();
}

export async function seedTeamsIfEmpty(): Promise<void> {
  try {
    const teamsSnap = await getDocs(collection(db, "teams"));
    if (!teamsSnap.empty) {
      return;
    }
    console.log("[FirebaseService] Seeding default teams...");
    const defaultTeams = [
      { name: "Executive", description: "Executive team and Board" },
      { name: "Enterprise Sales", description: "Enterprise clients management" },
      { name: "Mid-Market Team A", description: "Mid-market accounts - Area A" },
      { name: "Mid-Market Team B", description: "Mid-market accounts - Area B" },
      { name: "SME West Coast", description: "Small and medium business - West Coast" },
      { name: "SME East Coast", description: "Small and medium business - East Coast" }
    ];
    for (const team of defaultTeams) {
      const docId = team.name.toLowerCase().replace(/[^a-z0-9]/g, "-") || "default";
      const t: Team = {
        id: docId,
        name: team.name,
        description: team.description,
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, "teams", docId), cleanUndefined(t));
    }
    console.log("[FirebaseService] Teams seeding completed successfully.");
  } catch (err) {
    console.error("[FirebaseService] Error seeding teams:", err);
  }
}

export async function seedProductsIfEmpty(): Promise<void> {
  try {
    const productsSnap = await getDocs(collection(db, "products"));
    if (!productsSnap.empty) {
      return;
    }
    console.log("[FirebaseService] Seeding default products...");
    for (const p of INITIAL_PRODUCTS) {
      await setDoc(doc(db, "products", p.id), cleanUndefined(p));
    }
    console.log("[FirebaseService] Products seeding completed successfully.");
  } catch (err) {
    console.error("[FirebaseService] Error seeding products:", err);
  }
}

export async function seedDropdownsIfEmpty(): Promise<void> {
  try {
    // 1. Freight Terms
    const ftSnap = await getDocs(collection(db, "freight_terms"));
    if (ftSnap.empty) {
      const defaultFreightTerms = ["FOB (Free on Board)", "CIF (Cost, Insurance, Freight)", "EXW (Ex Works)", "DDP (Delivered Duty Paid)"];
      for (const [idx, term] of defaultFreightTerms.entries()) {
        await setDoc(doc(db, "freight_terms", `ft-${idx + 1}`), {
          id: `ft-${idx + 1}`,
          name: term,
          createdAt: new Date().toISOString()
        });
      }
    }

    // 2. Transporters
    const trSnap = await getDocs(collection(db, "transporters"));
    if (trSnap.empty) {
      const defaultTransporters = ["DHL Express", "FedEx", "UPS", "Apex Logistics"];
      for (const [idx, name] of defaultTransporters.entries()) {
        await setDoc(doc(db, "transporters", `tr-${idx + 1}`), {
          id: `tr-${idx + 1}`,
          name,
          createdAt: new Date().toISOString()
        });
      }
    }

    // 3. Warehouses
    const whSnap = await getDocs(collection(db, "warehouses"));
    if (whSnap.empty) {
      const defaultWarehouses = ["In-House Team", "Partner 3PL (Apex Hub)", "West Coast Fulfillment"];
      for (const [idx, name] of defaultWarehouses.entries()) {
        await setDoc(doc(db, "warehouses", `wh-${idx + 1}`), {
          id: `wh-${idx + 1}`,
          name,
          createdAt: new Date().toISOString()
        });
      }
    }

    // 4. Dispatch Locations
    const dlSnap = await getDocs(collection(db, "dispatch_locations"));
    if (dlSnap.empty) {
      const defaultDispatchLocations = ["Chicago Hub", "Los Angeles Facility", "New York Depot", "Dallas Distribution Center"];
      for (const [idx, name] of defaultDispatchLocations.entries()) {
        await setDoc(doc(db, "dispatch_locations", `dl-${idx + 1}`), {
          id: `dl-${idx + 1}`,
          name,
          createdAt: new Date().toISOString()
        });
      }
    }

    // Also seed initial categories, groups, manufacturers if empty
    const pcSnap = await getDocs(collection(db, "product_categories"));
    if (pcSnap.empty) {
      const defaultCategories = ["Cloud Services", "Software", "AI Solutions", "Hardware"];
      for (const [idx, name] of defaultCategories.entries()) {
        await setDoc(doc(db, "product_categories", `cat-${idx + 1}`), {
          id: `cat-${idx + 1}`,
          name,
          createdAt: new Date().toISOString()
        });
      }
    }

    const pgSnap = await getDocs(collection(db, "product_groups"));
    if (pgSnap.empty) {
      const defaultGroups = ["Infrastructure", "Applications", "Analytics", "Devices"];
      for (const [idx, name] of defaultGroups.entries()) {
        await setDoc(doc(db, "product_groups", `grp-${idx + 1}`), {
          id: `grp-${idx + 1}`,
          name,
          createdAt: new Date().toISOString()
        });
      }
    }

    const mSnap = await getDocs(collection(db, "manufacturers"));
    if (mSnap.empty) {
      const defaultManufacturers = ["Apex Systems", "Apex AI Labs", "External Partner Corp"];
      for (const [idx, name] of defaultManufacturers.entries()) {
        await setDoc(doc(db, "manufacturers", `man-${idx + 1}`), {
          id: `man-${idx + 1}`,
          name,
          createdAt: new Date().toISOString()
        });
      }
    }

    // 5. AOL Branch Name
    const abSnap = await getDocs(collection(db, "aol_branches"));
    if (abSnap.empty) {
      const defaultBranches = ["Mumbai", "Chennai", "Silvassa", "Gujarat"];
      for (const [idx, name] of defaultBranches.entries()) {
        await setDoc(doc(db, "aol_branches", `br-${idx + 1}`), {
          id: `br-${idx + 1}`,
          name,
          createdAt: new Date().toISOString()
        });
      }
    }

    // 6. Supplier Name
    const sSnap = await getDocs(collection(db, "suppliers"));
    if (sSnap.empty) {
      const defaultSuppliers = ["Global Chemicals Ltd", "Aura Enterprises", "Super Poly Plast", "Vardhman Trading", "Unilink Impex"];
      for (const [idx, name] of defaultSuppliers.entries()) {
        await setDoc(doc(db, "suppliers", `sup-${idx + 1}`), {
          id: `sup-${idx + 1}`,
          name,
          createdAt: new Date().toISOString()
        });
      }
    }

    // 7. Clearing Cat
    const ccSnap = await getDocs(collection(db, "clearing_cats"));
    if (ccSnap.empty) {
      const defaultClearingCats = ["Standard Clearing", "Express Clearing", "Bonded Warehouse", "Special Clearance"];
      for (const [idx, name] of defaultClearingCats.entries()) {
        await setDoc(doc(db, "clearing_cats", `cc-${idx + 1}`), {
          id: `cc-${idx + 1}`,
          name,
          createdAt: new Date().toISOString()
        });
      }
    }
  } catch (err) {
    console.error("[FirebaseService] Error seeding dropdowns:", err);
  }
}

/**
 * Seeds Database with initial mock data mapped to emails if users collection is empty.
 */
export async function seedDatabaseIfEmpty(): Promise<void> {
  const path = "users";
  try {
    const usersSnap = await getDocs(collection(db, "users"));
    await seedDropdownsIfEmpty();
    if (!usersSnap.empty) {
      console.log("[FirebaseService] Database already seeded.");
      await seedTeamsIfEmpty();
      await seedProductsIfEmpty();
      return;
    }

    console.log("[FirebaseService] Database empty. Starting email-keyed data seed...");
    await seedTeamsIfEmpty();
    await seedProductsIfEmpty();

    // 1. Seed Users (document key is lowercase email)
    const seededUsers: User[] = INITIAL_USERS.map((user) => {
      const email = user.email.toLowerCase();
      return {
        ...user,
        id: email, // use email as ID
        email,
        status: "active" as const,
        reportsTo: user.reportsTo ? mapIdToEmail(user.reportsTo) : undefined
      };
    });

    for (const u of seededUsers) {
      await setDoc(doc(db, "users", u.email), cleanUndefined(u));
    }

    // 2. Seed Workflows
    for (const w of INITIAL_WORKFLOWS) {
      await setDoc(doc(db, "workflows", w.id), cleanUndefined(w));
    }

    // 4. Seed Tasks
    const seededTasks: SalesTask[] = INITIAL_TASKS.map((task) => ({
      ...task,
      assignedToUserId: mapIdToEmail(task.assignedToUserId),
      createdByUserId: mapIdToEmail(task.createdByUserId)
    }));

    for (const t of seededTasks) {
      await setDoc(doc(db, "tasks", t.id), cleanUndefined(t));
    }

    // 5. Seed Action Logs
    const seededLogs: ActionLog[] = INITIAL_LOGS.map((log) => ({
      ...log,
      userId: mapIdToEmail(log.userId)
    }));

    for (const log of seededLogs) {
      await setDoc(doc(db, "logs", log.id), cleanUndefined(log));
    }

    // 6. Seed Orders
    const seededOrders: OrderOffer[] = INITIAL_ORDERS.map((order) => ({
      ...order,
      assignedToUserId: mapIdToEmail(order.assignedToUserId),
      createdByUserId: mapIdToEmail(order.createdByUserId)
    }));

    for (const ord of seededOrders) {
      await setDoc(doc(db, "orders", ord.id), cleanUndefined(ord));
    }

    console.log("[FirebaseService] Seeding completed successfully!");
  } catch (err) {
    console.error("[FirebaseService] Error during seeding:", err);
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export const BOOTSTRAP_ADMIN_EMAILS = [
  "naveen@chsurya.in",
  "gcp@aromaorganic.in",
  "care@aromaorganic.in",
  "whirlpoolveen@gmail.com",
  "robert.sterling@apex.com"
];

/**
 * Create or merge user profile inside `/users/{email}`.
 * If user details are already present in Firestore (pre-created by Admin):
 *   - Load existing configuration (role, team, quota, access level).
 *   - If status is not explicitly 'pending' or 'disabled', grant active access.
 * If user details are NOT present in Firestore:
 *   - If bootstrap admin, grant Admin role with active status.
 *   - If newly registered user without pre-existing record, register with status: 'pending' to prevent unauthorized misuse.
 */
export async function syncUserProfile(email: string, displayName: string, avatarUrl?: string): Promise<User> {
  const normalizedEmail = email.toLowerCase().trim();
  let userRef = doc(db, "users", normalizedEmail);
  let snap;
  try {
    snap = await getDoc(userRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `users/${normalizedEmail}`);
  }

  let existingUser: User | null = snap && snap.exists() ? (snap.data() as User) : null;

  // If not found by document ID, perform fallback query by email to catch any custom doc IDs created by admin
  if (!existingUser) {
    try {
      const q = query(collection(db, "users"), where("email", "==", normalizedEmail));
      const querySnap = await getDocs(q);
      if (!querySnap.empty) {
        const foundDoc = querySnap.docs[0];
        existingUser = { id: foundDoc.id, ...foundDoc.data() } as User;
        userRef = doc(db, "users", foundDoc.id);
      }
    } catch (e) {
      console.warn("User lookup query fallback error:", e);
    }
  }

  const isBootstrapAdmin = BOOTSTRAP_ADMIN_EMAILS.includes(normalizedEmail);

  // Case 1: User details ARE present in the user table in Firestore
  if (existingUser) {
    let needsUpdate = false;
    let updated: User = { 
      ...existingUser,
      id: existingUser.id || normalizedEmail,
      // If status is omitted or undefined on a pre-existing admin-registered user, default to active
      status: existingUser.status || "active"
    };

    // If bootstrap admin, guarantee active admin clearance
    if (isBootstrapAdmin && (updated.role !== Role.Admin || updated.status !== "active")) {
      updated.role = Role.Admin;
      updated.accessLevel = AccessLevel.Manager;
      updated.teamName = updated.teamName || "Executive";
      updated.status = "active";
      needsUpdate = true;
    }

    // Keep avatar updated if provided
    if (avatarUrl && updated.avatarUrl !== avatarUrl) {
      updated.avatarUrl = avatarUrl;
      needsUpdate = true;
    }

    if (needsUpdate) {
      try {
        await setDoc(userRef, cleanUndefined(updated), { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${userRef.id}`);
      }
    }
    return updated;
  }

  // Case 2: User details are NOT in Firestore and is a bootstrap admin
  if (isBootstrapAdmin) {
    const newAdminUser: User = {
      id: normalizedEmail,
      name: displayName || normalizedEmail.split("@")[0],
      role: Role.Admin,
      accessLevel: AccessLevel.Manager,
      email: normalizedEmail,
      avatarUrl: avatarUrl || "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=120",
      targetQuota: 250000,
      teamName: "Executive",
      status: "active"
    };

    try {
      await setDoc(userRef, cleanUndefined(newAdminUser));
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${normalizedEmail}`);
    }
    return newAdminUser;
  }

  // Case 3: Newly registered user NOT present in Firestore user table:
  // Register them as "pending" with restricted permissions so they land on "Account Awaiting Administrator Activation" screen to prevent misuse.
  const newPendingUser: User = {
    id: normalizedEmail,
    name: displayName || normalizedEmail.split("@")[0],
    role: Role.User,
    accessLevel: AccessLevel.Editor,
    email: normalizedEmail,
    avatarUrl: avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120",
    targetQuota: 0,
    teamName: "Unassigned",
    status: "pending",
    requestedAt: new Date().toISOString()
  };

  try {
    await setDoc(userRef, cleanUndefined(newPendingUser));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${normalizedEmail}`);
  }
  return newPendingUser;
}

// REST OF EVENT SUBSCRIPTIONS / WRITERS TO FIRESTORE

export function subscribeCollection<T>(
  colName: string,
  onUpdate: (data: T[]) => void,
  sortField?: string
) {
  const colRef = collection(db, colName);
  const q = sortField ? query(colRef, orderBy(sortField, "desc")) : colRef;
  return onSnapshot(q, (snapshot) => {
    const list: T[] = [];
    snapshot.forEach((d) => {
      list.push({ id: d.id, ...d.data() } as T);
    });
    onUpdate(list);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, colName);
  });
}

// Custom specialized writers/updaters

export async function saveTask(task: SalesTask): Promise<void> {
  try {
    await setDoc(doc(db, "tasks", task.id), cleanUndefined(task));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `tasks/${task.id}`);
  }
}

export async function deleteTaskDoc(taskId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "tasks", taskId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `tasks/${taskId}`);
  }
}

export async function saveWorkflow(workflow: ProjectWorkflow): Promise<void> {
  try {
    await setDoc(doc(db, "workflows", workflow.id), cleanUndefined(workflow));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `workflows/${workflow.id}`);
  }
}

export async function isAuditLogEnabled(): Promise<boolean> {
  try {
    const docSnap = await getDoc(doc(db, "settings", "auditLogStatus"));
    if (docSnap.exists()) {
      return !!docSnap.data().enabled;
    }
    return true;
  } catch (err) {
    return true;
  }
}

export async function setAuditLogEnabled(enabled: boolean): Promise<void> {
  try {
    await setDoc(doc(db, "settings", "auditLogStatus"), { enabled });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, "settings/auditLogStatus");
  }
}

export async function saveLog(log: ActionLog): Promise<void> {
  try {
    const enabled = await isAuditLogEnabled();
    if (enabled) {
      await setDoc(doc(db, "logs", log.id), cleanUndefined(log));
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `logs/${log.id}`);
  }
}

export async function clearAllLogsInFirestore(logs: ActionLog[]): Promise<void> {
  for (const l of logs) {
    try {
      await deleteDoc(doc(db, "logs", l.id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `logs/${l.id}`);
    }
  }
}

export async function updateUserDetails(userId: string, updates: Partial<User>): Promise<void> {
  const userRef = doc(db, "users", userId.toLowerCase());
  try {
    await updateDoc(userRef, cleanUndefined(updates));
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
  }
}

export async function saveUserDoc(user: User): Promise<void> {
  const docId = (user.email || user.id).toLowerCase();
  try {
    await setDoc(doc(db, "users", docId), cleanUndefined(user), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${docId}`);
  }
}

export async function deleteUserDoc(userId: string): Promise<void> {
  const cleanId = userId.trim();
  const lowerId = cleanId.toLowerCase();
  try {
    await deleteDoc(doc(db, "users", lowerId));
    if (cleanId !== lowerId) {
      await deleteDoc(doc(db, "users", cleanId)).catch(() => {});
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `users/${userId}`);
    throw err;
  }
}

export async function saveTeamTabSettings(
  teamName: string,
  visibleTabs: string[],
  visibleSubTabs: { [key: string]: string[] },
  visibleSubSubTabs: { [key: string]: { [key: string]: string[] } },
  permissions?: { [key: string]: { view: boolean; add: boolean; edit: boolean } }
): Promise<void> {
  const docId = teamName.toLowerCase().replace(/[^a-z0-9]/g, "-") || "default";
  try {
    await setDoc(doc(db, "tabSettings", docId), {
      id: docId,
      teamName,
      visibleTabs,
      visibleSubTabs,
      visibleSubSubTabs,
      permissions: permissions || null
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `tabSettings/${docId}`);
  }
}

export async function saveClient(client: Client): Promise<void> {
  try {
    await setDoc(doc(db, "clients", client.id), cleanUndefined(client));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `clients/${client.id}`);
  }
}

export async function deleteClientDoc(clientId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "clients", clientId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `clients/${clientId}`);
  }
}

export async function saveTeam(team: Team): Promise<void> {
  try {
    await setDoc(doc(db, "teams", team.id), cleanUndefined(team));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `teams/${team.id}`);
  }
}

export async function deleteTeamDoc(teamId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "teams", teamId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `teams/${teamId}`);
    throw err;
  }
}

export async function saveProduct(product: Product): Promise<void> {
  try {
    await setDoc(doc(db, "products", product.id), cleanUndefined(product));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `products/${product.id}`);
  }
}

export async function deleteProductDoc(productId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "products", productId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `products/${productId}`);
  }
}

export async function saveOrder(order: OrderOffer): Promise<void> {
  try {
    await setDoc(doc(db, "orders", order.id), cleanUndefined(order));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `orders/${order.id}`);
  }
}

export async function deleteOrderDoc(orderId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "orders", orderId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `orders/${orderId}`);
  }
}

export async function savePaymentBank(bank: PaymentBank): Promise<void> {
  try {
    await setDoc(doc(db, "payment_banks", bank.id), cleanUndefined(bank));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `payment_banks/${bank.id}`);
  }
}

export async function deletePaymentBankDoc(bankId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "payment_banks", bankId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `payment_banks/${bankId}`);
  }
}

export async function saveProductCategory(category: ProductCategory): Promise<void> {
  try {
    await setDoc(doc(db, "product_categories", category.id), cleanUndefined(category));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `product_categories/${category.id}`);
  }
}

export async function deleteProductCategoryDoc(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "product_categories", id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `product_categories/${id}`);
  }
}

export async function saveProductGroup(group: ProductGroup): Promise<void> {
  try {
    await setDoc(doc(db, "product_groups", group.id), cleanUndefined(group));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `product_groups/${group.id}`);
  }
}

export async function deleteProductGroupDoc(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "product_groups", id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `product_groups/${id}`);
  }
}

export async function saveManufacturer(manufacturer: Manufacturer): Promise<void> {
  try {
    await setDoc(doc(db, "manufacturers", manufacturer.id), cleanUndefined(manufacturer));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `manufacturers/${manufacturer.id}`);
  }
}

export async function deleteManufacturerDoc(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "manufacturers", id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `manufacturers/${id}`);
  }
}

export async function saveFreightTerm(item: FreightTerm): Promise<void> {
  try {
    await setDoc(doc(db, "freight_terms", item.id), cleanUndefined(item));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `freight_terms/${item.id}`);
  }
}

export async function deleteFreightTermDoc(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "freight_terms", id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `freight_terms/${id}`);
  }
}

export async function saveTransporter(item: TransporterName): Promise<void> {
  try {
    await setDoc(doc(db, "transporters", item.id), cleanUndefined(item));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `transporters/${item.id}`);
  }
}

export async function deleteTransporterDoc(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "transporters", id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `transporters/${id}`);
  }
}

export async function saveWarehouse(item: WarehouseManagedBy): Promise<void> {
  try {
    await setDoc(doc(db, "warehouses", item.id), cleanUndefined(item));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `warehouses/${item.id}`);
  }
}

export async function deleteWarehouseDoc(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "warehouses", id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `warehouses/${id}`);
  }
}

export async function saveDispatchLocation(item: DispatchLocation): Promise<void> {
  try {
    await setDoc(doc(db, "dispatch_locations", item.id), cleanUndefined(item));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `dispatch_locations/${item.id}`);
  }
}

export async function deleteDispatchLocationDoc(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "dispatch_locations", id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `dispatch_locations/${id}`);
  }
}

export async function saveAolBranch(item: AolBranchName): Promise<void> {
  try {
    await setDoc(doc(db, "aol_branches", item.id), cleanUndefined(item));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `aol_branches/${item.id}`);
  }
}

export async function deleteAolBranchDoc(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "aol_branches", id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `aol_branches/${id}`);
  }
}

export async function saveSupplier(item: SupplierName): Promise<void> {
  try {
    await setDoc(doc(db, "suppliers", item.id), cleanUndefined(item));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `suppliers/${item.id}`);
  }
}

export async function deleteSupplierDoc(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "suppliers", id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `suppliers/${id}`);
  }
}

export async function saveClearingCat(item: ClearingCat): Promise<void> {
  try {
    await setDoc(doc(db, "clearing_cats", item.id), cleanUndefined(item));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `clearing_cats/${item.id}`);
  }
}

export async function deleteClearingCatDoc(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "clearing_cats", id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `clearing_cats/${id}`);
  }
}

export async function saveImportPi(item: ImportPiRecord): Promise<void> {
  try {
    await setDoc(doc(db, "import_pis", item.id), cleanUndefined(item));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `import_pis/${item.id}`);
  }
}

export async function deleteImportPiDoc(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "import_pis", id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `import_pis/${id}`);
  }
}

export async function saveImportLc(item: ImportLcRecord): Promise<void> {
  try {
    await setDoc(doc(db, "import_lcs", item.id), cleanUndefined(item));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `import_lcs/${item.id}`);
  }
}

export async function deleteImportLcDoc(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "import_lcs", id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `import_lcs/${id}`);
  }
}

export async function saveImportEta(item: ImportEtaRecord): Promise<void> {
  try {
    await setDoc(doc(db, "import_etas", item.id), cleanUndefined(item));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `import_etas/${item.id}`);
  }
}

export async function deleteImportEtaDoc(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "import_etas", id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `import_etas/${id}`);
  }
}

export async function saveImportBoe(item: ImportBoeRecord): Promise<void> {
  try {
    await setDoc(doc(db, "import_boes", item.id), cleanUndefined(item));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `import_boes/${item.id}`);
  }
}

export async function deleteImportBoeDoc(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "import_boes", id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `import_boes/${id}`);
  }
}

export async function saveImportContainer(item: ImportContainerRecord): Promise<void> {
  try {
    await setDoc(doc(db, "import_containers", item.id), cleanUndefined(item));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `import_containers/${item.id}`);
  }
}

export async function deleteImportContainerDoc(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "import_containers", id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `import_containers/${id}`);
  }
}

export async function saveImportClearing(item: ImportClearingRecord): Promise<void> {
  try {
    await setDoc(doc(db, "import_clearings", item.id), cleanUndefined(item));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `import_clearings/${item.id}`);
  }
}

export async function deleteImportClearingDoc(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "import_clearings", id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `import_clearings/${id}`);
  }
}

export async function saveImportProvisionalClearing(item: ImportClearingRecord): Promise<void> {
  try {
    await setDoc(doc(db, "import_provisional_clearings", item.id), cleanUndefined(item));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `import_provisional_clearings/${item.id}`);
  }
}

export async function deleteImportProvisionalClearingDoc(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "import_provisional_clearings", id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `import_provisional_clearings/${id}`);
  }
}

export async function saveImportDrc(item: ImportDrcRecord): Promise<void> {
  try {
    await setDoc(doc(db, "import_drcs", item.id), cleanUndefined(item));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `import_drcs/${item.id}`);
  }
}

export async function deleteImportDrcDoc(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "import_drcs", id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `import_drcs/${id}`);
  }
}

export async function saveImportTpti(item: ImportTptiRecord): Promise<void> {
  try {
    await setDoc(doc(db, "import_tptis", item.id), cleanUndefined(item));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `import_tptis/${item.id}`);
  }
}

export async function deleteImportTptiDoc(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "import_tptis", id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `import_tptis/${id}`);
  }
}

// --- PID Consolidation Sync Helpers ---

export function mapImportCiToPid(ci: ImportCiRecord): PidRecord {
  return {
    id: ci.id,
    date: ci.purchaseTallyDate || "",
    aolBranchName: ci.aolBranchName || "",
    aolGodown: ci.aolGodown || "",
    supplierName: ci.supplierName || "",
    purchaseBeOrNo: ci.beNo || "",
    beOrPurchaseDate: ci.beDate || "",
    productName: ci.productName || "",
    containerNo: ci.containerNo || "",
    purchaseQty: ci.containerWiseQty || 0,
    purchaseRate: ci.purchaseRate || 0,
    type: "Import",
    originCode: ci.id,
    createdAt: ci.createdAt || new Date().toISOString(),
    createdByUserId: ci.createdByUserId,
    createdByName: ci.createdByName,
  };
}

export function mapDomesticPdToPid(pd: DomesticPdRecord): PidRecord {
  return {
    id: pd.id,
    date: pd.originalInvoiceDate || "",
    aolBranchName: pd.aolBranchName || "",
    aolGodown: pd.aolGodown || "",
    supplierName: pd.supplierName || "",
    purchaseBeOrNo: pd.purchaseBillNo || pd.originalPurchaseBillNo || "",
    beOrPurchaseDate: pd.originalInvoiceDate || "",
    productName: pd.productName || "",
    containerNo: pd.tankerOrVehicleNo || "",
    purchaseQty: pd.purchaseQty || 0,
    purchaseRate: pd.purchaseRate || 0,
    type: "Domestic",
    originCode: pd.id,
    createdAt: pd.createdAt || new Date().toISOString(),
    createdByUserId: pd.createdByUserId,
    createdByName: pd.createdByName,
  };
}

export function mapAccountsStToPid(st: AccountsStRecord): PidRecord {
  return {
    id: st.id,
    date: st.entryDate || st.invoiceOrTallyDate || "",
    aolBranchName: st.destAolBranchName || "",
    aolGodown: st.destAolGodown || "",
    supplierName: st.sourceSupplierName || "",
    purchaseBeOrNo: st.stockJvOrNewInvoiceNo || st.sourceBePurchaseBillNo || "",
    beOrPurchaseDate: st.invoiceOrTallyDate || st.entryDate || "",
    productName: st.newProductName || st.sourceProductName || "",
    containerNo: st.sourceContainerNo || "",
    purchaseQty: st.qty || 0,
    purchaseRate: st.rate || 0,
    type: st.importOrDomestic === "Import" ? "Import-ST" : "Domestic-ST",
    originCode: st.id,
    createdAt: st.createdAt || new Date().toISOString(),
    createdByUserId: st.createdByUserId,
    createdByName: st.createdByName,
  };
}

export function mapOpeningStockToPid(os: OpeningStockRecord): PidRecord {
  return {
    id: os.id,
    date: os.beOrPurchaseDate || "",
    aolBranchName: os.aolBranchName || "",
    aolGodown: os.aolGodown || "",
    supplierName: os.supplierName || "",
    purchaseBeOrNo: os.beNoOrPurchaseNo || "",
    beOrPurchaseDate: os.beOrPurchaseDate || "",
    productName: os.productName || "",
    containerNo: os.containerNo || "",
    purchaseQty: os.openingQty || 0,
    purchaseRate: os.purchaseRate || 0,
    type: (os.importOrDomestic as any) || "Opening Stock",
    originCode: os.originCode || os.id,
    createdAt: os.createdAt || new Date().toISOString(),
    createdByUserId: os.createdByUserId,
    createdByName: os.createdByName,
  };
}

export async function savePid(item: PidRecord): Promise<void> {
  try {
    const docRef = doc(db, "pids", item.id);
    const docSnap = await getDoc(docRef);
    let existing: Partial<PidRecord> = {};
    if (docSnap.exists()) {
      existing = docSnap.data() as Partial<PidRecord>;
    }

    // Merge new mapping fields onto existing record to preserve manual edits
    const merged: PidRecord = {
      ...existing,
      ...item,
    } as PidRecord;

    // Recalculate auto-calculated fields
    const purchaseQty = merged.purchaseQty || 0;
    const purchaseRate = merged.purchaseRate || 0;
    const drumCost = merged.drumCost || 0;
    const stockTransfer = merged.stockTransfer || 0;
    const salesQty = merged.salesQty || 0;
    const purchaseDebitCreditQty = merged.purchaseDebitCreditQty || 0;
    const salesDebitCreditQty = merged.salesDebitCreditQty || 0;

    // "Closing Stock" - auto calculated = Container wise qty - ("Stock Transfer" + "Sales Qty" + "Purchase Debit/Credit Qty" + "Sales Debit/Credit Qty")
    const closingStock = Number((purchaseQty - (stockTransfer + salesQty + purchaseDebitCreditQty + salesDebitCreditQty)).toFixed(4));
    merged.closingStock = closingStock;

    // "Purchase Rate after Druming" - auto calculated = purchase Rate + (Drum Cost / Closing Stock)
    merged.purchaseRateAfterDruming = closingStock > 0
      ? Number((purchaseRate + (drumCost / closingStock)).toFixed(4))
      : (purchaseQty > 0 ? Number((purchaseRate + (drumCost / purchaseQty)).toFixed(4)) : Number(purchaseRate.toFixed(4)));

    await setDoc(docRef, cleanUndefined(merged));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `pids/${item.id}`);
  }
}

export async function deletePidDoc(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "pids", id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `pids/${id}`);
  }
}

export async function saveImportCi(item: ImportCiRecord): Promise<void> {
  try {
    await setDoc(doc(db, "import_cis", item.id), cleanUndefined(item));
    // Synchronize to unified PID table
    try {
      await savePid(mapImportCiToPid(item));
    } catch (pidErr) {
      console.error("Failed to sync Import CI to PID collection:", pidErr);
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `import_cis/${item.id}`);
  }
}

export async function deleteImportCiDoc(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "import_cis", id));
    // Synchronize to unified PID table
    try {
      await deletePidDoc(id);
    } catch (pidErr) {
      console.error("Failed to delete corresponding PID doc on Import CI delete:", pidErr);
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `import_cis/${id}`);
  }
}

export async function saveDrcBankChargesType(item: DrcBankChargesType): Promise<void> {
  try {
    await setDoc(doc(db, "drc_bank_charges_types", item.id), cleanUndefined(item));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `drc_bank_charges_types/${item.id}`);
  }
}

export async function deleteDrcBankChargesType(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "drc_bank_charges_types", id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `drc_bank_charges_types/${id}`);
  }
}

export async function saveDrcBankCharges1(item: DrcBankCharges1): Promise<void> {
  try {
    await setDoc(doc(db, "drc_bank_charges_1", item.id), cleanUndefined(item));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `drc_bank_charges_1/${item.id}`);
  }
}

export async function deleteDrcBankCharges1(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "drc_bank_charges_1", id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `drc_bank_charges_1/${id}`);
  }
}

export async function saveAolGodown(item: AolGodown): Promise<void> {
  try {
    await setDoc(doc(db, "aol_godowns", item.id), cleanUndefined(item));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `aol_godowns/${item.id}`);
  }
}

export async function deleteAolGodownDoc(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "aol_godowns", id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `aol_godowns/${id}`);
  }
}

export async function saveDomesticSupplier(item: DomesticSupplierName): Promise<void> {
  try {
    await setDoc(doc(db, "domestic_suppliers", item.id), cleanUndefined(item));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `domestic_suppliers/${item.id}`);
  }
}

export async function deleteDomesticSupplierDoc(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "domestic_suppliers", id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `domestic_suppliers/${id}`);
  }
}

export async function saveShipToParty(item: ShipToParty): Promise<void> {
  try {
    await setDoc(doc(db, "ship_to_parties", item.id), cleanUndefined(item));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `ship_to_parties/${item.id}`);
  }
}

export async function deleteShipToPartyDoc(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "ship_to_parties", id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `ship_to_parties/${id}`);
  }
}

export async function saveDomesticPd(item: DomesticPdRecord): Promise<void> {
  try {
    await setDoc(doc(db, "domestic_pds", item.id), cleanUndefined(item));
    // Synchronize to unified PID table
    try {
      await savePid(mapDomesticPdToPid(item));
    } catch (pidErr) {
      console.error("Failed to sync Domestic PD to PID collection:", pidErr);
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `domestic_pds/${item.id}`);
  }
}

export async function deleteDomesticPdDoc(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "domestic_pds", id));
    // Synchronize to unified PID table
    try {
      await deletePidDoc(id);
    } catch (pidErr) {
      console.error("Failed to delete corresponding PID doc on Domestic PD delete:", pidErr);
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `domestic_pds/${id}`);
  }
}

export async function saveTptdCategory(item: TptdCategory): Promise<void> {
  try {
    await setDoc(doc(db, "tptd_categories", item.id), cleanUndefined(item));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `tptd_categories/${item.id}`);
  }
}

export async function deleteTptdCategoryDoc(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "tptd_categories", id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `tptd_categories/${id}`);
  }
}

export async function saveDomesticTptd(item: DomesticTptdRecord): Promise<void> {
  try {
    await setDoc(doc(db, "domestic_tptds", item.id), cleanUndefined(item));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `domestic_tptds/${item.id}`);
  }
}

export async function deleteDomesticTptdDoc(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "domestic_tptds", id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `domestic_tptds/${id}`);
  }
}

export async function saveAccountsSt(item: AccountsStRecord): Promise<void> {
  try {
    await setDoc(doc(db, "accounts_sts", item.id), cleanUndefined(item));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `accounts_sts/${item.id}`);
  }
}

export async function deleteAccountsStDoc(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "accounts_sts", id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `accounts_sts/${id}`);
  }
}

export async function saveOpeningStock(item: OpeningStockRecord): Promise<void> {
  try {
    await setDoc(doc(db, "opening_stocks", item.id), cleanUndefined(item));
    try {
      await savePid(mapOpeningStockToPid(item));
    } catch (pidErr) {
      console.error("Failed to sync Opening Stock to PID collection:", pidErr);
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `opening_stocks/${item.id}`);
  }
}

export async function deleteOpeningStockDoc(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "opening_stocks", id));
    try {
      await deletePidDoc(id);
    } catch (pidErr) {
      console.error("Failed to delete corresponding PID doc on Opening Stock delete:", pidErr);
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `opening_stocks/${id}`);
  }
}

export async function backfillPidsCollection(): Promise<void> {
  try {
    const cisSnap = await getDocs(collection(db, "import_cis"));
    const cis = cisSnap.docs.map(doc => doc.data() as ImportCiRecord);

    const pdsSnap = await getDocs(collection(db, "domestic_pds"));
    const pds = pdsSnap.docs.map(doc => doc.data() as DomesticPdRecord);

    const stsSnap = await getDocs(collection(db, "accounts_sts"));
    const sts = stsSnap.docs.map(doc => doc.data() as AccountsStRecord);

    const osSnap = await getDocs(collection(db, "opening_stocks"));
    const oss = osSnap.docs.map(doc => doc.data() as OpeningStockRecord);

    for (const ci of cis) {
      await savePid(mapImportCiToPid(ci));
    }
    for (const pd of pds) {
      await savePid(mapDomesticPdToPid(pd));
    }
    for (const st of sts) {
      await savePid(mapAccountsStToPid(st));
    }
    for (const os of oss) {
      await savePid(mapOpeningStockToPid(os));
    }
    console.log(`Consolidated PID backfill complete: ${cis.length} CIs, ${pds.length} PDs, ${sts.length} STs, and ${oss.length} OSs synced.`);
  } catch (err) {
    console.error("Failed to backfill pids collection:", err);
  }
}

export async function saveAccountsSales(item: AccountsSalesRecord): Promise<void> {
  try {
    await setDoc(doc(db, "accounts_sales", item.id), cleanUndefined(item));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `accounts_sales/${item.id}`);
  }
}

export async function deleteAccountsSalesDoc(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "accounts_sales", id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `accounts_sales/${id}`);
  }
}

export async function saveAccountsDruming(item: AccountsDrumingRecord): Promise<void> {
  try {
    await setDoc(doc(db, "accounts_drumings", item.id), cleanUndefined(item));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `accounts_drumings/${item.id}`);
  }
}

export async function deleteAccountsDrumingDoc(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "accounts_drumings", id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `accounts_drumings/${id}`);
  }
}

export async function saveExpenseLedger(item: ExpenseLedgerItem): Promise<void> {
  try {
    await setDoc(doc(db, "expense_ledgers", item.id), cleanUndefined(item));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `expense_ledgers/${item.id}`);
  }
}

export async function deleteExpenseLedgerDoc(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "expense_ledgers", id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `expense_ledgers/${id}`);
  }
}

export async function saveAccountsOfficeExp(item: AccountsOfficeExpRecord): Promise<void> {
  try {
    await setDoc(doc(db, "accounts_office_exps", item.id), cleanUndefined(item));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `accounts_office_exps/${item.id}`);
  }
}

export async function deleteAccountsOfficeExpDoc(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "accounts_office_exps", id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `accounts_office_exps/${id}`);
  }
}

export async function saveAccountsMeis(item: AccountsMeisRecord): Promise<void> {
  try {
    await setDoc(doc(db, "accounts_meis", item.id), cleanUndefined(item));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `accounts_meis/${item.id}`);
  }
}

export async function deleteAccountsMeisDoc(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "accounts_meis", id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `accounts_meis/${id}`);
  }
}

export async function saveOtherIncomeLedger(item: OtherIncomeLedgerItem): Promise<void> {
  try {
    await setDoc(doc(db, "other_income_ledgers", item.id), cleanUndefined(item));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `other_income_ledgers/${item.id}`);
  }
}

export async function deleteOtherIncomeLedgerDoc(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "other_income_ledgers", id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `other_income_ledgers/${id}`);
  }
}

export async function saveAccountsOtherIncome(item: AccountsOtherIncomeRecord): Promise<void> {
  try {
    await setDoc(doc(db, "accounts_other_incomes", item.id), cleanUndefined(item));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `accounts_other_incomes/${item.id}`);
  }
}

export async function deleteAccountsOtherIncomeDoc(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "accounts_other_incomes", id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `accounts_other_incomes/${id}`);
  }
}

export async function saveAccountsFdr(item: AccountsFdrRecord): Promise<void> {
  try {
    await setDoc(doc(db, "accounts_fdrs", item.id), cleanUndefined(item));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `accounts_fdrs/${item.id}`);
  }
}

export async function deleteAccountsFdrDoc(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "accounts_fdrs", id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `accounts_fdrs/${id}`);
  }
}

export async function saveAccountsCsdIsd(item: AccountsCsdIsdRecord): Promise<void> {
  try {
    await setDoc(doc(db, "accounts_csd_isd", item.id), cleanUndefined(item));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `accounts_csd_isd/${item.id}`);
  }
}

export async function deleteAccountsCsdIsdDoc(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "accounts_csd_isd", id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `accounts_csd_isd/${id}`);
  }
}

export async function saveAccountsTptS(item: AccountsTptSRecord): Promise<void> {
  try {
    await setDoc(doc(db, "accounts_tpt_s", item.id), cleanUndefined(item));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `accounts_tpt_s/${item.id}`);
  }
}

export async function deleteAccountsTptSDoc(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "accounts_tpt_s", id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `accounts_tpt_s/${id}`);
  }
}

export async function saveAccountsTptSt(item: AccountsTptStRecord): Promise<void> {
  try {
    await setDoc(doc(db, "accounts_tpt_st", item.id), cleanUndefined(item));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `accounts_tpt_st/${item.id}`);
  }
}

export async function deleteAccountsTptStDoc(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "accounts_tpt_st", id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `accounts_tpt_st/${id}`);
  }
}

export async function saveLedgerCrDr(item: LedgerCrDrCategory): Promise<void> {
  try {
    await setDoc(doc(db, "ledger_cr_dr", item.id), cleanUndefined(item));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `ledger_cr_dr/${item.id}`);
  }
}

export async function deleteLedgerCrDrDoc(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "ledger_cr_dr", id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `ledger_cr_dr/${id}`);
  }
}

export async function saveAccountsSupplierCrDr(item: AccountsSupplierCrDrRecord): Promise<void> {
  try {
    await setDoc(doc(db, "accounts_supplier_cr_dr", item.id), cleanUndefined(item));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `accounts_supplier_cr_dr/${item.id}`);
  }
}

export async function deleteAccountsSupplierCrDrDoc(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "accounts_supplier_cr_dr", id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `accounts_supplier_cr_dr/${id}`);
  }
}

export async function saveAccountsCustomerCrDr(item: AccountsCustomerCrDrRecord): Promise<void> {
  try {
    await setDoc(doc(db, "accounts_customer_cr_dr", item.id), cleanUndefined(item));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `accounts_customer_cr_dr/${item.id}`);
  }
}

export async function deleteAccountsCustomerCrDrDoc(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "accounts_customer_cr_dr", id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `accounts_customer_cr_dr/${id}`);
  }
}

/**
 * Generic save function used by Admin Google Sheets Sync to set/update records in any collection.
 */
export async function saveGenericCollectionRecord(collectionKey: string, record: any): Promise<void> {
  try {
    const cleanRec = cleanUndefined(record);
    if (!cleanRec.id) {
      throw new Error(`Record missing required 'id' field for collection ${collectionKey}`);
    }
    await setDoc(doc(db, collectionKey, cleanRec.id), cleanRec, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${collectionKey}/${record?.id || "unknown"}`);
  }
}

export async function bulkSaveGenericCollectionRecords(collectionKey: string, records: any[]): Promise<number> {
  if (!records || records.length === 0) return 0;
  let savedCount = 0;
  const chunkSize = 400; // safe batch chunk size under Firestore 500 limit
  for (let i = 0; i < records.length; i += chunkSize) {
    const chunk = records.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    for (const record of chunk) {
      const cleanRec = cleanUndefined(record);
      if (!cleanRec.id) {
        cleanRec.id = `${collectionKey.replace(/_/g, "")}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      }
      const docRef = doc(db, collectionKey, cleanRec.id);
      batch.set(docRef, cleanRec, { merge: true });
      savedCount++;
    }
    await batch.commit();
  }
  return savedCount;
}

export interface GoogleSheetsConfigDoc {
  spreadsheetIds?: { [moduleId: string]: string };
  appsScriptUrl?: string;
  updatedAt?: string;
}

export async function getGoogleSheetsSettings(): Promise<GoogleSheetsConfigDoc> {
  try {
    const docSnap = await getDoc(doc(db, "settings", "google_sheets"));
    if (docSnap.exists()) {
      return docSnap.data() as GoogleSheetsConfigDoc;
    }
  } catch (err) {
    console.warn("Could not load Google Sheets settings from Firestore:", err);
  }
  return { spreadsheetIds: {} };
}

export async function saveGoogleSheetsSettings(config: GoogleSheetsConfigDoc): Promise<void> {
  try {
    await setDoc(doc(db, "settings", "google_sheets"), {
      ...config,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, "settings/google_sheets");
  }
}

export interface AppsScriptConfigDoc {
  appsScriptUrl?: string;
  spreadsheetId?: string;
  sheetName?: string;
  autoSync?: boolean;
  autoSaveFetchedToDb?: boolean;
  autoReadFromSheet?: boolean;
  updatedAt?: string;
  updatedByName?: string;
}

export async function getSharedImportAppsScriptUrl(): Promise<string> {
  return "";
}

export async function saveSharedImportAppsScriptUrl(
  _url: string,
  _applyToAllTabs: boolean = false,
  _updatedByName?: string
): Promise<void> {
  // No-op to prevent cross-tab pollution since each sub-tab uses its own separate spreadsheet and script
}

export async function getAppsScriptConfig(configKey: string, defaultSheetName: string): Promise<AppsScriptConfigDoc> {
  try {
    const docSnap = await getDoc(doc(db, "settings", configKey));
    if (docSnap.exists()) {
      return docSnap.data() as AppsScriptConfigDoc;
    }
  } catch (err) {
    console.warn(`Could not load ${configKey} settings from Firestore:`, err);
  }
  return { sheetName: defaultSheetName, autoSync: true };
}

export async function saveAppsScriptConfig(configKey: string, config: AppsScriptConfigDoc): Promise<void> {
  try {
    await setDoc(doc(db, "settings", configKey), {
      ...config,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `settings/${configKey}`);
  }
}

export function subscribeAppsScriptConfig(configKey: string, defaultSheetName: string, onUpdate: (config: AppsScriptConfigDoc) => void) {
  const docRef = doc(db, "settings", configKey);
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      onUpdate(docSnap.data() as AppsScriptConfigDoc);
    } else {
      onUpdate({ sheetName: defaultSheetName, autoSync: true });
    }
  }, (error) => {
    console.warn(`Listener error for ${configKey}:`, error);
  });
}

export type ImportPiAppsScriptConfig = AppsScriptConfigDoc;

export async function getImportPiAppsScriptConfig(): Promise<ImportPiAppsScriptConfig> {
  return getAppsScriptConfig("import_pi_config", "Import PIs");
}

export async function saveImportPiAppsScriptConfig(config: ImportPiAppsScriptConfig): Promise<void> {
  return saveAppsScriptConfig("import_pi_config", config);
}

export function subscribeImportPiAppsScriptConfig(onUpdate: (config: ImportPiAppsScriptConfig) => void) {
  return subscribeAppsScriptConfig("import_pi_config", "Import PIs", onUpdate);
}









import React, { useState, useEffect } from "react";
import { Package, Briefcase, Coins, Trash2, Edit2, SlidersHorizontal, Tag, Layers, Building2, Plus, Truck, MapPin, FileText, Warehouse, BookOpen, Users } from "lucide-react";
import ProductsView from "./ProductsView";
import ClientsView from "./ClientsView";
import GodownsView from "./GodownsView";
import ExpenseLedgerSubView from "./ExpenseLedgerSubView";
import OtherIncomeLedgerSubView from "./OtherIncomeLedgerSubView";
import UsersManagementSubView from "./UsersManagementSubView";

// PaymentBank type needs to be imported, assuming it is in types.ts
import { User, Team, Product, Client, PaymentBank, ProductCategory, ProductGroup, Manufacturer, SalesLead, ProjectWorkflow, SalesTask, FreightTerm, TransporterName, WarehouseManagedBy, DispatchLocation, AolBranchName, SupplierName, ClearingCat, DrcBankChargesType, DrcBankCharges1, AolGodown, DomesticSupplierName, ShipToParty, TptdCategory, ExpenseLedgerItem, OtherIncomeLedgerItem, LedgerCrDrCategory } from "../types";

interface ListManagementViewProps {
  activeUserId: string;
  users: User[];
  products: Product[];
  clients: Client[];
  teams: Team[];
  paymentBanks: PaymentBank[];
  categories: ProductCategory[];
  groups: ProductGroup[];
  manufacturers: Manufacturer[];
  freightTerms: FreightTerm[];
  transporters: TransporterName[];
  warehouses: WarehouseManagedBy[];
  dispatchLocations: DispatchLocation[];
  leads?: SalesLead[];
  workflows: ProjectWorkflow[];
  tasks: SalesTask[];
  onAddProduct: (product: Omit<Product, "id" | "createdAt" | "createdByUserId">) => void;
  onEditProduct: (productId: string, product: Partial<Omit<Product, "id" | "createdAt" | "createdByUserId">>) => void;
  onBulkAddProducts?: (products: (Omit<Product, "id" | "createdAt" | "createdByUserId"> & { id?: string })[]) => Promise<void> | void;
  onDeleteProduct: (productId: string) => void;
  onAddCategory: (data: Omit<ProductCategory, "id" | "createdAt">) => void;
  onEditCategory?: (id: string, data: Omit<ProductCategory, "id" | "createdAt">) => void;
  onDeleteCategory: (id: string) => void;
  onAddGroup: (data: Omit<ProductGroup, "id" | "createdAt">) => void;
  onEditGroup?: (id: string, data: Omit<ProductGroup, "id" | "createdAt">) => void;
  onDeleteGroup: (id: string) => void;
  onAddManufacturer: (data: Omit<Manufacturer, "id" | "createdAt">) => void;
  onEditManufacturer?: (id: string, data: Omit<Manufacturer, "id" | "createdAt">) => void;
  onDeleteManufacturer: (id: string) => void;
  onAddFreightTerm: (data: Omit<FreightTerm, "id" | "createdAt">) => void;
  onEditFreightTerm?: (id: string, data: Omit<FreightTerm, "id" | "createdAt">) => void;
  onDeleteFreightTerm: (id: string) => void;
  onAddTransporter: (data: Omit<TransporterName, "id" | "createdAt">) => void;
  onEditTransporter?: (id: string, data: Omit<TransporterName, "id" | "createdAt">) => void;
  onDeleteTransporter: (id: string) => void;
  onAddWarehouse: (data: Omit<WarehouseManagedBy, "id" | "createdAt">) => void;
  onEditWarehouse?: (id: string, data: Omit<WarehouseManagedBy, "id" | "createdAt">) => void;
  onDeleteWarehouse: (id: string) => void;
  onAddDispatchLocation: (data: Omit<DispatchLocation, "id" | "createdAt">) => void;
  onEditDispatchLocation?: (id: string, data: Omit<DispatchLocation, "id" | "createdAt">) => void;
  onDeleteDispatchLocation: (id: string) => void;
  onAddClient: (client: Omit<Client, "id" | "createdAt">) => void;
  onEditClient: (clientId: string, client: Partial<Omit<Client, "id" | "createdAt" | "createdByUserId">>) => void;
  onDeleteClient: (clientId: string) => void;
  onAddTask: (task: Omit<SalesTask, "id">) => void;
  onToggleTaskComplete: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onAddPaymentBank: (bank: Omit<PaymentBank, "id" | "createdAt">) => void;
  onDeletePaymentBank: (id: string) => void;
  onEditPaymentBank: (id: string, bank: Omit<PaymentBank, "id" | "createdAt">) => void;
  onAddUser: (user: User) => Promise<void>;
  onUpdateUser: (userId: string, updates: Partial<User>) => Promise<void>;
  onDeleteUser: (userId: string) => Promise<void>;
  aolBranches?: AolBranchName[];
  suppliers?: SupplierName[];
  clearingCats?: ClearingCat[];
  drcBankChargesTypes?: DrcBankChargesType[];
  drcBankCharges1List?: DrcBankCharges1[];
  onAddAolBranch?: (data: Omit<AolBranchName, "id" | "createdAt">) => void;
  onEditAolBranch?: (id: string, data: Omit<AolBranchName, "id" | "createdAt">) => void;
  onDeleteAolBranch?: (id: string) => void;
  onAddSupplier?: (data: Omit<SupplierName, "id" | "createdAt">) => void;
  onEditSupplier?: (id: string, data: Omit<SupplierName, "id" | "createdAt">) => void;
  onDeleteSupplier?: (id: string) => void;
  onAddClearingCat?: (data: Omit<ClearingCat, "id" | "createdAt">) => void;
  onEditClearingCat?: (id: string, data: Omit<ClearingCat, "id" | "createdAt">) => void;
  onDeleteClearingCat?: (id: string) => void;
  onAddDrcBankChargesType?: (data: Omit<DrcBankChargesType, "id" | "createdAt">) => void;
  onEditDrcBankChargesType?: (id: string, data: Omit<DrcBankChargesType, "id" | "createdAt">) => void;
  onDeleteDrcBankChargesType?: (id: string) => void;
  onAddDrcBankCharges1?: (data: Omit<DrcBankCharges1, "id" | "createdAt">) => void;
  onEditDrcBankCharges1?: (id: string, data: Omit<DrcBankCharges1, "id" | "createdAt">) => void;
  onDeleteDrcBankCharges1?: (id: string) => void;
  aolGodowns?: AolGodown[];
  domesticSuppliers?: DomesticSupplierName[];
  shipToParties?: ShipToParty[];
  onAddAolGodown?: (data: Omit<AolGodown, "id" | "createdAt">) => void;
  onEditAolGodown?: (id: string, data: Omit<AolGodown, "id" | "createdAt">) => void;
  onDeleteAolGodown?: (id: string) => void;
  onAddDomesticSupplier?: (data: Omit<DomesticSupplierName, "id" | "createdAt">) => void;
  onEditDomesticSupplier?: (id: string, data: Omit<DomesticSupplierName, "id" | "createdAt">) => void;
  onDeleteDomesticSupplier?: (id: string) => void;
  onAddShipToParty?: (data: Omit<ShipToParty, "id" | "createdAt">) => void;
  onEditShipToParty?: (id: string, data: Omit<ShipToParty, "id" | "createdAt">) => void;
  onDeleteShipToParty?: (id: string) => void;
  tptdCategories?: TptdCategory[];
  onAddTptdCategory?: (data: Omit<TptdCategory, "id" | "createdAt">) => void;
  onEditTptdCategory?: (id: string, data: Omit<TptdCategory, "id" | "createdAt">) => void;
  onDeleteTptdCategory?: (id: string) => void;
  ledgerCrDrs?: LedgerCrDrCategory[];
  onAddLedgerCrDr?: (data: Omit<LedgerCrDrCategory, "id" | "createdAt">) => void;
  onEditLedgerCrDr?: (id: string, data: Omit<LedgerCrDrCategory, "id" | "createdAt">) => void;
  onDeleteLedgerCrDr?: (id: string) => void;
  expenseLedgers?: ExpenseLedgerItem[];
  onAddExpenseLedger?: (record: Omit<ExpenseLedgerItem, "id" | "createdAt">) => Promise<void> | void;
  onEditExpenseLedger?: (record: ExpenseLedgerItem) => Promise<void> | void;
  onDeleteExpenseLedger?: (id: string) => Promise<void> | void;
  otherIncomeLedgers?: OtherIncomeLedgerItem[];
  onAddOtherIncomeLedger?: (record: Omit<OtherIncomeLedgerItem, "id" | "createdAt">) => Promise<void> | void;
  onEditOtherIncomeLedger?: (record: OtherIncomeLedgerItem) => Promise<void> | void;
  onDeleteOtherIncomeLedger?: (id: string) => Promise<void> | void;
  visibleSubTabs?: { [key: string]: string[] };
  visibleSubSubTabs?: { [key: string]: { [key: string]: string[] } };
}

export default function ListManagementView({
  activeUserId,
  users,
  products,
  clients,
  teams,
  paymentBanks,
  categories,
  groups,
  manufacturers,
  freightTerms,
  transporters,
  warehouses,
  dispatchLocations,
  leads = [],
  workflows,
  tasks,
  onAddProduct,
  onEditProduct,
  onBulkAddProducts,
  onDeleteProduct,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
  onAddGroup,
  onEditGroup,
  onDeleteGroup,
  onAddManufacturer,
  onEditManufacturer,
  onDeleteManufacturer,
  onAddFreightTerm,
  onEditFreightTerm,
  onDeleteFreightTerm,
  onAddTransporter,
  onEditTransporter,
  onDeleteTransporter,
  onAddWarehouse,
  onEditWarehouse,
  onDeleteWarehouse,
  onAddDispatchLocation,
  onEditDispatchLocation,
  onDeleteDispatchLocation,
  onAddClient,
  onEditClient,
  onDeleteClient,
  onAddTask,
  onToggleTaskComplete,
  onDeleteTask,
  onAddPaymentBank,
  onDeletePaymentBank,
  onEditPaymentBank,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  aolBranches = [],
  suppliers = [],
  clearingCats = [],
  drcBankChargesTypes = [],
  drcBankCharges1List = [],
  aolGodowns = [],
  domesticSuppliers = [],
  shipToParties = [],
  onAddAolBranch,
  onEditAolBranch,
  onDeleteAolBranch,
  onAddSupplier,
  onEditSupplier,
  onDeleteSupplier,
  onAddClearingCat,
  onEditClearingCat,
  onDeleteClearingCat,
  onAddDrcBankChargesType,
  onEditDrcBankChargesType,
  onDeleteDrcBankChargesType,
  onAddDrcBankCharges1,
  onEditDrcBankCharges1,
  onDeleteDrcBankCharges1,
  onAddAolGodown,
  onEditAolGodown,
  onDeleteAolGodown,
  onAddDomesticSupplier,
  onEditDomesticSupplier,
  onDeleteDomesticSupplier,
  onAddShipToParty,
  onEditShipToParty,
  onDeleteShipToParty,
  tptdCategories = [],
  onAddTptdCategory,
  onEditTptdCategory,
  onDeleteTptdCategory,
  ledgerCrDrs = [],
  onAddLedgerCrDr,
  onEditLedgerCrDr,
  onDeleteLedgerCrDr,
  expenseLedgers = [],
  onAddExpenseLedger,
  onEditExpenseLedger,
  onDeleteExpenseLedger,
  otherIncomeLedgers = [],
  onAddOtherIncomeLedger,
  onEditOtherIncomeLedger,
  onDeleteOtherIncomeLedger,
  visibleSubTabs,
  visibleSubSubTabs,
}: ListManagementViewProps) {
  const allSubTabs = [
    { id: "products", label: "Product Catalog", icon: Package },
    { id: "users", label: "User Management", icon: Users },
    { id: "clients", label: "Client Management", icon: Briefcase },
    { id: "banks", label: "Payment Bank", icon: Coins },
    { id: "godowns", label: "Godowns", icon: Warehouse },
    { id: "expense_ledger", label: "Expense Ledger", icon: BookOpen },
    { id: "other_income_ledger", label: "Ledger", icon: BookOpen },
    { id: "dropdowns", label: "Dropdowns", icon: SlidersHorizontal },
  ];

  const visibleTabsForList = visibleSubTabs?.["list_management"] || allSubTabs.map(t => t.id);
  const filteredSubTabs = allSubTabs.filter(t => visibleTabsForList.includes(t.id));

  const activeUser = users.find(u => u.id === activeUserId);
  const isManagerOrAdmin = activeUser?.accessLevel === "Manager" || activeUser?.role === "Admin";

  const [activeSubTab, setActiveSubTab] = useState(filteredSubTabs[0]?.id || "products");
  const [isAddBankOpen, setIsAddBankOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<PaymentBank | null>(null);

  // Keep activeSubTab in sync if permissions change
  useEffect(() => {
    if (filteredSubTabs.length > 0 && !filteredSubTabs.some(t => t.id === activeSubTab)) {
      setActiveSubTab(filteredSubTabs[0].id);
    }
  }, [filteredSubTabs, activeSubTab]);

  // Extract visible sub-sub-tabs for the current tab
  const currentSubSubTabs = visibleSubSubTabs?.["list_management"]?.[activeSubTab];

  return (
    <div className="space-y-4">
      {/* Sub-tab selection */}
      <div className="flex border-b border-slate-200 gap-1 overflow-x-auto pb-0.5 scrollbar-thin whitespace-nowrap">
        {filteredSubTabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 text-[10px] font-bold font-mono uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                active ? "border-emerald-600 text-emerald-700" : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              <Icon size={12} className={active ? "text-emerald-600" : "text-slate-400"} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {filteredSubTabs.length === 0 ? (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl text-center font-medium text-xs font-mono mt-3">
          ⚠️ ACCESS RESTRICTED: No list management features are enabled for your team workspace.
        </div>
      ) : (
        <>
          {/* Render sub-view */}
          {activeSubTab === "products" && (
        <ProductsView
          activeUserId={activeUserId}
          users={users}
          products={products}
          teams={teams}
          categories={categories}
          groups={groups}
          manufacturers={manufacturers}
          onAddProduct={onAddProduct}
          onEditProduct={onEditProduct}
          onBulkAddProducts={onBulkAddProducts}
          onDeleteProduct={onDeleteProduct}
          onAddCategory={onAddCategory}
          onDeleteCategory={onDeleteCategory}
          onAddGroup={onAddGroup}
          onDeleteGroup={onDeleteGroup}
          onAddManufacturer={onAddManufacturer}
          onDeleteManufacturer={onDeleteManufacturer}
          visibleSubSubTabs={currentSubSubTabs}
        />
      )}
      {activeSubTab === "users" && (
        <UsersManagementSubView
          users={users}
          teams={teams}
          activeUserId={activeUserId}
          onAddUser={onAddUser}
          onUpdateUser={onUpdateUser}
          onDeleteUser={onDeleteUser}
          isAuthorized={isManagerOrAdmin}
        />
      )}
      {activeSubTab === "clients" && (
        <ClientsView
          activeUserId={activeUserId}
          users={users}
          clients={clients}
          teams={teams}
          onAddClient={onAddClient}
          onEditClient={onEditClient}
          onDeleteClient={onDeleteClient}
          leads={leads}
          workflows={workflows}
          products={products}
          tasks={tasks}
          onAddTask={onAddTask}
          onToggleTaskComplete={onToggleTaskComplete}
          onDeleteTask={onDeleteTask}
        />
      )}
      {activeSubTab === "dropdowns" && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200">
            <h2 className="text-xs font-bold text-slate-500 uppercase font-mono tracking-wider mb-1">List Dropdowns Configuration</h2>
            <p className="text-xs text-slate-500">Configure global choices for Product Categories, Product Groups, Manufacturers, Freight Terms, Transporters, Warehouses, Dispatch Locations, AOL Branches, Suppliers, and Clearing Cats.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <LocalDropdownSection
              title="Category"
              icon={Tag}
              items={categories}
              onAdd={onAddCategory}
              onEdit={onEditCategory}
              onDelete={onDeleteCategory}
              placeholder="e.g. Software, Hardware..."
              isAuthorized={isManagerOrAdmin}
            />
            <LocalDropdownSection
              title="Product Group"
              icon={Layers}
              items={groups}
              onAdd={onAddGroup}
              onEdit={onEditGroup}
              onDelete={onDeleteGroup}
              placeholder="e.g. Applications, Cloud Services..."
              isAuthorized={isManagerOrAdmin}
            />
            <LocalDropdownSection
              title="Manufacturer"
              icon={Building2}
              items={manufacturers}
              onAdd={onAddManufacturer}
              onEdit={onEditManufacturer}
              onDelete={onDeleteManufacturer}
              placeholder="e.g. Apex Systems, Apex AI Labs..."
              isAuthorized={isManagerOrAdmin}
            />
            <LocalDropdownSection
              title="FOB / CIF Terms"
              icon={FileText}
              items={freightTerms}
              onAdd={onAddFreightTerm}
              onEdit={onEditFreightTerm}
              onDelete={onDeleteFreightTerm}
              placeholder="e.g. FOB, CIF, CFR, EXW..."
              isAuthorized={isManagerOrAdmin}
            />
            <LocalDropdownSection
              title="Transporter Name"
              icon={Truck}
              items={transporters}
              onAdd={onAddTransporter}
              onEdit={onEditTransporter}
              onDelete={onDeleteTransporter}
              placeholder="e.g. FedEx, Apex Logistics..."
              isAuthorized={isManagerOrAdmin}
            />
            <LocalDropdownSection
              title="Warehouse Managed By"
              icon={Warehouse}
              items={warehouses}
              onAdd={onAddWarehouse}
              onEdit={onEditWarehouse}
              onDelete={onDeleteWarehouse}
              placeholder="e.g. Warehouse Team, Partner 3PL..."
              isAuthorized={isManagerOrAdmin}
            />
            <LocalDropdownSection
              title="Dispatch Location"
              icon={MapPin}
              items={dispatchLocations}
              onAdd={onAddDispatchLocation}
              onEdit={onEditDispatchLocation}
              onDelete={onDeleteDispatchLocation}
              placeholder="e.g. Chicago Hub, main facility..."
              isAuthorized={isManagerOrAdmin}
            />
            <LocalDropdownSection
              title="AOL Branch Name"
              icon={MapPin}
              items={aolBranches}
              onAdd={onAddAolBranch || (() => {})}
              onEdit={onEditAolBranch}
              onDelete={onDeleteAolBranch || (() => {})}
              placeholder="e.g. Mumbai, Chennai..."
              isAuthorized={isManagerOrAdmin}
            />
            <LocalDropdownSection
              title="SUPPLIER NAME"
              icon={Building2}
              items={suppliers}
              onAdd={onAddSupplier || (() => {})}
              onEdit={onEditSupplier}
              onDelete={onDeleteSupplier || (() => {})}
              placeholder="e.g. Global Chemicals..."
              isAuthorized={isManagerOrAdmin}
            />
            <LocalDropdownSection
              title="Clearing Cat"
              icon={Tag}
              items={clearingCats || []}
              onAdd={onAddClearingCat || (() => {})}
              onEdit={onEditClearingCat}
              onDelete={onDeleteClearingCat || (() => {})}
              placeholder="e.g. Standard Clearing, Bonded..."
              isAuthorized={isManagerOrAdmin}
            />
            <LocalDropdownSection
              title="Bank Charges Type"
              icon={Tag}
              items={drcBankChargesTypes || []}
              onAdd={onAddDrcBankChargesType || (() => {})}
              onEdit={onEditDrcBankChargesType}
              onDelete={onDeleteDrcBankChargesType || (() => {})}
              placeholder="e.g. Commission, Interest..."
              isAuthorized={isManagerOrAdmin}
            />
            <LocalDropdownSection
              title="Banks Charges 1"
              icon={Tag}
              items={drcBankCharges1List || []}
              onAdd={onAddDrcBankCharges1 || (() => {})}
              onEdit={onEditDrcBankCharges1}
              onDelete={onDeleteDrcBankCharges1 || (() => {})}
              placeholder="e.g. Swift, Cable..."
              isAuthorized={isManagerOrAdmin}
            />
            <LocalDropdownSection
              title="Godown / Warehouse Name"
              icon={Building2}
              items={aolGodowns || []}
              onAdd={onAddAolGodown || (() => {})}
              onEdit={onEditAolGodown}
              onDelete={onDeleteAolGodown || (() => {})}
              placeholder="e.g. Godown A, Godown B..."
              isAuthorized={isManagerOrAdmin}
            />
            <LocalDropdownSection
              title="Domestic Supplier List"
              icon={Building2}
              items={domesticSuppliers || []}
              onAdd={onAddDomesticSupplier || (() => {})}
              onEdit={onEditDomesticSupplier}
              onDelete={onDeleteDomesticSupplier || (() => {})}
              placeholder="e.g. Domestic Supplier Name..."
              isAuthorized={isManagerOrAdmin}
            />
            <LocalDropdownSection
              title="Ship To Party Name (GNFC Purchase)"
              icon={Building2}
              items={shipToParties || []}
              onAdd={onAddShipToParty || (() => {})}
              onEdit={onEditShipToParty}
              onDelete={onDeleteShipToParty || (() => {})}
              placeholder="e.g. GNFC Ship To Party..."
              isAuthorized={isManagerOrAdmin}
            />
            <LocalDropdownSection
              title="TPT-D Category"
              icon={Tag}
              items={tptdCategories || []}
              onAdd={onAddTptdCategory || (() => {})}
              onEdit={onEditTptdCategory}
              onDelete={onDeleteTptdCategory || (() => {})}
              placeholder="e.g. Freight, Toll, Maintenance..."
              isAuthorized={isManagerOrAdmin}
            />
            <LocalDropdownSection
              title="Ledger CR DR"
              icon={BookOpen}
              items={ledgerCrDrs || []}
              onAdd={onAddLedgerCrDr || (() => {})}
              onEdit={onEditLedgerCrDr}
              onDelete={onDeleteLedgerCrDr || (() => {})}
              placeholder="e.g. Purchase Discount, Price Difference..."
              isAuthorized={isManagerOrAdmin}
            />

          </div>
        </div>
      )}
      {activeSubTab === "banks" && (
        <div className="p-6 bg-white rounded-xl border border-slate-200">
           <div className="flex items-center justify-between mb-4">
             <h2 className="text-sm font-bold text-slate-800 uppercase font-mono">Payment Banks</h2>
             {isManagerOrAdmin ? (
               <button onClick={() => setIsAddBankOpen(true)} className="px-3 py-1.5 text-xs font-bold bg-emerald-600 text-white rounded-lg flex items-center gap-1.5 cursor-pointer hover:bg-emerald-700">
                 <Package size={12} /> Add Bank
               </button>
             ) : (
               <button disabled title="Requires Manager or Admin role." className="px-3 py-1.5 text-xs font-bold bg-slate-300 text-slate-400 rounded-lg flex items-center gap-1.5 cursor-not-allowed">
                 <Package size={12} /> Add Bank
               </button>
             )}
           </div>
           
           <div className="space-y-2 font-mono">
             {paymentBanks.map(bank => (
               <div key={bank.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg text-xs border border-slate-100">
                 <div>
                   <p className="font-bold text-slate-800">{bank.bankName}</p>
                   <p className="text-slate-500">Account: {bank.accountNumber}</p>
                 </div>
                 <div className="flex gap-2">
                    {isManagerOrAdmin ? (
                      <>
                        <button onClick={() => setEditingBank(bank)} className="text-amber-600 p-1 hover:bg-amber-50 rounded cursor-pointer" title="Edit Bank">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => onDeletePaymentBank(bank.id)} className="text-rose-600 p-1 hover:bg-rose-50 rounded cursor-pointer" title="Delete Bank">
                          <Trash2 size={14} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button disabled className="text-slate-300 p-1 cursor-not-allowed" title="Edit forbidden. Requires Manager role.">
                          <Edit2 size={14} className="opacity-45" />
                        </button>
                        <button disabled className="text-slate-300 p-1 cursor-not-allowed" title="Delete forbidden. Requires Manager role.">
                          <Trash2 size={14} className="opacity-45" />
                        </button>
                      </>
                    )}
                 </div>
               </div>
             ))}
           </div>
           
           {isAddBankOpen && (
             <BankModal onClose={() => setIsAddBankOpen(false)} onSave={onAddPaymentBank} />
           )}
           {editingBank && (
             <BankModal onClose={() => setEditingBank(null)} onSave={(data) => { onEditPaymentBank(editingBank.id, data); setEditingBank(null); }} initialBank={editingBank} />
           )}
        </div>
      )}
      {activeSubTab === "godowns" && (
        <GodownsView
          activeUserId={activeUserId}
          users={users}
          aolGodowns={aolGodowns}
          aolBranches={aolBranches}
          onAddAolGodown={onAddAolGodown || (() => {})}
          onEditAolGodown={onEditAolGodown || (() => {})}
          onDeleteAolGodown={onDeleteAolGodown || (() => {})}
        />
      )}
      {activeSubTab === "expense_ledger" && (
        <ExpenseLedgerSubView
          activeUserId={activeUserId}
          users={users}
          expenseLedgers={expenseLedgers}
          aolBranches={aolBranches}
          onAddExpenseLedger={onAddExpenseLedger || (() => {})}
          onUpdateExpenseLedger={onEditExpenseLedger || (() => {})}
          onDeleteExpenseLedger={onDeleteExpenseLedger || (() => {})}
        />
      )}
      {activeSubTab === "other_income_ledger" && (
        <OtherIncomeLedgerSubView
          activeUserId={activeUserId}
          users={users}
          otherIncomeLedgers={otherIncomeLedgers}
          onAddOtherIncomeLedger={onAddOtherIncomeLedger}
          onEditOtherIncomeLedger={onEditOtherIncomeLedger}
          onDeleteOtherIncomeLedger={onDeleteOtherIncomeLedger}
        />
      )}
      </>
      )}
    </div>
  );
}

function LocalDropdownSection({
  title,
  icon: Icon,
  items,
  onAdd,
  onDelete,
  onEdit,
  placeholder,
  isAuthorized = true,
}: {
  title: string;
  icon: any;
  items: any[];
  onAdd: (data: any) => void;
  onDelete: (id: string) => void;
  onEdit?: (id: string, data: any) => void;
  placeholder: string;
  isAuthorized?: boolean;
}) {
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthorized || !name.trim()) return;
    onAdd({ name: name.trim() });
    setName("");
  };

  const handleStartEdit = (item: any) => {
    setEditingId(item.id);
    setEditName(item.name);
    setConfirmDeleteId(null);
  };

  const handleSaveEdit = (id: string) => {
    if (!editName.trim()) return;
    if (onEdit) {
      onEdit(id, { name: editName.trim() });
    }
    setEditingId(null);
    setEditName("");
  };

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-3xs flex flex-col h-full">
      <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-4">
        <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
          <Icon size={16} />
        </div>
        <h3 className="text-xs font-bold text-slate-800 uppercase font-mono tracking-wide">{title}</h3>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
        <input
          type="text"
          value={name}
          disabled={!isAuthorized}
          onChange={(e) => setName(e.target.value)}
          placeholder={isAuthorized ? placeholder : "Requires Manager/Admin permission"}
          className="flex-1 text-xs border border-slate-200 bg-slate-50 px-3 py-2 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500 placeholder-slate-400 text-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <button
          type="submit"
          disabled={!isAuthorized}
          title={isAuthorized ? `Add to ${title}` : "Requires Manager or Admin role."}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1 shrink-0 disabled:bg-slate-300 disabled:text-slate-400 disabled:cursor-not-allowed"
        >
          <Plus size={14} /> Add
        </button>
      </form>

      <div className="flex-1 overflow-y-auto max-h-[300px] pr-1 space-y-1.5 font-mono">
        {items.length === 0 ? (
          <p className="text-slate-400 text-[11px] text-center py-8">No entries yet.</p>
        ) : (
          items.map((item) => {
            const isEditing = editingId === item.id;
            const isConfirmingDelete = confirmDeleteId === item.id;

            return (
              <div
                key={item.id}
                className="flex flex-col gap-2 text-xs px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-lg hover:border-slate-200 transition-all font-medium text-slate-700"
              >
                {isEditing ? (
                  <div className="flex items-center gap-1.5 w-full">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 text-xs border border-slate-300 bg-white px-2 py-1 rounded outline-none focus:ring-1 focus:ring-emerald-500"
                      autoFocus
                    />
                    <button
                      onClick={() => handleSaveEdit(item.id)}
                      className="px-2 py-1 bg-emerald-600 text-white rounded text-[11px] font-bold hover:bg-emerald-700 cursor-pointer"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-2 py-1 bg-slate-200 text-slate-700 rounded text-[11px] font-bold hover:bg-slate-300 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : isConfirmingDelete ? (
                  <div className="flex items-center justify-between w-full bg-rose-50 p-1.5 rounded border border-rose-200">
                    <span className="text-[11px] text-rose-800 font-bold">Delete "{item.name}"?</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          onDelete(item.id);
                          setConfirmDeleteId(null);
                        }}
                        className="px-2 py-0.5 bg-rose-600 text-white rounded text-[10px] font-bold hover:bg-rose-700 cursor-pointer"
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-[10px] font-bold hover:bg-slate-300 cursor-pointer"
                      >
                        No
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-center w-full">
                    <span className="font-semibold text-slate-800">{item.name}</span>
                    {isAuthorized ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleStartEdit(item)}
                          className="text-slate-400 hover:text-amber-600 p-1 rounded hover:bg-amber-50 transition-all cursor-pointer"
                          title={`Edit ${item.name}`}
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(item.id)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-all cursor-pointer"
                          title={`Delete ${item.name}`}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <button disabled className="text-slate-300 p-1 rounded cursor-not-allowed">
                          <Edit2 size={13} className="opacity-45" />
                        </button>
                        <button disabled className="text-slate-300 p-1 rounded cursor-not-allowed">
                          <Trash2 size={13} className="opacity-45" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function BankModal({ onClose, onSave, initialBank }: { onClose: () => void, onSave: (bank: Omit<PaymentBank, "id" | "createdAt">) => void, initialBank?: PaymentBank }) {
  const [bankName, setBankName] = useState(initialBank?.bankName || "");
  const [accountHolderName, setAccountHolderName] = useState(initialBank?.accountHolderName || "");
  const [accountNumber, setAccountNumber] = useState(initialBank?.accountNumber || "");
  const [ifscCode, setIfscCode] = useState(initialBank?.ifscCode || "");
  const [branch, setBranch] = useState(initialBank?.branch || "");
  const [address, setAddress] = useState(initialBank?.address || "");
  
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl border border-slate-200">
        <h2 className="text-sm font-bold text-slate-800 mb-4 uppercase font-mono">{initialBank ? "Edit Bank" : "Add New Bank"}</h2>
        <div className="space-y-3">
          <input type="text" placeholder="Bank Name" value={bankName} onChange={(e) => setBankName(e.target.value)} className="w-full text-xs border border-slate-200 bg-slate-50 px-3 py-2 rounded-lg" />
          <input type="text" placeholder="Account Holder Name" value={accountHolderName} onChange={(e) => setAccountHolderName(e.target.value)} className="w-full text-xs border border-slate-200 bg-slate-50 px-3 py-2 rounded-lg" />
          <input type="text" placeholder="Account Number" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} className="w-full text-xs border border-slate-200 bg-slate-50 px-3 py-2 rounded-lg" />
          <input type="text" placeholder="IFSC Code" value={ifscCode} onChange={(e) => setIfscCode(e.target.value)} className="w-full text-xs border border-slate-200 bg-slate-50 px-3 py-2 rounded-lg" />
          <input type="text" placeholder="Branch" value={branch} onChange={(e) => setBranch(e.target.value)} className="w-full text-xs border border-slate-200 bg-slate-50 px-3 py-2 rounded-lg" />
          <input type="text" placeholder="Address" value={address} onChange={(e) => setAddress(e.target.value)} className="w-full text-xs border border-slate-200 bg-slate-50 px-3 py-2 rounded-lg" />
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 rounded-lg cursor-pointer">Cancel</button>
            <button onClick={() => { onSave({ bankName, accountHolderName, accountNumber, ifscCode, branch, address }); onClose(); }} className="px-3 py-1.5 text-xs font-bold bg-emerald-600 text-white rounded-lg cursor-pointer">Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { User, Client, AolBranchName, Product, AolGodown, PidRecord, AccountsStRecord, AccountsSalesRecord, AccountsDrumingRecord, AccountsOfficeExpRecord, AccountsMeisRecord, ExpenseLedgerItem, AccountsOtherIncomeRecord, OtherIncomeLedgerItem, AccountsFdrRecord, AccountsCsdIsdRecord, AccountsTptSRecord, AccountsTptStRecord, TransporterName, TptdCategory, PaymentBank, LedgerCrDrCategory, AccountsSupplierCrDrRecord, AccountsCustomerCrDrRecord } from "../../types";
import AccountsStSubView from "./AccountsStSubView";
import AccountsSalesSubView from "./AccountsSalesSubView";
import AccountsDrumingSubView from "./AccountsDrumingSubView";
import AccountsOfficeExpSubView from "./AccountsOfficeExpSubView";
import AccountsMeisSubView from "./AccountsMeisSubView";
import AccountsOtherIncomeSubView from "./AccountsOtherIncomeSubView";
import AccountsFdrSubView from "./AccountsFdrSubView";
import AccountsCsdIsdSubView from "./AccountsCsdIsdSubView";
import AccountsTptSSubView from "./AccountsTptSSubView";
import AccountsTptStSubView from "./AccountsTptStSubView";
import AccountsSupplierCrDrSubView from "./AccountsSupplierCrDrSubView";
import AccountsCustomerCrDrSubView from "./AccountsCustomerCrDrSubView";
import { ArrowLeftRight, ShoppingBag, Package, Receipt, Award, TrendingUp, Landmark, FileSpreadsheet, Truck, Scroll } from "lucide-react";

interface AccountsViewProps {
  activeUserId: string;
  users: User[];
  clients?: Client[];
  accountsSts?: AccountsStRecord[];
  accountsSales?: AccountsSalesRecord[];
  accountsDrumings?: AccountsDrumingRecord[];
  accountsOfficeExps?: AccountsOfficeExpRecord[];
  accountsMeis?: AccountsMeisRecord[];
  accountsOtherIncomes?: AccountsOtherIncomeRecord[];
  accountsFdrs?: AccountsFdrRecord[];
  accountsCsdIsds?: AccountsCsdIsdRecord[];
  accountsTpts?: AccountsTptSRecord[];
  transporters?: TransporterName[];
  tptdCategories?: TptdCategory[];
  expenseLedgers?: ExpenseLedgerItem[];
  otherIncomeLedgers?: OtherIncomeLedgerItem[];
  aolBranches?: AolBranchName[];
  aolGodowns?: AolGodown[];
  products?: Product[];
  pids?: PidRecord[];
  paymentBanks?: PaymentBank[];
  onAddAccountsSt: (record: Omit<AccountsStRecord, "id" | "createdAt">) => void;
  onUpdateAccountsSt: (record: AccountsStRecord) => void;
  onDeleteAccountsSt: (id: string) => void;
  onAddAccountsSales: (record: Omit<AccountsSalesRecord, "id" | "createdAt">) => Promise<void> | void;
  onUpdateAccountsSales: (record: AccountsSalesRecord) => Promise<void> | void;
  onDeleteAccountsSales: (id: string) => Promise<void> | void;
  onAddAccountsDruming: (record: Omit<AccountsDrumingRecord, "id" | "createdAt">) => Promise<void> | void;
  onUpdateAccountsDruming: (record: AccountsDrumingRecord) => Promise<void> | void;
  onDeleteAccountsDruming: (id: string) => Promise<void> | void;
  onAddAccountsOfficeExp: (record: Omit<AccountsOfficeExpRecord, "id" | "createdAt">) => Promise<void> | void;
  onUpdateAccountsOfficeExp: (record: AccountsOfficeExpRecord) => Promise<void> | void;
  onDeleteAccountsOfficeExp: (id: string) => Promise<void> | void;
  onAddAccountsMeis: (record: Omit<AccountsMeisRecord, "id" | "createdAt">) => Promise<void> | void;
  onUpdateAccountsMeis: (record: AccountsMeisRecord) => Promise<void> | void;
  onDeleteAccountsMeis: (id: string) => Promise<void> | void;
  onAddAccountsOtherIncome?: (record: Omit<AccountsOtherIncomeRecord, "id" | "createdAt">) => Promise<void> | void;
  onUpdateAccountsOtherIncome?: (record: AccountsOtherIncomeRecord) => Promise<void> | void;
  onDeleteAccountsOtherIncome?: (id: string) => Promise<void> | void;
  onAddAccountsFdr?: (record: Omit<AccountsFdrRecord, "id" | "createdAt">) => Promise<void> | void;
  onUpdateAccountsFdr?: (record: AccountsFdrRecord) => Promise<void> | void;
  onDeleteAccountsFdr?: (id: string) => Promise<void> | void;
  onAddAccountsCsdIsd?: (record: Omit<AccountsCsdIsdRecord, "id" | "createdAt">) => Promise<void> | void;
  onUpdateAccountsCsdIsd?: (record: AccountsCsdIsdRecord) => Promise<void> | void;
  onDeleteAccountsCsdIsd?: (id: string) => Promise<void> | void;
  onAddAccountsTptS?: (record: Omit<AccountsTptSRecord, "id" | "createdAt">) => Promise<void> | void;
  onUpdateAccountsTptS?: (record: AccountsTptSRecord) => Promise<void> | void;
  onDeleteAccountsTptS?: (id: string) => Promise<void> | void;
  accountsTptSts?: AccountsTptStRecord[];
  onAddAccountsTptSt?: (record: Omit<AccountsTptStRecord, "id" | "createdAt">) => Promise<void> | void;
  onUpdateAccountsTptSt?: (record: AccountsTptStRecord) => Promise<void> | void;
  onDeleteAccountsTptSt?: (id: string) => Promise<void> | void;
  accountsSupplierCrDrs?: AccountsSupplierCrDrRecord[];
  accountsCustomerCrDrs?: AccountsCustomerCrDrRecord[];
  ledgerCrDrs?: LedgerCrDrCategory[];
  onAddAccountsSupplierCrDr?: (record: Omit<AccountsSupplierCrDrRecord, "id" | "createdAt">) => Promise<void> | void;
  onUpdateAccountsSupplierCrDr?: (record: AccountsSupplierCrDrRecord) => Promise<void> | void;
  onDeleteAccountsSupplierCrDr?: (id: string) => Promise<void> | void;
  onAddAccountsCustomerCrDr?: (record: Omit<AccountsCustomerCrDrRecord, "id" | "createdAt">) => Promise<void> | void;
  onUpdateAccountsCustomerCrDr?: (record: AccountsCustomerCrDrRecord) => Promise<void> | void;
  onDeleteAccountsCustomerCrDr?: (id: string) => Promise<void> | void;
  canAddSupplierCrDr?: boolean;
  canEditSupplierCrDr?: boolean;
  canAddCustomerCrDr?: boolean;
  canEditCustomerCrDr?: boolean;
  visibleSubTabs?: { [key: string]: string[] };
  getTabPermission?: (tabId: string, permissionType: "view" | "add" | "edit") => boolean;
}

type AccountsSubTab = "st" | "sales" | "druming" | "office_exp" | "meis" | "other_income" | "fdr" | "csd_isd" | "tpt_s" | "tpt_st" | "supplier_cr_dr" | "customer_cr_dr";

export default function AccountsView(props: AccountsViewProps) {
  const getSubTabAdd = (subId: string) => props.getTabPermission ? props.getTabPermission(`accounts_tab/${subId}`, "add") : true;
  const getSubTabEdit = (subId: string) => props.getTabPermission ? props.getTabPermission(`accounts_tab/${subId}`, "edit") : true;

  const subTabs = [
    { id: "st" as const, label: "ST (Stock Transfer)", icon: ArrowLeftRight },
    { id: "sales" as const, label: "Sales", icon: ShoppingBag },
    { id: "druming" as const, label: "Druming", icon: Package },
    { id: "office_exp" as const, label: "Office Exp", icon: Receipt },
    { id: "other_income" as const, label: "Other Income", icon: TrendingUp },
    { id: "meis" as const, label: "MEIS", icon: Award },
    { id: "fdr" as const, label: "FDR", icon: Landmark },
    { id: "csd_isd" as const, label: "CSD & ISD", icon: FileSpreadsheet },
    { id: "tpt_s" as const, label: "TPT-S", icon: Truck },
    { id: "tpt_st" as const, label: "TPT-ST", icon: Truck },
    { id: "supplier_cr_dr" as const, label: "Supplier CR/DR Note", icon: Scroll },
    { id: "customer_cr_dr" as const, label: "Customer CR/DR Note", icon: Scroll },
  ];

  const allowedSubTabs = props.visibleSubTabs?.["accounts_tab"] || subTabs.map((s) => s.id);
  const filteredSubTabs = subTabs.filter((s) => allowedSubTabs.includes(s.id));

  const [activeSubTab, setActiveSubTab] = useState<AccountsSubTab>(
    (filteredSubTabs[0]?.id as AccountsSubTab) || "st"
  );

  React.useEffect(() => {
    if (filteredSubTabs.length > 0 && !filteredSubTabs.some((t) => t.id === activeSubTab)) {
      setActiveSubTab(filteredSubTabs[0].id as AccountsSubTab);
    }
  }, [filteredSubTabs, activeSubTab]);

  return (
    <div className="flex flex-col gap-4">
      {/* Sub-tabs Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-1.5 flex flex-wrap items-center gap-1 shrink-0 shadow-xs">
        {filteredSubTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-[11px] font-bold tracking-wider uppercase transition-all duration-200 cursor-pointer ${
                isActive
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              <Icon size={13} className={isActive ? "text-emerald-400" : "text-slate-400"} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Render active sub-tab view */}
      <div className="transition-opacity duration-200">
        {activeSubTab === "st" && <AccountsStSubView {...props} canAdd={getSubTabAdd("st")} canEdit={getSubTabEdit("st")} />}
        {activeSubTab === "sales" && <AccountsSalesSubView {...props} canAdd={getSubTabAdd("sales")} canEdit={getSubTabEdit("sales")} />}
        {activeSubTab === "druming" && <AccountsDrumingSubView {...props} canAdd={getSubTabAdd("druming")} canEdit={getSubTabEdit("druming")} />}
        {activeSubTab === "office_exp" && <AccountsOfficeExpSubView {...props} canAdd={getSubTabAdd("office_exp")} canEdit={getSubTabEdit("office_exp")} />}
        {activeSubTab === "other_income" && (
          <AccountsOtherIncomeSubView
            activeUserId={props.activeUserId}
            users={props.users}
            accountsOtherIncomes={props.accountsOtherIncomes || []}
            otherIncomeLedgers={props.otherIncomeLedgers || []}
            aolBranches={props.aolBranches || []}
            onAddAccountsOtherIncome={props.onAddAccountsOtherIncome || (() => {})}
            onUpdateAccountsOtherIncome={props.onUpdateAccountsOtherIncome || (() => {})}
            onDeleteAccountsOtherIncome={props.onDeleteAccountsOtherIncome || (() => {})}
            canAdd={getSubTabAdd("other_income")}
            canEdit={getSubTabEdit("other_income")}
          />
        )}
        {activeSubTab === "meis" && <AccountsMeisSubView {...props} canAdd={getSubTabAdd("meis")} canEdit={getSubTabEdit("meis")} />}
        {activeSubTab === "fdr" && (
          <AccountsFdrSubView
            activeUserId={props.activeUserId}
            users={props.users}
            accountsFdrs={props.accountsFdrs || []}
            aolBranches={props.aolBranches || []}
            paymentBanks={props.paymentBanks || []}
            onAddAccountsFdr={props.onAddAccountsFdr || (() => {})}
            onUpdateAccountsFdr={props.onUpdateAccountsFdr || (() => {})}
            onDeleteAccountsFdr={props.onDeleteAccountsFdr || (() => {})}
            canAdd={getSubTabAdd("fdr")}
            canEdit={getSubTabEdit("fdr")}
          />
        )}
        {activeSubTab === "csd_isd" && (
          <AccountsCsdIsdSubView
            activeUserId={props.activeUserId}
            users={props.users}
            accountsCsdIsds={props.accountsCsdIsds || []}
            aolBranches={props.aolBranches || []}
            onAddAccountsCsdIsd={props.onAddAccountsCsdIsd || (() => {})}
            onUpdateAccountsCsdIsd={props.onUpdateAccountsCsdIsd || (() => {})}
            onDeleteAccountsCsdIsd={props.onDeleteAccountsCsdIsd || (() => {})}
            canAdd={getSubTabAdd("csd_isd")}
            canEdit={getSubTabEdit("csd_isd")}
          />
        )}
        {activeSubTab === "tpt_s" && (
          <AccountsTptSSubView
            activeUserId={props.activeUserId}
            users={props.users}
            accountsTpts={props.accountsTpts || []}
            accountsSales={props.accountsSales || []}
            transporters={props.transporters || []}
            tptdCategories={props.tptdCategories || []}
            aolBranches={props.aolBranches || []}
            onAddAccountsTptS={props.onAddAccountsTptS || (() => {})}
            onUpdateAccountsTptS={props.onUpdateAccountsTptS || (() => {})}
            onDeleteAccountsTptS={props.onDeleteAccountsTptS || (() => {})}
            canAdd={getSubTabAdd("tpt_s")}
            canEdit={getSubTabEdit("tpt_s")}
          />
        )}
        {activeSubTab === "tpt_st" && (
          <AccountsTptStSubView
            activeUserId={props.activeUserId}
            users={props.users}
            accountsTptSts={props.accountsTptSts || []}
            accountsSts={props.accountsSts || []}
            transporters={props.transporters || []}
            tptdCategories={props.tptdCategories || []}
            aolBranches={props.aolBranches || []}
            onAddAccountsTptSt={props.onAddAccountsTptSt || (() => {})}
            onUpdateAccountsTptSt={props.onUpdateAccountsTptSt || (() => {})}
            onDeleteAccountsTptSt={props.onDeleteAccountsTptSt || (() => {})}
            canAdd={getSubTabAdd("tpt_st")}
            canEdit={getSubTabEdit("tpt_st")}
          />
        )}
        {activeSubTab === "supplier_cr_dr" && (
          <AccountsSupplierCrDrSubView
            activeUserId={props.activeUserId}
            users={props.users}
            accountsSupplierCrDrs={props.accountsSupplierCrDrs || []}
            ledgerCrDrs={props.ledgerCrDrs || []}
            aolGodowns={props.aolGodowns || []}
            aolBranches={props.aolBranches || []}
            pids={props.pids || []}
            onAddAccountsSupplierCrDr={props.onAddAccountsSupplierCrDr || (() => {})}
            onUpdateAccountsSupplierCrDr={props.onUpdateAccountsSupplierCrDr || (() => {})}
            onDeleteAccountsSupplierCrDr={props.onDeleteAccountsSupplierCrDr || (() => {})}
            canAdd={props.canAddSupplierCrDr ?? getSubTabAdd("supplier_cr_dr")}
            canEdit={props.canEditSupplierCrDr ?? getSubTabEdit("supplier_cr_dr")}
          />
        )}
        {activeSubTab === "customer_cr_dr" && (
          <AccountsCustomerCrDrSubView
            activeUserId={props.activeUserId}
            users={props.users}
            accountsCustomerCrDrs={props.accountsCustomerCrDrs || []}
            sales={props.accountsSales || []}
            ledgerCrDrs={props.ledgerCrDrs || []}
            aolGodowns={props.aolGodowns || []}
            aolBranches={props.aolBranches || []}
            onAddAccountsCustomerCrDr={props.onAddAccountsCustomerCrDr || (() => {})}
            onUpdateAccountsCustomerCrDr={props.onUpdateAccountsCustomerCrDr || (() => {})}
            onDeleteAccountsCustomerCrDr={props.onDeleteAccountsCustomerCrDr || (() => {})}
            canAdd={props.canAddCustomerCrDr ?? getSubTabAdd("customer_cr_dr")}
            canEdit={props.canEditCustomerCrDr ?? getSubTabEdit("customer_cr_dr")}
          />
        )}
      </div>
    </div>
  );
}

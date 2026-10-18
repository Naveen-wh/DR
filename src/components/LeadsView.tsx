/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { User, SalesLead, ProjectWorkflow, Client, Team, Product, AolBranchName, SupplierName, ImportClearingRecord, ImportBoeRecord, ImportContainerRecord, ClearingCat, ImportPiRecord, ImportTptiRecord, TptdCategory } from "../types";
import ImportProcurementSubView from "./ImportProcurementSubView";
import ImportClearingSubView from "./ImportClearingSubView";
import ImportPaymentsSubView from "./ImportPaymentsSubView";
import ImportTptiSubView from "./ImportTptiSubView";
import ImportReportsSubView from "./ImportReportsSubView";
import { Coins, ShieldAlert, Award, FileText, Landmark, Truck } from "lucide-react";

interface LeadsViewProps {
  activeUserId: string;
  users: User[];
  leads: SalesLead[];
  workflows: ProjectWorkflow[];
  products?: Product[];
  clients?: Client[];
  teams?: Team[];
  onAddLead: (lead: Omit<SalesLead, "id" | "createdAt">) => void;
  onEditLead: (lead: SalesLead) => void;
  onDeleteLead: (leadId: string) => void;
  onAddClient?: (clientData: Omit<Client, "id" | "createdAt">) => void;
  aolBranches?: AolBranchName[];
  suppliers?: SupplierName[];
  importClearings?: ImportClearingRecord[];
  importProvisionalClearings?: ImportClearingRecord[];
  importBoes?: ImportBoeRecord[];
  importContainers?: ImportContainerRecord[];
  clearingCats?: ClearingCat[];
  onAddImportClearing?: (record: Omit<ImportClearingRecord, "id" | "createdAt">) => void;
  onUpdateImportClearing?: (record: ImportClearingRecord) => void;
  onDeleteImportClearing?: (id: string) => void;
  importPis?: ImportPiRecord[];
  importTptis?: ImportTptiRecord[];
  tptdCategories?: TptdCategory[];
  onAddImportTpti?: (record: Omit<ImportTptiRecord, "id" | "createdAt">) => void;
  onUpdateImportTpti?: (record: ImportTptiRecord) => void;
  onDeleteImportTpti?: (id: string) => void;
  onAddTptdCategory?: (data: Omit<TptdCategory, "id" | "createdAt">) => void;
  visibleSubTabs?: { [key: string]: string[] };
}

type ImportSubTab = "procurement" | "clearing" | "payments" | "tpti" | "reports";

export default function LeadsView(props: LeadsViewProps) {
  const subTabs = [
    { id: "procurement", label: "procurement", icon: Coins },
    { id: "clearing", label: "Clearing", icon: ShieldAlert },
    { id: "payments", label: "Payments", icon: Landmark },
    { id: "tpti", label: "TPT-I", icon: Truck },
    { id: "reports", label: "Reports", icon: FileText },
  ] as const;

  const allowedSubTabs = props.visibleSubTabs?.["leads"] || subTabs.map((s) => s.id);
  const filteredSubTabs = subTabs.filter((s) => allowedSubTabs.includes(s.id));

  const [activeSubTab, setActiveSubTab] = useState<ImportSubTab>(
    (filteredSubTabs[0]?.id as ImportSubTab) || "procurement"
  );

  React.useEffect(() => {
    if (filteredSubTabs.length > 0 && !filteredSubTabs.some((t) => t.id === activeSubTab)) {
      setActiveSubTab(filteredSubTabs[0].id as ImportSubTab);
    }
  }, [filteredSubTabs, activeSubTab]);

  return (
    <div className="flex flex-col gap-4">
      {/* Sub-tabs bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-1.5 flex flex-wrap items-center gap-1 shrink-0 shadow-sm">
        {filteredSubTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold tracking-wider uppercase transition-all duration-200 ${
                isActive
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              <Icon size={12} className={isActive ? "text-emerald-400" : "text-slate-400"} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Render selected Sub-view */}
      <div className="transition-opacity duration-200">
        {activeSubTab === "procurement" && <ImportProcurementSubView {...props} />}
        {activeSubTab === "clearing" && (
          <ImportClearingSubView
            activeUserId={props.activeUserId}
            users={props.users}
            importClearings={props.importClearings || []}
            importProvisionalClearings={props.importProvisionalClearings || []}
            importBoes={props.importBoes || []}
            importContainers={props.importContainers || []}
            clearingCats={props.clearingCats || []}
            aolBranches={props.aolBranches || []}
            onAddImportClearing={props.onAddImportClearing || (() => {})}
            onUpdateImportClearing={props.onUpdateImportClearing || (() => {})}
            onDeleteImportClearing={props.onDeleteImportClearing || (() => {})}
          />
        )}
        {activeSubTab === "payments" && <ImportPaymentsSubView {...props} />}
        {activeSubTab === "tpti" && (
          <ImportTptiSubView
            activeUserId={props.activeUserId}
            users={props.users}
            importPis={props.importPis || []}
            importBoes={props.importBoes || []}
            importTptis={props.importTptis || []}
            tptdCategories={props.tptdCategories || []}
            onAddImportTpti={props.onAddImportTpti || (() => {})}
            onUpdateImportTpti={props.onUpdateImportTpti || (() => {})}
            onDeleteImportTpti={props.onDeleteImportTpti || (() => {})}
            onAddTptdCategory={props.onAddTptdCategory}
          />
        )}
        {activeSubTab === "reports" && <ImportReportsSubView {...props} />}
      </div>
    </div>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { User, SalesLead, ProjectWorkflow, Client, Team, Product, DomesticTptdRecord, TptdCategory, DomesticPdRecord } from "../../types";
import DomesticProcurementSubView from "./DomesticProcurementSubView";
import DomesticPaymentsSubView from "./DomesticPaymentsSubView";
import DomesticTptdSubView from "./DomesticTptdSubView";
import DomesticReportsSubView from "./DomesticReportsSubView";
import { Coins, ShieldAlert, Landmark, Truck, FileText } from "lucide-react";

interface DomesticProcurementViewProps {
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

  // Optional TPT-D props for subtab rendering
  domesticTptds?: DomesticTptdRecord[];
  tptdCategories?: TptdCategory[];
  domesticPds?: DomesticPdRecord[];
  onAddDomesticTptd?: (record: Omit<DomesticTptdRecord, "id" | "createdAt">) => void;
  onUpdateDomesticTptd?: (record: DomesticTptdRecord) => void;
  onDeleteDomesticTptd?: (id: string) => void;
  onAddTptdCategory?: (data: Omit<TptdCategory, "id" | "createdAt">) => void;
}

type DomesticSubTab = "procurement" | "payments" | "tptd" | "reports";

export default function DomesticProcurementView(props: DomesticProcurementViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<DomesticSubTab>("procurement");

  const subTabs = [
    { id: "procurement", label: "procurement", icon: Coins },
    { id: "payments", label: "Payments", icon: Landmark },
    { id: "tptd", label: "TPT-D", icon: Truck },
    { id: "reports", label: "Reports", icon: FileText },
  ] as const;

  return (
    <div className="flex flex-col gap-4">
      {/* Sub-tabs bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-1.5 flex flex-wrap items-center gap-1 shrink-0 shadow-sm">
        {subTabs.map((tab) => {
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
        {activeSubTab === "procurement" && <DomesticProcurementSubView {...props} />}
        {activeSubTab === "payments" && <DomesticPaymentsSubView {...props} />}
        {activeSubTab === "tptd" && (
          <DomesticTptdSubView
            activeUserId={props.activeUserId}
            users={props.users}
            domesticPds={props.domesticPds || []}
            domesticTptds={props.domesticTptds || []}
            tptdCategories={props.tptdCategories || []}
            onAddDomesticTptd={props.onAddDomesticTptd || (() => {})}
            onUpdateDomesticTptd={props.onUpdateDomesticTptd || (() => {})}
            onDeleteDomesticTptd={props.onDeleteDomesticTptd || (() => {})}
            onAddTptdCategory={props.onAddTptdCategory}
          />
        )}
        {activeSubTab === "reports" && <DomesticReportsSubView {...props} />}
      </div>
    </div>
  );
}

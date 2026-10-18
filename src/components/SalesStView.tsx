/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { User, SalesLead, ProjectWorkflow, Client, Team, Product } from "../types";
import SalesStSalesSubView from "./SalesStSalesSubView";
import SalesStStockTransferSubView from "./SalesStStockTransferSubView";
import SalesStReportsSubView from "./SalesStReportsSubView";
import { Coins, ArrowLeftRight, FileText } from "lucide-react";

interface SalesStViewProps {
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
}

type SalesStSubTab = "sales" | "st" | "reports";

export default function SalesStView(props: SalesStViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<SalesStSubTab>("sales");

  const subTabs = [
    { id: "sales", label: "Sales", icon: Coins },
    { id: "st", label: "Stock transfer (ST)", icon: ArrowLeftRight },
    { id: "reports", label: "Report", icon: FileText },
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
        {activeSubTab === "sales" && <SalesStSalesSubView {...props} />}
        {activeSubTab === "st" && <SalesStStockTransferSubView {...props} />}
        {activeSubTab === "reports" && <SalesStReportsSubView {...props} />}
      </div>
    </div>
  );
}

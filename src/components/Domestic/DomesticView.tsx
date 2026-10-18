/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { User, AolBranchName, SupplierName, Product, Client, AolGodown, DomesticSupplierName, ShipToParty, DomesticPdRecord, DomesticTptdRecord, TptdCategory } from "../../types";
import DomesticPdSubView from "./DomesticPdSubView";
import DomesticTptdSubView from "./DomesticTptdSubView";
import { Briefcase, FileText } from "lucide-react";

interface DomesticViewProps {
  activeUserId: string;
  users: User[];
  domesticPds?: DomesticPdRecord[];
  aolBranches?: AolBranchName[];
  aolGodowns?: AolGodown[];
  domesticSuppliers?: DomesticSupplierName[];
  shipToParties?: ShipToParty[];
  clients?: Client[];
  products?: Product[];
  onAddDomesticPd: (record: Omit<DomesticPdRecord, "id" | "createdAt">) => void;
  onUpdateDomesticPd: (record: DomesticPdRecord) => void;
  onDeleteDomesticPd: (id: string) => void;
  onAddAolGodown?: (data: Omit<AolGodown, "id" | "createdAt">) => void;
  onAddDomesticSupplier?: (data: Omit<DomesticSupplierName, "id" | "createdAt">) => void;
  onAddShipToParty?: (data: Omit<ShipToParty, "id" | "createdAt">) => void;
  onAddClient?: (data: Omit<Client, "id" | "createdAt">) => void;

  // TPT-D properties
  domesticTptds?: DomesticTptdRecord[];
  tptdCategories?: TptdCategory[];
  onAddDomesticTptd: (record: Omit<DomesticTptdRecord, "id" | "createdAt">) => void;
  onUpdateDomesticTptd: (record: DomesticTptdRecord) => void;
  onDeleteDomesticTptd: (id: string) => void;
  onAddTptdCategory?: (data: Omit<TptdCategory, "id" | "createdAt">) => void;
  visibleSubTabs?: { [key: string]: string[] };
  getTabPermission?: (tabId: string, permissionType: "view" | "add" | "edit") => boolean;
}

type DomesticSubTab = "pd" | "tptd";

export default function DomesticView(props: DomesticViewProps) {
  const getSubTabAdd = (subId: string) => props.getTabPermission ? props.getTabPermission(`domestic_tab/${subId}`, "add") : true;
  const getSubTabEdit = (subId: string) => props.getTabPermission ? props.getTabPermission(`domestic_tab/${subId}`, "edit") : true;

  const subTabs = [
    { id: "pd" as const, label: "PD", icon: FileText },
    { id: "tptd" as const, label: "TPT-D", icon: FileText },
  ];

  const allowedSubTabs = props.visibleSubTabs?.["domestic_tab"] || subTabs.map((s) => s.id);
  const filteredSubTabs = subTabs.filter((s) => allowedSubTabs.includes(s.id));

  const [activeSubTab, setActiveSubTab] = useState<DomesticSubTab>(
    (filteredSubTabs[0]?.id as DomesticSubTab) || "pd"
  );

  React.useEffect(() => {
    if (filteredSubTabs.length > 0 && !filteredSubTabs.some((t) => t.id === activeSubTab)) {
      setActiveSubTab(filteredSubTabs[0].id as DomesticSubTab);
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
        {activeSubTab === "pd" && <DomesticPdSubView {...props} canAdd={getSubTabAdd("pd")} canEdit={getSubTabEdit("pd")} />}
        {activeSubTab === "tptd" && <DomesticTptdSubView {...props} canAdd={getSubTabAdd("tptd")} canEdit={getSubTabEdit("tptd")} />}
      </div>
    </div>
  );
}

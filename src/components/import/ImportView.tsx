/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * @This is important page for Import sub-tabs
 */

import React, { useState } from "react";
import { User, AolBranchName, SupplierName, Product, ImportPiRecord, ImportLcRecord, ImportEtaRecord, ImportBoeRecord, ImportContainerRecord, ImportClearingRecord, ClearingCat, ImportDrcRecord, ImportTptiRecord, ImportCiRecord, AolGodown, TptdCategory, DrcBankChargesType, DrcBankCharges1, PaymentBank, FreightTerm } from "../types";
import ImportPiSubView from "./importSubView/ImportPiSubView";
import ImportLcSubView from "./importSubView/ImportLcSubView";
import ImportEtaSubView from "./importSubView/ImportEtaSubView";
import ImportBoeSubView from "./importSubView/ImportBoeSubView";
import ImportContainerSubView from "./importSubView/ImportContainerSubView";
import ImportIgmSubView from "./importSubView/ImportIgmSubView";
import ImportDeferredDutySubView from "./importSubView/ImportDeferredDutySubView";
import ImportClearingSubView from "./importSubView/ImportClearingSubView";
import ImportDrcSubView from "./importSubView/ImportDrcSubView";
import ImportTptiSubView from "./importSubView/ImportTptiSubView";
import ImportCiSubView from "./importSubView/ImportCiSubView";
import ImportBoeCnSubView from "./importSubView/ImportBoeCnSubView";
import { FileText, Landmark, Clock, Receipt, Container, FileCheck, ShieldAlert, Building2, Coins, FileSpreadsheet, Layers } from "lucide-react";

interface ImportViewProps {
  activeUserId: string;
  users: User[];
  importPis: ImportPiRecord[];
  importLcs: ImportLcRecord[];
  importEtas: ImportEtaRecord[];
  importBoes?: ImportBoeRecord[];
  importContainers?: ImportContainerRecord[];
  importClearings?: ImportClearingRecord[];
  importProvisionalClearings?: ImportClearingRecord[];
  importDrcs?: ImportDrcRecord[];
  importTptis?: ImportTptiRecord[];
  importCis?: ImportCiRecord[];
  aolGodowns?: AolGodown[];
  tptdCategories?: TptdCategory[];
  clearingCats?: ClearingCat[];
  aolBranches?: AolBranchName[];
  suppliers?: SupplierName[];
  paymentBanks?: PaymentBank[];
  freightTerms?: FreightTerm[];
  drcBankChargesTypes?: DrcBankChargesType[];
  drcBankCharges1List?: DrcBankCharges1[];
  products?: Product[];
  onAddImportPi: (record: Omit<ImportPiRecord, "id" | "createdAt">) => void;
  onUpdateImportPi: (record: ImportPiRecord) => void;
  onDeleteImportPi: (id: string) => void;
  onAddImportLc: (record: Omit<ImportLcRecord, "id" | "createdAt">) => void;
  onUpdateImportLc: (record: ImportLcRecord) => void;
  onDeleteImportLc: (id: string) => void;
  onAddImportEta: (record: Omit<ImportEtaRecord, "id" | "createdAt">) => void;
  onUpdateImportEta: (record: ImportEtaRecord) => void;
  onDeleteImportEta: (id: string) => void;
  onAddImportBoe?: (record: Omit<ImportBoeRecord, "id" | "createdAt">) => void;
  onUpdateImportBoe?: (record: ImportBoeRecord) => void;
  onDeleteImportBoe?: (id: string) => void;
  onAddImportContainer?: (record: Omit<ImportContainerRecord, "id" | "createdAt">) => void;
  onUpdateImportContainer?: (record: ImportContainerRecord) => void;
  onDeleteImportContainer?: (id: string) => void;
  onAddImportClearing?: (record: Omit<ImportClearingRecord, "id" | "createdAt">) => void;
  onUpdateImportClearing?: (record: ImportClearingRecord) => void;
  onDeleteImportClearing?: (id: string) => void;
  onAddImportDrc?: (record: Omit<ImportDrcRecord, "id" | "createdAt">) => void;
  onUpdateImportDrc?: (record: ImportDrcRecord) => void;
  onDeleteImportDrc?: (id: string) => void;
  onAddImportTpti?: (record: Omit<ImportTptiRecord, "id" | "createdAt">) => void;
  onUpdateImportTpti?: (record: ImportTptiRecord) => void;
  onDeleteImportTpti?: (id: string) => void;
  onAddImportCi?: (record: Omit<ImportCiRecord, "id" | "createdAt">) => void;
  onUpdateImportCi?: (record: ImportCiRecord) => void;
  onDeleteImportCi?: (id: string) => void;
  onAddTptdCategory?: (data: Omit<TptdCategory, "id" | "createdAt">) => void;
  visibleSubTabs?: { [key: string]: string[] };
  getTabPermission?: (tabId: string, permissionType: "view" | "add" | "edit") => boolean;
}

type ImportTabSubView = "pi" | "lc" | "eta" | "boe" | "containers" | "boe_cn" | "clearing" | "drc" | "ci" | "igm" | "deferred_duty" | "tpti";

export default function ImportView(props: ImportViewProps) {
  const getSubTabAdd = (subId: string) => props.getTabPermission ? props.getTabPermission(`import_module/${subId}`, "add") : true;
  const getSubTabEdit = (subId: string) => props.getTabPermission ? props.getTabPermission(`import_module/${subId}`, "edit") : true;

 {/* What it does: An array defining all 12 import module stages in chronological order, associating each tab's unique id with its display label and icon 
  chnaging the order chnage its possition in UI
  */}
  const subTabs = [
    { id: "boe_cn" as const, label: "BOE_CN", icon: Layers },
    { id: "pi" as const, label: "PI", icon: FileText },
    { id: "lc" as const, label: "LC", icon: Landmark },
    { id: "eta" as const, label: "ETA", icon: Clock },
    { id: "boe" as const, label: "BOE", icon: Receipt },
    { id: "containers" as const, label: "Containers", icon: Container },
    { id: "igm" as const, label: "IGM & Item", icon: FileCheck },
    { id: "deferred_duty" as const, label: "Deferred Duty", icon: ShieldAlert },
    { id: "tpti" as const, label: "TPT-I", icon: Coins },
    { id: "clearing" as const, label: "Clearing", icon: Building2 },
    { id: "drc" as const, label: "DRC", icon: Coins },
    { id: "ci" as const, label: "IP", icon: FileSpreadsheet },
  ];

  const allowedSubTabs = props.visibleSubTabs?.["import_module"] || subTabs.map((s) => s.id);
  const filteredSubTabs = subTabs.filter((s) => allowedSubTabs.includes(s.id));

  const [activeSubTab, setActiveSubTab] = useState<ImportTabSubView>(
    (filteredSubTabs[0]?.id as ImportTabSubView) || "pi"
  );

  React.useEffect(() => {
    if (filteredSubTabs.length > 0 && !filteredSubTabs.some((t) => t.id === activeSubTab)) {
      setActiveSubTab(filteredSubTabs[0].id as ImportTabSubView);
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
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-[11px] font-bold tracking-wider uppercase transition-all duration-200 cursor-pointer ${
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
        {activeSubTab === "pi" && <ImportPiSubView {...props} canAdd={getSubTabAdd("pi")} canEdit={getSubTabEdit("pi")} />}
        {activeSubTab === "lc" && <ImportLcSubView {...props} canAdd={getSubTabAdd("lc")} canEdit={getSubTabEdit("lc")} />}
        {activeSubTab === "eta" && <ImportEtaSubView {...props} canAdd={getSubTabAdd("eta")} canEdit={getSubTabEdit("eta")} />}
        {activeSubTab === "boe" && (
          <ImportBoeSubView
            activeUserId={props.activeUserId}
            users={props.users}
            importPis={props.importPis}
            importBoes={props.importBoes || []}
            importContainers={props.importContainers || []}
            aolBranches={props.aolBranches}
            suppliers={props.suppliers}
            products={props.products}
            freightTerms={props.freightTerms}
            onAddImportBoe={props.onAddImportBoe || (() => {})}
            onUpdateImportBoe={props.onUpdateImportBoe || (() => {})}
            onDeleteImportBoe={props.onDeleteImportBoe || (() => {})}
            canAdd={getSubTabAdd("boe")}
            canEdit={getSubTabEdit("boe")}
          />
        )}
        {activeSubTab === "containers" && (
          <ImportContainerSubView
            activeUserId={props.activeUserId}
            users={props.users}
            importPis={props.importPis || []}
            importBoes={props.importBoes || []}
            importContainers={props.importContainers || []}
            onAddImportContainer={props.onAddImportContainer || (() => {})}
            onUpdateImportContainer={props.onUpdateImportContainer || (() => {})}
            onDeleteImportContainer={props.onDeleteImportContainer || (() => {})}
            canAdd={getSubTabAdd("containers")}
            canEdit={getSubTabEdit("containers")}
          />
        )}
        {activeSubTab === "boe_cn" && (
          <ImportBoeCnSubView
            activeUserId={props.activeUserId}
            users={props.users}
            importContainers={props.importContainers || []}
            importBoes={props.importBoes || []}
            importPis={props.importPis || []}
            aolBranches={props.aolBranches}
            suppliers={props.suppliers}
            products={props.products}
            onUpdateImportContainer={props.onUpdateImportContainer}
            onUpdateImportBoe={props.onUpdateImportBoe}
            canEdit={getSubTabEdit("boe_cn")}
          />
        )}
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
            canAdd={getSubTabAdd("clearing")}
            canEdit={getSubTabEdit("clearing")}
          />
        )}
        {activeSubTab === "drc" && (
          <ImportDrcSubView
            activeUserId={props.activeUserId}
            users={props.users}
            importDrcs={props.importDrcs || []}
            importPis={props.importPis || []}
            importLcs={props.importLcs || []}
            aolBranches={props.aolBranches || []}
            suppliers={props.suppliers || []}
            paymentBanks={props.paymentBanks || []}
            drcBankChargesTypes={props.drcBankChargesTypes || []}
            drcBankCharges1List={props.drcBankCharges1List || []}
            onAddImportDrc={props.onAddImportDrc || (() => {})}
            onUpdateImportDrc={props.onUpdateImportDrc || (() => {})}
            onDeleteImportDrc={props.onDeleteImportDrc || (() => {})}
            canAdd={getSubTabAdd("drc")}
            canEdit={getSubTabEdit("drc")}
          />
        )}
        {activeSubTab === "ci" && (
          <ImportCiSubView
            activeUserId={props.activeUserId}
            users={props.users}
            importCis={props.importCis || []}
            importPis={props.importPis || []}
            importBoes={props.importBoes || []}
            importContainers={props.importContainers || []}
            aolGodowns={props.aolGodowns || []}
            onAddImportCi={props.onAddImportCi || (() => {})}
            onUpdateImportCi={props.onUpdateImportCi || (() => {})}
            onDeleteImportCi={props.onDeleteImportCi || (() => {})}
            canAdd={getSubTabAdd("ci")}
            canEdit={getSubTabEdit("ci")}
          />
        )}
        {activeSubTab === "igm" && (
          <ImportIgmSubView
            activeUserId={props.activeUserId}
            users={props.users}
            importBoes={props.importBoes || []}
            importContainers={props.importContainers || []}
            onUpdateImportContainer={props.onUpdateImportContainer || (() => {})}
            aolBranches={props.aolBranches}
            canAdd={getSubTabAdd("igm")}
            canEdit={getSubTabEdit("igm")}
          />
        )}
        {activeSubTab === "deferred_duty" && (
          <ImportDeferredDutySubView
            activeUserId={props.activeUserId}
            users={props.users}
            importBoes={props.importBoes || []}
            importPis={props.importPis || []}
            onAddImportBoe={props.onAddImportBoe}
            onUpdateImportBoe={props.onUpdateImportBoe || (() => {})}
            aolBranches={props.aolBranches}
            canAdd={getSubTabAdd("deferred_duty")}
            canEdit={getSubTabEdit("deferred_duty")}
          />
        )}
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
            canAdd={getSubTabAdd("tpti")}
            canEdit={getSubTabEdit("tpti")}
          />
        )}
      </div>
    </div>
  );
}

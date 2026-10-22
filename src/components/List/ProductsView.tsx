/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { User, Role, Product, Team, ProductCategory, ProductGroup, Manufacturer, AccessLevel } from "../../types";
import { canEditProduct, canDeleteProduct } from "../../data";
import ProductBulkImportModal from "../Configuration/ProductBulkImportModal";
import {
  Plus,
  Trash2,
  X,
  Search,
  Package,
  Building2,
  Layers,
  Cpu,
  Tag,
  Edit2,
  SlidersHorizontal,
  Bookmark,
  Upload,
  FileSpreadsheet,
  Hash
} from "lucide-react";

interface ProductsViewProps {
  activeUserId: string;
  users: User[];
  products: Product[];
  teams: Team[];
  categories: ProductCategory[];
  groups: ProductGroup[];
  manufacturers: Manufacturer[];
  onAddProduct: (product: Omit<Product, "id" | "createdAt" | "createdByUserId">) => void;
  onEditProduct: (productId: string, product: Partial<Omit<Product, "id" | "createdAt" | "createdByUserId">>) => void;
  onBulkAddProducts?: (products: (Omit<Product, "id" | "createdAt" | "createdByUserId"> & { id?: string })[]) => Promise<void> | void;
  onDeleteProduct: (productId: string) => void;
  onAddCategory: (data: Omit<ProductCategory, "id" | "createdAt">) => void;
  onDeleteCategory: (id: string) => void;
  onAddGroup: (data: Omit<ProductGroup, "id" | "createdAt">) => void;
  onDeleteGroup: (id: string) => void;
  onAddManufacturer: (data: Omit<Manufacturer, "id" | "createdAt">) => void;
  onDeleteManufacturer: (id: string) => void;
  visibleSubSubTabs?: string[];
}

export default function ProductsView({
  activeUserId,
  users,
  products = [],
  teams = [],
  categories = [],
  groups = [],
  manufacturers = [],
  onAddProduct,
  onEditProduct,
  onBulkAddProducts,
  onDeleteProduct,
  onAddCategory,
  onDeleteCategory,
  onAddGroup,
  onDeleteGroup,
  onAddManufacturer,
  onDeleteManufacturer,
  visibleSubSubTabs,
}: ProductsViewProps) {
  const activeUser = users.find((u) => u.id === activeUserId) || users[0];
  const isExecutive = activeUser.teamName === "Executive" || activeUser.role === Role.Admin;

  const allSubSubTabs = [
    { id: "products_list", label: "Products" },
    { id: "products_dropdown", label: "Products Dropdown" },
  ];

  const filteredSubSubTabs = allSubSubTabs.filter(t => 
    !visibleSubSubTabs || visibleSubSubTabs.includes(t.id)
  );

  const [activeSubTab, setActiveSubTab] = useState<string>(filteredSubSubTabs[0]?.id || "products_list");

  // Keep activeSubTab in sync if permissions change
  useEffect(() => {
    if (filteredSubSubTabs.length > 0 && !filteredSubSubTabs.some(t => t.id === activeSubTab)) {
      setActiveSubTab(filteredSubSubTabs[0].id);
    }
  }, [filteredSubSubTabs, activeSubTab]);

  // Search & Filters state
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [teamFilter, setTeamFilter] = useState("All");

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Add Product form fields
  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState("");
  const [group, setGroup] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [hsnCode, setHsnCode] = useState("");
  const [productTeam, setProductTeam] = useState(isExecutive ? "" : activeUser.teamName);

  // Edit Product form fields
  const [editProductName, setEditProductName] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editGroup, setEditGroup] = useState("");
  const [editManufacturer, setEditManufacturer] = useState("");
  const [editHsnCode, setEditHsnCode] = useState("");
  const [editProductTeam, setEditProductTeam] = useState("");

  // ----------------------------------------------------
  // FILTER PRODUCTS (TEAM SEGREGATION)
  // ----------------------------------------------------
  const filteredProducts = products.filter((p) => {
    // 1. Team Segregation:
    // Non-Executive/Non-Admin users can only view products belonging to their own team
    if (!isExecutive && p.teamName && p.teamName !== activeUser.teamName) {
      return false;
    }

    // 2. Search filtering
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.group.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.manufacturer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.hsnCode && p.hsnCode.toLowerCase().includes(searchTerm.toLowerCase()));

    // 3. Category filter
    const matchesCategory = categoryFilter === "All" || p.category === categoryFilter;

    // 4. Team filter
    const matchesTeam = teamFilter === "All" || p.teamName === teamFilter;

    return matchesSearch && matchesCategory && matchesTeam;
  });

  // Extract unique categories for filter dropdown
  const uniqueCategories = Array.from(new Set(products.map((p) => p.category))).filter(Boolean);

  // ----------------------------------------------------
  // SUBMIT HANDLERS
  // ----------------------------------------------------
  const handleOpenAdd = () => {
    setProductName("");
    setCategory("");
    setGroup("");
    setManufacturer("");
    setHsnCode("");
    setProductTeam(isExecutive ? "" : activeUser.teamName);
    setIsAddOpen(true);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName.trim() || !category.trim() || !group.trim() || !manufacturer.trim()) {
      alert("Please fill in all required fields.");
      return;
    }

    onAddProduct({
      name: productName.trim(),
      category: category.trim(),
      group: group.trim(),
      manufacturer: manufacturer.trim(),
      hsnCode: hsnCode.trim() || undefined,
      teamName: isExecutive ? (productTeam || undefined) : (activeUser.teamName || undefined),
    });

    setIsAddOpen(false);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setEditProductName(p.name);
    setEditCategory(p.category);
    setEditGroup(p.group);
    setEditManufacturer(p.manufacturer);
    setEditHsnCode(p.hsnCode || "");
    setEditProductTeam(p.teamName || "");
    setIsEditOpen(true);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    if (!editProductName.trim() || !editCategory.trim() || !editGroup.trim() || !editManufacturer.trim()) {
      alert("Please fill in all required fields.");
      return;
    }

    onEditProduct(editingProduct.id, {
      name: editProductName.trim(),
      category: editCategory.trim(),
      group: editGroup.trim(),
      manufacturer: editManufacturer.trim(),
      hsnCode: editHsnCode.trim() || undefined,
      teamName: isExecutive ? (editProductTeam || undefined) : (activeUser.teamName || undefined),
    });

    setIsEditOpen(false);
    setEditingProduct(null);
  };

  const handleDelete = (pId: string) => {
    if (confirm("Are you sure you want to delete this product?")) {
      onDeleteProduct(pId);
    }
  };

  return (
    <div id="products-catalog-container" className="flex flex-col gap-4">
      {/* Sub-tab selection */}
      <div className="flex gap-2 border-b border-slate-200 overflow-x-auto whitespace-nowrap pb-0.5 scrollbar-thin">
        {filteredSubSubTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`text-xs font-bold px-3 py-1.5 cursor-pointer transition-all ${
              activeSubTab === tab.id ? "border-b-2 border-emerald-600 text-emerald-600" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filteredSubSubTabs.length === 0 ? (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl text-center font-medium text-xs font-mono">
          ⚠️ ACCESS RESTRICTED: No product catalog features are enabled for your team workspace.
        </div>
      ) : activeSubTab === "products_list" ? (
        <>
          {/* Overview stats ribbon */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-3xs flex items-center gap-3">
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
            <Package size={18} />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium font-mono uppercase">Total Products</div>
            <div className="text-lg font-bold text-slate-800 leading-none mt-1">
              {products.length}
            </div>
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-3xs flex items-center gap-3">
          <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
            <Tag size={18} />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium font-mono uppercase">Categories</div>
            <div className="text-lg font-bold text-slate-800 leading-none mt-1">
              {uniqueCategories.length}
            </div>
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-3xs flex items-center gap-3">
          <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
            <Layers size={18} />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium font-mono uppercase">Your Team Access</div>
            <div className="text-sm font-semibold text-slate-800 mt-1 leading-none truncate max-w-[180px]">
              {activeUser.teamName || "Unassigned"}
            </div>
          </div>
        </div>
      </div>

      {/* Control bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-3xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-1 flex-col sm:flex-row gap-2">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
            <input
              type="text"
              placeholder="Search products by name, category, manufacturer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 placeholder-slate-400"
            />
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs border border-slate-200 bg-slate-50 rounded-lg px-2 py-1.5 text-slate-600 outline-none cursor-pointer focus:ring-1 focus:ring-emerald-500"
          >
            <option value="All">All Categories</option>
            {uniqueCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {/* Team Filter - Only visible for Executive / Admin */}
          {isExecutive && (
            <select
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              className="text-xs border border-slate-200 bg-slate-50 rounded-lg px-2 py-1.5 text-slate-600 outline-none cursor-pointer focus:ring-1 focus:ring-emerald-500"
            >
              <option value="All">All Teams</option>
              {teams.map((t) => (
                <option key={t.id} value={t.name}>
                  {t.name}
                </option>
              ))}
              <option value="">Unassigned</option>
            </select>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsBulkImportOpen(true)}
            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-3xs cursor-pointer shrink-0"
          >
            <Upload size={14} /> Import Products
          </button>
          <button
            onClick={handleOpenAdd}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer shrink-0"
          >
            <Plus size={14} /> Add Product
          </button>
        </div>
      </div>

      {/* Product list */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-100 text-[10px] uppercase font-bold font-mono tracking-wider text-slate-400">
                <th className="py-2.5 px-4">Product Name</th>
                <th className="py-2.5 px-3">HSN Code</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Product Group</th>
                <th className="py-2.5 px-3">Manufacturer</th>
                <th className="py-2.5 px-3">Authorized Team Segregation</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Package size={32} className="text-slate-300 stroke-[1.5]" />
                      <p className="text-sm text-slate-500 font-semibold">No products found</p>
                      <p className="text-[10px] text-slate-400 max-w-[280px]">
                        {searchTerm || categoryFilter !== "All" || teamFilter !== "All"
                          ? "Adjust your filters or query text to find matches."
                          : "No products exist inside this team segment. Create one above."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/40 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-800">
                      <div className="flex items-center gap-2">
                        <div className="p-1 bg-slate-100 rounded text-slate-500">
                          <Cpu size={13} />
                        </div>
                        {p.name}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      {p.hsnCode ? (
                        <span className="bg-slate-100 border border-slate-200 text-slate-800 font-mono text-[11px] font-bold px-2 py-0.5 rounded">
                          {p.hsnCode}
                        </span>
                      ) : (
                        <span className="text-slate-300 text-[11px] italic font-mono">-</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className="bg-slate-100 text-slate-600 font-mono text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {p.category}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-slate-500 font-medium">{p.group}</span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Building2 size={12} className="text-slate-400" />
                        {p.manufacturer}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-lg ${
                          p.teamName === "Executive"
                            ? "bg-purple-50 text-purple-600 border border-purple-200"
                            : p.teamName === "Enterprise Sales"
                            ? "bg-indigo-50 text-indigo-600 border border-indigo-200"
                            : p.teamName?.includes("Mid-Market")
                            ? "bg-blue-50 text-blue-600 border border-blue-200"
                            : p.teamName?.includes("SME")
                            ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {p.teamName || "Unassigned"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 font-mono">
                        {canEditProduct(activeUserId, p, users) ? (
                          <button
                            onClick={() => handleOpenEdit(p)}
                            title="Edit Product"
                            className="p-1 text-amber-600 hover:bg-amber-50 rounded-md transition-all cursor-pointer"
                          >
                            <Edit2 size={13} />
                          </button>
                        ) : (
                          <button
                            disabled
                            title="Edit forbidden. Requires creator or team contributor permission."
                            className="p-1 text-slate-300 bg-slate-50 rounded-md cursor-not-allowed border border-transparent"
                          >
                            <Edit2 size={13} className="opacity-45" />
                          </button>
                        )}

                        {canDeleteProduct(activeUserId, p, users) ? (
                          <button
                            onClick={() => handleDelete(p.id)}
                            title="Delete Product"
                            className="p-1 text-rose-600 hover:bg-rose-50 rounded-md transition-all cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        ) : (
                          <button
                            disabled
                            title="Delete forbidden. Requires Manager role."
                            className="p-1 text-slate-300 bg-slate-50 rounded-md cursor-not-allowed border border-transparent"
                          >
                            <Trash2 size={13} className="opacity-45" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

        </>
      ) : (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-3xs space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <ListSection title="Categories" items={categories} onAdd={onAddCategory} onDelete={onDeleteCategory} />
            <ListSection title="Product Groups" items={groups} onAdd={onAddGroup} onDelete={onDeleteGroup} />
            <ListSection title="Manufacturers" items={manufacturers} onAdd={onAddManufacturer} onDelete={onDeleteManufacturer} />
          </div>
        </div>
      )}
      {isAddOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-md w-full overflow-hidden">
            <div className="bg-emerald-950 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plus size={18} className="text-emerald-400" />
                <h3 className="text-sm font-bold tracking-tight">Add New Product</h3>
              </div>
              <button
                onClick={() => setIsAddOpen(false)}
                className="text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-4 flex flex-col gap-3">
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1 uppercase font-mono">Product Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cloud Infrastructure Suite"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full text-sm border border-slate-200 bg-slate-50 px-3 py-2 rounded-xl focus:ring-1 focus:ring-emerald-500 outline-none text-slate-800"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1 uppercase font-mono flex items-center justify-between">
                  <span>HSN Code</span>
                  <span className="text-[10px] text-slate-400 font-normal lowercase">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 3901.20.00 / 2905.31.00"
                  value={hsnCode}
                  onChange={(e) => setHsnCode(e.target.value)}
                  className="w-full text-sm border border-slate-200 bg-slate-50 px-3 py-2 rounded-xl focus:ring-1 focus:ring-emerald-500 outline-none text-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1 uppercase font-mono">Category *</label>
                <select
                  required
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full text-sm border border-slate-200 bg-slate-50 px-3 py-2 rounded-xl focus:ring-1 focus:ring-emerald-500 outline-none text-slate-800"
                >
                  <option value="">Select Category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1 uppercase font-mono">Product Group *</label>
                <select
                  required
                  value={group}
                  onChange={(e) => setGroup(e.target.value)}
                  className="w-full text-sm border border-slate-200 bg-slate-50 px-3 py-2 rounded-xl focus:ring-1 focus:ring-emerald-500 outline-none text-slate-800"
                >
                  <option value="">Select Product Group</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.name}>{g.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1 uppercase font-mono">Manufacturer *</label>
                <select
                  required
                  value={manufacturer}
                  onChange={(e) => setManufacturer(e.target.value)}
                  className="w-full text-sm border border-slate-200 bg-slate-50 px-3 py-2 rounded-xl focus:ring-1 focus:ring-emerald-500 outline-none text-slate-800"
                >
                  <option value="">Select Manufacturer</option>
                  {manufacturers.map((m) => (
                    <option key={m.id} value={m.name}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1 uppercase font-mono">
                  Associated Team {isExecutive ? "(Optional)" : ""}
                </label>
                <select
                  value={isExecutive ? productTeam : (activeUser.teamName || "")}
                  onChange={(e) => isExecutive && setProductTeam(e.target.value)}
                  disabled={!isExecutive}
                  className={`w-full text-sm border border-slate-200 px-3 py-2 rounded-xl focus:ring-1 outline-none ${
                    isExecutive
                      ? "bg-slate-50 text-slate-800 cursor-pointer focus:ring-emerald-500"
                      : "bg-slate-100 text-slate-500 cursor-not-allowed select-none font-medium"
                  }`}
                >
                  {isExecutive ? (
                    <>
                      <option value="">Select Team (or leave Unassigned)</option>
                      {teams.map((t) => (
                        <option key={t.id} value={t.name}>
                          {t.name}
                        </option>
                      ))}
                    </>
                  ) : (
                    <option value={activeUser.teamName || ""}>
                      {activeUser.teamName || "Unassigned"} (Auto-assigned)
                    </option>
                  )}
                </select>
              </div>

              <div className="flex gap-2 justify-end mt-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="text-xs font-semibold px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="text-xs font-bold px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all shadow-xs cursor-pointer"
                >
                  Create Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PRODUCT MODAL */}
      {isEditOpen && editingProduct && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-md w-full overflow-hidden">
            <div className="bg-amber-950 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit2 size={18} className="text-amber-400" />
                <h3 className="text-sm font-bold tracking-tight">Modify Product Specifications</h3>
              </div>
              <button
                onClick={() => {
                  setIsEditOpen(false);
                  setEditingProduct(null);
                }}
                className="text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="p-4 flex flex-col gap-3">
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1 uppercase font-mono">Product Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cloud Infrastructure Suite"
                  value={editProductName}
                  onChange={(e) => setEditProductName(e.target.value)}
                  className="w-full text-sm border border-slate-200 bg-slate-50 px-3 py-2 rounded-xl focus:ring-1 focus:ring-amber-500 outline-none text-slate-800"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1 uppercase font-mono flex items-center justify-between">
                  <span>HSN Code</span>
                  <span className="text-[10px] text-slate-400 font-normal lowercase">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 3901.20.00 / 2905.31.00"
                  value={editHsnCode}
                  onChange={(e) => setEditHsnCode(e.target.value)}
                  className="w-full text-sm border border-slate-200 bg-slate-50 px-3 py-2 rounded-xl focus:ring-1 focus:ring-amber-500 outline-none text-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1 uppercase font-mono">Category *</label>
                <select
                  required
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full text-sm border border-slate-200 bg-slate-50 px-3 py-2 rounded-xl focus:ring-1 focus:ring-amber-500 outline-none text-slate-800"
                >
                  <option value="">Select Category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1 uppercase font-mono">Product Group *</label>
                <select
                  required
                  value={editGroup}
                  onChange={(e) => setEditGroup(e.target.value)}
                  className="w-full text-sm border border-slate-200 bg-slate-50 px-3 py-2 rounded-xl focus:ring-1 focus:ring-amber-500 outline-none text-slate-800"
                >
                  <option value="">Select Product Group</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.name}>{g.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1 uppercase font-mono">Manufacturer *</label>
                <select
                  required
                  value={editManufacturer}
                  onChange={(e) => setEditManufacturer(e.target.value)}
                  className="w-full text-sm border border-slate-200 bg-slate-50 px-3 py-2 rounded-xl focus:ring-1 focus:ring-amber-500 outline-none text-slate-800"
                >
                  <option value="">Select Manufacturer</option>
                  {manufacturers.map((m) => (
                    <option key={m.id} value={m.name}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1 uppercase font-mono">
                  Associated Team {isExecutive ? "(Optional)" : ""}
                </label>
                <select
                  value={isExecutive ? editProductTeam : (activeUser.teamName || "")}
                  onChange={(e) => isExecutive && setEditProductTeam(e.target.value)}
                  disabled={!isExecutive}
                  className={`w-full text-sm border border-slate-200 px-3 py-2 rounded-xl focus:ring-1 outline-none ${
                    isExecutive
                      ? "bg-slate-50 text-slate-800 cursor-pointer focus:ring-amber-500"
                      : "bg-slate-100 text-slate-500 cursor-not-allowed select-none font-medium"
                  }`}
                >
                  {isExecutive ? (
                    <>
                      <option value="">Select Team (or leave Unassigned)</option>
                      {teams.map((t) => (
                        <option key={t.id} value={t.name}>
                          {t.name}
                        </option>
                      ))}
                    </>
                  ) : (
                    <option value={activeUser.teamName || ""}>
                      {activeUser.teamName || "Unassigned"} (Auto-assigned)
                    </option>
                  )}
                </select>
              </div>

              <div className="flex gap-2 justify-end mt-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditOpen(false);
                    setEditingProduct(null);
                  }}
                  className="text-xs font-semibold px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="text-xs font-bold px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-all shadow-xs cursor-pointer"
                >
                  Save Modifications
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BULK IMPORT MODAL */}
      <ProductBulkImportModal
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
        onAddProduct={onAddProduct}
        onEditProduct={onEditProduct}
        onBulkAddProducts={onBulkAddProducts}
        existingProducts={products}
        categories={categories}
        groups={groups}
        manufacturers={manufacturers}
        teams={teams}
        activeUserId={activeUserId}
        activeUserName={activeUser.name}
        onAddCategory={onAddCategory}
        onAddGroup={onAddGroup}
        onAddManufacturer={onAddManufacturer}
      />
    </div>
  );
}

function ListSection({ title, items, onAdd, onDelete }: { title: string, items: any[], onAdd: (data: any) => void, onDelete: (id: string) => void }) {
  const [name, setName] = useState("");
  return (
    <div className="space-y-3">
      <h3 className="font-bold text-slate-800">{title}</h3>
      <div className="flex gap-2">
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full text-xs border border-slate-200 bg-slate-50 px-3 py-1.5 rounded-lg" />
        <button onClick={() => { onAdd({ name }); setName(""); }} className="bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer">Add</button>
      </div>
      <div className="space-y-1">
        {items.map(item => (
          <div key={item.id} className="flex justify-between items-center text-xs p-2 bg-slate-50 rounded">
            {item.name}
            <button onClick={() => onDelete(item.id)} className="text-rose-600 cursor-pointer"><Trash2 size={12} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import { 
  Search, 
  Plus, 
  AlertTriangle,
  Trash2,
  Pencil,
  Tag,
  Box,
  MonitorPlay,
  TrendingUp,
  Percent
} from "lucide-react";
import { 
  getProducts, 
  createProductAction, 
  updateProductAction,
  deleteProductAction,
  ProductModel 
} from "@/features/products/actions";
import { 
  getSuppliers, 
  createClientAction, 
  ClientModel 
} from "@/features/clients/actions";

export default function GestaoProdutos() {
  const [products, setProducts] = useState<ProductModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [description, setDescription] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [stockQuantity, setStockQuantity] = useState("0");
  const [minStock, setMinStock] = useState("5");
  const [type, setType] = useState<"physical" | "digital" | "service">("physical");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductModel | null>(null);

  // Fornecedor
  const [suppliers, setSuppliers] = useState<ClientModel[]>([]);
  const [supplierId, setSupplierId] = useState("");

  // Modal rápido de cadastro de fornecedor
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState("");
  const [newSupplierDoc, setNewSupplierDoc] = useState("");
  const [newSupplierEmail, setNewSupplierEmail] = useState("");

  // Modal de confirmação de redução de estoque
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockModalData, setStockModalData] = useState<{
    oldStock: number;
    newStock: number;
    oldTotal: number;
    newTotal: number;
    costPrice: number;
  } | null>(null);
  const [pendingPayload, setPendingPayload] = useState<Record<string, unknown> | null>(null);

  // Margem calculada em tempo real
  const calcMargin = (sale: string, cost: string): number | null => {
    const s = parseFloat(sale);
    const c = parseFloat(cost);
    if (!s || !c || c <= 0) return null;
    return ((s - c) / s) * 100;
  };
  const liveMargin = calcMargin(salePrice, costPrice);

  useEffect(() => { loadProducts(); loadSuppliers(); }, []);

  async function loadSuppliers() {
    try {
      const data = await getSuppliers();
      setSuppliers(data);
    } catch (err) {
      console.error(err);
    }
  }

  async function loadProducts() {
    setLoading(true);
    try {
      const data = await getProducts();
      setProducts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleEditProduct = (product: ProductModel) => {
    setEditingProduct(product);
    setSku(product.sku ?? "");
    setName(product.name);
    setDescription(product.description);
    setSalePrice(product.sale_price.toString());
    setCostPrice(product.cost_price.toString());
    setStockQuantity(product.stock_quantity.toString());
    setMinStock(product.min_stock.toString());
    setType(product.type as any);
    setSupplierId(product.supplier_id || "");
    setSaveError(null);
    setShowModal(true);
  };

  const doSubmitProduct = async (payload: Record<string, unknown>, replaceTransaction?: boolean) => {
    setIsSubmitting(true);
    setSaveError(null);

    const result = editingProduct
      ? await updateProductAction(editingProduct.id, payload, replaceTransaction ? { replaceTransaction: true } : undefined)
      : await createProductAction(payload);

    if (result.success && result.data) {
      if (editingProduct) {
        setProducts(products.map(p => p.id === result.data!.id ? result.data! : p));
      } else {
        setProducts([result.data, ...products]);
      }
      setShowModal(false);
      setEditingProduct(null);
      setName(""); setSku(""); setDescription(""); setSalePrice(""); setCostPrice("");
      setStockQuantity("0"); setMinStock("5"); setType("physical");
      setSupplierId("");
    } else {
      setSaveError(result.error || "Erro desconhecido ao salvar.");
    }
    setIsSubmitting(false);
  };

  const handleSubmitProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);

    const payload: Record<string, unknown> = {
      sku,
      name,
      description,
      sale_price: parseFloat(salePrice.replace(",", ".")),
      cost_price: parseFloat(costPrice.replace(",", ".")) || 0,
      stock_quantity: parseInt(stockQuantity),
      min_stock: parseInt(minStock),
      type
    };

    if (type === "physical" && supplierId) {
      payload.supplier_id = supplierId;
    }

    // Se for edição e estoque diminuiu, perguntar sobre transação
    if (editingProduct) {
      const newQty = parseInt(stockQuantity);
      const oldQty = editingProduct.stock_quantity;
      const cost = parseFloat(costPrice.replace(",", ".")) || 0;

      if (newQty < oldQty && cost > 0) {
        setStockModalData({
          oldStock: oldQty,
          newStock: newQty,
          oldTotal: oldQty * cost,
          newTotal: newQty * cost,
          costPrice: cost,
        });
        setPendingPayload(payload);
        setShowStockModal(true);
        return;
      }
    }

    await doSubmitProduct(payload);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingProduct(null);
    setName(""); setSku(""); setDescription(""); setSalePrice(""); setCostPrice("");
    setStockQuantity("0"); setMinStock("5"); setType("physical");
    setSupplierId(""); setSaveError(null);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja deletar este produto?")) {
      const result = await deleteProductAction(id);
      if (result.success) {
        setProducts(products.filter(p => p.id !== id));
      } else {
        alert(result.error || "Erro desconhecido ao deletar.");
      }
    }
  };

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupplierName.trim()) return;

    const result = await createClientAction({
      name: newSupplierName.trim(),
      type: "fornecedor",
      status: "active",
      email: newSupplierEmail.trim() || "",
      document: newSupplierDoc.trim() || "",
    });

    if (result.success && result.data) {
      setSuppliers([...suppliers, result.data]);
      setSupplierId(result.data.id);
      setShowSupplierModal(false);
      setNewSupplierName(""); setNewSupplierDoc(""); setNewSupplierEmail("");
    } else {
      alert(result.error || "Erro ao cadastrar fornecedor.");
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  // KPIs
  const totalItems = products.reduce((acc, p) => acc + p.stock_quantity, 0);
  const totalValue = products.reduce((acc, p) => acc + (p.sale_price * p.stock_quantity), 0);
  const totalCost = products.reduce((acc, p) => acc + (p.cost_price * p.stock_quantity), 0);
  const lowStockItems = products.filter(p => p.type === "physical" && p.stock_quantity <= p.min_stock).length;
  const withMargin = products.filter(p => p.cost_price > 0 && p.sale_price > 0);
  const avgMargin = withMargin.length > 0
    ? withMargin.reduce((acc, p) => acc + ((p.sale_price - p.cost_price) / p.sale_price) * 100, 0) / withMargin.length
    : null;

  const formatBRL = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  return (
    <>
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Produtos & Estoque</h2>
          <p className="text-gray-500 mt-1">Gestão de produtos físicos, infoprodutos e serviços com margem de lucro.</p>
        </div>
        <button onClick={() => { setEditingProduct(null); setSaveError(null); setShowModal(true); }}
          className="flex items-center gap-2 py-3 px-5 rounded-xl text-sm font-medium text-white bg-[var(--color-brand-blue)] hover:bg-[var(--color-brand-blue-hover)] transition-all cursor-pointer shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:scale-105">
          <Plus size={18} /> Cadastrar Produto
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
        <div className="glass-panel rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><Box className="w-16 h-16" /></div>
          <p className="text-sm font-medium text-gray-500 mb-1">Itens em Estoque</p>
          <h3 className="text-3xl font-bold">{totalItems}</h3>
        </div>
        <div className="glass-panel rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><TrendingUp className="w-16 h-16" /></div>
          <p className="text-sm font-medium text-gray-500 mb-1">Valor em Estoque (Venda)</p>
          <h3 className="text-2xl font-bold">{formatBRL(totalValue)}</h3>
        </div>
        <div className="glass-panel rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><TrendingUp className="w-16 h-16 text-rose-500" /></div>
          <p className="text-sm font-medium text-gray-500 mb-1">Custo Total em Estoque</p>
          <h3 className="text-2xl font-bold text-rose-400">{formatBRL(totalCost)}</h3>
        </div>
        <div className="glass-panel rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><Percent className="w-16 h-16 text-emerald-500" /></div>
          <p className="text-sm font-medium text-gray-500 mb-1">Margem Média</p>
          <h3 className={`text-3xl font-bold ${avgMargin !== null ? (avgMargin >= 30 ? "text-emerald-500" : "text-amber-500") : "text-gray-500"}`}>
            {avgMargin !== null ? `${avgMargin.toFixed(1)}%` : "—"}
          </h3>
        </div>
        <div className="glass-panel rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform text-rose-500"><AlertTriangle className="w-16 h-16" /></div>
          <p className="text-sm font-medium text-gray-500 mb-1">Alertas de Estoque</p>
          <h3 className={`text-3xl font-bold ${lowStockItems > 0 ? "text-rose-500" : "text-emerald-500"}`}>{lowStockItems}</h3>
        </div>
      </div>

      {/* Product Table */}
      <div className="glass-panel rounded-3xl p-6">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Tag className="w-5 h-5 text-[var(--color-brand-blue)]" /> Catálogo
          </h3>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Buscar produto..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-[var(--border-color)] rounded-xl bg-white/5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)]" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-gray-500 border-b border-[var(--border-color)]">
              <tr>
                <th className="px-4 py-3">Produto</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Custo</th>
                <th className="px-4 py-3">Preço de Venda</th>
                <th className="px-4 py-3">Margem</th>
                <th className="px-4 py-3">Registrado em</th>
                <th className="px-4 py-3">Estoque</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-b border-[var(--border-color)]/50 animate-pulse">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-4"><div className="h-4 bg-white/5 rounded w-20" /></td>
                    ))}
                  </tr>
                ))
              ) : filteredProducts.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-500">Nenhum produto no catálogo.</td></tr>
              ) : (
                filteredProducts.map((product) => {
                  const isLowStock = product.type === "physical" && product.stock_quantity <= product.min_stock;
                  const margin = product.cost_price > 0 && product.sale_price > 0
                    ? ((product.sale_price - product.cost_price) / product.sale_price) * 100
                    : null;
                  return (
                    <tr key={product.id} className="border-b border-[var(--border-color)]/50 hover:bg-white/5 transition-colors group">
                      <td className="px-4 py-4">
                        <div className="font-semibold">{product.name}</div>
                        <div className="text-xs text-gray-500 truncate max-w-[180px]">{product.description}</div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${
                          product.type === "physical" ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                          product.type === "digital" ? "bg-purple-500/10 text-purple-400 border-purple-500/20" :
                          "bg-sky-500/10 text-sky-400 border-sky-500/20"
                        }`}>
                          {product.type === "physical" && <Box className="w-3 h-3" />}
                          {product.type === "digital" && <MonitorPlay className="w-3 h-3" />}
                          {product.type === "physical" ? "Físico" : product.type === "digital" ? "Digital" : "Serviço"}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-gray-400">
                        {product.cost_price > 0 ? formatBRL(product.cost_price) : <span className="text-gray-600">—</span>}
                      </td>
                      <td className="px-4 py-4 font-medium">{formatBRL(product.sale_price)}</td>
                      <td className="px-4 py-4">
                        {margin !== null ? (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${
                            margin >= 50 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                            margin >= 20 ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                            "bg-rose-500/10 text-rose-400 border-rose-500/20"
                          }`}>
                            <Percent className="w-3 h-3" />{margin.toFixed(1)}%
                          </span>
                        ) : <span className="text-gray-600 text-xs">Sem custo</span>}
                      </td>
                      <td className="px-4 py-4 text-xs text-gray-500 whitespace-nowrap">
                        {new Date(product.updated_at || product.created_at).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-4 py-4">
                        {product.type === "physical" ? (
                          <div className={`flex items-center gap-2 font-medium ${isLowStock ? "text-rose-500" : ""}`}>
                            {product.stock_quantity} un {isLowStock && <AlertTriangle className="w-4 h-4" />}
                          </div>
                        ) : <span className="text-gray-500 text-xs">Ilimitado</span>}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button onClick={() => handleEditProduct(product)}
                          className="p-2 rounded-lg text-gray-500 hover:bg-sky-500/10 hover:text-sky-400 transition-colors opacity-0 group-hover:opacity-100">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(product.id)}
                          className="p-2 rounded-lg text-gray-500 hover:bg-rose-500/10 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass-panel w-full max-w-xl rounded-3xl p-8 shadow-2xl relative overflow-y-auto max-h-[90vh]">
            <h3 className="text-xl font-bold mb-6">{editingProduct ? "Editar Produto" : "Cadastrar Novo Produto"}</h3>
            
            <form onSubmit={handleSubmitProduct} className="space-y-4">
              {saveError && (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>{saveError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-sm font-medium text-gray-300">Nome do Produto/Serviço</label>
                  <input type="text" required value={name} onChange={e => setName(e.target.value)}
                    className="w-full px-4 py-2 border border-[var(--border-color)] rounded-xl bg-white/5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)]"
                    placeholder="Ex: Mentoria VIP ou Tênis Nike" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-300">Tipo</label>
                  <select value={type} onChange={e => setType(e.target.value as any)}
                    className="w-full px-4 py-2 border border-[var(--border-color)] rounded-xl bg-white/5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)] [&>option]:bg-gray-900">
                    <option value="physical">Físico</option>
                    <option value="digital">Digital (E-book/Curso)</option>
                    <option value="service">Serviço/Mentoria</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-300">SKU (Código do Produto)</label>
                <input type="text" value={sku} onChange={e => setSku(e.target.value)}
                  className="w-full px-4 py-2 border border-[var(--border-color)] rounded-xl bg-white/5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)]"
                  placeholder="Ex: PROD-001" />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-300">Descrição Breve</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
                  className="w-full px-4 py-2 border border-[var(--border-color)] rounded-xl bg-white/5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)]"
                  placeholder="Descreva o produto..." />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-300">Custo do Produto (R$)</label>
                  <input type="number" step="0.01" value={costPrice} onChange={e => setCostPrice(e.target.value)}
                    className="w-full px-4 py-2 border border-[var(--border-color)] rounded-xl bg-white/5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)]"
                    placeholder="0.00" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-300">Preço de Venda (R$)</label>
                  <input type="number" step="0.01" required value={salePrice} onChange={e => setSalePrice(e.target.value)}
                    className="w-full px-4 py-2 border border-[var(--border-color)] rounded-xl bg-white/5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)]"
                    placeholder="0.00" />
                </div>
              </div>

              {/* Preview Margem */}
              {liveMargin !== null && (
                <div className={`flex items-center gap-3 p-3 rounded-xl border text-sm font-medium transition-all ${
                  liveMargin >= 50 ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                  liveMargin >= 20 ? "bg-amber-500/10 border-amber-500/20 text-amber-400" :
                  "bg-rose-500/10 border-rose-500/20 text-rose-400"
                }`}>
                  <Percent className="w-4 h-4" />
                  Margem de Lucro: <span className="font-bold text-base ml-1">{liveMargin.toFixed(1)}%</span>
                  <span className="ml-auto text-xs opacity-70">
                    {liveMargin >= 50 ? "Excelente" : liveMargin >= 20 ? "Aceitável" : "Baixa — revise o preço"}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className={`text-sm font-medium ${type !== "physical" ? "text-gray-600" : "text-gray-300"}`}>Qtd. Estoque Inicial</label>
                  <input type="number" value={stockQuantity} onChange={e => setStockQuantity(e.target.value)}
                    disabled={type !== "physical"}
                    className="w-full px-4 py-2 border border-[var(--border-color)] rounded-xl bg-white/5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)] disabled:opacity-40" />
                </div>
                <div className="space-y-1">
                  <label className={`text-sm font-medium ${type !== "physical" ? "text-gray-600" : "text-gray-300"}`}>Estoque Mínimo (Alerta)</label>
                  <input type="number" value={minStock} onChange={e => setMinStock(e.target.value)}
                    disabled={type !== "physical"}
                    className="w-full px-4 py-2 border border-[var(--border-color)] rounded-xl bg-white/5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)] disabled:opacity-40" />
                </div>
              </div>

              {type === "physical" && (
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-300">Fornecedor</label>
                  <div className="flex gap-2">
                    <select value={supplierId} onChange={e => setSupplierId(e.target.value)}
                      className="flex-1 w-full px-4 py-2 border border-[var(--border-color)] rounded-xl bg-white/5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)] [&>option]:bg-gray-900">
                      <option value="">Selecione um fornecedor</option>
                      {suppliers.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    <button type="button" onClick={() => setShowSupplierModal(true)}
                      className="px-4 py-2 rounded-xl border border-[var(--border-color)] text-gray-400 hover:bg-white/5 hover:text-gray-200 text-sm transition-all whitespace-nowrap">
                      + Novo
                    </button>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-6 border-t border-[var(--border-color)]">
                <button type="button" onClick={handleCloseModal}
                  className="px-5 py-2 rounded-xl border border-[var(--border-color)] text-gray-400 hover:bg-white/5 text-sm transition-all">
                  Cancelar
                </button>
                <button type="submit" disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-[var(--color-brand-blue)] hover:bg-[var(--color-brand-blue-hover)] text-white text-sm transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)] disabled:opacity-70">
                  {isSubmitting ? "Salvando..." : editingProduct ? "Atualizar Produto" : "Salvar Produto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal confirmação redução de estoque */}
      {showStockModal && stockModalData && (
        <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass-panel w-full max-w-md rounded-3xl p-8 shadow-2xl relative overflow-hidden">
            <h3 className="text-lg font-bold mb-2">Estoque Reduzido</h3>
            <p className="text-sm text-gray-400 mb-6">
              O estoque foi reduzido de <strong>{stockModalData.oldStock}</strong> para <strong>{stockModalData.newStock}</strong>.
            </p>
            <div className="flex flex-col gap-2 mb-6 p-4 rounded-xl bg-white/5 border border-[var(--border-color)] text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Transação anterior:</span>
                <span className="font-medium text-rose-400">{formatBRL(stockModalData.oldTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Nova transação:</span>
                <span className="font-medium text-emerald-400">{formatBRL(stockModalData.newTotal)}</span>
              </div>
            </div>
            <p className="text-sm text-gray-400 mb-6">
              Deseja excluir a transação anterior e criar uma nova com o valor corrigido?
            </p>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => { setShowStockModal(false); setPendingPayload(null); setStockModalData(null); }}
                className="px-4 py-2 rounded-xl border border-[var(--border-color)] text-gray-400 hover:bg-white/5 text-sm transition-all">
                Cancelar
              </button>
              <button type="button" onClick={async () => { if (pendingPayload) await doSubmitProduct(pendingPayload); setShowStockModal(false); setPendingPayload(null); setStockModalData(null); }}
                className="px-4 py-2 rounded-xl border border-gray-600 text-gray-300 hover:bg-white/5 text-sm transition-all">
                Não
              </button>
              <button type="button" onClick={async () => { if (pendingPayload) { await doSubmitProduct(pendingPayload, true); } setShowStockModal(false); setPendingPayload(null); setStockModalData(null); }}
                className="px-4 py-2 rounded-xl bg-[var(--color-brand-blue)] hover:bg-[var(--color-brand-blue-hover)] text-white text-sm transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                Sim, excluir e recriar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mini-modal Cadastrar Fornecedor */}
      {showSupplierModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass-panel w-full max-w-md rounded-3xl p-8 shadow-2xl relative overflow-hidden">
            <h3 className="text-lg font-bold mb-6">Novo Fornecedor</h3>
            <form onSubmit={handleCreateSupplier} className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-300">Nome do Fornecedor *</label>
                <input type="text" required value={newSupplierName} onChange={e => setNewSupplierName(e.target.value)}
                  className="w-full px-4 py-2 border border-[var(--border-color)] rounded-xl bg-white/5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)]"
                  placeholder="Ex: Distribuidora XYZ" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-300">CPF/CNPJ</label>
                <input type="text" value={newSupplierDoc} onChange={e => setNewSupplierDoc(e.target.value)}
                  className="w-full px-4 py-2 border border-[var(--border-color)] rounded-xl bg-white/5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)]"
                  placeholder="Opcional" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-300">E-mail</label>
                <input type="email" value={newSupplierEmail} onChange={e => setNewSupplierEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-[var(--border-color)] rounded-xl bg-white/5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)]"
                  placeholder="Opcional" />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)]">
                <button type="button" onClick={() => { setShowSupplierModal(false); setNewSupplierName(""); setNewSupplierDoc(""); setNewSupplierEmail(""); }}
                  className="px-5 py-2 rounded-xl border border-[var(--border-color)] text-gray-400 hover:bg-white/5 text-sm transition-all">
                  Cancelar
                </button>
                <button type="submit"
                  className="px-5 py-2 rounded-xl bg-[var(--color-brand-blue)] hover:bg-[var(--color-brand-blue-hover)] text-white text-sm transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                  Cadastrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

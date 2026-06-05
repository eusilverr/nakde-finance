"use client";

import React, { useState } from "react";
import { FileText, Download, Users, ShoppingCart, DollarSign } from "lucide-react";
import { getReportData } from "@/features/reports/actions";
import { getUserSettings } from "@/features/settings/actions";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function RelatoriosPage() {
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState<"clientes" | "vendas" | "financeiro">("vendas");

  // Filters for Financeiro
  const [finStartDate, setFinStartDate] = useState("");
  const [finEndDate, setFinEndDate] = useState("");
  const [finType, setFinType] = useState<"all" | "income" | "expense">("all");
  const [finCategory, setFinCategory] = useState("");

  // Filters for Vendas
  const [saleStartDate, setSaleStartDate] = useState("");
  const [saleEndDate, setSaleEndDate] = useState("");
  const [saleTypeFilter, setSaleTypeFilter] = useState<"all" | "product" | "service" | "both">("all");
  const [saleStatusFilter, setSaleStatusFilter] = useState<"all" | "pending" | "approved" | "invoiced" | "completed" | "canceled">("all");

  const handleExportPDF = async () => {
    setLoading(true);
    try {
      let filters: any = undefined;
      
      if (reportType === "financeiro") {
        filters = {
          startDate: finStartDate || undefined,
          endDate: finEndDate || undefined,
          transactionType: finType,
          category: finCategory || undefined,
        };
      } else if (reportType === "vendas") {
        filters = {
          startDate: saleStartDate || undefined,
          endDate: saleEndDate || undefined,
          saleType: saleTypeFilter,
          saleStatus: saleStatusFilter,
        };
      }
      
      const data = await getReportData(reportType, filters);
      const settings = await getUserSettings();
      const companyName = settings?.company.name || "Minha Empresa";

      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(20);
      doc.setTextColor(40, 40, 40);
      doc.text(companyName, 14, 22);
      
      doc.setFontSize(14);
      doc.setTextColor(100, 100, 100);
      
      let title = "";
      let head: string[][] = [];
      let body: any[][] = [];

      if (reportType === "clientes") {
        title = "Relatório de Clientes";
        head = [["Nome", "E-mail", "Documento", "Status", "Data de Cadastro"]];
        body = data.map((item: any) => {
          let dtStr = item.created_at;
          if (dtStr && dtStr.length === 10) dtStr += "T12:00:00Z";
          return [
            item.name,
            item.email || "-",
            item.document || "-",
            item.status === "active" ? "Ativo" : item.status === "prospect" ? "Prospect" : "Inativo",
            new Date(dtStr).toLocaleDateString("pt-BR")
          ];
        });
      } else if (reportType === "vendas") {
        title = "Relatório de Vendas";
        head = [["Nº Pedido", "Cliente", "Tipo", "Status", "Valor Total", "Data"]];
        body = data.map((item: any) => {
          // Adjust date string timezone issue by appending T12:00:00Z if it's YYYY-MM-DD
          let dtStr = item.created_at;
          if (dtStr && dtStr.length === 10) dtStr += "T12:00:00Z";
          return [
            item.sale_number,
            item.clients?.name || "Desconhecido",
            item.sale_type === "product" ? "Produto" : item.sale_type === "service" ? "Serviço" : "Misto",
            item.status,
            new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(item.total_amount),
            new Date(dtStr).toLocaleDateString("pt-BR")
          ];
        });
      } else if (reportType === "financeiro") {
        title = "Relatório Financeiro (Lançamentos)";
        head = [["Descrição", "Categoria", "Tipo", "Status", "Valor", "Data Venc."]];
        body = data.map((item: any) => {
          let dtStr = item.due_date;
          if (dtStr && dtStr.length === 10) dtStr += "T12:00:00Z";
          return [
            item.description || "-",
            item.category,
            item.type === "income" ? "Receita" : "Despesa",
            item.status,
            new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(item.amount),
            new Date(dtStr).toLocaleDateString("pt-BR")
          ];
        });
      }

      doc.text(title, 14, 32);
      
      doc.setFontSize(10);
      doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, 14, 40);

      autoTable(doc, {
        startY: 45,
        head: head,
        body: body,
        theme: "striped",
        headStyles: { fillColor: [59, 130, 246] }, // Tailwind blue-500
        styles: { fontSize: 9 },
      });

      doc.save(`relatorio_${reportType}_${new Date().getTime()}.pdf`);
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      alert("Houve um erro ao gerar o relatório. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const reportOptions = [
    { id: "vendas", label: "Relatório de Vendas", icon: ShoppingCart, desc: "Listagem de todas as vendas e orçamentos emitidos." },
    { id: "clientes", label: "Relatório de Clientes", icon: Users, desc: "Listagem de todos os contatos e clientes da base." },
    { id: "financeiro", label: "Relatório Financeiro", icon: DollarSign, desc: "Fluxo de caixa, contas a pagar e a receber." },
  ] as const;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 sm:mb-8">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Relatórios</h2>
          <p className="text-gray-500 mt-1 text-sm sm:text-base">Gere relatórios gerenciais e exporte dados da sua operação em PDF.</p>
        </div>
      </div>

      <div className="glass-panel rounded-3xl p-4 sm:p-6 lg:p-8">
        <h3 className="text-lg font-bold mb-6">Selecione o tipo de relatório</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {reportOptions.map((opt) => {
            const Icon = opt.icon;
            const isSelected = reportType === opt.id;
            return (
              <div 
                key={opt.id}
                onClick={() => setReportType(opt.id)}
                className={`p-6 rounded-2xl border-2 transition-all cursor-pointer flex flex-col gap-3 group ${
                  isSelected 
                    ? "border-[var(--color-brand-blue)] bg-[var(--color-brand-blue)]/5" 
                    : "border-[var(--border-color)] hover:border-gray-400 bg-white/5"
                }`}
              >
                <div className={`p-3 rounded-xl w-fit ${isSelected ? "bg-[var(--color-brand-blue)]/20 text-[var(--color-brand-blue)]" : "bg-white/10 text-gray-400 group-hover:text-gray-300"}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-base">{opt.label}</h4>
                  <p className="text-xs text-gray-500 mt-1">{opt.desc}</p>
                </div>
                
                {/* Custom radio button visual */}
                <div className="mt-2 flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${isSelected ? "border-[var(--color-brand-blue)]" : "border-gray-500"}`}>
                    {isSelected && <div className="w-2 h-2 rounded-full bg-[var(--color-brand-blue)]"></div>}
                  </div>
                  <span className="text-xs font-medium text-gray-400">Selecionar</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Dynamic Filters UI for Vendas */}
        {reportType === "vendas" && (
          <div className="mb-10 animate-in fade-in slide-in-from-top-4 duration-300 border border-[var(--border-color)] rounded-2xl p-6 bg-white/5">
            <h4 className="font-bold text-sm text-gray-300 mb-4 uppercase tracking-wider">Filtros do Relatório de Vendas</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-400">Data Inicial</label>
                <input
                  type="date"
                  value={saleStartDate}
                  onChange={(e) => setSaleStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--border-color)] rounded-xl bg-white/5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)] [color-scheme:light dark]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-400">Data Final</label>
                <input
                  type="date"
                  value={saleEndDate}
                  onChange={(e) => setSaleEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--border-color)] rounded-xl bg-white/5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)] [color-scheme:light dark]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-400">Tipo da Venda</label>
                <select
                  value={saleTypeFilter}
                  onChange={(e) => setSaleTypeFilter(e.target.value as any)}
                  className="w-full px-3 py-2 border border-[var(--border-color)] rounded-xl bg-white/5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)]"
                >
                  <option value="all">Todos</option>
                  <option value="product">Produto</option>
                  <option value="service">Serviço</option>
                  <option value="both">Misto</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-400">Status</label>
                <select
                  value={saleStatusFilter}
                  onChange={(e) => setSaleStatusFilter(e.target.value as any)}
                  className="w-full px-3 py-2 border border-[var(--border-color)] rounded-xl bg-white/5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)]"
                >
                  <option value="all">Todos</option>
                  <option value="pending">Pendente</option>
                  <option value="approved">Aprovada</option>
                  <option value="invoiced">Faturada</option>
                  <option value="completed">Concluída</option>
                  <option value="canceled">Cancelada</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Filters UI for Financeiro */}
        {reportType === "financeiro" && (
          <div className="mb-10 animate-in fade-in slide-in-from-top-4 duration-300 border border-[var(--border-color)] rounded-2xl p-6 bg-white/5">
            <h4 className="font-bold text-sm text-gray-300 mb-4 uppercase tracking-wider">Filtros do Relatório Financeiro</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-400">Data Inicial</label>
                <input
                  type="date"
                  value={finStartDate}
                  onChange={(e) => setFinStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--border-color)] rounded-xl bg-white/5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)] [color-scheme:light dark]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-400">Data Final</label>
                <input
                  type="date"
                  value={finEndDate}
                  onChange={(e) => setFinEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--border-color)] rounded-xl bg-white/5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)] [color-scheme:light dark]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-400">Tipo</label>
                <select
                  value={finType}
                  onChange={(e) => setFinType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-[var(--border-color)] rounded-xl bg-white/5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)]"
                >
                  <option value="all">Todos</option>
                  <option value="income">Receitas</option>
                  <option value="expense">Despesas</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-400">Categoria</label>
                <input
                  type="text"
                  placeholder="Ex: Vendas, Marketing..."
                  value={finCategory}
                  onChange={(e) => setFinCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--border-color)] rounded-xl bg-white/5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)]"
                />
              </div>
            </div>
          </div>
        )}

        <div className="pt-6 border-t border-[var(--border-color)] flex justify-end">
          <button
            onClick={handleExportPDF}
            disabled={loading}
            className="flex items-center gap-2 py-3 px-8 rounded-xl text-sm font-bold text-white bg-[var(--color-brand-blue)] hover:bg-[var(--color-brand-blue-hover)] transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:scale-105 disabled:opacity-70 disabled:hover:scale-100"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Download className="w-5 h-5" />
            )}
            {loading ? "Gerando PDF..." : "Exportar para PDF"}
          </button>
        </div>
      </div>
    </div>
  );
}

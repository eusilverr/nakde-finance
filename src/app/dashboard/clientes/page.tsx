"use client";

import React, { useEffect, useState, useRef } from "react";
import { 
  Users, 
  Search, 
  Plus, 
  Mail, 
  FileText, 
  Clock, 
  DollarSign, 
  Briefcase, 
  Package, 
  UserPlus,
  ChevronRight,
  TrendingUp,
  Pencil,
  Filter,
  MapPin,
  Globe,
  Phone,
  Building,
  Building2,
  Calendar,
  Trash2
} from "lucide-react";
import { 
  getClients, 
  getClientTimeline, 
  ClientModel, 
  TimelineEventModel,
  createClientAction,
  updateClientAction,
  deleteClientAction,
  ActionResult
} from "@/features/clients/actions";

export default function CRMClientes() {
  const [clients, setClients] = useState<ClientModel[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientModel | null>(null);
  const [timeline, setTimeline] = useState<TimelineEventModel[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [timelineLoading, setTimelineLoading] = useState(false);

  // New states
  const [listTab, setListTab] = useState<"cliente" | "fornecedor">("cliente");
  const [detailsTab, setDetailsTab] = useState<"visao_geral" | "historico" | "financeiro" | "servicos" | "arquivos" | "observacoes">("visao_geral");
  const [showDropdown, setShowDropdown] = useState(false);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newDoc, setNewDoc] = useState("");
  const [newStatus, setNewStatus] = useState<"prospect" | "active" | "inactive">("prospect");
  const [newType, setNewType] = useState<"cliente" | "fornecedor">("cliente");
  const [newPhone, setNewPhone] = useState("");
  const [newWebsite, setNewWebsite] = useState("");
  const [newCityState, setNewCityState] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Edit Modal State
  const [editingClient, setEditingClient] = useState<ClientModel | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editDoc, setEditDoc] = useState("");
  const [editStatus, setEditStatus] = useState<"prospect" | "active" | "inactive">("prospect");
  const [editType, setEditType] = useState<"cliente" | "fornecedor">("cliente");
  const [editPhone, setEditPhone] = useState("");
  const [editWebsite, setEditWebsite] = useState("");
  const [editCityState, setEditCityState] = useState("");
  const [editErrorMessage, setEditErrorMessage] = useState("");

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const list = await getClients();
        setClients(list);
        if (list.length > 0) {
          const firstType = list.find(c => c.type === "cliente" || !c.type) ? "cliente" : "fornecedor";
          setListTab(firstType);
          setSelectedClient(list.find(c => (c.type || "cliente") === firstType) || list[0]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    async function loadTimeline() {
      if (!selectedClient) return;
      setTimelineLoading(true);
      try {
        const events = await getClientTimeline(selectedClient.id);
        setTimeline(events);
      } catch (err) {
        console.error(err);
      } finally {
        setTimelineLoading(false);
      }
    }
    loadTimeline();
  }, [selectedClient]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    const result = await createClientAction({
      name: newName,
      email: newEmail,
      document: newDoc,
      status: newStatus,
      type: newType,
      phone: newPhone,
      website: newWebsite,
      city_state: newCityState
    });

    if (result.success && result.data) {
      setClients(prev => [...prev, result.data!]);
      setSelectedClient(result.data);
      setListTab(result.data.type);
      setShowModal(false);
      setNewName("");
      setNewEmail("");
      setNewDoc("");
      setNewStatus("prospect");
      setNewPhone("");
      setNewWebsite("");
      setNewCityState("");
    } else {
      setErrorMessage(result.error || "Erro desconhecido ao cadastrar contato.");
    }
  };

  const handleEditClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;
    setEditErrorMessage("");

    const result = await updateClientAction(editingClient.id, {
      name: editName,
      email: editEmail,
      document: editDoc,
      status: editStatus,
      type: editType,
      phone: editPhone,
      website: editWebsite,
      city_state: editCityState
    });

    if (result.success && result.data) {
      setClients(prev => prev.map(c => c.id === result.data!.id ? result.data! : c));
      if (selectedClient?.id === editingClient.id) {
        setSelectedClient(result.data);
        setListTab(result.data.type);
      }
      setEditingClient(null);
    } else {
      setEditErrorMessage(result.error || "Erro desconhecido ao atualizar contato.");
    }
  };

  const handleDeleteClient = async (clientId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Tem certeza que deseja excluir este contato?")) return;
    const result = await deleteClientAction(clientId);
    if (result.success) {
      setClients(prev => prev.filter(c => c.id !== clientId));
      if (selectedClient?.id === clientId) {
        setSelectedClient(null);
      }
    } else {
      alert(result.error || "Erro ao excluir contato.");
    }
  };

  const openNewModal = (type: "cliente" | "fornecedor") => {
    setNewType(type);
    setShowDropdown(false);
    setShowModal(true);
  };

  const openEditModal = (client: ClientModel) => {
    setEditingClient(client);
    setEditName(client.name);
    setEditEmail(client.email);
    setEditDoc(client.document);
    setEditStatus(client.status);
    setEditType(client.type || "cliente");
    setEditPhone(client.phone || "");
    setEditWebsite(client.website || "");
    setEditCityState(client.city_state || "");
    setEditErrorMessage("");
  };

  const filteredClients = clients.filter(c => 
    (c.type || "cliente") === listTab &&
    (c.name.toLowerCase().includes(search.toLowerCase()) || 
     c.email.toLowerCase().includes(search.toLowerCase()))
  );

  const clientesCount = clients.filter(c => (c.type || "cliente") === "cliente").length;
  const fornecedoresCount = clients.filter(c => c.type === "fornecedor").length;

  const getEventIcon = (type: string) => {
    switch (type) {
      case "payment_received": return <DollarSign className="w-4 h-4 text-emerald-500" />;
      case "contract_signed": return <Briefcase className="w-4 h-4 text-sky-500" />;
      case "product_purchased": return <Package className="w-4 h-4 text-purple-500" />;
      case "client_created": return <UserPlus className="w-4 h-4 text-blue-500" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <>
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Clientes e Fornecedores (CRM)</h2>
          <p className="text-gray-500 mt-1">
            Gerencie o relacionamento com clientes e fornecedores e rastreie suas linhas do tempo operacionais.
          </p>
        </div>
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 py-3 px-5 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-[var(--color-brand-blue)] hover:bg-[var(--color-brand-blue-hover)] focus:outline-none transition-all cursor-pointer shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:scale-105"
          >
            <Plus size={18} />
            Novo Contato
          </button>
          
          {showDropdown && (
            <div className="absolute right-0 mt-2 w-48 bg-[var(--panel-bg)] border border-[var(--border-color)] rounded-xl shadow-2xl z-40 overflow-hidden animate-in fade-in slide-in-from-top-2">
              <button 
                onClick={() => openNewModal("cliente")}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left hover:bg-white/5 transition-colors cursor-pointer"
              >
                <div className="w-6 h-6 rounded-md bg-blue-500/10 flex items-center justify-center">
                  <Building className="w-3.5 h-3.5 text-blue-500" />
                </div>
                <span>Novo Cliente</span>
              </button>
              <button 
                onClick={() => openNewModal("fornecedor")}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left hover:bg-white/5 transition-colors cursor-pointer"
              >
                <div className="w-6 h-6 rounded-md bg-purple-500/10 flex items-center justify-center">
                  <Building2 className="w-3.5 h-3.5 text-purple-500" />
                </div>
                <span>Novo Fornecedor</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Pane Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left Pane - List of Contacts */}
        <div className="lg:col-span-4 glass-panel rounded-3xl p-6 flex flex-col min-h-[600px] border border-[var(--border-color)] shadow-sm">
          
          {/* Toggles */}
          <div className="flex p-1 bg-white/5 rounded-xl mb-6">
            <button
              onClick={() => setListTab("cliente")}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                listTab === "cliente" 
                  ? "bg-[var(--panel-bg)] text-blue-500 shadow-sm border border-[var(--border-color)]" 
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              Clientes ({clientesCount})
            </button>
            <button
              onClick={() => setListTab("fornecedor")}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                listTab === "fornecedor" 
                  ? "bg-[var(--panel-bg)] text-purple-500 shadow-sm border border-[var(--border-color)]" 
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              Fornecedores ({fornecedoresCount})
            </button>
          </div>
          
          {/* Search Bar & Filter */}
          <div className="flex gap-2 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text"
                placeholder="Buscar contatos..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-[var(--border-color)] rounded-xl bg-white/5 text-[var(--foreground)] placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)] focus:border-transparent transition-all text-sm"
              />
            </div>
            <button className="p-2.5 border border-[var(--border-color)] rounded-xl bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer">
              <Filter className="w-4 h-4" />
            </button>
          </div>

          {/* Contact List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[600px] custom-scrollbar">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-20 bg-white/5 animate-pulse rounded-xl" />
              ))
            ) : filteredClients.length === 0 ? (
              <div className="text-center py-12 text-gray-500 text-sm flex flex-col items-center">
                <Users className="w-8 h-8 mb-2 opacity-50" />
                Nenhum contato encontrado.
              </div>
            ) : (
              filteredClients.map((client) => {
                const isSelected = selectedClient?.id === client.id;
                const isCliente = (client.type || "cliente") === "cliente";
                return (
                  <div
                    key={client.id}
                    onClick={() => setSelectedClient(client)}
                    className={`flex flex-col p-4 rounded-xl cursor-pointer transition-all border ${
                      isSelected 
                        ? (isCliente ? "bg-blue-500/10 border-blue-500/30" : "bg-purple-500/10 border-purple-500/30") 
                        : "bg-white/5 border-transparent hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 truncate pr-2">
                        <p className={`font-semibold text-sm truncate ${isSelected ? (isCliente ? 'text-blue-400' : 'text-purple-400') : ''}`}>
                          {client.name}
                        </p>
                        <p className="text-xs text-gray-500 truncate mt-0.5">{client.email}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          isCliente 
                            ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" 
                            : "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                        }`}>
                          {isCliente ? "CLIENTE" : "FORNECEDOR"}
                        </span>
                        <button
                          onClick={(e) => handleDeleteClient(client.id, e)}
                          className="text-gray-500 hover:text-red-400 transition-colors cursor-pointer"
                          title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Pane - Detail View */}
        <div className="lg:col-span-8 glass-panel rounded-3xl flex flex-col min-h-[600px] border border-[var(--border-color)] overflow-hidden shadow-sm">
          {selectedClient ? (
            <>
              {/* Premium Header */}
              <div className="p-8 border-b border-[var(--border-color)] bg-gradient-to-b from-white/5 to-transparent">
                <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                  <div className="flex items-start gap-5">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border shadow-inner ${
                      (selectedClient.type || "cliente") === "cliente" 
                        ? "bg-gradient-to-br from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-400" 
                        : "bg-gradient-to-br from-purple-500/20 to-purple-600/10 border-purple-500/30 text-purple-400"
                    }`}>
                      {(selectedClient.type || "cliente") === "cliente" ? <Building className="w-7 h-7" /> : <Building2 className="w-7 h-7" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-2xl font-bold text-[var(--foreground)]">{selectedClient.name}</h3>
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold tracking-wider ${
                          (selectedClient.type || "cliente") === "cliente" 
                            ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" 
                            : "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                        }`}>
                          {(selectedClient.type || "cliente") === "cliente" ? "CLIENTE" : "FORNECEDOR"}
                        </span>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-3 text-sm text-gray-400">
                        <span className="flex items-center gap-1.5"><Mail className="w-4 h-4" /> {selectedClient.email}</span>
                        {selectedClient.document && <span className="flex items-center gap-1.5"><FileText className="w-4 h-4" /> {selectedClient.document}</span>}
                        {selectedClient.city_state && <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {selectedClient.city_state}</span>}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-3">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                      selectedClient.status === "active" 
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                        : selectedClient.status === "prospect" 
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/20" 
                        : "bg-gray-500/10 text-gray-400 border-gray-500/20"
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${selectedClient.status === 'active' ? 'bg-emerald-400' : selectedClient.status === 'prospect' ? 'bg-amber-400' : 'bg-gray-400'}`}></div>
                      {selectedClient.status.toUpperCase()}
                    </span>
                    <button
                      onClick={() => openEditModal(selectedClient)}
                      className="text-xs flex items-center gap-1 text-gray-400 hover:text-[var(--color-brand-blue)] transition-colors cursor-pointer"
                    >
                      <Pencil className="w-3 h-3" /> Editar Perfil
                    </button>
                  </div>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="px-8 border-b border-[var(--border-color)] overflow-x-auto no-scrollbar">
                <div className="flex gap-6 min-w-max">
                  {[
                    { id: "visao_geral", label: "Visão Geral" },
                    { id: "historico", label: "Histórico" },
                    { id: "financeiro", label: "Financeiro" },
                    { id: "servicos", label: "Serviços" },
                    { id: "arquivos", label: "Arquivos" },
                    { id: "observacoes", label: "Observações" }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setDetailsTab(tab.id as any)}
                      className={`py-4 text-sm font-medium transition-all relative whitespace-nowrap cursor-pointer ${
                        detailsTab === tab.id 
                          ? "text-[var(--color-brand-blue)]" 
                          : "text-gray-500 hover:text-gray-300"
                      }`}
                    >
                      {tab.label}
                      {detailsTab === tab.id && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-brand-blue)] rounded-t-full shadow-[0_-2px_10px_rgba(59,130,246,0.5)]"></div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab Content Area */}
              <div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-[var(--background)]/30">
                
                {detailsTab === "visao_geral" && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Informações Gerais Card */}
                      <div className="bg-[var(--panel-bg)] border border-[var(--border-color)] rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                        <h4 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">Informações Gerais</h4>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center py-2 border-b border-white/5">
                            <span className="text-sm text-gray-500 flex items-center gap-2"><Building className="w-4 h-4" /> Tipo</span>
                            <span className="text-sm font-medium capitalize">{selectedClient.type || "Cliente"}</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-white/5">
                            <span className="text-sm text-gray-500 flex items-center gap-2"><UserPlus className="w-4 h-4" /> Responsável</span>
                            <span className="text-sm font-medium">Admin User</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-white/5">
                            <span className="text-sm text-gray-500 flex items-center gap-2"><Phone className="w-4 h-4" /> Telefone</span>
                            <span className="text-sm font-medium">{selectedClient.phone || "-"}</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-white/5">
                            <span className="text-sm text-gray-500 flex items-center gap-2"><Globe className="w-4 h-4" /> Website</span>
                            <span className="text-sm font-medium text-[var(--color-brand-blue)] hover:underline cursor-pointer">{selectedClient.website || "-"}</span>
                          </div>
                        </div>
                      </div>

                      {/* Resumo do Relacionamento Card */}
                      <div className="bg-[var(--panel-bg)] border border-[var(--border-color)] rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col">
                        <h4 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">Resumo do Relacionamento</h4>
                        <div className="grid grid-cols-2 gap-4 flex-1">
                          <div className="bg-white/5 rounded-xl p-4 flex flex-col justify-center">
                            <span className="text-xs text-gray-500 mb-1">Negociações</span>
                            <span className="text-xl font-bold">0</span>
                          </div>
                          <div className="bg-white/5 rounded-xl p-4 flex flex-col justify-center">
                            <span className="text-xs text-gray-500 mb-1">Pedidos Ativos</span>
                            <span className="text-xl font-bold">0</span>
                          </div>
                          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex flex-col justify-center col-span-2">
                            <span className="text-xs text-emerald-400/70 mb-1">Faturamento Total</span>
                            <span className="text-2xl font-bold text-emerald-400">R$ 0,00</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-center mt-6">
                      <button 
                        onClick={() => setDetailsTab("historico")}
                        className="text-sm font-medium text-[var(--color-brand-blue)] hover:text-cyan-400 transition-colors flex items-center gap-2 bg-[var(--color-brand-blue)]/10 px-5 py-2.5 rounded-full"
                      >
                        <Clock className="w-4 h-4" />
                        Ver linha do tempo completa
                      </button>
                    </div>
                  </div>
                )}

                {detailsTab === "historico" && (
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <h4 className="text-lg font-bold mb-8 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-[var(--color-brand-blue)]" />
                      Linha do Tempo Operacional
                    </h4>

                    <div className="relative border-l-2 border-white/10 ml-4 space-y-10 py-4 max-w-2xl">
                      {timelineLoading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                          <div key={i} className="relative animate-pulse pl-8">
                            <div className="absolute -left-[11px] top-1 w-5 h-5 rounded-full bg-gray-400 border-4 border-[var(--background)]" />
                            <div className="space-y-2">
                              <div className="h-4 bg-gray-300 dark:bg-white/10 rounded w-1/2" />
                              <div className="h-3 bg-gray-300 dark:bg-white/10 rounded w-1/4" />
                            </div>
                          </div>
                        ))
                      ) : timeline.length === 0 ? (
                        <div className="pl-8 text-gray-500 text-sm">
                          Nenhum evento registrado nesta linha do tempo.
                        </div>
                      ) : (
                        timeline.map((event) => (
                          <div key={event.id} className="relative group pl-8">
                            {/* Event Bubble */}
                            <div className="absolute -left-[18px] top-0 w-9 h-9 rounded-full bg-[var(--panel-bg)] border-2 border-[var(--border-color)] flex items-center justify-center shadow-md group-hover:scale-110 group-hover:border-[var(--color-brand-blue)] transition-all z-10">
                              {getEventIcon(event.event_type)}
                            </div>
                            
                            {/* Event Content */}
                            <div className="bg-[var(--panel-bg)] border border-[var(--border-color)] p-5 rounded-2xl shadow-sm hover:shadow-md transition-all group-hover:border-[var(--color-brand-blue)]/30">
                              <div className="flex items-center justify-between mb-2">
                                <h5 className="font-semibold text-sm text-[var(--foreground)]">{event.description}</h5>
                                <span className="text-xs text-gray-500 flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-md">
                                  <Calendar className="w-3 h-3" />
                                  {new Date(event.created_at).toLocaleDateString("pt-BR", { day: '2-digit', month: 'short', year: 'numeric' })}
                                </span>
                              </div>
                              <p className="text-xs text-gray-400">
                                Registrado às {new Date(event.created_at).toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' })}
                              </p>
                              {event.metadata && (
                                <div className="mt-4 p-3 rounded-xl bg-black/20 border border-white/5 text-xs text-[var(--color-brand-blue)] font-mono overflow-x-auto">
                                  {JSON.stringify(event.metadata)}
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* Placeholders for other tabs */}
                {["financeiro", "servicos", "arquivos", "observacoes"].includes(detailsTab) && (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500 py-12 animate-in fade-in">
                    <Briefcase className="w-12 h-12 mb-4 opacity-20" />
                    <p className="font-medium">Módulo em desenvolvimento</p>
                    <p className="text-sm mt-1">Esta área será integrada com as demais ferramentas da plataforma em breve.</p>
                  </div>
                )}

              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-8">
              <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4">
                <Users className="w-10 h-10 stroke-[1.5]" />
              </div>
              <h3 className="text-lg font-semibold text-gray-300 mb-1">Nenhum Contato Selecionado</h3>
              <p className="text-sm text-center max-w-sm">Selecione um cliente ou fornecedor na lista lateral para visualizar seu hub operacional completo.</p>
            </div>
          )}
        </div>
      </div>

      {/* New Contact Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass-panel w-full max-w-2xl rounded-3xl p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              {newType === "cliente" ? <Building className="w-5 h-5 text-blue-500" /> : <Building2 className="w-5 h-5 text-purple-500" />}
              Adicionar Novo {newType === "cliente" ? "Cliente" : "Fornecedor"}
            </h3>
            
            <form onSubmit={handleCreateClient} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-sm font-medium text-gray-300">Razão Social / Nome *</label>
                  <input 
                    type="text" 
                    required
                    value={newName} 
                    onChange={e => setNewName(e.target.value)}
                    className="w-full px-4 py-2.5 border border-[var(--border-color)] rounded-xl bg-white/5 text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)] focus:border-transparent text-sm transition-all"
                    placeholder="Ex: Stark Industries"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-300">E-mail de Contato *</label>
                  <input 
                    type="email" 
                    required
                    value={newEmail} 
                    onChange={e => setNewEmail(e.target.value)}
                    className="w-full px-4 py-2.5 border border-[var(--border-color)] rounded-xl bg-white/5 text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)] focus:border-transparent text-sm transition-all"
                    placeholder="Ex: contato@empresa.com"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-300">Documento (CNPJ/CPF)</label>
                  <input 
                    type="text" 
                    value={newDoc} 
                    onChange={e => setNewDoc(e.target.value)}
                    className="w-full px-4 py-2.5 border border-[var(--border-color)] rounded-xl bg-white/5 text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)] focus:border-transparent text-sm transition-all"
                    placeholder="00.000.000/0001-00"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-300">Telefone</label>
                  <input 
                    type="text" 
                    value={newPhone} 
                    onChange={e => setNewPhone(e.target.value)}
                    className="w-full px-4 py-2.5 border border-[var(--border-color)] rounded-xl bg-white/5 text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)] focus:border-transparent text-sm transition-all"
                    placeholder="(00) 00000-0000"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-300">Cidade / Estado</label>
                  <input 
                    type="text" 
                    value={newCityState} 
                    onChange={e => setNewCityState(e.target.value)}
                    className="w-full px-4 py-2.5 border border-[var(--border-color)] rounded-xl bg-white/5 text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)] focus:border-transparent text-sm transition-all"
                    placeholder="Ex: São Paulo, SP"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-300">Website</label>
                  <input 
                    type="text" 
                    value={newWebsite} 
                    onChange={e => setNewWebsite(e.target.value)}
                    className="w-full px-4 py-2.5 border border-[var(--border-color)] rounded-xl bg-white/5 text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)] focus:border-transparent text-sm transition-all"
                    placeholder="www.empresa.com.br"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-300">Status</label>
                  <select 
                    value={newStatus} 
                    onChange={e => setNewStatus(e.target.value as any)}
                    className="w-full px-4 py-2.5 border border-[var(--border-color)] rounded-xl bg-white/5 text-[var(--foreground)] dark:bg-[#0f1115] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)] focus:border-transparent text-sm transition-all"
                  >
                    <option value="prospect">Lead / Prospect</option>
                    <option value="active">Ativo</option>
                    <option value="inactive">Inativo</option>
                  </select>
                </div>
              </div>

              {errorMessage && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm mt-4">
                  {errorMessage}
                </div>
              )}
              
              <div className="flex justify-end gap-3 pt-6 border-t border-[var(--border-color)] mt-8">
                <button 
                  type="button" 
                  onClick={() => { setShowModal(false); setErrorMessage(""); }}
                  className="px-5 py-2.5 rounded-xl border border-[var(--border-color)] text-gray-400 hover:text-white hover:bg-white/5 text-sm font-medium transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[var(--color-brand-blue)] hover:bg-[var(--color-brand-blue-hover)] text-white text-sm font-medium transition-all cursor-pointer shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:scale-105"
                >
                  Cadastrar {newType === "cliente" ? "Cliente" : "Fornecedor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Contact Modal */}
      {editingClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass-panel w-full max-w-2xl rounded-3xl p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Pencil className="w-5 h-5 text-gray-400" />
              Editar Perfil de Contato
            </h3>
            
            <form onSubmit={handleEditClient} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-sm font-medium text-gray-300">Razão Social / Nome *</label>
                  <input 
                    type="text" 
                    required
                    value={editName} 
                    onChange={e => setEditName(e.target.value)}
                    className="w-full px-4 py-2.5 border border-[var(--border-color)] rounded-xl bg-white/5 text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)] focus:border-transparent text-sm transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-300">E-mail de Contato *</label>
                  <input 
                    type="email" 
                    required
                    value={editEmail} 
                    onChange={e => setEditEmail(e.target.value)}
                    className="w-full px-4 py-2.5 border border-[var(--border-color)] rounded-xl bg-white/5 text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)] focus:border-transparent text-sm transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-300">Documento (CNPJ/CPF)</label>
                  <input 
                    type="text" 
                    value={editDoc} 
                    onChange={e => setEditDoc(e.target.value)}
                    className="w-full px-4 py-2.5 border border-[var(--border-color)] rounded-xl bg-white/5 text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)] focus:border-transparent text-sm transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-300">Telefone</label>
                  <input 
                    type="text" 
                    value={editPhone} 
                    onChange={e => setEditPhone(e.target.value)}
                    className="w-full px-4 py-2.5 border border-[var(--border-color)] rounded-xl bg-white/5 text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)] focus:border-transparent text-sm transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-300">Cidade / Estado</label>
                  <input 
                    type="text" 
                    value={editCityState} 
                    onChange={e => setEditCityState(e.target.value)}
                    className="w-full px-4 py-2.5 border border-[var(--border-color)] rounded-xl bg-white/5 text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)] focus:border-transparent text-sm transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-300">Website</label>
                  <input 
                    type="text" 
                    value={editWebsite} 
                    onChange={e => setEditWebsite(e.target.value)}
                    className="w-full px-4 py-2.5 border border-[var(--border-color)] rounded-xl bg-white/5 text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)] focus:border-transparent text-sm transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-300">Tipo de Contato</label>
                  <select 
                    value={editType} 
                    onChange={e => setEditType(e.target.value as any)}
                    className="w-full px-4 py-2.5 border border-[var(--border-color)] rounded-xl bg-white/5 text-[var(--foreground)] dark:bg-[#0f1115] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)] focus:border-transparent text-sm transition-all"
                  >
                    <option value="cliente">Cliente</option>
                    <option value="fornecedor">Fornecedor</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-300">Status</label>
                  <select 
                    value={editStatus} 
                    onChange={e => setEditStatus(e.target.value as any)}
                    className="w-full px-4 py-2.5 border border-[var(--border-color)] rounded-xl bg-white/5 text-[var(--foreground)] dark:bg-[#0f1115] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)] focus:border-transparent text-sm transition-all"
                  >
                    <option value="prospect">Lead / Prospect</option>
                    <option value="active">Ativo</option>
                    <option value="inactive">Inativo</option>
                  </select>
                </div>
              </div>

              {editErrorMessage && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm mt-4">
                  {editErrorMessage}
                </div>
              )}
              
              <div className="flex justify-end gap-3 pt-6 border-t border-[var(--border-color)] mt-8">
                <button 
                  type="button" 
                  onClick={() => setEditingClient(null)}
                  className="px-5 py-2.5 rounded-xl border border-[var(--border-color)] text-gray-400 hover:text-white hover:bg-white/5 text-sm font-medium transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[var(--color-brand-blue)] hover:bg-[var(--color-brand-blue-hover)] text-white text-sm font-medium transition-all cursor-pointer shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:scale-105"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

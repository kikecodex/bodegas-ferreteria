"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
    ArrowLeft,
    Building2,
    CreditCard,
    Users,
    Package,
    ShoppingCart,
    CheckCircle,
    XCircle,
    Calendar,
    Loader2,
    Save,
    Plus,
    Receipt,
    Clock,
    DollarSign
} from "lucide-react";

interface Tenant {
    id: string;
    name: string;
    slug: string;
    ruc: string | null;
    tradeName: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
    plan: string;
    planExpiresAt: string | null;
    trialEndsAt: string | null;
    isActive: boolean;
    createdAt: string;
    _count: {
        users: number;
        products: number;
        sales: number;
        clients: number;
        suppliers: number;
    };
    payments: Payment[];
    users: { id: string; name: string; email: string; role: string; isActive: boolean }[];
}

interface Payment {
    id: string;
    amount: number;
    method: string;
    reference: string | null;
    notes: string | null;
    periodStart: string | null;
    periodEnd: string | null;
    createdAt: string;
}

export default function TenantDetailPage() {
    const router = useRouter();
    const params = useParams();
    const tenantId = params.id as string;

    const [tenant, setTenant] = useState<Tenant | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);

    // Form states
    const [paymentForm, setPaymentForm] = useState({
        amount: "30",
        method: "YAPE",
        reference: "",
        notes: "",
        months: 1
    });

    useEffect(() => {
        fetchTenant();
    }, [tenantId]);

    const fetchTenant = async () => {
        try {
            const res = await fetch(`/api/admin/tenants/${tenantId}`);
            if (res.ok) {
                const data = await res.json();
                setTenant(data.tenant);
            } else {
                router.push("/admin");
            }
        } catch {
            router.push("/admin");
        } finally {
            setLoading(false);
        }
    };

    const handleActivate = async () => {
        if (!tenant) return;
        setSaving(true);
        try {
            const res = await fetch(`/api/admin/tenants/${tenantId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isActive: !tenant.isActive })
            });
            if (res.ok) {
                fetchTenant();
            }
        } catch (error) {
            console.error("Error updating tenant:", error);
        } finally {
            setSaving(false);
        }
    };

    const handleRegisterPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch("/api/admin/payments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    tenantId,
                    ...paymentForm
                })
            });
            if (res.ok) {
                setShowPaymentModal(false);
                setPaymentForm({ amount: "30", method: "YAPE", reference: "", notes: "", months: 1 });
                fetchTenant();
            }
        } catch (error) {
            console.error("Error registering payment:", error);
        } finally {
            setSaving(false);
        }
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return "N/A";
        return new Date(dateStr).toLocaleDateString("es-PE", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    };

    const formatCurrency = (amount: number) => {
        return `S/${amount.toFixed(2)}`;
    };

    const isExpired = (dateStr: string | null) => {
        if (!dateStr) return true;
        return new Date(dateStr) < new Date();
    };

    const getPlanBadge = (plan: string) => {
        const styles: Record<string, string> = {
            TRIAL: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
            ACTIVO: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
            SUSPENDIDO: "bg-red-500/20 text-red-400 border-red-500/30",
        };
        return styles[plan] || "bg-slate-500/20 text-slate-400 border-slate-500/30";
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
            </div>
        );
    }

    if (!tenant) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            {/* Header */}
            <header className="bg-white/5 backdrop-blur-xl border-b border-white/10">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push("/admin")}
                            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-slate-400" />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-white">{tenant.name}</h1>
                            <p className="text-sm text-slate-400">{tenant.slug}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className={`px-4 py-2 rounded-full text-sm font-medium border ${getPlanBadge(tenant.plan)}`}>
                            {tenant.plan}
                        </span>
                        <button
                            onClick={handleActivate}
                            disabled={saving}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${tenant.isActive
                                    ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                                    : "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                                }`}
                        >
                            {tenant.isActive ? "Suspender" : "Activar"}
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4">
                        <div className="flex items-center gap-3">
                            <Users className="w-5 h-5 text-blue-400" />
                            <div>
                                <p className="text-xl font-bold text-white">{tenant._count.users}</p>
                                <p className="text-xs text-slate-400">Usuarios</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4">
                        <div className="flex items-center gap-3">
                            <Package className="w-5 h-5 text-purple-400" />
                            <div>
                                <p className="text-xl font-bold text-white">{tenant._count.products}</p>
                                <p className="text-xs text-slate-400">Productos</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4">
                        <div className="flex items-center gap-3">
                            <ShoppingCart className="w-5 h-5 text-emerald-400" />
                            <div>
                                <p className="text-xl font-bold text-white">{tenant._count.sales}</p>
                                <p className="text-xs text-slate-400">Ventas</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4">
                        <div className="flex items-center gap-3">
                            <Users className="w-5 h-5 text-orange-400" />
                            <div>
                                <p className="text-xl font-bold text-white">{tenant._count.clients}</p>
                                <p className="text-xs text-slate-400">Clientes</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4">
                        <div className="flex items-center gap-3">
                            <Calendar className="w-5 h-5 text-pink-400" />
                            <div>
                                <p className={`text-sm font-bold ${isExpired(tenant.planExpiresAt) ? "text-red-400" : "text-white"}`}>
                                    {formatDate(tenant.planExpiresAt)}
                                </p>
                                <p className="text-xs text-slate-400">Vence</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Subscription Card */}
                    <div className="lg:col-span-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                                <CreditCard className="w-5 h-5 text-emerald-400" />
                                Suscripción y Pagos
                            </h2>
                            <button
                                onClick={() => setShowPaymentModal(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                Registrar Pago
                            </button>
                        </div>

                        {/* Current Status */}
                        <div className={`p-4 rounded-xl mb-6 ${isExpired(tenant.planExpiresAt)
                                ? "bg-red-500/10 border border-red-500/30"
                                : "bg-emerald-500/10 border border-emerald-500/30"
                            }`}>
                            <div className="flex items-center gap-3">
                                {isExpired(tenant.planExpiresAt) ? (
                                    <XCircle className="w-6 h-6 text-red-400" />
                                ) : (
                                    <CheckCircle className="w-6 h-6 text-emerald-400" />
                                )}
                                <div>
                                    <p className={`font-medium ${isExpired(tenant.planExpiresAt) ? "text-red-400" : "text-emerald-400"}`}>
                                        {isExpired(tenant.planExpiresAt) ? "Suscripción Vencida" : "Suscripción Activa"}
                                    </p>
                                    <p className="text-sm text-slate-400">
                                        {isExpired(tenant.planExpiresAt)
                                            ? "El negocio no tiene acceso al sistema"
                                            : `Válida hasta ${formatDate(tenant.planExpiresAt)}`}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Payment History */}
                        <h3 className="text-sm font-medium text-slate-400 mb-3">Historial de Pagos</h3>
                        {tenant.payments.length === 0 ? (
                            <div className="text-center py-8">
                                <Receipt className="w-10 h-10 text-slate-500 mx-auto mb-3" />
                                <p className="text-slate-400">No hay pagos registrados</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {tenant.payments.map((payment) => (
                                    <div key={payment.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${payment.method === "YAPE"
                                                    ? "bg-purple-500/20"
                                                    : "bg-blue-500/20"
                                                }`}>
                                                <DollarSign className={`w-5 h-5 ${payment.method === "YAPE"
                                                        ? "text-purple-400"
                                                        : "text-blue-400"
                                                    }`} />
                                            </div>
                                            <div>
                                                <p className="text-white font-medium">{formatCurrency(payment.amount)}</p>
                                                <p className="text-xs text-slate-400">
                                                    {payment.method} {payment.reference && `• ${payment.reference}`}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm text-slate-300">{formatDate(payment.createdAt)}</p>
                                            <p className="text-xs text-slate-500">
                                                {formatDate(payment.periodStart)} - {formatDate(payment.periodEnd)}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Business Info */}
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                        <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-6">
                            <Building2 className="w-5 h-5 text-blue-400" />
                            Datos del Negocio
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <p className="text-xs text-slate-400 uppercase tracking-wide">Nombre</p>
                                <p className="text-white">{tenant.name}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 uppercase tracking-wide">RUC</p>
                                <p className="text-white">{tenant.ruc || "No registrado"}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 uppercase tracking-wide">Dirección</p>
                                <p className="text-white">{tenant.address || "No registrada"}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 uppercase tracking-wide">Teléfono</p>
                                <p className="text-white">{tenant.phone || "No registrado"}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 uppercase tracking-wide">Email</p>
                                <p className="text-white">{tenant.email || "No registrado"}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 uppercase tracking-wide">Registrado</p>
                                <p className="text-white">{formatDate(tenant.createdAt)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Payment Modal */}
            {showPaymentModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-slate-800 border border-white/10 rounded-2xl w-full max-w-md mx-4 p-6">
                        <h3 className="text-xl font-bold text-white mb-6">Registrar Pago</h3>
                        <form onSubmit={handleRegisterPayment} className="space-y-4">
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">Monto (S/)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={paymentForm.amount}
                                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:border-emerald-500 focus:outline-none"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">Método de Pago</label>
                                <select
                                    value={paymentForm.method}
                                    onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:border-emerald-500 focus:outline-none"
                                >
                                    <option value="YAPE">Yape</option>
                                    <option value="TRANSFERENCIA">Transferencia</option>
                                    <option value="EFECTIVO">Efectivo</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">Referencia / # Operación</label>
                                <input
                                    type="text"
                                    value={paymentForm.reference}
                                    onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                                    placeholder="Ej: 12345678"
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">Meses a extender</label>
                                <select
                                    value={paymentForm.months}
                                    onChange={(e) => setPaymentForm({ ...paymentForm, months: parseInt(e.target.value) })}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:border-emerald-500 focus:outline-none"
                                >
                                    <option value={1}>1 mes</option>
                                    <option value={3}>3 meses</option>
                                    <option value={6}>6 meses</option>
                                    <option value={12}>12 meses</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">Notas (opcional)</label>
                                <textarea
                                    value={paymentForm.notes}
                                    onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                                    rows={2}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none resize-none"
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowPaymentModal(false)}
                                    className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg font-medium transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 px-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                                >
                                    {saving ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <>
                                            <Save className="w-5 h-5" />
                                            Registrar
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

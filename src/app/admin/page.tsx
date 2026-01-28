"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
    Building2,
    Users,
    CreditCard,
    Shield,
    ChevronRight,
    CheckCircle,
    XCircle,
    Clock,
    DollarSign,
    Calendar,
    Loader2,
    Plus,
    X,
    Upload,
    Eye,
    EyeOff
} from "lucide-react";

interface Tenant {
    id: string;
    name: string;
    slug: string;
    ruc: string | null;
    logo: string | null;
    plan: string;
    planExpiresAt: string | null;
    trialEndsAt: string | null;
    isActive: boolean;
    createdAt: string;
    _count: {
        users: number;
        products: number;
        sales: number;
    };
}

interface NewTenantForm {
    name: string;
    slug: string;
    ruc: string;
    tradeName: string;
    phone: string;
    email: string;
    address: string;
    plan: string;
    adminName: string;
    adminEmail: string;
    adminPassword: string;
    logo: string;
}

export default function AdminPage() {
    const router = useRouter();
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [creating, setCreating] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [form, setForm] = useState<NewTenantForm>({
        name: "",
        slug: "",
        ruc: "",
        tradeName: "",
        phone: "",
        email: "",
        address: "",
        plan: "TRIAL",
        adminName: "",
        adminEmail: "",
        adminPassword: "",
        logo: ""
    });

    useEffect(() => {
        checkAccess();
    }, []);

    const checkAccess = async () => {
        try {
            const res = await fetch("/api/admin/check-access");
            if (!res.ok) {
                router.push("/login");
                return;
            }
            const data = await res.json();
            if (!data.isSuperAdmin) {
                router.push("/");
                return;
            }
            setIsSuperAdmin(true);
            fetchTenants();
        } catch {
            router.push("/login");
        }
    };

    const fetchTenants = async () => {
        try {
            const res = await fetch("/api/admin/tenants");
            if (res.ok) {
                const data = await res.json();
                setTenants(data.tenants || []);
            }
        } catch (error) {
            console.error("Error fetching tenants:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Preview local
        const reader = new FileReader();
        reader.onloadend = () => {
            setLogoPreview(reader.result as string);
        };
        reader.readAsDataURL(file);

        // Upload
        setUploadingLogo(true);
        try {
            const formData = new FormData();
            formData.append("file", file);

            const res = await fetch("/api/admin/upload-logo", {
                method: "POST",
                body: formData
            });

            if (res.ok) {
                const data = await res.json();
                setForm(prev => ({ ...prev, logo: data.logoUrl }));
            } else {
                const error = await res.json();
                alert(error.error || "Error al subir logo");
            }
        } catch (error) {
            console.error("Error uploading logo:", error);
            alert("Error al subir logo");
        } finally {
            setUploadingLogo(false);
        }
    };

    const handleCreateTenant = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);

        try {
            const res = await fetch("/api/admin/tenants", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form)
            });

            const data = await res.json();

            if (res.ok) {
                setShowModal(false);
                setForm({
                    name: "",
                    slug: "",
                    ruc: "",
                    tradeName: "",
                    phone: "",
                    email: "",
                    address: "",
                    plan: "TRIAL",
                    adminName: "",
                    adminEmail: "",
                    adminPassword: "",
                    logo: ""
                });
                setLogoPreview(null);
                fetchTenants();
                alert(data.message || "Negocio creado exitosamente");
            } else {
                alert(data.error || "Error al crear negocio");
            }
        } catch (error) {
            console.error("Error creating tenant:", error);
            alert("Error al crear negocio");
        } finally {
            setCreating(false);
        }
    };

    const generateSlug = (name: string) => {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "");
    };

    const getPlanBadge = (plan: string) => {
        const styles: Record<string, string> = {
            TRIAL: "bg-yellow-500/20 text-yellow-400",
            ACTIVO: "bg-emerald-500/20 text-emerald-400",
            SUSPENDIDO: "bg-red-500/20 text-red-400",
        };
        return styles[plan] || "bg-slate-500/20 text-slate-400";
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return "N/A";
        return new Date(dateStr).toLocaleDateString("es-PE", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    };

    const isExpired = (dateStr: string | null) => {
        if (!dateStr) return false;
        return new Date(dateStr) < new Date();
    };

    if (!isSuperAdmin) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            {/* Header */}
            <header className="bg-white/5 backdrop-blur-xl border-b border-white/10">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                            <Shield className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-white">Super Admin</h1>
                            <p className="text-sm text-slate-400">Panel de Administración</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all"
                        >
                            <Plus className="w-4 h-4" />
                            Nuevo Cliente
                        </button>
                        <button
                            onClick={() => router.push("/")}
                            className="text-slate-400 hover:text-white transition-colors"
                        >
                            Volver al Dashboard
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8">
                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                                <Building2 className="w-6 h-6 text-blue-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-white">{tenants.length}</p>
                                <p className="text-sm text-slate-400">Negocios</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                                <CheckCircle className="w-6 h-6 text-emerald-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-white">
                                    {tenants.filter(t => t.plan === "ACTIVO").length}
                                </p>
                                <p className="text-sm text-slate-400">Activos</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                                <Clock className="w-6 h-6 text-yellow-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-white">
                                    {tenants.filter(t => t.plan === "TRIAL").length}
                                </p>
                                <p className="text-sm text-slate-400">En Trial</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                                <DollarSign className="w-6 h-6 text-green-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-white">
                                    S/{tenants.filter(t => t.plan === "ACTIVO").length * 30}
                                </p>
                                <p className="text-sm text-slate-400">MRR</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tenants Table */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
                    <div className="p-6 border-b border-white/10">
                        <h2 className="text-lg font-semibold text-white">Negocios Registrados</h2>
                    </div>

                    {loading ? (
                        <div className="p-12 flex items-center justify-center">
                            <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
                        </div>
                    ) : tenants.length === 0 ? (
                        <div className="p-12 text-center">
                            <Building2 className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                            <p className="text-slate-400">No hay negocios registrados aún</p>
                            <button
                                onClick={() => setShowModal(true)}
                                className="mt-4 px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors"
                            >
                                Crear primer cliente
                            </button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-white/10">
                                        <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Negocio</th>
                                        <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Plan</th>
                                        <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Vence</th>
                                        <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Usuarios</th>
                                        <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Productos</th>
                                        <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Ventas</th>
                                        <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tenants.map((tenant) => (
                                        <tr key={tenant.id} className="border-b border-white/5 hover:bg-white/5">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    {tenant.logo ? (
                                                        <Image
                                                            src={tenant.logo}
                                                            alt={tenant.name}
                                                            width={40}
                                                            height={40}
                                                            className="w-10 h-10 rounded-lg object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center">
                                                            <Building2 className="w-5 h-5 text-slate-400" />
                                                        </div>
                                                    )}
                                                    <div>
                                                        <p className="text-white font-medium">{tenant.name}</p>
                                                        <p className="text-sm text-slate-500">{tenant.slug}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPlanBadge(tenant.plan)}`}>
                                                    {tenant.plan}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    {isExpired(tenant.planExpiresAt) ? (
                                                        <XCircle className="w-4 h-4 text-red-400" />
                                                    ) : (
                                                        <Calendar className="w-4 h-4 text-slate-400" />
                                                    )}
                                                    <span className={isExpired(tenant.planExpiresAt) ? "text-red-400" : "text-slate-300"}>
                                                        {formatDate(tenant.planExpiresAt)}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <Users className="w-4 h-4 text-slate-400" />
                                                    <span className="text-slate-300">{tenant._count?.users || 0}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-300">{tenant._count?.products || 0}</td>
                                            <td className="px-6 py-4 text-slate-300">{tenant._count?.sales || 0}</td>
                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={() => router.push(`/admin/tenants/${tenant.id}`)}
                                                    className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300"
                                                >
                                                    Ver <ChevronRight className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>

            {/* Modal Crear Tenant */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-white/10 flex items-center justify-between sticky top-0 bg-slate-800 z-10">
                            <div>
                                <h2 className="text-xl font-bold text-white">Nuevo Cliente</h2>
                                <p className="text-sm text-slate-400">Crear nuevo negocio en la plataforma</p>
                            </div>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateTenant} className="p-6 space-y-6">
                            {/* Logo Upload */}
                            <div className="flex items-center gap-6">
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-24 h-24 rounded-2xl border-2 border-dashed border-white/20 flex items-center justify-center cursor-pointer hover:border-emerald-500/50 transition-colors overflow-hidden"
                                >
                                    {logoPreview ? (
                                        <Image
                                            src={logoPreview}
                                            alt="Logo preview"
                                            width={96}
                                            height={96}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : uploadingLogo ? (
                                        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                                    ) : (
                                        <Upload className="w-8 h-8 text-slate-400" />
                                    )}
                                </div>
                                <div>
                                    <p className="text-white font-medium">Logo del negocio</p>
                                    <p className="text-sm text-slate-400">JPG, PNG o WEBP. Máximo 2MB</p>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        onChange={handleLogoUpload}
                                        className="hidden"
                                    />
                                </div>
                            </div>

                            {/* Datos del Negocio */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Datos del Negocio</h3>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-slate-300 mb-1">Nombre del negocio *</label>
                                        <input
                                            type="text"
                                            value={form.name}
                                            onChange={(e) => {
                                                setForm(prev => ({
                                                    ...prev,
                                                    name: e.target.value,
                                                    slug: generateSlug(e.target.value)
                                                }));
                                            }}
                                            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                                            placeholder="Ferretería Don Pedro"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-slate-300 mb-1">Identificador (slug)</label>
                                        <input
                                            type="text"
                                            value={form.slug}
                                            onChange={(e) => setForm(prev => ({ ...prev, slug: e.target.value }))}
                                            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                                            placeholder="ferreteria-don-pedro"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-slate-300 mb-1">RUC</label>
                                        <input
                                            type="text"
                                            value={form.ruc}
                                            onChange={(e) => setForm(prev => ({ ...prev, ruc: e.target.value }))}
                                            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                                            placeholder="20123456789"
                                            maxLength={11}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-slate-300 mb-1">Nombre comercial</label>
                                        <input
                                            type="text"
                                            value={form.tradeName}
                                            onChange={(e) => setForm(prev => ({ ...prev, tradeName: e.target.value }))}
                                            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                                            placeholder="Don Pedro"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-slate-300 mb-1">Teléfono</label>
                                        <input
                                            type="tel"
                                            value={form.phone}
                                            onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
                                            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                                            placeholder="999 888 777"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-slate-300 mb-1">Email del negocio</label>
                                        <input
                                            type="email"
                                            value={form.email}
                                            onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                                            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                                            placeholder="contacto@ferreteria.com"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm text-slate-300 mb-1">Dirección</label>
                                    <input
                                        type="text"
                                        value={form.address}
                                        onChange={(e) => setForm(prev => ({ ...prev, address: e.target.value }))}
                                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                                        placeholder="Av. Principal 123, Lima"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm text-slate-300 mb-1">Plan</label>
                                    <select
                                        value={form.plan}
                                        onChange={(e) => setForm(prev => ({ ...prev, plan: e.target.value }))}
                                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                                    >
                                        <option value="TRIAL" className="bg-slate-800">Trial (14 días gratis)</option>
                                        <option value="ACTIVO" className="bg-slate-800">Activo (S/30/mes)</option>
                                    </select>
                                </div>
                            </div>

                            {/* Usuario Administrador */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Usuario Administrador</h3>

                                <div>
                                    <label className="block text-sm text-slate-300 mb-1">Nombre del administrador</label>
                                    <input
                                        type="text"
                                        value={form.adminName}
                                        onChange={(e) => setForm(prev => ({ ...prev, adminName: e.target.value }))}
                                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                                        placeholder="Juan Pérez"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm text-slate-300 mb-1">Email del administrador *</label>
                                    <input
                                        type="email"
                                        value={form.adminEmail}
                                        onChange={(e) => setForm(prev => ({ ...prev, adminEmail: e.target.value }))}
                                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                                        placeholder="admin@ferreteria.com"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm text-slate-300 mb-1">Contraseña *</label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={form.adminPassword}
                                            onChange={(e) => setForm(prev => ({ ...prev, adminPassword: e.target.value }))}
                                            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 pr-12"
                                            placeholder="••••••••"
                                            required
                                            minLength={6}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                                        >
                                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Botones */}
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 px-4 py-3 bg-white/5 text-slate-300 rounded-xl hover:bg-white/10 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {creating ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Creando...
                                        </>
                                    ) : (
                                        <>
                                            <Plus className="w-5 h-5" />
                                            Crear Cliente
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

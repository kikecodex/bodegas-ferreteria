"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, User, Lock, Mail, Phone, MapPin, FileText, Loader2 } from "lucide-react";

export default function RegisterPage() {
    const router = useRouter();
    const [step, setStep] = useState(1); // 1: negocio, 2: admin
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Datos del negocio
    const [businessName, setBusinessName] = useState("");
    const [businessRuc, setBusinessRuc] = useState("");
    const [businessPhone, setBusinessPhone] = useState("");
    const [businessEmail, setBusinessEmail] = useState("");
    const [businessAddress, setBusinessAddress] = useState("");

    // Datos del admin
    const [adminName, setAdminName] = useState("");
    const [adminEmail, setAdminEmail] = useState("");
    const [adminPassword, setAdminPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (step === 1) {
            if (!businessName.trim()) {
                setError("El nombre del negocio es requerido");
                return;
            }
            setStep(2);
            setError("");
            return;
        }

        // Step 2: validar y enviar
        if (!adminName.trim() || !adminEmail.trim() || !adminPassword) {
            setError("Todos los campos son requeridos");
            return;
        }

        if (adminPassword !== confirmPassword) {
            setError("Las contraseñas no coinciden");
            return;
        }

        if (adminPassword.length < 6) {
            setError("La contraseña debe tener al menos 6 caracteres");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    businessName,
                    businessRuc,
                    businessPhone,
                    businessEmail,
                    businessAddress,
                    adminName,
                    adminEmail,
                    adminPassword,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Error al registrar");
                return;
            }

            // Éxito - redirigir a login
            router.push("/login?registered=true");
        } catch {
            setError("Error de conexión");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-500 mb-4">
                        <Building2 className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">Crear tu Negocio</h1>
                    <p className="text-slate-400 mt-2">
                        {step === 1 ? "Información del negocio" : "Crea tu cuenta de administrador"}
                    </p>
                </div>

                {/* Progress */}
                <div className="flex items-center justify-center gap-2 mb-8">
                    <div className={`w-3 h-3 rounded-full ${step >= 1 ? "bg-emerald-400" : "bg-slate-600"}`} />
                    <div className={`w-16 h-1 rounded ${step >= 2 ? "bg-emerald-400" : "bg-slate-600"}`} />
                    <div className={`w-3 h-3 rounded-full ${step >= 2 ? "bg-emerald-400" : "bg-slate-600"}`} />
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg mb-6">
                            {error}
                        </div>
                    )}

                    {step === 1 ? (
                        <div className="space-y-4">
                            {/* Nombre del negocio */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Nombre del Negocio *
                                </label>
                                <div className="relative">
                                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input
                                        type="text"
                                        value={businessName}
                                        onChange={(e) => setBusinessName(e.target.value)}
                                        placeholder="Ej: Ferretería Don Pedro"
                                        className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
                                    />
                                </div>
                            </div>

                            {/* RUC */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    RUC (opcional)
                                </label>
                                <div className="relative">
                                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input
                                        type="text"
                                        value={businessRuc}
                                        onChange={(e) => setBusinessRuc(e.target.value)}
                                        placeholder="20123456789"
                                        maxLength={11}
                                        className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
                                    />
                                </div>
                            </div>

                            {/* Teléfono */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Teléfono (opcional)
                                </label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input
                                        type="tel"
                                        value={businessPhone}
                                        onChange={(e) => setBusinessPhone(e.target.value)}
                                        placeholder="999 888 777"
                                        className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
                                    />
                                </div>
                            </div>

                            {/* Dirección */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Dirección (opcional)
                                </label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input
                                        type="text"
                                        value={businessAddress}
                                        onChange={(e) => setBusinessAddress(e.target.value)}
                                        placeholder="Av. Principal 123"
                                        className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
                                    />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Nombre admin */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Tu Nombre *
                                </label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input
                                        type="text"
                                        value={adminName}
                                        onChange={(e) => setAdminName(e.target.value)}
                                        placeholder="Juan Pérez"
                                        className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
                                    />
                                </div>
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Email *
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input
                                        type="email"
                                        value={adminEmail}
                                        onChange={(e) => setAdminEmail(e.target.value)}
                                        placeholder="tu@email.com"
                                        className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
                                    />
                                </div>
                            </div>

                            {/* Contraseña */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Contraseña *
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input
                                        type="password"
                                        value={adminPassword}
                                        onChange={(e) => setAdminPassword(e.target.value)}
                                        placeholder="Mínimo 6 caracteres"
                                        className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
                                    />
                                </div>
                            </div>

                            {/* Confirmar contraseña */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Confirmar Contraseña *
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Repite tu contraseña"
                                        className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Buttons */}
                    <div className="flex gap-3 mt-6">
                        {step === 2 && (
                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                className="flex-1 py-3 bg-white/5 border border-white/10 text-white rounded-xl font-medium hover:bg-white/10 transition-colors"
                            >
                                Atrás
                            </button>
                        )}
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 py-3 bg-gradient-to-r from-emerald-400 to-cyan-500 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-emerald-500/25 transition-all flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : step === 1 ? (
                                "Continuar"
                            ) : (
                                "Crear Negocio"
                            )}
                        </button>
                    </div>

                    {/* Trial info */}
                    <div className="mt-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                        <p className="text-sm text-emerald-400 text-center">
                            🎉 <strong>7 días de prueba gratis</strong> incluidos
                        </p>
                    </div>

                    {/* Login link */}
                    <p className="text-center text-slate-400 mt-6">
                        ¿Ya tienes cuenta?{" "}
                        <a href="/login" className="text-emerald-400 hover:underline">
                            Iniciar sesión
                        </a>
                    </p>
                </form>
            </div>
        </div>
    );
}

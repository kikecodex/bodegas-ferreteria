"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Lock, Mail, Eye, EyeOff } from "lucide-react";

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirect = searchParams.get("redirect") || "/";

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Error al iniciar sesión");
            }

            // Redirigir al dashboard
            router.push("/");
            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error al iniciar sesión");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="w-full max-w-md relative z-10 bg-card/95 backdrop-blur border-border/50 shadow-2xl">
            <CardContent className="p-8">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <span className="text-white font-bold text-3xl">R</span>
                    </div>
                    <h1 className="text-2xl font-bold">Sistema Retail</h1>
                    <p className="text-muted-foreground mt-2">Inicia sesión para continuar</p>
                </div>

                {/* Formulario */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500 text-sm text-center">
                            {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            Correo Electrónico
                        </label>
                        <Input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="usuario@empresa.com"
                            required
                            autoFocus
                            className="h-12"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                            <Lock className="h-4 w-4" />
                            Contraseña
                        </label>
                        <div className="relative">
                            <Input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                className="h-12 pr-12"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                {showPassword ? (
                                    <EyeOff className="h-5 w-5" />
                                ) : (
                                    <Eye className="h-5 w-5" />
                                )}
                            </button>
                        </div>
                    </div>

                    <Button
                        type="submit"
                        className="w-full h-12 text-lg bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600"
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                                Ingresando...
                            </>
                        ) : (
                            "Ingresar"
                        )}
                    </Button>
                </form>

                {/* Footer */}
                <p className="text-center text-xs text-muted-foreground mt-6">
                    Sistema de Gestión Retail v1.0
                </p>
            </CardContent>
        </Card>
    );
}

function LoginFallback() {
    return (
        <Card className="w-full max-w-md relative z-10 bg-card/95 backdrop-blur border-border/50 shadow-2xl">
            <CardContent className="p-8">
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            </CardContent>
        </Card>
    );
}

export default function LoginPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
            {/* Efectos de fondo */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-red-500/20 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-orange-500/20 rounded-full blur-3xl" />
            </div>

            <Suspense fallback={<LoginFallback />}>
                <LoginForm />
            </Suspense>
        </div>
    );
}

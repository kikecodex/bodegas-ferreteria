"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    Home,
    Package,
    ShoppingCart,
    Users,
    Box,
    Receipt,
    FileText,
    Settings,
    Truck,
    User,
    Lock,
    Eye,
    EyeOff,
    Loader2,
    ArrowLeft,
    Check
} from "lucide-react";

interface UserInfo {
    id: string;
    email: string;
    name: string;
    role: string;
    phone?: string;
}

const navItems = [
    { icon: Home, label: "Dashboard", href: "/" },
    { icon: Package, label: "Productos", href: "/productos" },
    { icon: ShoppingCart, label: "Ventas", href: "/ventas" },
    { icon: Users, label: "Clientes", href: "/clientes" },
    { icon: Truck, label: "Proveedores", href: "/proveedores" },
    { icon: Box, label: "Compras", href: "/compras" },
    { icon: Receipt, label: "Facturas", href: "/facturas" },
    { icon: FileText, label: "Reportes", href: "/reportes" },
];

export default function PerfilPage() {
    const router = useRouter();
    const [user, setUser] = useState<UserInfo | null>(null);
    const [loading, setLoading] = useState(true);

    // Formulario de contraseña
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [changing, setChanging] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    // Obtener usuario
    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await fetch("/api/auth/me");
                if (res.ok) {
                    const data = await res.json();
                    setUser(data.user);
                } else {
                    router.push("/login");
                }
            } catch {
                router.push("/login");
            } finally {
                setLoading(false);
            }
        };
        fetchUser();
    }, [router]);

    // Cambiar contraseña
    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess(false);

        if (newPassword !== confirmPassword) {
            setError("Las contraseñas no coinciden");
            return;
        }

        if (newPassword.length < 6) {
            setError("La nueva contraseña debe tener al menos 6 caracteres");
            return;
        }

        setChanging(true);
        try {
            const res = await fetch("/api/auth/change-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ currentPassword, newPassword })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Error al cambiar contraseña");
            }

            setSuccess(true);
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error al cambiar contraseña");
        } finally {
            setChanging(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-background">
            {/* Sidebar */}
            <aside className="w-64 border-r bg-card flex flex-col">
                <div className="p-4 border-b">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-600 to-orange-500 flex items-center justify-center">
                            <span className="text-white font-bold text-lg">O</span>
                        </div>
                        <div>
                            <h1 className="font-bold text-sm">CORPORACIÓN</h1>
                            <h2 className="font-bold text-lg text-red-600 -mt-1">OROPEZA&apos;S</h2>
                        </div>
                    </div>
                </div>
                <nav className="flex-1 p-3 space-y-1">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.label}
                                href={item.href}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-accent transition-colors"
                            >
                                <Icon className="h-5 w-5" />
                                <span className="font-medium">{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>
                <div className="p-3 border-t">
                    <Link href="/perfil" className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-red-600 text-white">
                        <Settings className="h-5 w-5" />
                        <span className="font-medium">Mi Perfil</span>
                    </Link>
                </div>
            </aside>

            {/* Main */}
            <main className="flex-1 p-6">
                <div className="max-w-2xl mx-auto space-y-6">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => router.back()}>
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <h1 className="text-2xl font-bold">Mi Perfil</h1>
                    </div>

                    {/* Info del Usuario */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="h-5 w-5" />
                                Información de la Cuenta
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-4">
                                <Avatar className="h-20 w-20">
                                    <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                                        {user?.name?.charAt(0) || "U"}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <h2 className="text-xl font-bold">{user?.name}</h2>
                                    <p className="text-muted-foreground">{user?.email}</p>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Rol: <span className="font-medium">{user?.role}</span>
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Cambiar Contraseña */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Lock className="h-5 w-5" />
                                Cambiar Contraseña
                            </CardTitle>
                            <CardDescription>
                                Actualiza tu contraseña de acceso al sistema
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleChangePassword} className="space-y-4">
                                {error && (
                                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500 text-sm">
                                        {error}
                                    </div>
                                )}

                                {success && (
                                    <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-500 text-sm flex items-center gap-2">
                                        <Check className="h-4 w-4" />
                                        ¡Contraseña actualizada correctamente!
                                    </div>
                                )}

                                <div>
                                    <label className="text-sm font-medium">Contraseña Actual</label>
                                    <div className="relative mt-1">
                                        <Input
                                            type={showCurrentPassword ? "text" : "password"}
                                            value={currentPassword}
                                            onChange={(e) => setCurrentPassword(e.target.value)}
                                            placeholder="Tu contraseña actual"
                                            required
                                            className="pr-10"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                                        >
                                            {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-sm font-medium">Nueva Contraseña</label>
                                    <div className="relative mt-1">
                                        <Input
                                            type={showNewPassword ? "text" : "password"}
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            placeholder="Mínimo 6 caracteres"
                                            required
                                            className="pr-10"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowNewPassword(!showNewPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                                        >
                                            {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-sm font-medium">Confirmar Nueva Contraseña</label>
                                    <Input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Repetir nueva contraseña"
                                        required
                                        className="mt-1"
                                    />
                                </div>

                                <Button type="submit" disabled={changing} className="w-full">
                                    {changing ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Cambiando...
                                        </>
                                    ) : (
                                        <>
                                            <Lock className="h-4 w-4 mr-2" />
                                            Cambiar Contraseña
                                        </>
                                    )}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}

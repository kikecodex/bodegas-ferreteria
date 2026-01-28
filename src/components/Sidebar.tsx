"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    Home,
    Package,
    ShoppingCart,
    Users,
    Truck,
    Box,
    FileEdit,
    Receipt,
    FileText,
    Settings,
    LogOut,
    Lock,
    Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TenantInfo {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
    tradeName?: string;
}

interface UserInfo {
    id: string;
    name: string;
    email: string;
    role: string;
}

// Navigation items
const navItems = [
    { icon: Home, label: "Dashboard", href: "/" },
    { icon: Package, label: "Productos", href: "/productos" },
    { icon: ShoppingCart, label: "Ventas", href: "/ventas" },
    { icon: Users, label: "Clientes", href: "/clientes" },
    { icon: Truck, label: "Proveedores", href: "/proveedores" },
    { icon: Box, label: "Compras", href: "/compras" },
    { icon: FileEdit, label: "Cotizaciones", href: "/cotizaciones" },
    { icon: Receipt, label: "Notas de Venta", href: "/notas-venta" },
    { icon: FileText, label: "Reportes", href: "/reportes" },
];

export function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const [tenant, setTenant] = useState<TenantInfo | null>(null);
    const [user, setUser] = useState<UserInfo | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch("/api/auth/me");
                if (res.ok) {
                    const data = await res.json();
                    setUser(data.user);
                    setTenant(data.tenant);
                }
            } catch (error) {
                console.error("Error fetching user data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleLogout = async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/login");
        router.refresh();
    };

    // Get initials for avatar
    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map(n => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <aside className="hidden md:flex w-64 flex-col bg-sidebar border-r border-sidebar-border">
            {/* Logo */}
            <div className="h-16 flex items-center px-4 border-b border-sidebar-border">
                {loading ? (
                    <div className="flex items-center justify-center w-full">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : tenant?.logo ? (
                    <Image
                        src={tenant.logo}
                        alt={tenant.name}
                        width={180}
                        height={45}
                        className="object-contain max-h-12"
                        priority
                    />
                ) : (
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-600 to-orange-500 flex items-center justify-center">
                            <span className="text-white font-bold text-lg">
                                {tenant?.name?.charAt(0) || "N"}
                            </span>
                        </div>
                        <div>
                            <h1 className="font-bold text-sm leading-tight">
                                {tenant?.tradeName || tenant?.name || "Mi Negocio"}
                            </h1>
                        </div>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
                {navItems.map((item) => {
                    const isActive = pathname === item.href ||
                        (item.href !== "/" && pathname.startsWith(item.href));

                    return (
                        <Link
                            key={item.label}
                            href={item.href}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${isActive
                                    ? "bg-primary text-primary-foreground"
                                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                                }`}
                        >
                            <item.icon className={`h-5 w-5 ${isActive ? "" : "text-muted-foreground group-hover:text-foreground"}`} />
                            <span className="font-medium">{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* User section */}
            <div className="p-4 border-t border-sidebar-border">
                <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                        <AvatarImage src="" />
                        <AvatarFallback className="bg-primary text-primary-foreground">
                            {user?.name ? getInitials(user.name) : "US"}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{user?.name || "Usuario"}</p>
                        <p className="text-xs text-muted-foreground truncate">{user?.email || ""}</p>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Settings className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                                <Link href="/perfil" className="flex items-center cursor-pointer">
                                    <Lock className="h-4 w-4 mr-2" />
                                    Mi Perfil / Cambiar Clave
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleLogout} className="text-red-500">
                                <LogOut className="h-4 w-4 mr-2" />
                                Cerrar Sesión
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </aside>
    );
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Home,
    Package,
    ShoppingCart,
    Users,
    Box,
    Receipt,
    FileText,
    Settings,
    Bell,
    DollarSign,
    History,
    LockOpen,
    Lock
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { POSInterface } from "@/components/POSInterface";
import { CashRegisterModal } from "@/components/CashRegisterModal";

const navItems = [
    { icon: Home, label: "Dashboard", href: "/" },
    { icon: Package, label: "Productos", href: "/productos" },
    { icon: ShoppingCart, label: "Ventas", href: "/ventas", active: true },
    { icon: Users, label: "Clientes", href: "/clientes" },
    { icon: Box, label: "Inventario", href: "/inventario" },
    { icon: Receipt, label: "Facturas", href: "/facturas" },
    { icon: FileText, label: "Reportes", href: "/reportes" },
];

export default function VentasPage() {
    const [showCashModal, setShowCashModal] = useState(false);
    const [cashStatus, setCashStatus] = useState<{
        isOpen: boolean;
        summary?: { salesCount: number; totalSales: number };
    }>({ isOpen: false });

    const fetchCashStatus = async () => {
        try {
            const res = await fetch("/api/cash-register");
            if (res.ok) {
                const data = await res.json();
                setCashStatus(data);
            }
        } catch (error) {
            console.error("Error fetching cash status:", error);
        }
    };

    useEffect(() => {
        let isMounted = true;

        const loadCashStatus = async () => {
            try {
                const res = await fetch("/api/cash-register");
                if (res.ok && isMounted) {
                    const data = await res.json();
                    setCashStatus(data);
                }
            } catch (error) {
                console.error("Error fetching cash status:", error);
            }
        };

        loadCashStatus();

        return () => {
            isMounted = false;
        };
    }, []);

    return (
        <div className="flex min-h-screen bg-background">
            {/* Sidebar */}
            <aside className="w-64 border-r bg-card flex flex-col">
                {/* Logo */}
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

                {/* Navigation */}
                <nav className="flex-1 p-3 space-y-1">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.label}
                                href={item.href}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${item.active
                                    ? "bg-red-600 text-white"
                                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                                    }`}
                            >
                                <Icon className="h-5 w-5" />
                                <span className="font-medium">{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                {/* Settings */}
                <div className="p-3 border-t space-y-1">
                    <Link
                        href="/configuracion"
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                    >
                        <Settings className="h-5 w-5" />
                        <span className="font-medium">Configuración</span>
                    </Link>
                </div>

                {/* User */}
                <div className="p-4 border-t">
                    <div className="flex items-center gap-3">
                        <Avatar>
                            <AvatarImage src="" />
                            <AvatarFallback className="bg-red-100 text-red-600">N</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                            <p className="font-medium text-sm">Administrador</p>
                            <p className="text-xs text-muted-foreground">admin@oropezas.com</p>
                        </div>
                        <Settings className="h-4 w-4 text-muted-foreground" />
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col">
                {/* Header */}
                <header className="h-16 border-b bg-card px-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <h1 className="text-2xl font-bold">Punto de Venta</h1>
                        <Badge
                            variant={cashStatus.isOpen ? "default" : "destructive"}
                            className="cursor-pointer"
                            onClick={() => setShowCashModal(true)}
                        >
                            {cashStatus.isOpen ? (
                                <>
                                    <LockOpen className="h-3 w-3 mr-1" />
                                    Caja Abierta
                                </>
                            ) : (
                                <>
                                    <Lock className="h-3 w-3 mr-1" />
                                    Caja Cerrada
                                </>
                            )}
                        </Badge>
                        {cashStatus.isOpen && cashStatus.summary && (
                            <span className="text-sm text-muted-foreground">
                                {cashStatus.summary.salesCount} ventas | S/ {cashStatus.summary.totalSales.toFixed(2)}
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowCashModal(true)}
                        >
                            <DollarSign className="h-4 w-4 mr-1" />
                            Caja
                        </Button>
                        <Link href="/ventas/historial">
                            <Button variant="outline" size="sm">
                                <History className="h-4 w-4 mr-1" />
                                Historial
                            </Button>
                        </Link>
                        <Button variant="ghost" size="icon" className="relative">
                            <Bell className="h-5 w-5" />
                        </Button>
                    </div>
                </header>

                {/* POS Content */}
                <div className="flex-1 p-6">
                    {cashStatus.isOpen ? (
                        <POSInterface onSaleComplete={fetchCashStatus} />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full">
                            <Lock className="h-24 w-24 text-muted-foreground/50 mb-6" />
                            <h2 className="text-2xl font-bold mb-2">Caja Cerrada</h2>
                            <p className="text-muted-foreground mb-6">
                                Debe abrir la caja antes de realizar ventas
                            </p>
                            <Button size="lg" onClick={() => setShowCashModal(true)}>
                                <LockOpen className="h-5 w-5 mr-2" />
                                Abrir Caja
                            </Button>
                        </div>
                    )}
                </div>
            </main>

            {/* Modal de Caja */}
            <CashRegisterModal
                isOpen={showCashModal}
                onClose={() => setShowCashModal(false)}
                onCashUpdated={fetchCashStatus}
            />
        </div>
    );
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    TrendingUp,
    TrendingDown,
    DollarSign,
    Calendar,
    BarChart3,
    RefreshCw,
    Loader2,
    ArrowUpRight,
    ArrowDownRight,
    CreditCard,
    Wallet,
    ArrowRight,
    Truck
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface DashboardStats {
    ventas: {
        hoy: { total: number; caja: number; credito: number };
        ayer: { caja: number };
        semana: { caja: number };
        mes: { caja: number };
        fechaSeleccionada?: { total: number; caja: number; credito: number };
    };
    cantidadVentas: {
        hoy: number;
        semana: number;
        mes: number;
        fechaSeleccionada?: number;
    };
    productos: {
        total: number;
        sinStock: number;
        stockBajo: number;
    };
    clientes: {
        total: number;
        nuevosHoy: number;
    };
    topProductos: Array<{
        id: string;
        name: string;
        code: string;
        totalVentas: number;
        cantidad: number;
    }>;
    ventasPorMetodo: Record<string, number>;
    egresosPorMetodo: Record<string, number>;
}

const navItems = [
    { icon: Home, label: "Dashboard", href: "/" },
    { icon: Package, label: "Productos", href: "/productos" },
    { icon: ShoppingCart, label: "Ventas", href: "/ventas" },
    { icon: CreditCard, label: "Créditos", href: "/creditos" },
    { icon: Users, label: "Clientes", href: "/clientes" },
    { icon: Box, label: "Inventario", href: "/inventario" },
    { icon: Receipt, label: "Facturas", href: "/facturas" },
    { icon: FileText, label: "Reportes", href: "/reportes", active: true },
];

export default function ReportesPage() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [period, setPeriod] = useState<"hoy" | "semana" | "mes">("hoy");
    const [selectedDate, setSelectedDate] = useState<string>("");  // Fecha específica YYYY-MM-DD

    const fetchStats = async () => {
        setLoading(true);
        try {
            // Obtener productos
            const productsRes = await fetch("/api/products?limit=1000");
            const productsData = productsRes.ok ? await productsRes.json() : { products: [] };
            const products = productsData.products || [];

            // Obtener clientes
            const clientsRes = await fetch("/api/clients?limit=1000");
            const clientsData = clientsRes.ok ? await clientsRes.json() : { clients: [] };
            const clients = clientsData.clients || [];

            // Obtener ventas
            const salesRes = await fetch("/api/sales?limit=1000");
            const salesData = salesRes.ok ? await salesRes.json() : { sales: [] };
            const sales = salesData.sales || [];

            // Helper: obtener fecha YYYY-MM-DD en zona horaria de Perú
            // Esto garantiza que funcione correctamente sin importar la zona del servidor
            const getPeruDateStr = (date: Date): string => {
                return date.toLocaleDateString('en-CA', { timeZone: 'America/Lima' }); // formato YYYY-MM-DD
            };

            // Calcular fecha de "hoy" en Perú
            const now = new Date();
            const todayStr = getPeruDateStr(now); // ej: "2026-02-06"

            // Calcular ayer
            const yesterdayDate = new Date(now);
            yesterdayDate.setDate(yesterdayDate.getDate() - 1);
            const yesterdayStr = getPeruDateStr(yesterdayDate);

            // Rango de semana y mes usando timestamps con offset Perú explícito
            const weekAgo = new Date(todayStr + 'T00:00:00-05:00');
            weekAgo.setDate(weekAgo.getDate() - 7);
            const monthAgo = new Date(todayStr + 'T00:00:00-05:00');
            monthAgo.setMonth(monthAgo.getMonth() - 1);

            // Obtener la fecha Perú de cada venta para comparar
            const getSaleDateStr = (createdAt: string) => getPeruDateStr(new Date(createdAt));

            // Filtrar ventas por período (separando ventas al crédito de las de caja)
            const ventasHoyCaja = sales.filter((s: { createdAt: string; status: string; paymentMethod: string }) => {
                return getSaleDateStr(s.createdAt) === todayStr && s.status === "COMPLETADA" && s.paymentMethod !== "CREDITO";
            });
            const ventasHoyCredito = sales.filter((s: { createdAt: string; status: string; paymentMethod: string }) => {
                return getSaleDateStr(s.createdAt) === todayStr && s.status === "COMPLETADA" && s.paymentMethod === "CREDITO";
            });
            const ventasAyer = sales.filter((s: { createdAt: string; status: string; paymentMethod: string }) => {
                return getSaleDateStr(s.createdAt) === yesterdayStr && s.status === "COMPLETADA" && s.paymentMethod !== "CREDITO";
            });
            const ventasSemana = sales.filter((s: { createdAt: string; status: string; paymentMethod: string }) =>
                new Date(s.createdAt) >= weekAgo && getSaleDateStr(s.createdAt) <= todayStr && s.status === "COMPLETADA" && s.paymentMethod !== "CREDITO"
            );
            const ventasMes = sales.filter((s: { createdAt: string; status: string; paymentMethod: string }) =>
                new Date(s.createdAt) >= monthAgo && getSaleDateStr(s.createdAt) <= todayStr && s.status === "COMPLETADA" && s.paymentMethod !== "CREDITO"
            );

            // Calcular totales
            const totalHoyCaja = ventasHoyCaja.reduce((sum: number, v: { total: number }) => sum + v.total, 0);
            const totalHoyCredito = ventasHoyCredito.reduce((sum: number, v: { total: number }) => sum + v.total, 0);
            const totalHoy = totalHoyCaja + totalHoyCredito;

            const totalAyer = ventasAyer.reduce((sum: number, v: { total: number }) => sum + v.total, 0);
            const totalSemana = ventasSemana.reduce((sum: number, v: { total: number }) => sum + v.total, 0);
            const totalMes = ventasMes.reduce((sum: number, v: { total: number }) => sum + v.total, 0);

            // Si hay fecha específica seleccionada, calcular ventas de ese día
            let ventasFechaSeleccionadaCaja: typeof ventasHoyCaja = [];
            let ventasFechaSeleccionadaCredito: typeof ventasHoyCaja = [];
            let totalFechaSeleccionadaCaja = 0;
            let totalFechaSeleccionadaCredito = 0;
            let totalFechaSeleccionada = 0;

            if (selectedDate) {
                ventasFechaSeleccionadaCaja = sales.filter((s: { createdAt: string; status: string; paymentMethod: string }) => {
                    return getSaleDateStr(s.createdAt) === selectedDate && s.status === "COMPLETADA" && s.paymentMethod !== "CREDITO";
                });
                ventasFechaSeleccionadaCredito = sales.filter((s: { createdAt: string; status: string; paymentMethod: string }) => {
                    return getSaleDateStr(s.createdAt) === selectedDate && s.status === "COMPLETADA" && s.paymentMethod === "CREDITO";
                });
                totalFechaSeleccionadaCaja = ventasFechaSeleccionadaCaja.reduce((sum: number, v: { total: number }) => sum + v.total, 0);
                totalFechaSeleccionadaCredito = ventasFechaSeleccionadaCredito.reduce((sum: number, v: { total: number }) => sum + v.total, 0);
                totalFechaSeleccionada = totalFechaSeleccionadaCaja + totalFechaSeleccionadaCredito;
            }



            // Ventas por método de pago (del día actual o seleccionado) - Sólo cuenta caja
            const targetDateStr = selectedDate || todayStr;
            const ventasPorMetodo: Record<string, number> = {};
            const ventasTarget = selectedDate ? ventasFechaSeleccionadaCaja : ventasHoyCaja;
            ventasTarget.forEach((v: { paymentMethod: string; total: number }) => {
                ventasPorMetodo[v.paymentMethod] = (ventasPorMetodo[v.paymentMethod] || 0) + v.total;
            });


            // Top productos (simulado - necesitaría agregación en backend)
            const productSales: Record<string, { name: string; code: string; total: number; qty: number }> = {};
            // Por ahora, mostrar los productos con menos stock
            const topProductos = products
                .filter((p: { stock: number }) => p.stock > 0)
                .sort((a: { stock: number }, b: { stock: number }) => a.stock - b.stock)
                .slice(0, 5)
                .map((p: { id: string; name: string; code: string; stock: number }) => ({
                    id: p.id,
                    name: p.name,
                    code: p.code,
                    totalVentas: 0,
                    cantidad: p.stock
                }));

            // Egresos por método de pago (compras del día)
            const purchasesRes = await fetch("/api/purchases?limit=1000");
            const purchasesData = purchasesRes.ok ? await purchasesRes.json() : { purchases: [] };
            const purchases = purchasesData.purchases || [];

            const egresosPorMetodo: Record<string, number> = {};
            purchases.forEach((p: { createdAt: string; paymentMethod?: string; total: number; status: string }) => {
                if (getSaleDateStr(p.createdAt) === targetDateStr && p.status === "COMPLETADA") {
                    const method = p.paymentMethod || "EFECTIVO";
                    egresosPorMetodo[method] = (egresosPorMetodo[method] || 0) + p.total;
                }
            });

            setStats({
                ventas: {
                    hoy: { total: totalHoy, caja: totalHoyCaja, credito: totalHoyCredito },
                    ayer: { caja: totalAyer },
                    semana: { caja: totalSemana },
                    mes: { caja: totalMes },
                    fechaSeleccionada: selectedDate ? { total: totalFechaSeleccionada, caja: totalFechaSeleccionadaCaja, credito: totalFechaSeleccionadaCredito } : undefined
                },
                cantidadVentas: {
                    hoy: ventasHoyCaja.length + ventasHoyCredito.length,
                    semana: ventasSemana.length,
                    mes: ventasMes.length,
                    fechaSeleccionada: selectedDate ? ventasFechaSeleccionadaCaja.length + ventasFechaSeleccionadaCredito.length : undefined
                },
                productos: {
                    total: products.length,
                    sinStock: products.filter((p: { stock: number }) => p.stock === 0).length,
                    stockBajo: products.filter((p: { stock: number; minStock: number }) => p.stock > 0 && p.stock <= p.minStock).length
                },
                clientes: {
                    total: clients.length,
                    nuevosHoy: clients.filter((c: { createdAt: string }) => getSaleDateStr(c.createdAt) === todayStr).length
                },
                topProductos,
                ventasPorMetodo,
                egresosPorMetodo
            });
        } catch (error) {
            console.error("Error fetching stats:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, [selectedDate]);

    const getVariation = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
    };

    const variation = stats ? getVariation(stats.ventas.hoy.caja, stats.ventas.ayer.caja) : 0;

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
                            <a
                                key={item.label}
                                href={item.href} target="app" rel="noopener noreferrer"
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${item.active
                                    ? "bg-red-600 text-white"
                                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                                    }`}
                            >
                                <Icon className="h-5 w-5" />
                                <span className="font-medium">{item.label}</span>
                            </a>
                        );
                    })}
                </nav>

                <div className="p-3 border-t">
                    <a
                        href="/configuracion"
                        target="app"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                    >
                        <Settings className="h-5 w-5" />
                        <span className="font-medium">Configuración</span>
                    </a>
                </div>

                <div className="p-4 border-t">
                    <div className="flex items-center gap-3">
                        <Avatar>
                            <AvatarImage src="" />
                            <AvatarFallback className="bg-red-100 text-red-600">A</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                            <p className="font-medium text-sm">Administrador</p>
                            <p className="text-xs text-muted-foreground">admin@oropezas.com</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col">
                <header className="h-16 border-b bg-card px-6 flex items-center justify-between">
                    <h1 className="text-2xl font-bold">Reportes y Estadísticas</h1>
                    <div className="flex items-center gap-2">
                        {/* Selector de fecha específica */}
                        <div className="flex items-center gap-2 border rounded-lg px-2 py-1">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => {
                                    setSelectedDate(e.target.value);
                                    if (e.target.value) {
                                        fetchStats();
                                    }
                                }}
                                className="bg-transparent border-none text-sm focus:outline-none"
                            />
                            {selectedDate && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                    onClick={() => setSelectedDate("")}
                                >
                                    ×
                                </Button>
                            )}
                        </div>
                        <div className="flex border rounded-lg overflow-hidden">
                            {(["hoy", "semana", "mes"] as const).map((p) => (
                                <Button
                                    key={p}
                                    variant={period === p && !selectedDate ? "default" : "ghost"}
                                    size="sm"
                                    className="rounded-none"
                                    onClick={() => {
                                        setPeriod(p);
                                        setSelectedDate("");
                                    }}
                                >
                                    {p.charAt(0).toUpperCase() + p.slice(1)}
                                </Button>
                            ))}
                        </div>
                        <Button variant="outline" size="sm" onClick={fetchStats}>
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Actualizar
                        </Button>
                        <Button variant="ghost" size="icon">
                            <Bell className="h-5 w-5" />
                        </Button>
                    </div>
                </header>

                {loading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
                    </div>
                ) : stats && (
                    <div className="p-6 space-y-4">
                        {/* Reportes Detallados - ARRIBA */}
                        <div className="grid grid-cols-3 gap-4">
                            <a href="/reportes/facturas" target="app" rel="noopener noreferrer">
                                <Card className="hover:border-green-500 hover:shadow-md transition-all cursor-pointer group">
                                    <CardContent className="p-4 flex items-center gap-4">
                                        <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                                            <Receipt className="h-5 w-5 text-white" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-bold">Comprobantes</p>
                                            <p className="text-sm text-muted-foreground">
                                                Boletas y Facturas
                                            </p>
                                        </div>
                                        <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-green-500 transition-colors" />
                                    </CardContent>
                                </Card>
                            </a>
                            <a href="/reportes/caja-diaria" target="app" rel="noopener noreferrer">
                                <Card className="hover:border-amber-500 hover:shadow-md transition-all cursor-pointer group">
                                    <CardContent className="p-4 flex items-center gap-4">
                                        <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                                            <Wallet className="h-5 w-5 text-white" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-bold">Caja Diaria</p>
                                            <p className="text-sm text-muted-foreground">
                                                Apertura/cierre y diferencias
                                            </p>
                                        </div>
                                        <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-amber-500 transition-colors" />
                                    </CardContent>
                                </Card>
                            </a>
                            <a href="/reportes/compras" target="app" rel="noopener noreferrer">
                                <Card className="hover:border-red-500 hover:shadow-md transition-all cursor-pointer group">
                                    <CardContent className="p-4 flex items-center gap-4">
                                        <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center">
                                            <Truck className="h-5 w-5 text-white" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-bold">Compras</p>
                                            <p className="text-sm text-muted-foreground">
                                                Egresos por proveedor
                                            </p>
                                        </div>
                                        <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-red-500 transition-colors" />
                                    </CardContent>
                                </Card>
                            </a>
                        </div>

                        {/* Card del Día */}
                        <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg border-none relative overflow-hidden">
                            <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                            <CardContent className="p-6 relative z-10">
                                <div className="flex items-center gap-2 mb-4">
                                    <Calendar className="h-5 w-5 text-white/80" />
                                    <p className="text-white/90 font-medium">
                                        Resumen del {selectedDate
                                            ? new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
                                            : new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
                                        }
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                                    {/* Total Ventas (Incluye crédito) */}
                                    <div className="bg-black/20 rounded-xl p-4">
                                        <p className="text-white/80 text-sm mb-1">Ventas Totales Brutas</p>
                                        <p className="text-4xl font-bold">
                                            S/ {(selectedDate ? stats.ventas.fechaSeleccionada?.total || 0 : stats.ventas.hoy.total).toFixed(2)}
                                        </p>
                                        <p className="text-white/60 text-xs mt-1">Incluye ventas al crédito</p>
                                    </div>

                                    {/* Dinero en Caja (Flujo Real) */}
                                    <div className="bg-black/20 rounded-xl p-4 relative overflow-hidden ring-1 ring-white/30">
                                        <div className="absolute inset-0 bg-green-500/10"></div>
                                        <p className="text-green-300 text-sm mb-1 font-medium flex items-center gap-1.5"><Wallet className="w-4 h-4" /> Flujo de Caja (Dinero Real)</p>
                                        <p className="text-4xl font-bold text-white relative z-10">
                                            S/ {(selectedDate ? stats.ventas.fechaSeleccionada?.caja || 0 : stats.ventas.hoy.caja).toFixed(2)}
                                        </p>
                                        <p className="text-green-200/60 text-xs mt-1 relative z-10">Dinero que debe haber en caja</p>
                                    </div>

                                    {/* Ventas al Crédito (Pendiente) */}
                                    <div className="bg-black/20 rounded-xl p-4">
                                        <p className="text-orange-200 text-sm mb-1 flex items-center gap-1.5"><CreditCard className="w-4 h-4" /> Ventas al Crédito</p>
                                        <p className="text-3xl font-bold text-white">
                                            S/ {(selectedDate ? stats.ventas.fechaSeleccionada?.credito || 0 : stats.ventas.hoy.credito).toFixed(2)}
                                        </p>
                                        <p className="text-orange-200/60 text-xs mt-1">Dinero pendiente de cobro</p>
                                    </div>
                                </div>

                                <div className="mt-4 pt-4 border-t border-white/20 text-right">
                                    <p className="text-white/90">
                                        <span className="font-bold text-lg">{selectedDate ? stats.cantidadVentas.fechaSeleccionada || 0 : stats.cantidadVentas.hoy}</span> transacciones en total
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* KPIs - Ultra compacto */}
                        <div className="grid grid-cols-4 gap-2">
                            <div className="flex items-center gap-2 border-l-2 border-l-green-500 bg-card rounded-r px-2 py-1">
                                <DollarSign className="h-3.5 w-3.5 text-green-500 shrink-0" />
                                <span className="text-xs text-muted-foreground">{selectedDate ? 'Fecha' : 'Hoy'}</span>
                                <span className="text-sm font-bold">S/ {(selectedDate ? stats.ventas.fechaSeleccionada?.caja || 0 : stats.ventas.hoy.caja).toFixed(2)}</span>
                                <span className="ml-auto text-[10px] text-muted-foreground">{!selectedDate && (variation >= 0 ? "↑" : "↓")}{!selectedDate && Math.abs(variation).toFixed(1)}%</span>
                            </div>
                            <div className="flex items-center gap-2 border-l-2 border-l-blue-500 bg-card rounded-r px-2 py-1">
                                <ShoppingCart className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                                <span className="text-xs text-muted-foreground">Mes (Caja)</span>
                                <span className="text-sm font-bold">S/ {stats.ventas.mes.caja.toFixed(2)}</span>
                                <span className="ml-auto text-[10px] text-muted-foreground">{stats.cantidadVentas.mes} trans.</span>
                            </div>
                            <div className="flex items-center gap-2 border-l-2 border-l-purple-500 bg-card rounded-r px-2 py-1">
                                <Package className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                                <span className="text-xs text-muted-foreground">Stock</span>
                                <span className="text-sm font-bold">{stats.productos.sinStock}</span>
                                <span className="text-[10px] text-muted-foreground">sin · {stats.productos.stockBajo} bajo</span>
                                <span className="ml-auto text-[10px] text-muted-foreground">{stats.productos.total} total</span>
                            </div>
                            <div className="flex items-center gap-2 border-l-2 border-l-orange-500 bg-card rounded-r px-2 py-1">
                                <Users className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                                <span className="text-xs text-muted-foreground">Clientes</span>
                                <span className="text-sm font-bold">{stats.clientes.total}</span>
                                {stats.clientes.nuevosHoy > 0 && <span className="ml-auto text-[10px] text-green-600">+{stats.clientes.nuevosHoy} hoy</span>}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {/* Flujo de Caja por Método de Pago */}
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <BarChart3 className="h-4 w-4" />
                                        Flujo de Caja por Método de Pago
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {(() => {
                                        const allMethods = new Set([
                                            ...Object.keys(stats.ventasPorMetodo),
                                            ...Object.keys(stats.egresosPorMetodo)
                                        ]);
                                        if (allMethods.size === 0) {
                                            return (
                                                <p className="text-muted-foreground text-center py-6">
                                                    No hay movimientos hoy
                                                </p>
                                            );
                                        }
                                        const totalIngresos = Object.values(stats.ventasPorMetodo).reduce((a, b) => a + b, 0);
                                        const totalEgresos = Object.values(stats.egresosPorMetodo).reduce((a, b) => a + b, 0);
                                        return (
                                            <div className="space-y-4">
                                                {Array.from(allMethods).sort().map((method) => {
                                                    const ingreso = stats.ventasPorMetodo[method] || 0;
                                                    const egreso = stats.egresosPorMetodo[method] || 0;
                                                    const neto = ingreso - egreso;
                                                    return (
                                                        <div key={method} className="space-y-1">
                                                            <div className="flex justify-between items-center">
                                                                <span className="font-medium text-sm">{method}</span>
                                                                <span className={`text-sm font-bold ${neto >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                                    Neto: S/ {neto.toFixed(2)}
                                                                </span>
                                                            </div>
                                                            <div className="flex gap-2 text-xs text-muted-foreground">
                                                                <span className="text-green-600">▲ Ingreso: S/ {ingreso.toFixed(2)}</span>
                                                                <span className="text-red-600">▼ Egreso: S/ {egreso.toFixed(2)}</span>
                                                            </div>
                                                            <div className="flex gap-1 h-2">
                                                                <div
                                                                    className="bg-green-500 rounded-full transition-all"
                                                                    style={{ width: `${totalIngresos > 0 ? (ingreso / Math.max(totalIngresos, totalEgresos)) * 100 : 0}%` }}
                                                                />
                                                                <div
                                                                    className="bg-red-400 rounded-full transition-all"
                                                                    style={{ width: `${totalEgresos > 0 ? (egreso / Math.max(totalIngresos, totalEgresos)) * 100 : 0}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                                {/* Totales */}
                                                <div className="border-t pt-3 mt-3">
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-green-600 font-medium">Total Ingresos</span>
                                                        <span className="text-green-600 font-bold">S/ {totalIngresos.toFixed(2)}</span>
                                                    </div>
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-red-600 font-medium">Total Egresos</span>
                                                        <span className="text-red-600 font-bold">S/ {totalEgresos.toFixed(2)}</span>
                                                    </div>
                                                    <div className="flex justify-between text-sm font-bold border-t pt-1 mt-1">
                                                        <span>Neto del Día</span>
                                                        <span className={totalIngresos - totalEgresos >= 0 ? 'text-green-600' : 'text-red-600'}>
                                                            S/ {(totalIngresos - totalEgresos).toFixed(2)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </CardContent>
                            </Card>

                            {/* Productos con Stock Bajo */}
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <TrendingDown className="h-4 w-4 text-amber-500" />
                                        Productos con Menor Stock
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {stats.topProductos.length === 0 ? (
                                        <p className="text-muted-foreground text-center py-6">
                                            No hay productos con stock
                                        </p>
                                    ) : (
                                        <div className="space-y-2">
                                            {stats.topProductos.map((product, index) => (
                                                <div key={product.id} className="flex items-center gap-3">
                                                    <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                                                        {index + 1}
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="font-medium text-sm">{product.name}</p>
                                                        <p className="text-xs text-muted-foreground">{product.code}</p>
                                                    </div>
                                                    <Badge variant={product.cantidad <= 5 ? "destructive" : "secondary"}>
                                                        {product.cantidad} und
                                                    </Badge>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Resumen de Período */}
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <TrendingUp className="h-4 w-4 text-green-500" />
                                    Resumen de Ventas
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-3 gap-4 text-center">
                                    <div className="p-3 bg-muted rounded-lg">
                                        <p className="text-xs text-muted-foreground">{selectedDate ? 'Fecha' : 'Hoy'}</p>
                                        <p className="text-xl font-bold text-green-600">S/ {(selectedDate ? stats.ventas.fechaSeleccionada?.caja || 0 : stats.ventas.hoy.caja).toFixed(2)}</p>
                                        <p className="text-xs text-muted-foreground">
                                            Caja Registradora
                                        </p>
                                    </div>
                                    <div className="p-3 bg-muted rounded-lg border border-border">
                                        <p className="text-xs text-muted-foreground">Esta Semana (Caja)</p>
                                        <p className="text-xl font-bold">S/ {stats.ventas.semana.caja.toFixed(2)}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {stats.cantidadVentas.semana} transacciones
                                        </p>
                                    </div>
                                    <div className="p-3 bg-muted rounded-lg border border-border">
                                        <p className="text-xs text-muted-foreground">Este Mes (Caja)</p>
                                        <p className="text-xl font-bold">S/ {stats.ventas.mes.caja.toFixed(2)}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {stats.cantidadVentas.mes} transacciones
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </main>
        </div>
    );
}

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
        hoy: number;
        ayer: number;
        semana: number;
        mes: number;
        fechaSeleccionada?: number;
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

            // Filtrar ventas por período (excluir ventas a crédito - esas se manejan aparte)
            const ventasHoy = sales.filter((s: { createdAt: string; status: string; paymentMethod: string }) => {
                return getSaleDateStr(s.createdAt) === todayStr &&
                    s.status === "COMPLETADA" &&
                    s.paymentMethod !== "CREDITO";
            });
            const ventasAyer = sales.filter((s: { createdAt: string; status: string; paymentMethod: string }) => {
                return getSaleDateStr(s.createdAt) === yesterdayStr &&
                    s.status === "COMPLETADA" &&
                    s.paymentMethod !== "CREDITO";
            });
            const ventasSemana = sales.filter((s: { createdAt: string; status: string; paymentMethod: string }) =>
                new Date(s.createdAt) >= weekAgo &&
                getSaleDateStr(s.createdAt) <= todayStr &&
                s.status === "COMPLETADA" &&
                s.paymentMethod !== "CREDITO"
            );
            const ventasMes = sales.filter((s: { createdAt: string; status: string; paymentMethod: string }) =>
                new Date(s.createdAt) >= monthAgo &&
                getSaleDateStr(s.createdAt) <= todayStr &&
                s.status === "COMPLETADA" &&
                s.paymentMethod !== "CREDITO"
            );

            // Calcular totales
            const totalHoy = ventasHoy.reduce((sum: number, v: { total: number }) => sum + v.total, 0);
            const totalAyer = ventasAyer.reduce((sum: number, v: { total: number }) => sum + v.total, 0);
            const totalSemana = ventasSemana.reduce((sum: number, v: { total: number }) => sum + v.total, 0);
            const totalMes = ventasMes.reduce((sum: number, v: { total: number }) => sum + v.total, 0);

            // Ventas por método de pago (del día)
            const ventasPorMetodo: Record<string, number> = {};
            ventasHoy.forEach((v: { paymentMethod: string; total: number }) => {
                ventasPorMetodo[v.paymentMethod] = (ventasPorMetodo[v.paymentMethod] || 0) + v.total;
            });

            // Si hay fecha específica seleccionada, calcular ventas de ese día
            let ventasFechaSeleccionada: typeof ventasHoy = [];
            let totalFechaSeleccionada = 0;
            if (selectedDate) {
                ventasFechaSeleccionada = sales.filter((s: { createdAt: string; status: string }) => {
                    return getSaleDateStr(s.createdAt) === selectedDate && s.status === "COMPLETADA";
                });
                totalFechaSeleccionada = ventasFechaSeleccionada.reduce((sum: number, v: { total: number }) => sum + v.total, 0);
            }

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
                if (getSaleDateStr(p.createdAt) === todayStr && p.status === "COMPLETADA") {
                    const method = p.paymentMethod || "EFECTIVO";
                    egresosPorMetodo[method] = (egresosPorMetodo[method] || 0) + p.total;
                }
            });

            setStats({
                ventas: {
                    hoy: totalHoy,
                    ayer: totalAyer,
                    semana: totalSemana,
                    mes: totalMes,
                    fechaSeleccionada: selectedDate ? totalFechaSeleccionada : undefined
                },
                cantidadVentas: {
                    hoy: ventasHoy.length,
                    semana: ventasSemana.length,
                    mes: ventasMes.length,
                    fechaSeleccionada: selectedDate ? ventasFechaSeleccionada.length : undefined
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

    const variation = stats ? getVariation(stats.ventas.hoy, stats.ventas.ayer) : 0;

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
                                href={item.href} target="_blank" rel="noopener noreferrer"
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
                        target="_blank"
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
                        <div className="grid grid-cols-2 gap-4">
                            <a href="/reportes/facturas" target="_blank" rel="noopener noreferrer">
                                <Card className="hover:border-green-500 hover:shadow-md transition-all cursor-pointer group">
                                    <CardContent className="p-4 flex items-center gap-4">
                                        <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                                            <Receipt className="h-5 w-5 text-white" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-bold">Reporte de Comprobantes Emitidos</p>
                                            <p className="text-sm text-muted-foreground">
                                                Boletas y Facturas con detalle fiscal e IGV
                                            </p>
                                        </div>
                                        <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-green-500 transition-colors" />
                                    </CardContent>
                                </Card>
                            </a>
                            <a href="/reportes/caja-diaria" target="_blank" rel="noopener noreferrer">
                                <Card className="hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer group">
                                    <CardContent className="p-4 flex items-center gap-4">
                                        <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                                            <Wallet className="h-5 w-5 text-white" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-bold">Reporte de Caja Diaria</p>
                                            <p className="text-sm text-muted-foreground">
                                                Historial de apertura/cierre con diferencias
                                            </p>
                                        </div>
                                        <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-amber-500 transition-colors" />
                                    </CardContent>
                                </Card>
                            </a>
                        </div>

                        {/* Card de Fecha Seleccionada */}
                        {selectedDate && stats.ventas.fechaSeleccionada !== undefined && (
                            <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <Calendar className="h-5 w-5" />
                                                <p className="text-white/80 text-sm font-medium">
                                                    Ventas del {new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                                </p>
                                            </div>
                                            <p className="text-3xl font-bold">S/ {stats.ventas.fechaSeleccionada.toFixed(2)}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-2xl font-bold">{stats.cantidadVentas.fechaSeleccionada}</p>
                                            <p className="text-white/80 text-sm">transacciones</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* KPIs Principales - Compactos */}
                        <div className="grid grid-cols-4 gap-3">
                            <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <DollarSign className="h-6 w-6 opacity-80" />
                                        <Badge variant="secondary" className="bg-white/20 text-white text-xs">
                                            {variation >= 0 ? (
                                                <ArrowUpRight className="h-3 w-3 mr-1" />
                                            ) : (
                                                <ArrowDownRight className="h-3 w-3 mr-1" />
                                            )}
                                            {Math.abs(variation).toFixed(1)}%
                                        </Badge>
                                    </div>
                                    <p className="text-white/80 text-xs">Ventas Hoy</p>
                                    <p className="text-2xl font-bold">S/ {stats.ventas.hoy.toFixed(2)}</p>
                                    <p className="text-xs text-white/60">
                                        Ayer: S/ {stats.ventas.ayer.toFixed(2)}
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <ShoppingCart className="h-6 w-6 opacity-80" />
                                        <Calendar className="h-4 w-4 opacity-60" />
                                    </div>
                                    <p className="text-white/80 text-xs">Ventas del Mes</p>
                                    <p className="text-2xl font-bold">S/ {stats.ventas.mes.toFixed(2)}</p>
                                    <p className="text-xs text-white/60">
                                        {stats.cantidadVentas.mes} transacciones
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="bg-gradient-to-br from-purple-500 to-pink-600 text-white">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <Package className="h-6 w-6 opacity-80" />
                                        <Badge variant="secondary" className="bg-white/20 text-white text-xs">
                                            {stats.productos.total}
                                        </Badge>
                                    </div>
                                    <p className="text-white/80 text-xs">Productos</p>
                                    <div className="flex gap-3 mt-1">
                                        <div>
                                            <p className="text-xl font-bold">{stats.productos.sinStock}</p>
                                            <p className="text-xs text-white/60">Sin stock</p>
                                        </div>
                                        <div>
                                            <p className="text-xl font-bold">{stats.productos.stockBajo}</p>
                                            <p className="text-xs text-white/60">Stock bajo</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-gradient-to-br from-orange-500 to-red-600 text-white">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <Users className="h-6 w-6 opacity-80" />
                                        {stats.clientes.nuevosHoy > 0 && (
                                            <Badge variant="secondary" className="bg-white/20 text-white text-xs">
                                                +{stats.clientes.nuevosHoy} hoy
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-white/80 text-xs">Clientes</p>
                                    <p className="text-2xl font-bold">{stats.clientes.total}</p>
                                    <p className="text-xs text-white/60">
                                        Registrados en el sistema
                                    </p>
                                </CardContent>
                            </Card>
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
                                        <p className="text-xs text-muted-foreground">Hoy</p>
                                        <p className="text-xl font-bold">S/ {stats.ventas.hoy.toFixed(2)}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {stats.cantidadVentas.hoy} ventas
                                        </p>
                                    </div>
                                    <div className="p-3 bg-muted rounded-lg">
                                        <p className="text-xs text-muted-foreground">Esta Semana</p>
                                        <p className="text-xl font-bold">S/ {stats.ventas.semana.toFixed(2)}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {stats.cantidadVentas.semana} ventas
                                        </p>
                                    </div>
                                    <div className="p-3 bg-muted rounded-lg">
                                        <p className="text-xs text-muted-foreground">Este Mes</p>
                                        <p className="text-xl font-bold">S/ {stats.ventas.mes.toFixed(2)}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {stats.cantidadVentas.mes} ventas
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

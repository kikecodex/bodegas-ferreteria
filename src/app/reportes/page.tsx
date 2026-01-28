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
    ArrowDownRight
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface DashboardStats {
    ventas: {
        hoy: number;
        ayer: number;
        semana: number;
        mes: number;
    };
    cantidadVentas: {
        hoy: number;
        semana: number;
        mes: number;
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
}

const navItems = [
    { icon: Home, label: "Dashboard", href: "/" },
    { icon: Package, label: "Productos", href: "/productos" },
    { icon: ShoppingCart, label: "Ventas", href: "/ventas" },
    { icon: Users, label: "Clientes", href: "/clientes" },
    { icon: Box, label: "Inventario", href: "/inventario" },
    { icon: Receipt, label: "Facturas", href: "/facturas" },
    { icon: FileText, label: "Reportes", href: "/reportes", active: true },
];

export default function ReportesPage() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [period, setPeriod] = useState<"hoy" | "semana" | "mes">("hoy");

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

            // Calcular fechas
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 7);
            const monthAgo = new Date(today);
            monthAgo.setMonth(monthAgo.getMonth() - 1);

            // Filtrar ventas por período
            const ventasHoy = sales.filter((s: { createdAt: string; status: string }) =>
                new Date(s.createdAt) >= today && s.status === "COMPLETADA"
            );
            const ventasAyer = sales.filter((s: { createdAt: string; status: string }) => {
                const date = new Date(s.createdAt);
                return date >= yesterday && date < today && s.status === "COMPLETADA";
            });
            const ventasSemana = sales.filter((s: { createdAt: string; status: string }) =>
                new Date(s.createdAt) >= weekAgo && s.status === "COMPLETADA"
            );
            const ventasMes = sales.filter((s: { createdAt: string; status: string }) =>
                new Date(s.createdAt) >= monthAgo && s.status === "COMPLETADA"
            );

            // Calcular totales
            const totalHoy = ventasHoy.reduce((sum: number, v: { total: number }) => sum + v.total, 0);
            const totalAyer = ventasAyer.reduce((sum: number, v: { total: number }) => sum + v.total, 0);
            const totalSemana = ventasSemana.reduce((sum: number, v: { total: number }) => sum + v.total, 0);
            const totalMes = ventasMes.reduce((sum: number, v: { total: number }) => sum + v.total, 0);

            // Ventas por método de pago
            const ventasPorMetodo: Record<string, number> = {};
            ventasMes.forEach((v: { paymentMethod: string; total: number }) => {
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

            setStats({
                ventas: {
                    hoy: totalHoy,
                    ayer: totalAyer,
                    semana: totalSemana,
                    mes: totalMes
                },
                cantidadVentas: {
                    hoy: ventasHoy.length,
                    semana: ventasSemana.length,
                    mes: ventasMes.length
                },
                productos: {
                    total: products.length,
                    sinStock: products.filter((p: { stock: number }) => p.stock === 0).length,
                    stockBajo: products.filter((p: { stock: number; minStock: number }) => p.stock > 0 && p.stock <= p.minStock).length
                },
                clientes: {
                    total: clients.length,
                    nuevosHoy: clients.filter((c: { createdAt: string }) => new Date(c.createdAt) >= today).length
                },
                topProductos,
                ventasPorMetodo
            });
        } catch (error) {
            console.error("Error fetching stats:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

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

                <div className="p-3 border-t">
                    <Link
                        href="/configuracion"
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                    >
                        <Settings className="h-5 w-5" />
                        <span className="font-medium">Configuración</span>
                    </Link>
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
                        <div className="flex border rounded-lg overflow-hidden">
                            {(["hoy", "semana", "mes"] as const).map((p) => (
                                <Button
                                    key={p}
                                    variant={period === p ? "default" : "ghost"}
                                    size="sm"
                                    className="rounded-none"
                                    onClick={() => setPeriod(p)}
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
                    <div className="p-6 space-y-6">
                        {/* KPIs Principales */}
                        <div className="grid grid-cols-4 gap-4">
                            <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <DollarSign className="h-8 w-8 opacity-80" />
                                        <Badge variant="secondary" className="bg-white/20 text-white">
                                            {variation >= 0 ? (
                                                <ArrowUpRight className="h-3 w-3 mr-1" />
                                            ) : (
                                                <ArrowDownRight className="h-3 w-3 mr-1" />
                                            )}
                                            {Math.abs(variation).toFixed(1)}%
                                        </Badge>
                                    </div>
                                    <p className="text-white/80 text-sm">Ventas Hoy</p>
                                    <p className="text-3xl font-bold">S/ {stats.ventas.hoy.toFixed(2)}</p>
                                    <p className="text-sm text-white/60 mt-1">
                                        Ayer: S/ {stats.ventas.ayer.toFixed(2)}
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <ShoppingCart className="h-8 w-8 opacity-80" />
                                        <Calendar className="h-5 w-5 opacity-60" />
                                    </div>
                                    <p className="text-white/80 text-sm">Ventas del Mes</p>
                                    <p className="text-3xl font-bold">S/ {stats.ventas.mes.toFixed(2)}</p>
                                    <p className="text-sm text-white/60 mt-1">
                                        {stats.cantidadVentas.mes} transacciones
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="bg-gradient-to-br from-purple-500 to-pink-600 text-white">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <Package className="h-8 w-8 opacity-80" />
                                        <Badge variant="secondary" className="bg-white/20 text-white">
                                            {stats.productos.total}
                                        </Badge>
                                    </div>
                                    <p className="text-white/80 text-sm">Productos</p>
                                    <div className="flex gap-4 mt-2">
                                        <div>
                                            <p className="text-2xl font-bold">{stats.productos.sinStock}</p>
                                            <p className="text-xs text-white/60">Sin stock</p>
                                        </div>
                                        <div>
                                            <p className="text-2xl font-bold">{stats.productos.stockBajo}</p>
                                            <p className="text-xs text-white/60">Stock bajo</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-gradient-to-br from-orange-500 to-red-600 text-white">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <Users className="h-8 w-8 opacity-80" />
                                        {stats.clientes.nuevosHoy > 0 && (
                                            <Badge variant="secondary" className="bg-white/20 text-white">
                                                +{stats.clientes.nuevosHoy} hoy
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-white/80 text-sm">Clientes</p>
                                    <p className="text-3xl font-bold">{stats.clientes.total}</p>
                                    <p className="text-sm text-white/60 mt-1">
                                        Registrados en el sistema
                                    </p>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            {/* Ventas por Método de Pago */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <BarChart3 className="h-5 w-5" />
                                        Ventas por Método de Pago
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {Object.keys(stats.ventasPorMetodo).length === 0 ? (
                                        <p className="text-muted-foreground text-center py-8">
                                            No hay ventas en el período
                                        </p>
                                    ) : (
                                        <div className="space-y-4">
                                            {Object.entries(stats.ventasPorMetodo)
                                                .sort((a, b) => b[1] - a[1])
                                                .map(([method, amount]) => {
                                                    const total = Object.values(stats.ventasPorMetodo).reduce((a, b) => a + b, 0);
                                                    const percent = (amount / total) * 100;
                                                    return (
                                                        <div key={method}>
                                                            <div className="flex justify-between text-sm mb-1">
                                                                <span className="font-medium">{method}</span>
                                                                <span>S/ {amount.toFixed(2)}</span>
                                                            </div>
                                                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full bg-primary rounded-full transition-all"
                                                                    style={{ width: `${percent}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Productos con Stock Bajo */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <TrendingDown className="h-5 w-5 text-amber-500" />
                                        Productos con Menor Stock
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {stats.topProductos.length === 0 ? (
                                        <p className="text-muted-foreground text-center py-8">
                                            No hay productos con stock
                                        </p>
                                    ) : (
                                        <div className="space-y-3">
                                            {stats.topProductos.map((product, index) => (
                                                <div key={product.id} className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold">
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
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <TrendingUp className="h-5 w-5 text-green-500" />
                                    Resumen de Ventas
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-3 gap-6 text-center">
                                    <div className="p-4 bg-muted rounded-lg">
                                        <p className="text-sm text-muted-foreground">Hoy</p>
                                        <p className="text-2xl font-bold">S/ {stats.ventas.hoy.toFixed(2)}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {stats.cantidadVentas.hoy} ventas
                                        </p>
                                    </div>
                                    <div className="p-4 bg-muted rounded-lg">
                                        <p className="text-sm text-muted-foreground">Esta Semana</p>
                                        <p className="text-2xl font-bold">S/ {stats.ventas.semana.toFixed(2)}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {stats.cantidadVentas.semana} ventas
                                        </p>
                                    </div>
                                    <div className="p-4 bg-muted rounded-lg">
                                        <p className="text-sm text-muted-foreground">Este Mes</p>
                                        <p className="text-2xl font-bold">S/ {stats.ventas.mes.toFixed(2)}</p>
                                        <p className="text-sm text-muted-foreground">
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

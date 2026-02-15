"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import {
    Home,
    Package,
    ShoppingCart,
    Users,
    Box,
    Receipt,
    FileText,
    Settings,
    Calendar,
    RefreshCw,
    Loader2,
    CreditCard,
    DollarSign,
    ArrowLeft,
    Truck,
    Wallet,
    Banknote,
    TrendingUp,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface PurchaseReport {
    id: string;
    number: string;
    invoiceNumber?: string;
    invoiceDate?: string;
    subtotal: number;
    tax: number;
    total: number;
    paymentMethod: string;
    status: string;
    notes?: string;
    createdAt: string;
    supplier: {
        id: string;
        name: string;
        ruc: string;
    };
    itemCount: number;
}

interface PurchaseKPIs {
    totalCompras: number;
    subtotalTotal: number;
    igvTotal: number;
    cantidadCompras: number;
    proveedoresUnicos: number;
    comprasPorMetodo: Record<string, number>;
    comprasEfectivo: number;
    comprasOtros: number;
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

function getLocalDateStr(date: Date = new Date()): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

export default function ReporteComprasPage() {
    const [loading, setLoading] = useState(true);
    const [purchases, setPurchases] = useState<PurchaseReport[]>([]);
    const [kpis, setKpis] = useState<PurchaseKPIs | null>(null);
    const [dateFrom, setDateFrom] = useState(() => getLocalDateStr());
    const [dateTo, setDateTo] = useState(() => getLocalDateStr());
    const [methodFilter, setMethodFilter] = useState<string>("all");

    const fetchReport = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (dateFrom) params.append("dateFrom", dateFrom);
            if (dateTo) params.append("dateTo", dateTo);
            if (methodFilter !== "all") params.append("paymentMethod", methodFilter);

            const res = await fetch(`/api/reports/purchases?${params}`);
            if (res.ok) {
                const data = await res.json();
                setPurchases(data.purchases || []);
                setKpis(data.kpis || null);
            }
        } catch (error) {
            console.error("Error fetching purchases report:", error);
        } finally {
            setLoading(false);
        }
    }, [dateFrom, dateTo, methodFilter]);

    useEffect(() => {
        fetchReport();
    }, [fetchReport]);

    const setQuickFilter = (type: "hoy" | "ayer" | "semana" | "mes") => {
        const today = new Date();
        const todayStr = getLocalDateStr(today);
        switch (type) {
            case "hoy":
                setDateFrom(todayStr);
                setDateTo(todayStr);
                break;
            case "ayer": {
                const ayer = new Date(today);
                ayer.setDate(ayer.getDate() - 1);
                const ayerStr = getLocalDateStr(ayer);
                setDateFrom(ayerStr);
                setDateTo(ayerStr);
                break;
            }
            case "semana": {
                const semana = new Date(today);
                semana.setDate(semana.getDate() - 7);
                setDateFrom(getLocalDateStr(semana));
                setDateTo(todayStr);
                break;
            }
            case "mes": {
                const mes = new Date(today);
                mes.setMonth(mes.getMonth() - 1);
                setDateFrom(getLocalDateStr(mes));
                setDateTo(todayStr);
                break;
            }
        }
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString("es-PE", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "America/Lima",
        });
    };

    // Totales de la tabla
    const filteredSubtotal = purchases.reduce((sum, p) => sum + p.subtotal, 0);
    const filteredIgv = purchases.reduce((sum, p) => sum + p.tax, 0);
    const filteredTotal = purchases.reduce((sum, p) => sum + p.total, 0);

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
                    <div className="flex items-center gap-3">
                        <a href="/reportes" target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="icon">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </a>
                        <Truck className="h-6 w-6 text-red-600" />
                        <h1 className="text-2xl font-bold">Reporte de Compras</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={fetchReport}>
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Actualizar
                        </Button>
                    </div>
                </header>

                <div className="p-6 space-y-4 overflow-auto">
                    {/* Filtros */}
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex gap-4 items-end flex-wrap">
                                <div className="w-40">
                                    <label className="text-sm text-muted-foreground">Desde</label>
                                    <div className="relative mt-1">
                                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            type="date"
                                            value={dateFrom}
                                            onChange={(e) => setDateFrom(e.target.value)}
                                            className="pl-9"
                                        />
                                    </div>
                                </div>
                                <div className="w-40">
                                    <label className="text-sm text-muted-foreground">Hasta</label>
                                    <div className="relative mt-1">
                                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            type="date"
                                            value={dateTo}
                                            onChange={(e) => setDateTo(e.target.value)}
                                            className="pl-9"
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    {(["hoy", "ayer", "semana", "mes"] as const).map((p) => (
                                        <Button
                                            key={p}
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setQuickFilter(p)}
                                        >
                                            {p.charAt(0).toUpperCase() + p.slice(1)}
                                        </Button>
                                    ))}
                                </div>
                                <div className="flex gap-1 ml-auto">
                                    <Button
                                        variant={methodFilter === "all" ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setMethodFilter("all")}
                                    >
                                        Todos
                                    </Button>
                                    <Button
                                        variant={methodFilter === "EFECTIVO" ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setMethodFilter("EFECTIVO")}
                                    >
                                        <Banknote className="h-3 w-3 mr-1" />
                                        Efectivo
                                    </Button>
                                    <Button
                                        variant={methodFilter === "YAPE" ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setMethodFilter("YAPE")}
                                    >
                                        <Wallet className="h-3 w-3 mr-1" />
                                        Yape
                                    </Button>
                                    <Button
                                        variant={methodFilter === "TRANSFERENCIA" ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setMethodFilter("TRANSFERENCIA")}
                                    >
                                        <CreditCard className="h-3 w-3 mr-1" />
                                        Transfer.
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* KPI Cards */}
                    {kpis && (
                        <div className="grid grid-cols-4 gap-4">
                            <Card className="bg-gradient-to-br from-red-500 to-rose-600 text-white">
                                <CardContent className="p-5">
                                    <div className="flex items-center justify-between mb-3">
                                        <Truck className="h-7 w-7 opacity-80" />
                                        <Badge variant="secondary" className="bg-white/20 text-white text-xs">
                                            {kpis.cantidadCompras}
                                        </Badge>
                                    </div>
                                    <p className="text-white/80 text-sm">Total Compras</p>
                                    <p className="text-2xl font-bold">S/ {kpis.totalCompras.toFixed(2)}</p>
                                    <p className="text-xs text-white/60 mt-1">
                                        {kpis.proveedoresUnicos} proveedor{kpis.proveedoresUnicos !== 1 ? "es" : ""}
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white">
                                <CardContent className="p-5">
                                    <div className="flex items-center justify-between mb-3">
                                        <Banknote className="h-7 w-7 opacity-80" />
                                    </div>
                                    <p className="text-white/80 text-sm">Compras en Efectivo</p>
                                    <p className="text-2xl font-bold">S/ {kpis.comprasEfectivo.toFixed(2)}</p>
                                    <p className="text-xs text-white/60 mt-1">
                                        Sale de la caja física
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                                <CardContent className="p-5">
                                    <div className="flex items-center justify-between mb-3">
                                        <Wallet className="h-7 w-7 opacity-80" />
                                    </div>
                                    <p className="text-white/80 text-sm">Compras Yape/Transfer.</p>
                                    <p className="text-2xl font-bold">S/ {kpis.comprasOtros.toFixed(2)}</p>
                                    <p className="text-xs text-white/60 mt-1">
                                        No afecta caja física
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="bg-gradient-to-br from-purple-500 to-pink-600 text-white">
                                <CardContent className="p-5">
                                    <div className="flex items-center justify-between mb-3">
                                        <TrendingUp className="h-7 w-7 opacity-80" />
                                    </div>
                                    <p className="text-white/80 text-sm">IGV Total (18%)</p>
                                    <p className="text-2xl font-bold">S/ {kpis.igvTotal.toFixed(2)}</p>
                                    <p className="text-xs text-white/60 mt-1">
                                        Base: S/ {kpis.subtotalTotal.toFixed(2)}
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* Desglose por Método de Pago */}
                    {kpis && Object.keys(kpis.comprasPorMetodo).length > 0 && (
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <DollarSign className="h-4 w-4" />
                                    Desglose por Método de Pago
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-4 gap-3">
                                    {Object.entries(kpis.comprasPorMetodo).sort().map(([method, amount]) => (
                                        <div key={method} className="p-3 bg-muted rounded-lg text-center">
                                            <p className="text-xs text-muted-foreground">{method}</p>
                                            <p className="text-lg font-bold">S/ {amount.toFixed(2)}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {((amount / kpis.totalCompras) * 100).toFixed(0)}% del total
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Tabla */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg flex items-center gap-2">
                                Detalle de Compras
                                {methodFilter !== "all" && (
                                    <Badge variant="outline">{methodFilter}</Badge>
                                )}
                                <span className="text-sm text-muted-foreground font-normal ml-2">
                                    ({purchases.length} registros)
                                </span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {loading ? (
                                <div className="flex justify-center py-12">
                                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                </div>
                            ) : purchases.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                    <Truck className="h-12 w-12 mb-4 opacity-50" />
                                    <p>No se encontraron compras en el período seleccionado</p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Nº Compra</TableHead>
                                            <TableHead>Fecha</TableHead>
                                            <TableHead>Proveedor</TableHead>
                                            <TableHead>RUC</TableHead>
                                            <TableHead>Factura Prov.</TableHead>
                                            <TableHead>Método Pago</TableHead>
                                            <TableHead>Items</TableHead>
                                            <TableHead className="text-right">Subtotal</TableHead>
                                            <TableHead className="text-right">IGV</TableHead>
                                            <TableHead className="text-right">Total</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {purchases.map((purchase) => (
                                            <TableRow key={purchase.id}>
                                                <TableCell className="font-mono font-medium">
                                                    {purchase.number}
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                    {formatDate(purchase.createdAt)}
                                                </TableCell>
                                                <TableCell className="font-medium">
                                                    {purchase.supplier.name}
                                                </TableCell>
                                                <TableCell className="font-mono text-sm">
                                                    {purchase.supplier.ruc}
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                    {purchase.invoiceNumber || "-"}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant="outline"
                                                        className={`text-xs ${purchase.paymentMethod === "EFECTIVO"
                                                            ? "border-amber-500 text-amber-600"
                                                            : purchase.paymentMethod === "YAPE"
                                                                ? "border-purple-500 text-purple-600"
                                                                : "border-blue-500 text-blue-600"
                                                            }`}
                                                    >
                                                        {purchase.paymentMethod}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {purchase.itemCount}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    S/ {purchase.subtotal.toFixed(2)}
                                                </TableCell>
                                                <TableCell className="text-right text-muted-foreground">
                                                    S/ {purchase.tax.toFixed(2)}
                                                </TableCell>
                                                <TableCell className="text-right font-bold">
                                                    S/ {purchase.total.toFixed(2)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {/* Fila de totales */}
                                        <TableRow className="bg-muted/50 font-bold">
                                            <TableCell colSpan={7} className="text-right">
                                                TOTALES
                                            </TableCell>
                                            <TableCell className="text-right">
                                                S/ {filteredSubtotal.toFixed(2)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                S/ {filteredIgv.toFixed(2)}
                                            </TableCell>
                                            <TableCell className="text-right text-lg">
                                                S/ {filteredTotal.toFixed(2)}
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}

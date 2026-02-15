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
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";
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
    Eye,
    TrendingUp,
    TrendingDown,
    CheckCircle2,
    AlertTriangle,
    MinusCircle,
    Wallet,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface CashSale {
    id: string;
    number: string;
    total: number;
    paymentMethod: string;
    documentType: string;
    client: string;
    createdAt: string;
}

interface CashRegisterEntry {
    id: string;
    openedAt: string;
    closedAt: string | null;
    openingAmount: number;
    closingAmount: number | null;
    expectedAmount: number | null;
    difference: number | null;
    openedBy: string;
    closedBy: string | null;
    notes: string | null;
    isClosed: boolean;
    totalSales: number;
    salesCount: number;
    salesByMethod: Record<string, number>;
    sales: CashSale[];
    salesNotes: CashSale[];
}

interface CashKPIs {
    totalCajas: number;
    cajasCerradas: number;
    cajasAbiertas: number;
    totalIngresos: number;
    diferenciaAcumulada: number;
    cajasConSobrante: number;
    cajasConFaltante: number;
    cajasCuadradas: number;
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

export default function ReporteCajaDiariaPage() {
    const [loading, setLoading] = useState(true);
    const [registers, setRegisters] = useState<CashRegisterEntry[]>([]);
    const [kpis, setKpis] = useState<CashKPIs | null>(null);
    const [dateFrom, setDateFrom] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        return getLocalDateStr(d);
    });
    const [dateTo, setDateTo] = useState(() => getLocalDateStr());
    const [selectedRegister, setSelectedRegister] = useState<CashRegisterEntry | null>(null);

    const fetchReport = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (dateFrom) params.append("dateFrom", dateFrom);
            if (dateTo) params.append("dateTo", dateTo);

            const res = await fetch(`/api/reports/daily-cash?${params}`);
            if (res.ok) {
                const data = await res.json();
                setRegisters(data.registers || []);
                setKpis(data.kpis || null);
            }
        } catch (error) {
            console.error("Error fetching daily cash report:", error);
        } finally {
            setLoading(false);
        }
    }, [dateFrom, dateTo]);

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

    const formatDateTime = (date: string) => {
        return new Date(date).toLocaleDateString("es-PE", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "America/Lima",
        });
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString("es-PE", {
            weekday: "short",
            day: "2-digit",
            month: "short",
            year: "numeric",
            timeZone: "America/Lima",
        });
    };

    const getDiffBadge = (difference: number | null) => {
        if (difference === null) return null;
        const abs = Math.abs(difference);
        if (abs <= 0.01) {
            return (
                <Badge className="bg-green-500/15 text-green-700 border-green-300">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    CUADRADO
                </Badge>
            );
        }
        if (difference > 0) {
            return (
                <Badge className="bg-blue-500/15 text-blue-700 border-blue-300">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    +S/ {abs.toFixed(2)} SOBRANTE
                </Badge>
            );
        }
        return (
            <Badge className="bg-red-500/15 text-red-700 border-red-300">
                <TrendingDown className="h-3 w-3 mr-1" />
                -S/ {abs.toFixed(2)} FALTANTE
            </Badge>
        );
    };

    const getMethodLabel = (method: string) => {
        const labels: Record<string, string> = {
            EFECTIVO: "💵 Efectivo",
            YAPE: "📱 Yape",
            PLIN: "📱 Plin",
            TARJETA: "💳 Tarjeta",
            TRANSFERENCIA: "🏦 Transferencia",
        };
        return labels[method] || method;
    };

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
                    <div className="flex items-center gap-3">
                        <a href="/reportes" target="app" rel="noopener noreferrer">
                            <Button variant="ghost" size="icon">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </a>
                        <Wallet className="h-6 w-6 text-emerald-600" />
                        <h1 className="text-2xl font-bold">Reporte de Caja Diaria</h1>
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
                            </div>
                        </CardContent>
                    </Card>

                    {/* KPI Cards */}
                    {kpis && (
                        <div className="grid grid-cols-4 gap-4">
                            <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white">
                                <CardContent className="p-5">
                                    <div className="flex items-center justify-between mb-3">
                                        <DollarSign className="h-7 w-7 opacity-80" />
                                        <Badge variant="secondary" className="bg-white/20 text-white text-xs">
                                            {kpis.cajasCerradas} cierres
                                        </Badge>
                                    </div>
                                    <p className="text-white/80 text-sm">Total Ingresos</p>
                                    <p className="text-2xl font-bold">S/ {kpis.totalIngresos.toFixed(2)}</p>
                                </CardContent>
                            </Card>

                            <Card className={`bg-gradient-to-br ${Math.abs(kpis.diferenciaAcumulada) <= 0.01 ? "from-emerald-500 to-green-600" : kpis.diferenciaAcumulada > 0 ? "from-blue-500 to-indigo-600" : "from-red-500 to-rose-600"} text-white`}>
                                <CardContent className="p-5">
                                    <div className="flex items-center justify-between mb-3">
                                        {Math.abs(kpis.diferenciaAcumulada) <= 0.01 ? (
                                            <CheckCircle2 className="h-7 w-7 opacity-80" />
                                        ) : kpis.diferenciaAcumulada > 0 ? (
                                            <TrendingUp className="h-7 w-7 opacity-80" />
                                        ) : (
                                            <TrendingDown className="h-7 w-7 opacity-80" />
                                        )}
                                    </div>
                                    <p className="text-white/80 text-sm">Diferencia Acumulada</p>
                                    <p className="text-2xl font-bold">
                                        {kpis.diferenciaAcumulada >= 0 ? "+" : ""}S/ {kpis.diferenciaAcumulada.toFixed(2)}
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="bg-gradient-to-br from-purple-500 to-pink-600 text-white">
                                <CardContent className="p-5">
                                    <div className="flex items-center justify-between mb-3">
                                        <CheckCircle2 className="h-7 w-7 opacity-80" />
                                    </div>
                                    <p className="text-white/80 text-sm">Cajas Cuadradas</p>
                                    <p className="text-2xl font-bold">{kpis.cajasCuadradas}</p>
                                    <p className="text-xs text-white/60 mt-1">
                                        de {kpis.cajasCerradas} cierres
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white">
                                <CardContent className="p-5">
                                    <div className="flex items-center gap-4 mb-3">
                                        <AlertTriangle className="h-7 w-7 opacity-80" />
                                    </div>
                                    <p className="text-white/80 text-sm">Inconsistencias</p>
                                    <div className="flex gap-4 mt-1">
                                        <div>
                                            <p className="text-xl font-bold">{kpis.cajasConSobrante}</p>
                                            <p className="text-xs text-white/60">Sobrantes</p>
                                        </div>
                                        <div>
                                            <p className="text-xl font-bold">{kpis.cajasConFaltante}</p>
                                            <p className="text-xs text-white/60">Faltantes</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* Tabla de Cajas */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg flex items-center gap-2">
                                Historial de Cajas
                                <span className="text-sm text-muted-foreground font-normal ml-2">
                                    ({registers.length} registros)
                                </span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {loading ? (
                                <div className="flex justify-center py-12">
                                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                </div>
                            ) : registers.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                    <Wallet className="h-12 w-12 mb-4 opacity-50" />
                                    <p>No se encontraron registros de caja en el período</p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Fecha</TableHead>
                                            <TableHead>Estado</TableHead>
                                            <TableHead className="text-right">Apertura</TableHead>
                                            <TableHead className="text-right">Ventas</TableHead>
                                            <TableHead className="text-right"># Ventas</TableHead>
                                            <TableHead className="text-right">Esperado</TableHead>
                                            <TableHead className="text-right">Cierre</TableHead>
                                            <TableHead>Diferencia</TableHead>
                                            <TableHead className="text-center">Detalle</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {registers.map((reg) => (
                                            <TableRow key={reg.id} className={!reg.isClosed ? "bg-amber-50 dark:bg-amber-950/20" : ""}>
                                                <TableCell className="font-medium">
                                                    {formatDate(reg.openedAt)}
                                                </TableCell>
                                                <TableCell>
                                                    {reg.isClosed ? (
                                                        <Badge className="bg-green-500/15 text-green-700">Cerrada</Badge>
                                                    ) : (
                                                        <Badge className="bg-amber-500/15 text-amber-700 animate-pulse">Abierta</Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    S/ {reg.openingAmount.toFixed(2)}
                                                </TableCell>
                                                <TableCell className="text-right font-medium">
                                                    S/ {reg.totalSales.toFixed(2)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {reg.salesCount}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {reg.expectedAmount !== null ? `S/ ${reg.expectedAmount.toFixed(2)}` : "-"}
                                                </TableCell>
                                                <TableCell className="text-right font-bold">
                                                    {reg.closingAmount !== null ? `S/ ${reg.closingAmount.toFixed(2)}` : "-"}
                                                </TableCell>
                                                <TableCell>
                                                    {reg.isClosed ? getDiffBadge(reg.difference) : (
                                                        <span className="text-muted-foreground text-sm">-</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => setSelectedRegister(reg)}
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </main>

            {/* Modal de Detalle */}
            <Dialog open={!!selectedRegister} onOpenChange={() => setSelectedRegister(null)}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Wallet className="h-5 w-5" />
                            Detalle de Caja - {selectedRegister && formatDate(selectedRegister.openedAt)}
                        </DialogTitle>
                    </DialogHeader>

                    {selectedRegister && (
                        <div className="space-y-4">
                            {/* Resumen */}
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-muted-foreground">Apertura</p>
                                    <p className="font-medium">{formatDateTime(selectedRegister.openedAt)}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Cierre</p>
                                    <p className="font-medium">
                                        {selectedRegister.closedAt
                                            ? formatDateTime(selectedRegister.closedAt)
                                            : "⏳ Abierta"}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Monto Apertura</p>
                                    <p className="font-bold text-lg">S/ {selectedRegister.openingAmount.toFixed(2)}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Total Ventas</p>
                                    <p className="font-bold text-lg text-green-600">S/ {selectedRegister.totalSales.toFixed(2)}</p>
                                </div>
                            </div>

                            {/* Diferencia */}
                            {selectedRegister.isClosed && (
                                <div className="border rounded-lg p-4 space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Monto Esperado</span>
                                        <span className="font-medium">S/ {selectedRegister.expectedAmount?.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Monto Cierre</span>
                                        <span className="font-bold">S/ {selectedRegister.closingAmount?.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between items-center border-t pt-2">
                                        <span className="text-sm font-medium">Diferencia</span>
                                        {getDiffBadge(selectedRegister.difference)}
                                    </div>
                                </div>
                            )}

                            {/* Desglose por Método */}
                            <div>
                                <p className="font-medium mb-2">Desglose por Método de Pago</p>
                                <div className="space-y-2">
                                    {Object.entries(selectedRegister.salesByMethod)
                                        .sort((a, b) => b[1] - a[1])
                                        .map(([method, amount]) => {
                                            const percent = selectedRegister.totalSales > 0
                                                ? (amount / selectedRegister.totalSales) * 100
                                                : 0;
                                            return (
                                                <div key={method}>
                                                    <div className="flex justify-between text-sm mb-1">
                                                        <span>{getMethodLabel(method)}</span>
                                                        <span className="font-medium">S/ {amount.toFixed(2)}</span>
                                                    </div>
                                                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-emerald-500 rounded-full transition-all"
                                                            style={{ width: `${percent}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    {Object.keys(selectedRegister.salesByMethod).length === 0 && (
                                        <p className="text-muted-foreground text-sm text-center py-4">Sin ventas</p>
                                    )}
                                </div>
                            </div>

                            {/* Listado de Ventas */}
                            {(selectedRegister.sales.length > 0 || selectedRegister.salesNotes.length > 0) && (
                                <div>
                                    <p className="font-medium mb-2">
                                        Ventas del Turno ({selectedRegister.salesCount})
                                    </p>
                                    <div className="max-h-60 overflow-y-auto border rounded-lg">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="text-xs">Nro</TableHead>
                                                    <TableHead className="text-xs">Tipo</TableHead>
                                                    <TableHead className="text-xs">Hora</TableHead>
                                                    <TableHead className="text-xs">Cliente</TableHead>
                                                    <TableHead className="text-xs">Método</TableHead>
                                                    <TableHead className="text-xs text-right">Total</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {[...selectedRegister.sales, ...selectedRegister.salesNotes]
                                                    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                                                    .map((sale) => (
                                                        <TableRow key={sale.id}>
                                                            <TableCell className="font-mono text-xs">{sale.number}</TableCell>
                                                            <TableCell>
                                                                <Badge variant="outline" className="text-xs px-1 py-0">
                                                                    {sale.documentType === "NOTA_VENTA" ? "NV" : sale.documentType === "FACTURA" ? "FAC" : "BOL"}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell className="text-xs">
                                                                {new Date(sale.createdAt).toLocaleTimeString("es-PE", {
                                                                    hour: "2-digit",
                                                                    minute: "2-digit",
                                                                    timeZone: "America/Lima",
                                                                })}
                                                            </TableCell>
                                                            <TableCell className="text-xs">{sale.client}</TableCell>
                                                            <TableCell>
                                                                <Badge variant="outline" className="text-xs px-1 py-0">
                                                                    {sale.paymentMethod}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell className="text-right font-medium text-xs">
                                                                S/ {sale.total.toFixed(2)}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            )}

                            {/* Notas */}
                            {selectedRegister.notes && (
                                <div className="border-t pt-3">
                                    <p className="text-sm text-muted-foreground">Notas</p>
                                    <p className="text-sm whitespace-pre-wrap">{selectedRegister.notes}</p>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

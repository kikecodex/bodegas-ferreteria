"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
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
    Bell,
    ArrowLeft,
    Search,
    Calendar,
    RefreshCw,
    Eye,
    XCircle,
    Loader2,
    ChevronLeft,
    ChevronRight,
    Printer,
    Trash2,
    AlertTriangle,
    CreditCard,
    Truck,
    FileEdit,
    DollarSign,
    TrendingUp
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";

interface Sale {
    id: string;
    number: string;
    total: number;
    subtotal: number;
    discount: number;
    tax: number;
    paymentMethod: string;
    status: string;
    documentType: string;
    createdAt: string;
    client?: {
        id: string;
        name: string;
        document: string;
    };
    user?: {
        id: string;
        name: string;
    };
    _count?: {
        items: number;
    };
}

interface SaleDetail extends Sale {
    items: {
        id: string;
        productId: string;
        productName: string;
        productCode: string;
        quantity: number;
        unitPrice: number;
        discount: number;
        subtotal: number;
        product?: {
            id: string;
            code: string;
            name: string;
        };
    }[];
}

const navItems = [
    { icon: Home, label: "Dashboard", href: "/" },
    { icon: Package, label: "Productos", href: "/productos" },
    { icon: ShoppingCart, label: "Ventas", href: "/ventas", active: true },
    { icon: CreditCard, label: "Créditos", href: "/creditos" },
    { icon: Users, label: "Clientes", href: "/clientes" },
    { icon: Truck, label: "Proveedores", href: "/proveedores" },
    { icon: Box, label: "Compras", href: "/compras" },
    { icon: FileEdit, label: "Cotizaciones", href: "/cotizaciones" },
    { icon: Receipt, label: "Notas de Venta", href: "/notas-venta" },
    { icon: FileText, label: "Reportes", href: "/reportes" },
];

// Helper: obtener fecha en zona horaria de Perú (UTC-5) como YYYY-MM-DD
// Usa toLocaleDateString con timezone fijo para evitar que en servidores UTC
// las ventas de madrugada (00:00-05:00 PET) caigan en el día anterior
function getLocalDateStr(date: Date = new Date()): string {
    return date.toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
}

export default function HistorialVentasPage() {
    const [sales, setSales] = useState<Sale[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    // Inicializar con fecha de hoy en hora LOCAL
    const [dateFrom, setDateFrom] = useState(() => getLocalDateStr());
    const [dateTo, setDateTo] = useState(() => getLocalDateStr());
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Modal de detalle
    const [selectedSale, setSelectedSale] = useState<SaleDetail | null>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);

    // Modal de limpiar historial
    const [showClearModal, setShowClearModal] = useState(false);
    const [clearConfirmation, setClearConfirmation] = useState("");
    const [clearInfo, setClearInfo] = useState<{ confirmationCode: string; salesCount: number } | null>(null);
    const [clearing, setClearing] = useState(false);

    // Modal de duplicados
    const [showDuplicatesModal, setShowDuplicatesModal] = useState(false);
    const [duplicateGroups, setDuplicateGroups] = useState<Array<{
        key: string;
        total: number;
        client: string | null;
        sales: Array<{
            id: string;
            number: string;
            total: number;
            createdAt: string;
            timeDiff: number | null;
        }>;
    }>>([]);
    const [loadingDuplicates, setLoadingDuplicates] = useState(false);
    const [voidingId, setVoidingId] = useState<string | null>(null);
    const [deletingVoided, setDeletingVoided] = useState(false);

    // Resumen agregado del servidor (sin paginación)
    const [summary, setSummary] = useState({ totalVentas: 0, cantidadVentas: 0 });

    const fetchSales = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: "20"
            });
            if (search) params.append("search", search);
            if (dateFrom) params.append("dateFrom", dateFrom);
            if (dateTo) params.append("dateTo", dateTo);

            const res = await fetch(`/api/sales?${params}`);
            if (res.ok) {
                const data = await res.json();
                // Excluir ventas a crédito (se manejan en módulo /creditos)
                const salesFiltradas = (data.sales || []).filter(
                    (s: { paymentMethod: string }) => s.paymentMethod !== "CREDITO"
                );
                setSales(salesFiltradas);
                setTotalPages(data.pagination?.totalPages || 1);
                // Resumen agregado del servidor (totales reales sin paginación)
                if (data.summary) {
                    setSummary(data.summary);
                }
            }
        } catch (error) {
            console.error("Error fetching sales:", error);
        } finally {
            setLoading(false);
        }
    }, [page, search, dateFrom, dateTo]);

    useEffect(() => {
        fetchSales();
    }, [fetchSales]);

    const viewSaleDetail = async (saleId: string) => {
        setLoadingDetail(true);
        try {
            const res = await fetch(`/api/sales/${saleId}`);
            if (res.ok) {
                const data = await res.json();
                setSelectedSale(data);
            }
        } catch (error) {
            console.error("Error fetching sale detail:", error);
        } finally {
            setLoadingDetail(false);
        }
    };

    // Anular venta y restaurar stock
    const cancelSale = async (saleId: string) => {
        if (!confirm("¿Está seguro de anular esta venta?\n\n✓ Se restaurará el stock de los productos\n✓ La venta quedará marcada como ANULADA")) {
            return;
        }

        try {
            const res = await fetch(`/api/sales/${saleId}/void`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    reason: "Anulación manual desde historial"
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error);
            }

            const result = await res.json();
            alert(`✓ ${result.message}\n\nStock restaurado:\n${result.stockRestored.map((s: { productName: string; quantity: number }) => `• ${s.productName}: +${s.quantity}`).join('\n')}`);
            fetchSales();
            setSelectedSale(null);
        } catch (error) {
            alert(error instanceof Error ? error.message : "Error al anular venta");
        }
    };

    // Imprimir ticket de venta - Impresión DIRECTA sin diálogo
    const printSale = async (saleId: string) => {
        try {
            // Intentar usar servidor local de impresión (impresión 100% silenciosa)
            try {
                const pingResponse = await fetch('http://localhost:9100/ping', {
                    method: 'GET',
                    signal: AbortSignal.timeout(1000)
                });

                if (pingResponse.ok) {
                    const response = await fetch(`/api/sales/${saleId}/receipt`);
                    if (!response.ok) throw new Error('Error al obtener ticket');
                    const pdfBlob = await response.blob();

                    const printResponse = await fetch('http://localhost:9100/print', {
                        method: 'POST',
                        body: pdfBlob
                    });

                    if (printResponse.ok) {
                        console.log('✓ Ticket enviado a impresora POS-80');
                        return;
                    }
                }
            } catch (localError) {
                console.log('Servidor local no disponible, abriendo ventana de impresión');
            }

            // Fallback: Abrir PDF en ventana popup separada (no encima del sistema)
            // Esto permite ver, imprimir o descargar el ticket
            const printUrl = `/api/sales/${saleId}/receipt`;
            const popup = window.open(
                printUrl,
                'ImprimirTicket',
                'width=450,height=700,left=100,top=100,scrollbars=yes,resizable=yes,toolbar=no,menubar=no,location=no,status=no'
            );

            if (popup) {
                popup.focus();
            } else {
                // Si el popup fue bloqueado, abrir en nueva pestaña
                window.open(printUrl, '_blank');
            }
        } catch (error) {
            console.error('Error al imprimir:', error);
            alert('Error al imprimir el ticket');
        }
    };

    // Obtener info para limpiar historial
    const fetchClearInfo = async () => {
        try {
            const res = await fetch("/api/sales/clear-sales");
            if (res.ok) {
                const data = await res.json();
                setClearInfo(data);
            }
        } catch (error) {
            console.error("Error:", error);
        }
    };

    // Limpiar historial de ventas
    const clearHistory = async () => {
        if (!clearInfo || clearConfirmation !== clearInfo.confirmationCode) {
            alert("Código de confirmación incorrecto");
            return;
        }

        setClearing(true);
        try {
            const res = await fetch("/api/sales/clear-sales", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ confirmation: clearConfirmation })
            });

            if (res.ok) {
                const data = await res.json();
                alert(`✅ ${data.message}`);
                setShowClearModal(false);
                setClearConfirmation("");
                fetchSales();
            } else {
                const data = await res.json();
                alert(data.error || "Error al limpiar historial");
            }
        } catch (error) {
            alert("Error al limpiar historial");
        } finally {
            setClearing(false);
        }
    };

    // Buscar ventas duplicadas
    const fetchDuplicates = async () => {
        setLoadingDuplicates(true);
        try {
            const res = await fetch("/api/sales/duplicates?threshold=60");
            if (res.ok) {
                const data = await res.json();
                setDuplicateGroups(data.duplicateGroups || []);
                setShowDuplicatesModal(true);
            }
        } catch (error) {
            console.error("Error fetching duplicates:", error);
            alert("Error al buscar duplicados");
        } finally {
            setLoadingDuplicates(false);
        }
    };

    // Eliminar venta desde modal de duplicados
    const voidSaleFromDuplicates = async (saleId: string, saleNumber: string) => {
        if (!confirm(`¿ELIMINAR venta ${saleNumber} permanentemente?\n\n✓ Se restaurará el stock\n✓ La venta se borrará del sistema`)) {
            return;
        }

        setVoidingId(saleId);
        try {
            const res = await fetch(`/api/sales/${saleId}/void`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reason: "Venta duplicada - eliminación" })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error);
            }

            // Actualizar grupos de duplicados (remover la venta eliminada)
            setDuplicateGroups(prev =>
                prev.map(group => ({
                    ...group,
                    sales: group.sales.filter(s => s.id !== saleId)
                })).filter(group => group.sales.length > 1)
            );

            fetchSales();
        } catch (error) {
            alert(error instanceof Error ? error.message : "Error al eliminar");
        } finally {
            setVoidingId(null);
        }
    };

    // Eliminar TODAS las ventas anuladas de la base de datos
    const deleteVoidedSales = async () => {
        if (!confirm("¿ELIMINAR PERMANENTEMENTE todas las ventas ANULADAS?\n\n⚠️ Esta acción no se puede deshacer\n✓ Las ventas anuladas se borrarán del sistema")) {
            return;
        }

        setDeletingVoided(true);
        try {
            const res = await fetch("/api/sales/delete-voided", {
                method: "DELETE"
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error);
            }

            const result = await res.json();
            alert(`✓ ${result.message}`);
            fetchSales();
        } catch (error) {
            alert(error instanceof Error ? error.message : "Error al eliminar ventas anuladas");
        } finally {
            setDeletingVoided(false);
        }
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString("es-PE", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "COMPLETADA":
                return <Badge className="bg-green-500">Completada</Badge>;
            case "ANULADA":
                return <Badge variant="destructive">Anulada</Badge>;
            case "PENDIENTE":
                return <Badge variant="secondary">Pendiente</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const getPaymentBadge = (method: string) => {
        const colors: Record<string, string> = {
            EFECTIVO: "bg-green-500/20 text-green-700",
            TARJETA: "bg-blue-500/20 text-blue-700",
            YAPE: "bg-purple-500/20 text-purple-700",
            PLIN: "bg-cyan-500/20 text-cyan-700",
            TRANSFERENCIA: "bg-orange-500/20 text-orange-700",
            CREDITO: "bg-amber-500/20 text-amber-700"
        };
        return (
            <Badge variant="outline" className={colors[method] || ""}>
                {method === "CREDITO" ? "AL CRÉDITO" : method}
            </Badge>
        );
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
                            <AvatarFallback className="bg-red-100 text-red-600">N</AvatarFallback>
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
                    <div className="flex items-center gap-4">
                        <Link href="/ventas">
                            <Button variant="ghost" size="icon">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <h1 className="text-2xl font-bold">Historial de Ventas</h1>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={fetchDuplicates}
                            disabled={loadingDuplicates}
                            className="text-amber-600 border-amber-300 hover:bg-amber-50"
                        >
                            {loadingDuplicates ? (
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                                <AlertTriangle className="h-4 w-4 mr-1" />
                            )}
                            Buscar Duplicados
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={deleteVoidedSales}
                            disabled={deletingVoided}
                            className="text-red-500 border-red-200 hover:bg-red-50"
                        >
                            {deletingVoided ? (
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                                <XCircle className="h-4 w-4 mr-1" />
                            )}
                            Limpiar Anuladas
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                                fetchClearInfo();
                                setShowClearModal(true);
                            }}
                        >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Limpiar Historial
                        </Button>
                        <Button variant="outline" size="sm" onClick={fetchSales}>
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Actualizar
                        </Button>
                        <Button variant="ghost" size="icon">
                            <Bell className="h-5 w-5" />
                        </Button>
                    </div>
                </header>

                <div className="p-6 space-y-4">
                    {/* Filtros */}
                    <Card>
                        <CardContent className="p-4 space-y-3">
                            {/* Botones de filtro rápido por fecha */}
                            <div className="flex gap-2">
                                <Button
                                    variant={dateFrom === getLocalDateStr() && dateTo === getLocalDateStr() ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => {
                                        const today = getLocalDateStr();
                                        setDateFrom(today);
                                        setDateTo(today);
                                    }}
                                >
                                    Hoy
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        const yesterday = new Date();
                                        yesterday.setDate(yesterday.getDate() - 1);
                                        const yesterdayStr = getLocalDateStr(yesterday);
                                        setDateFrom(yesterdayStr);
                                        setDateTo(yesterdayStr);
                                    }}
                                >
                                    Ayer
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        const today = new Date();
                                        const weekAgo = new Date();
                                        weekAgo.setDate(today.getDate() - 7);
                                        setDateFrom(getLocalDateStr(weekAgo));
                                        setDateTo(getLocalDateStr(today));
                                    }}
                                >
                                    Semana
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        const today = new Date();
                                        const monthAgo = new Date();
                                        monthAgo.setMonth(today.getMonth() - 1);
                                        setDateFrom(getLocalDateStr(monthAgo));
                                        setDateTo(getLocalDateStr(today));
                                    }}
                                >
                                    Mes
                                </Button>
                                {(dateFrom || dateTo) && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setDateFrom("");
                                            setDateTo("");
                                        }}
                                        className="text-muted-foreground"
                                    >
                                        Limpiar
                                    </Button>
                                )}
                            </div>
                            <div className="flex gap-4 items-end">
                                <div className="flex-1">
                                    <label className="text-sm text-muted-foreground">Buscar</label>
                                    <div className="relative mt-1">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            placeholder="Número, cliente, documento..."
                                            className="pl-9"
                                        />
                                    </div>
                                </div>
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
                            </div>
                        </CardContent>
                    </Card>

                    {/* Resumen del día - Usa totales del servidor (sin paginación) */}
                    {!loading && summary.cantidadVentas > 0 && (() => {
                        const totalDia = summary.totalVentas;
                        const cantidadVentas = summary.cantidadVentas;
                        const promedio = cantidadVentas > 0 ? totalDia / cantidadVentas : 0;
                        return (
                            <div className="grid grid-cols-3 gap-4">
                                <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white">
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm text-green-100">Total Ventas</p>
                                                <p className="text-2xl font-bold">S/ {totalDia.toFixed(2)}</p>
                                            </div>
                                            <DollarSign className="h-8 w-8 text-green-200" />
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm text-blue-100">Cantidad de Ventas</p>
                                                <p className="text-2xl font-bold">{cantidadVentas}</p>
                                            </div>
                                            <Receipt className="h-8 w-8 text-blue-200" />
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white">
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm text-amber-100">Promedio por Venta</p>
                                                <p className="text-2xl font-bold">S/ {promedio.toFixed(2)}</p>
                                            </div>
                                            <TrendingUp className="h-8 w-8 text-amber-200" />
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        );
                    })()}

                    {/* Tabla */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg">Ventas</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {loading ? (
                                <div className="flex justify-center py-12">
                                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                </div>
                            ) : sales.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                    <Receipt className="h-12 w-12 mb-4 opacity-50" />
                                    <p>No se encontraron ventas</p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Número</TableHead>
                                            <TableHead>Fecha</TableHead>
                                            <TableHead>Cliente</TableHead>
                                            <TableHead>Items</TableHead>
                                            <TableHead>Pago</TableHead>
                                            <TableHead className="text-right">Total</TableHead>
                                            <TableHead>Estado</TableHead>
                                            <TableHead className="text-right">Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {sales.map(sale => (
                                            <TableRow key={sale.id}>
                                                <TableCell className="font-medium">
                                                    {sale.number}
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                    {formatDate(sale.createdAt)}
                                                </TableCell>
                                                <TableCell>
                                                    {sale.client?.name || "Cliente general"}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary">
                                                        {sale._count?.items || 0}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {getPaymentBadge(sale.paymentMethod)}
                                                </TableCell>
                                                <TableCell className="text-right font-bold">
                                                    S/ {sale.total.toFixed(2)}
                                                </TableCell>
                                                <TableCell>
                                                    {getStatusBadge(sale.status)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => viewSaleDetail(sale.id)}
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-blue-500"
                                                        onClick={() => printSale(sale.id)}
                                                        title="Imprimir ticket"
                                                    >
                                                        <Printer className="h-4 w-4" />
                                                    </Button>
                                                    {sale.status !== "ANULADA" && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-red-500"
                                                            onClick={() => cancelSale(sale.id)}
                                                        >
                                                            <XCircle className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>

                    {/* Paginación */}
                    {totalPages > 1 && (
                        <div className="flex justify-center gap-2">
                            <Button
                                variant="outline"
                                size="icon"
                                disabled={page === 1}
                                onClick={() => setPage(p => p - 1)}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="flex items-center px-4">
                                Página {page} de {totalPages}
                            </span>
                            <Button
                                variant="outline"
                                size="icon"
                                disabled={page === totalPages}
                                onClick={() => setPage(p => p + 1)}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                </div>
            </main>

            {/* Modal de Detalle */}
            <Dialog open={!!selectedSale} onOpenChange={() => setSelectedSale(null)}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            Detalle de Venta {selectedSale?.number}
                        </DialogTitle>
                    </DialogHeader>
                    {loadingDetail ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    ) : selectedSale && (
                        <div className="space-y-4">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Fecha</span>
                                <span>{formatDate(selectedSale.createdAt)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Cliente</span>
                                <span>{selectedSale.client?.name || "Cliente general"}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Vendedor</span>
                                <span>{selectedSale.user?.name || "Sistema"}</span>
                            </div>

                            <div className="border-t pt-4">
                                <p className="font-medium mb-2">Items</p>
                                <div className="space-y-2">
                                    {selectedSale.items?.map(item => (
                                        <div key={item.id} className="flex justify-between text-sm">
                                            <span>
                                                {item.quantity} x {item.productName}
                                            </span>
                                            <span>S/ {item.subtotal.toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="border-t pt-4 space-y-1">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Subtotal</span>
                                    <span>S/ {selectedSale.subtotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">IGV (18%)</span>
                                    <span>S/ {selectedSale.tax.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between font-bold text-lg">
                                    <span>Total</span>
                                    <span>S/ {selectedSale.total.toFixed(2)}</span>
                                </div>
                            </div>

                            <div className="flex gap-2 border-t pt-4">
                                {getStatusBadge(selectedSale.status)}
                                {getPaymentBadge(selectedSale.paymentMethod)}
                                <Badge variant="outline">{selectedSale.documentType}</Badge>
                            </div>

                            <div className="flex gap-2 border-t pt-4">
                                <Button
                                    className="flex-1"
                                    onClick={() => printSale(selectedSale.id)}
                                >
                                    <Printer className="h-4 w-4 mr-2" />
                                    Imprimir Ticket
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Modal de Limpiar Historial */}
            <Dialog open={showClearModal} onOpenChange={setShowClearModal}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600">
                            <AlertTriangle className="h-5 w-5" />
                            Limpiar Historial de Ventas
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <p className="text-red-800 font-medium">⚠️ Esta acción es irreversible</p>
                            <p className="text-red-600 text-sm mt-1">
                                Se eliminarán permanentemente {clearInfo?.salesCount || 0} ventas y todos sus items.
                            </p>
                        </div>

                        <div>
                            <label className="text-sm font-medium">Para confirmar, escriba:</label>
                            <p className="font-mono text-lg my-2 bg-gray-100 p-2 rounded text-center">
                                {clearInfo?.confirmationCode || "cargando..."}
                            </p>
                            <Input
                                value={clearConfirmation}
                                onChange={(e) => setClearConfirmation(e.target.value)}
                                placeholder="Escriba el código de confirmación"
                                className="mt-2"
                            />
                        </div>

                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => {
                                    setShowClearModal(false);
                                    setClearConfirmation("");
                                }}
                            >
                                Cancelar
                            </Button>
                            <Button
                                variant="destructive"
                                className="flex-1"
                                onClick={clearHistory}
                                disabled={clearing || clearConfirmation !== clearInfo?.confirmationCode}
                            >
                                {clearing ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                                    <>
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Eliminar Todo
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Modal de Duplicados */}
            <Dialog open={showDuplicatesModal} onOpenChange={setShowDuplicatesModal}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-amber-500" />
                            Ventas Potencialmente Duplicadas
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        {duplicateGroups.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <Receipt className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                <p>No se encontraron ventas duplicadas 🎉</p>
                                <p className="text-sm">El sistema verificó las últimas 7 días</p>
                            </div>
                        ) : (
                            <>
                                <p className="text-sm text-muted-foreground">
                                    Se encontraron {duplicateGroups.length} grupo(s) de ventas con el mismo total
                                    y productos, creadas con menos de 60 segundos de diferencia.
                                </p>

                                {duplicateGroups.map((group, idx) => (
                                    <Card key={idx} className="border-amber-200 bg-amber-50/50">
                                        <CardHeader className="py-3">
                                            <CardTitle className="text-sm flex justify-between items-center">
                                                <span>Total: S/ {group.total.toFixed(2)}</span>
                                                <Badge variant="outline">
                                                    {group.sales.length} ventas
                                                </Badge>
                                            </CardTitle>
                                            {group.client && (
                                                <p className="text-xs text-muted-foreground">
                                                    Cliente: {group.client}
                                                </p>
                                            )}
                                        </CardHeader>
                                        <CardContent className="py-2">
                                            <div className="space-y-2">
                                                {group.sales.map((sale, saleIdx) => (
                                                    <div
                                                        key={sale.id}
                                                        className="flex items-center justify-between p-2 bg-white rounded border"
                                                    >
                                                        <div>
                                                            <p className="font-mono text-sm">{sale.number}</p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {formatDate(sale.createdAt)}
                                                                {sale.timeDiff && (
                                                                    <span className="ml-2 text-amber-600">
                                                                        (+{sale.timeDiff}s después)
                                                                    </span>
                                                                )}
                                                            </p>
                                                        </div>
                                                        {saleIdx > 0 && (
                                                            <Button
                                                                variant="destructive"
                                                                size="sm"
                                                                onClick={() => voidSaleFromDuplicates(sale.id, sale.number)}
                                                                disabled={voidingId === sale.id}
                                                            >
                                                                {voidingId === sale.id ? (
                                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                                ) : (
                                                                    <>
                                                                        <Trash2 className="h-4 w-4 mr-1" />
                                                                        Eliminar
                                                                    </>
                                                                )}
                                                            </Button>
                                                        )}
                                                        {saleIdx === 0 && (
                                                            <Badge className="bg-green-500">Original</Badge>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </>
                        )}

                        <div className="flex justify-end">
                            <Button variant="outline" onClick={() => setShowDuplicatesModal(false)}>
                                Cerrar
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

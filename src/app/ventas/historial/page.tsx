"use client";

import { useState, useEffect, useCallback } from "react";
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
    ChevronRight
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
    { icon: Users, label: "Clientes", href: "/clientes" },
    { icon: Box, label: "Inventario", href: "/inventario" },
    { icon: Receipt, label: "Facturas", href: "/facturas" },
    { icon: FileText, label: "Reportes", href: "/reportes" },
];

export default function HistorialVentasPage() {
    const [sales, setSales] = useState<Sale[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Modal de detalle
    const [selectedSale, setSelectedSale] = useState<SaleDetail | null>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);

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
                setSales(data.sales || []);
                setTotalPages(data.pagination?.totalPages || 1);
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

    const cancelSale = async (saleId: string) => {
        if (!confirm("¿Está seguro de anular esta venta? Se reversará el stock.")) {
            return;
        }

        try {
            const res = await fetch(`/api/sales/${saleId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "ANULAR",
                    reason: "Anulación manual"
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error);
            }

            alert("Venta anulada correctamente");
            fetchSales();
            setSelectedSale(null);
        } catch (error) {
            alert(error instanceof Error ? error.message : "Error al anular venta");
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
            TRANSFERENCIA: "bg-orange-500/20 text-orange-700"
        };
        return (
            <Badge variant="outline" className={colors[method] || ""}>
                {method}
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
                        <CardContent className="p-4">
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
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

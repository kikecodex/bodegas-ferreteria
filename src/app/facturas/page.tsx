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
    Bell,
    Search,
    Calendar,
    RefreshCw,
    Eye,
    Download,
    Loader2,
    ChevronLeft,
    ChevronRight,
    FileCheck,
    FileMinus
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Sale {
    id: string;
    number: string;
    total: number;
    subtotal: number;
    tax: number;
    paymentMethod: string;
    status: string;
    documentType: string;
    documentNumber?: string;
    createdAt: string;
    client?: {
        id: string;
        name: string;
        document: string;
        documentType: string;
    };
    items?: Array<{
        id: string;
        productName: string;
        quantity: number;
        unitPrice: number;
        subtotal: number;
    }>;
}

const navItems = [
    { icon: Home, label: "Dashboard", href: "/" },
    { icon: Package, label: "Productos", href: "/productos" },
    { icon: ShoppingCart, label: "Ventas", href: "/ventas" },
    { icon: Users, label: "Clientes", href: "/clientes" },
    { icon: Box, label: "Inventario", href: "/inventario" },
    { icon: Receipt, label: "Facturas", href: "/facturas", active: true },
    { icon: FileText, label: "Reportes", href: "/reportes" },
];

export default function FacturasPage() {
    const [sales, setSales] = useState<Sale[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [docFilter, setDocFilter] = useState<"all" | "BOLETA" | "FACTURA">("all");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Modal de detalle
    const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);

    // Stats
    const [stats, setStats] = useState({
        totalBoletas: 0,
        totalFacturas: 0,
        montoBoletas: 0,
        montoFacturas: 0
    });

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
                let allSales = data.sales || [];

                // Calcular stats
                const boletas = allSales.filter((s: Sale) => s.documentType === "BOLETA" && s.status === "COMPLETADA");
                const facturas = allSales.filter((s: Sale) => s.documentType === "FACTURA" && s.status === "COMPLETADA");

                setStats({
                    totalBoletas: boletas.length,
                    totalFacturas: facturas.length,
                    montoBoletas: boletas.reduce((sum: number, s: Sale) => sum + s.total, 0),
                    montoFacturas: facturas.reduce((sum: number, s: Sale) => sum + s.total, 0)
                });

                // Aplicar filtro por tipo de documento
                if (docFilter !== "all") {
                    allSales = allSales.filter((s: Sale) => s.documentType === docFilter);
                }

                setSales(allSales);
                setTotalPages(data.pagination?.totalPages || 1);
            }
        } catch (error) {
            console.error("Error fetching sales:", error);
        } finally {
            setLoading(false);
        }
    }, [page, search, dateFrom, dateTo, docFilter]);

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
                return <Badge className="bg-green-500">Emitida</Badge>;
            case "ANULADA":
                return <Badge variant="destructive">Anulada</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
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
                    <h1 className="text-2xl font-bold">Comprobantes</h1>
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
                    {/* Stats */}
                    <div className="grid grid-cols-4 gap-4">
                        <Card className={`cursor-pointer ${docFilter === "BOLETA" ? "border-blue-500" : ""}`} onClick={() => setDocFilter(docFilter === "BOLETA" ? "all" : "BOLETA")}>
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Boletas</p>
                                        <p className="text-2xl font-bold">{stats.totalBoletas}</p>
                                    </div>
                                    <FileCheck className="h-8 w-8 text-blue-500" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Monto Boletas</p>
                                        <p className="text-2xl font-bold text-blue-600">S/ {stats.montoBoletas.toFixed(2)}</p>
                                    </div>
                                    <Receipt className="h-8 w-8 text-blue-500" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className={`cursor-pointer ${docFilter === "FACTURA" ? "border-green-500" : ""}`} onClick={() => setDocFilter(docFilter === "FACTURA" ? "all" : "FACTURA")}>
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Facturas</p>
                                        <p className="text-2xl font-bold">{stats.totalFacturas}</p>
                                    </div>
                                    <FileMinus className="h-8 w-8 text-green-500" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Monto Facturas</p>
                                        <p className="text-2xl font-bold text-green-600">S/ {stats.montoFacturas.toFixed(2)}</p>
                                    </div>
                                    <Receipt className="h-8 w-8 text-green-500" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

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
                                            placeholder="Número, cliente..."
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
                            <CardTitle className="text-lg flex items-center gap-2">
                                Comprobantes Emitidos
                                {docFilter !== "all" && (
                                    <Badge variant="outline">{docFilter}</Badge>
                                )}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {loading ? (
                                <div className="flex justify-center py-12">
                                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                </div>
                            ) : sales.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                    <Receipt className="h-12 w-12 mb-4 opacity-50" />
                                    <p>No se encontraron comprobantes</p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Número</TableHead>
                                            <TableHead>Tipo</TableHead>
                                            <TableHead>Fecha</TableHead>
                                            <TableHead>Cliente</TableHead>
                                            <TableHead>RUC/DNI</TableHead>
                                            <TableHead className="text-right">Subtotal</TableHead>
                                            <TableHead className="text-right">IGV</TableHead>
                                            <TableHead className="text-right">Total</TableHead>
                                            <TableHead>Estado</TableHead>
                                            <TableHead className="text-right">Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {sales.map(sale => (
                                            <TableRow key={sale.id}>
                                                <TableCell className="font-mono font-medium">
                                                    {sale.number}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={sale.documentType === "FACTURA" ? "default" : "secondary"}>
                                                        {sale.documentType}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                    {formatDate(sale.createdAt)}
                                                </TableCell>
                                                <TableCell>
                                                    {sale.client?.name || "Cliente general"}
                                                </TableCell>
                                                <TableCell className="font-mono text-sm">
                                                    {sale.client?.document || "-"}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    S/ {sale.subtotal.toFixed(2)}
                                                </TableCell>
                                                <TableCell className="text-right text-muted-foreground">
                                                    S/ {sale.tax.toFixed(2)}
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
                                                        title="Descargar PDF"
                                                    >
                                                        <Download className="h-4 w-4" />
                                                    </Button>
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
                        <DialogTitle className="flex items-center gap-2">
                            <Receipt className="h-5 w-5" />
                            {selectedSale?.documentType} {selectedSale?.number}
                        </DialogTitle>
                    </DialogHeader>
                    {loadingDetail ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    ) : selectedSale && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-muted-foreground">Fecha</p>
                                    <p className="font-medium">{formatDate(selectedSale.createdAt)}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Estado</p>
                                    {getStatusBadge(selectedSale.status)}
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Cliente</p>
                                    <p className="font-medium">{selectedSale.client?.name || "Cliente general"}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Documento</p>
                                    <p className="font-mono">{selectedSale.client?.document || "-"}</p>
                                </div>
                            </div>

                            <div className="border-t pt-4">
                                <p className="font-medium mb-2">Detalle</p>
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
                                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                                    <span>Total</span>
                                    <span>S/ {selectedSale.total.toFixed(2)}</span>
                                </div>
                            </div>

                            <Button className="w-full" variant="outline">
                                <Download className="h-4 w-4 mr-2" />
                                Descargar PDF
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

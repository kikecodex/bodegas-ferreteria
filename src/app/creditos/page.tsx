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
    Loader2,
    ChevronLeft,
    ChevronRight,
    CheckCircle,
    DollarSign,
    CreditCard,
    AlertCircle
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog";
import { Sidebar } from "@/components/Sidebar";

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
    amountPaid: number;
    change: number;
    client?: {
        id: string;
        name: string;
        document: string;
        phone?: string;
    };
    user?: {
        id: string;
        name: string;
    };
    items?: Array<{
        id: string;
        productName: string;
        productCode: string;
        quantity: number;
        unitPrice: number;
        discount: number;
        subtotal: number;
    }>;
}

export default function CreditosPage() {
    const [loading, setLoading] = useState(true);
    const [creditos, setCreditos] = useState<Sale[]>([]);
    const [selectedCredito, setSelectedCredito] = useState<Sale | null>(null);
    const [showDetail, setShowDetail] = useState(false);
    const [showPayDialog, setShowPayDialog] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [search, setSearch] = useState("");
    const [totalDeuda, setTotalDeuda] = useState(0);

    // Fetch créditos pendientes
    const fetchCreditos = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/sales?paymentMethod=CREDITO&status=COMPLETADA&limit=100");
            if (res.ok) {
                const data = await res.json();
                // Filtrar solo los que NO han sido pagados (status !== PAGADO)
                const pendientes = data.sales.filter((s: Sale) => s.status !== "PAGADO");
                setCreditos(pendientes);

                // Calcular total de deuda
                const total = pendientes.reduce((sum: number, s: Sale) => sum + s.total, 0);
                setTotalDeuda(total);
            }
        } catch (error) {
            console.error("Error fetching creditos:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCreditos();
    }, [fetchCreditos]);

    // Ver detalle de crédito
    const viewCredito = async (credito: Sale) => {
        try {
            const res = await fetch(`/api/sales/${credito.id}`);
            if (res.ok) {
                const data = await res.json();
                setSelectedCredito(data);
                setShowDetail(true);
            }
        } catch (error) {
            console.error("Error fetching credito detail:", error);
        }
    };

    // Marcar como pagado
    const marcarPagado = async () => {
        if (!selectedCredito) return;

        setProcessing(true);
        try {
            const res = await fetch(`/api/sales/${selectedCredito.id}/pay`, {
                method: "POST"
            });

            if (res.ok) {
                setShowPayDialog(false);
                setShowDetail(false);
                fetchCreditos();
            } else {
                alert("Error al marcar como pagado");
            }
        } catch (error) {
            console.error("Error paying credit:", error);
            alert("Error al procesar el pago");
        } finally {
            setProcessing(false);
        }
    };

    // Filtrar por búsqueda
    const creditosFiltrados = creditos.filter(c => {
        if (!search) return true;
        const searchLower = search.toLowerCase();
        return (
            c.number.toLowerCase().includes(searchLower) ||
            c.client?.name?.toLowerCase().includes(searchLower) ||
            c.client?.document?.includes(search)
        );
    });

    // Agrupar por cliente
    const creditosPorCliente = creditosFiltrados.reduce((acc, c) => {
        const clientName = c.client?.name || "Cliente General";
        if (!acc[clientName]) {
            acc[clientName] = {
                cliente: c.client,
                creditos: [],
                totalDeuda: 0
            };
        }
        acc[clientName].creditos.push(c);
        acc[clientName].totalDeuda += c.total;
        return acc;
    }, {} as Record<string, { cliente: Sale['client']; creditos: Sale[]; totalDeuda: number }>);

    return (
        <div className="flex min-h-screen bg-background">
            <Sidebar />

            <main className="flex-1 flex flex-col">
                <header className="h-16 border-b bg-card px-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/ventas">
                            <Button variant="ghost" size="icon">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <h1 className="text-2xl font-bold">Cuentas por Cobrar (Créditos)</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={fetchCreditos}>
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Actualizar
                        </Button>
                    </div>
                </header>

                <div className="p-6 space-y-6">
                    {/* Resumen */}
                    <div className="grid grid-cols-3 gap-4">
                        <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between mb-2">
                                    <CreditCard className="h-8 w-8 opacity-80" />
                                    <Badge variant="secondary" className="bg-white/20 text-white">
                                        Pendientes
                                    </Badge>
                                </div>
                                <p className="text-white/80 text-sm">Total por Cobrar</p>
                                <p className="text-3xl font-bold">S/ {totalDeuda.toFixed(2)}</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between mb-2">
                                    <Receipt className="h-8 w-8 text-muted-foreground" />
                                </div>
                                <p className="text-muted-foreground text-sm">Créditos Activos</p>
                                <p className="text-3xl font-bold">{creditos.length}</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between mb-2">
                                    <Users className="h-8 w-8 text-muted-foreground" />
                                </div>
                                <p className="text-muted-foreground text-sm">Clientes con Deuda</p>
                                <p className="text-3xl font-bold">{Object.keys(creditosPorCliente).length}</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Filtro de búsqueda */}
                    <Card>
                        <CardContent className="p-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Buscar por cliente, número o documento..."
                                    className="pl-9"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Lista de créditos por cliente */}
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
                        </div>
                    ) : creditosFiltrados.length === 0 ? (
                        <Card>
                            <CardContent className="py-12 text-center">
                                <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                                <p className="text-lg font-medium text-muted-foreground">
                                    No hay créditos pendientes
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-4">
                            {Object.entries(creditosPorCliente).map(([clientName, data]) => (
                                <Card key={clientName}>
                                    <CardHeader className="pb-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <Avatar>
                                                    <AvatarFallback>
                                                        {clientName.charAt(0).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <CardTitle className="text-lg">{clientName}</CardTitle>
                                                    {data.cliente?.document && (
                                                        <p className="text-sm text-muted-foreground">
                                                            DNI/RUC: {data.cliente.document}
                                                            {data.cliente.phone && ` • Tel: ${data.cliente.phone}`}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm text-muted-foreground">Total Deuda</p>
                                                <p className="text-xl font-bold text-amber-600">
                                                    S/ {data.totalDeuda.toFixed(2)}
                                                </p>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Nº Venta</TableHead>
                                                    <TableHead>Fecha</TableHead>
                                                    <TableHead>Documento</TableHead>
                                                    <TableHead className="text-right">Monto</TableHead>
                                                    <TableHead className="text-center">Acciones</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {data.creditos.map((credito) => (
                                                    <TableRow key={credito.id}>
                                                        <TableCell className="font-medium">
                                                            {credito.number}
                                                        </TableCell>
                                                        <TableCell>
                                                            {new Date(credito.createdAt).toLocaleDateString('es-PE')}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline">{credito.documentType}</Badge>
                                                        </TableCell>
                                                        <TableCell className="text-right font-bold">
                                                            S/ {credito.total.toFixed(2)}
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <div className="flex justify-center gap-1">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => viewCredito(credito)}
                                                                >
                                                                    <Eye className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="text-green-600 hover:text-green-700"
                                                                    onClick={() => {
                                                                        setSelectedCredito(credito);
                                                                        setShowPayDialog(true);
                                                                    }}
                                                                >
                                                                    <DollarSign className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* Dialog de detalle */}
            <Dialog open={showDetail} onOpenChange={setShowDetail}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Detalle de Crédito {selectedCredito?.number}</DialogTitle>
                    </DialogHeader>
                    {selectedCredito && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-muted-foreground">Fecha</p>
                                    <p className="font-medium">
                                        {new Date(selectedCredito.createdAt).toLocaleString('es-PE')}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Cliente</p>
                                    <p className="font-medium">
                                        {selectedCredito.client?.name || "Cliente General"}
                                    </p>
                                </div>
                            </div>

                            {selectedCredito.items && (
                                <div>
                                    <p className="text-muted-foreground text-sm mb-2">Items</p>
                                    <div className="space-y-1">
                                        {selectedCredito.items.map((item) => (
                                            <div key={item.id} className="flex justify-between text-sm">
                                                <span>{item.quantity} x {item.productName}</span>
                                                <span>S/ {item.subtotal.toFixed(2)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="border-t pt-4">
                                <div className="flex justify-between text-lg font-bold">
                                    <span>Total a Cobrar</span>
                                    <span className="text-amber-600">S/ {selectedCredito.total.toFixed(2)}</span>
                                </div>
                            </div>

                            <Button
                                className="w-full bg-green-600 hover:bg-green-700"
                                onClick={() => {
                                    setShowDetail(false);
                                    setShowPayDialog(true);
                                }}
                            >
                                <DollarSign className="h-4 w-4 mr-2" />
                                Marcar como Pagado
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Dialog de confirmación de pago */}
            <Dialog open={showPayDialog} onOpenChange={setShowPayDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirmar Pago</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-center text-lg">
                            ¿Confirmar que el cliente pagó
                            <span className="font-bold text-green-600"> S/ {selectedCredito?.total.toFixed(2)}</span>?
                        </p>
                        {selectedCredito?.client?.name && (
                            <p className="text-center text-muted-foreground mt-2">
                                Cliente: {selectedCredito.client.name}
                            </p>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowPayDialog(false)}>
                            Cancelar
                        </Button>
                        <Button
                            className="bg-green-600 hover:bg-green-700"
                            onClick={marcarPagado}
                            disabled={processing}
                        >
                            {processing ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <CheckCircle className="h-4 w-4 mr-2" />
                            )}
                            Confirmar Pago
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

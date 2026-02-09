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
    AlertCircle,
    Trash2,
    Banknote,
    History
} from "lucide-react";
import { Label } from "@/components/ui/label";
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
    notes?: string;
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

// Parsear historial de pagos desde las notas
function parsePaymentHistory(notes?: string): Array<{ amount: number; method: string; date: string }> {
    if (!notes) return [];
    const payments: Array<{ amount: number; method: string; date: string }> = [];
    const regex = /\[ABONO S\/ ([\d.]+) - ([^-]+) - (.+?)\]/g;
    let match;
    while ((match = regex.exec(notes)) !== null) {
        payments.push({
            amount: parseFloat(match[1]),
            method: match[2].trim(),
            date: match[3].trim()
        });
    }
    return payments;
}

export default function CreditosPage() {
    const [loading, setLoading] = useState(true);
    const [creditos, setCreditos] = useState<Sale[]>([]);
    const [selectedCredito, setSelectedCredito] = useState<Sale | null>(null);
    const [showDetail, setShowDetail] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [search, setSearch] = useState("");
    const [totalDeuda, setTotalDeuda] = useState(0);

    // Estado de pago parcial
    const [payAmount, setPayAmount] = useState("");
    const [payMethod, setPayMethod] = useState("EFECTIVO");

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

    // Registrar pago (parcial o total)
    const registrarPago = async (fullPayment = false) => {
        if (!selectedCredito) return;
        const remaining = selectedCredito.total - (selectedCredito.amountPaid || 0);
        const amount = fullPayment ? remaining : parseFloat(payAmount);

        if (!amount || amount <= 0) {
            alert("Ingrese un monto válido");
            return;
        }
        if (amount > remaining + 0.01) {
            alert(`El monto excede el saldo pendiente de S/ ${remaining.toFixed(2)}`);
            return;
        }

        setProcessing(true);
        try {
            const res = await fetch(`/api/sales/${selectedCredito.id}/pay`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ amount, method: payMethod })
            });

            if (res.ok) {
                const data = await res.json();
                // Refresh detail
                const detailRes = await fetch(`/api/sales/${selectedCredito.id}`);
                if (detailRes.ok) {
                    const detailData = await detailRes.json();
                    setSelectedCredito(detailData);
                }
                setPayAmount("");
                fetchCreditos();
                if (data.payment.isFullyPaid) {
                    alert("¡Crédito pagado en su totalidad!");
                    setShowDetail(false);
                }
            } else {
                const err = await res.json();
                alert(err.error || "Error al registrar pago");
            }
        } catch (error) {
            console.error("Error paying credit:", error);
            alert("Error al procesar el pago");
        } finally {
            setProcessing(false);
        }
    };

    // Eliminar crédito
    const deleteCredito = async (credito: Sale) => {
        if (!confirm(`¿Eliminar el crédito ${credito.number}? Se revertirá el stock. Esta acción no se puede deshacer.`)) return;
        try {
            const res = await fetch(`/api/sales/${credito.id}`, { method: "DELETE" });
            if (res.ok) {
                fetchCreditos();
            } else {
                alert("Error al eliminar crédito");
            }
        } catch (error) {
            console.error("Error:", error);
            alert("Error al eliminar crédito");
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
        const saldo = c.total - (c.amountPaid || 0);
        acc[clientName].totalDeuda += saldo;
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
                                                    <TableHead className="text-right">Total</TableHead>
                                                    <TableHead className="text-right">Pagado</TableHead>
                                                    <TableHead className="text-right">Saldo</TableHead>
                                                    <TableHead className="text-center">Acciones</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {data.creditos.map((credito) => {
                                                    const paid = credito.amountPaid || 0;
                                                    const saldo = credito.total - paid;
                                                    const pct = (paid / credito.total) * 100;
                                                    return (
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
                                                            <TableCell className="text-right text-sm">
                                                                S/ {credito.total.toFixed(2)}
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                {paid > 0 ? (
                                                                    <span className="text-green-600 font-medium text-sm">S/ {paid.toFixed(2)}</span>
                                                                ) : (
                                                                    <span className="text-muted-foreground text-sm">—</span>
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="text-right font-bold text-amber-600">
                                                                S/ {saldo.toFixed(2)}
                                                            </TableCell>
                                                            <TableCell className="text-center">
                                                                <div className="flex justify-center gap-1">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        title="Ver detalle y pagos"
                                                                        onClick={() => viewCredito(credito)}
                                                                    >
                                                                        <Eye className="h-4 w-4" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="text-red-500 hover:text-red-700"
                                                                        title="Eliminar crédito"
                                                                        onClick={() => deleteCredito(credito)}
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* Dialog de detalle con amortización */}
            <Dialog open={showDetail} onOpenChange={(open) => { setShowDetail(open); if (!open) setPayAmount(""); }}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CreditCard className="h-5 w-5" />
                            Crédito {selectedCredito?.number}
                        </DialogTitle>
                    </DialogHeader>
                    {selectedCredito && (() => {
                        const paid = selectedCredito.amountPaid || 0;
                        const remaining = selectedCredito.total - paid;
                        const pct = paid > 0 ? Math.round((paid / selectedCredito.total) * 100) : 0;
                        const payments = parsePaymentHistory(selectedCredito.notes);
                        return (
                            <div className="space-y-4">
                                {/* Info del crédito */}
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

                                {/* Items */}
                                {selectedCredito.items && (
                                    <div>
                                        <p className="text-muted-foreground text-sm mb-2">Productos</p>
                                        <div className="space-y-1 bg-muted/50 rounded-lg p-3">
                                            {selectedCredito.items.map((item) => (
                                                <div key={item.id} className="flex justify-between text-sm">
                                                    <span>{item.quantity} x {item.productName}</span>
                                                    <span>S/ {item.subtotal.toFixed(2)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Resumen financiero con barra de progreso */}
                                <div className="border rounded-lg p-4 space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Total del crédito</span>
                                        <span className="font-medium">S/ {selectedCredito.total.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Total abonado</span>
                                        <span className="font-medium text-green-600">S/ {paid.toFixed(2)}</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-3">
                                        <div
                                            className={`h-3 rounded-full transition-all ${pct >= 100 ? 'bg-green-500' : pct > 50 ? 'bg-blue-500' : 'bg-amber-500'}`}
                                            style={{ width: `${Math.min(pct, 100)}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-muted-foreground">{pct}% pagado</span>
                                        <span className="font-bold text-amber-600 text-lg">Saldo: S/ {remaining.toFixed(2)}</span>
                                    </div>
                                </div>

                                {/* Historial de pagos */}
                                {payments.length > 0 && (
                                    <div>
                                        <p className="text-sm font-medium flex items-center gap-1 mb-2">
                                            <History className="h-4 w-4" />
                                            Historial de Abonos
                                        </p>
                                        <div className="space-y-2 max-h-40 overflow-y-auto">
                                            {payments.map((p, i) => (
                                                <div key={i} className="flex items-center justify-between text-sm bg-green-50 rounded-lg px-3 py-2">
                                                    <div className="flex items-center gap-2">
                                                        <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                                                        <span className="text-muted-foreground text-xs">{p.date}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="outline" className="text-xs">{p.method}</Badge>
                                                        <span className="font-medium text-green-700">S/ {p.amount.toFixed(2)}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Formulario de pago */}
                                {remaining > 0.01 && (
                                    <div className="border-t pt-4 space-y-3">
                                        <p className="text-sm font-medium flex items-center gap-1">
                                            <Banknote className="h-4 w-4" />
                                            Registrar Abono
                                        </p>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <Label className="text-xs">Monto (S/)</Label>
                                                <Input
                                                    type="number"
                                                    step="0.10"
                                                    min="0.10"
                                                    max={remaining}
                                                    value={payAmount}
                                                    onChange={(e) => setPayAmount(e.target.value)}
                                                    placeholder={remaining.toFixed(2)}
                                                    className="text-lg"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs">Método</Label>
                                                <select
                                                    value={payMethod}
                                                    onChange={(e) => setPayMethod(e.target.value)}
                                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                                >
                                                    <option value="EFECTIVO">💵 Efectivo</option>
                                                    <option value="YAPE">📱 Yape</option>
                                                    <option value="TRANSFERENCIA">💳 Transferencia</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                className="flex-1"
                                                variant="outline"
                                                onClick={() => registrarPago(false)}
                                                disabled={processing || !payAmount}
                                            >
                                                {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <DollarSign className="h-4 w-4 mr-2" />}
                                                Abonar S/ {payAmount || "0.00"}
                                            </Button>
                                            <Button
                                                className="flex-1 bg-green-600 hover:bg-green-700"
                                                onClick={() => registrarPago(true)}
                                                disabled={processing}
                                            >
                                                {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                                                Pago Total
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                </DialogContent>
            </Dialog>
        </div>
    );
}

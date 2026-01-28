"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    DollarSign,
    Loader2,
    LockOpen,
    Lock,
    Clock,
    Banknote,
    CreditCard,
    AlertTriangle
} from "lucide-react";

interface CashSummary {
    openingAmount: number;
    totalSales: number;
    salesByMethod: Record<string, number>;
    expectedAmount: number;
    salesCount: number;
}

interface CashRegister {
    id: string;
    openingAmount: number;
    openedAt: string;
    openedBy: string;
}

interface CashRegisterModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCashUpdated: () => void;
}

export function CashRegisterModal({ isOpen, onClose, onCashUpdated }: CashRegisterModalProps) {
    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [cashStatus, setCashStatus] = useState<{
        isOpen: boolean;
        cashRegister?: CashRegister;
        summary?: CashSummary;
    } | null>(null);

    // Estado para abrir caja
    const [openingAmount, setOpeningAmount] = useState("");
    const [openingNotes, setOpeningNotes] = useState("");

    // Estado para cerrar caja
    const [closingAmount, setClosingAmount] = useState("");
    const [closingNotes, setClosingNotes] = useState("");

    // Obtener estado de caja
    useEffect(() => {
        if (isOpen) {
            fetchCashStatus();
        }
    }, [isOpen]);

    const fetchCashStatus = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/cash-register");
            if (res.ok) {
                const data = await res.json();
                setCashStatus(data);
                if (data.summary) {
                    setClosingAmount(data.summary.expectedAmount.toFixed(2));
                }
            }
        } catch (error) {
            console.error("Error fetching cash status:", error);
        } finally {
            setLoading(false);
        }
    };

    // Abrir caja
    const handleOpenCash = async () => {
        setProcessing(true);
        try {
            const res = await fetch("/api/cash-register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    openingAmount: parseFloat(openingAmount) || 0,
                    notes: openingNotes || null
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error);
            }

            setOpeningAmount("");
            setOpeningNotes("");
            await fetchCashStatus();
            onCashUpdated();
        } catch (error) {
            alert(error instanceof Error ? error.message : "Error al abrir caja");
        } finally {
            setProcessing(false);
        }
    };

    // Cerrar caja
    const handleCloseCash = async () => {
        if (!closingAmount) {
            alert("Ingrese el monto de cierre");
            return;
        }

        setProcessing(true);
        try {
            const res = await fetch("/api/cash-register/close", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    closingAmount: parseFloat(closingAmount),
                    notes: closingNotes || null
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error);
            }

            const data = await res.json();

            // Mostrar resumen
            const diff = data.summary.difference;
            const diffType = data.summary.differenceType;
            alert(
                `Caja cerrada correctamente\n\n` +
                `Apertura: S/ ${data.summary.openingAmount.toFixed(2)}\n` +
                `Ventas efectivo: S/ ${data.summary.cashSales.toFixed(2)}\n` +
                `Esperado: S/ ${data.summary.expectedAmount.toFixed(2)}\n` +
                `Cierre: S/ ${data.summary.closingAmount.toFixed(2)}\n\n` +
                `Estado: ${diffType} (S/ ${Math.abs(diff).toFixed(2)})`
            );

            setClosingAmount("");
            setClosingNotes("");
            onCashUpdated();
            onClose();
        } catch (error) {
            alert(error instanceof Error ? error.message : "Error al cerrar caja");
        } finally {
            setProcessing(false);
        }
    };

    const formatTime = (date: string) => {
        return new Date(date).toLocaleTimeString("es-PE", {
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5" />
                        Gestión de Caja
                    </DialogTitle>
                </DialogHeader>

                {loading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                ) : cashStatus?.isOpen ? (
                    // Caja abierta - Mostrar resumen y opción de cerrar
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-green-600">
                            <LockOpen className="h-5 w-5" />
                            <span className="font-medium">Caja Abierta</span>
                            <Badge variant="outline" className="ml-auto">
                                <Clock className="h-3 w-3 mr-1" />
                                {cashStatus.cashRegister && formatTime(cashStatus.cashRegister.openedAt)}
                            </Badge>
                        </div>

                        {cashStatus.summary && (
                            <Card>
                                <CardContent className="p-4 space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Monto apertura</span>
                                        <span>S/ {cashStatus.summary.openingAmount.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Ventas ({cashStatus.summary.salesCount})</span>
                                        <span>S/ {cashStatus.summary.totalSales.toFixed(2)}</span>
                                    </div>

                                    {Object.entries(cashStatus.summary.salesByMethod).length > 0 && (
                                        <div className="border-t pt-2 space-y-1">
                                            {Object.entries(cashStatus.summary.salesByMethod).map(([method, amount]) => (
                                                <div key={method} className="flex justify-between text-xs">
                                                    <span className="flex items-center gap-1 text-muted-foreground">
                                                        {method === "EFECTIVO" ? <Banknote className="h-3 w-3" /> : <CreditCard className="h-3 w-3" />}
                                                        {method}
                                                    </span>
                                                    <span>S/ {(amount as number).toFixed(2)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="flex justify-between font-medium border-t pt-2">
                                        <span>Esperado en caja</span>
                                        <span>S/ {cashStatus.summary.expectedAmount.toFixed(2)}</span>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        <div className="space-y-2">
                            <Label>Monto de Cierre (S/)</Label>
                            <Input
                                type="number"
                                step="0.10"
                                value={closingAmount}
                                onChange={(e) => setClosingAmount(e.target.value)}
                                placeholder="0.00"
                                className="text-lg"
                            />
                            {closingAmount && cashStatus.summary && (
                                <DifferenceIndicator
                                    expected={cashStatus.summary.expectedAmount}
                                    actual={parseFloat(closingAmount)}
                                />
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label>Notas (opcional)</Label>
                            <Textarea
                                value={closingNotes}
                                onChange={(e) => setClosingNotes(e.target.value)}
                                placeholder="Observaciones del cierre..."
                                rows={2}
                            />
                        </div>

                        <Button
                            onClick={handleCloseCash}
                            disabled={processing}
                            className="w-full"
                            variant="destructive"
                        >
                            {processing ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <Lock className="h-4 w-4 mr-2" />
                            )}
                            Cerrar Caja
                        </Button>
                    </div>
                ) : (
                    // Caja cerrada - Opción de abrir
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-red-600">
                            <Lock className="h-5 w-5" />
                            <span className="font-medium">Caja Cerrada</span>
                        </div>

                        <div className="space-y-2">
                            <Label>Monto de Apertura (S/)</Label>
                            <Input
                                type="number"
                                step="0.10"
                                value={openingAmount}
                                onChange={(e) => setOpeningAmount(e.target.value)}
                                placeholder="0.00"
                                className="text-lg"
                                autoFocus
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Notas (opcional)</Label>
                            <Textarea
                                value={openingNotes}
                                onChange={(e) => setOpeningNotes(e.target.value)}
                                placeholder="Observaciones de apertura..."
                                rows={2}
                            />
                        </div>

                        <Button
                            onClick={handleOpenCash}
                            disabled={processing}
                            className="w-full"
                        >
                            {processing ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <LockOpen className="h-4 w-4 mr-2" />
                            )}
                            Abrir Caja
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

// Indicador de diferencia
function DifferenceIndicator({ expected, actual }: { expected: number; actual: number }) {
    const diff = actual - expected;

    if (Math.abs(diff) < 0.01) {
        return (
            <div className="text-sm text-green-600 flex items-center gap-1">
                ✓ Cuadrado
            </div>
        );
    }

    if (diff > 0) {
        return (
            <div className="text-sm text-blue-600 flex items-center gap-1">
                Sobrante: +S/ {diff.toFixed(2)}
            </div>
        );
    }

    return (
        <div className="text-sm text-red-600 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Faltante: -S/ {Math.abs(diff).toFixed(2)}
        </div>
    );
}

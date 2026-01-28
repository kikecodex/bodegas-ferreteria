"use client";

import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Loader2,
    Package,
    ArrowDownCircle,
    ArrowUpCircle,
    RefreshCw,
    Plus,
    ChevronLeft,
    ChevronRight
} from "lucide-react";

interface Movement {
    id: string;
    type: string;
    quantity: number;
    previousStock: number;
    newStock: number;
    reason?: string;
    reference?: string;
    createdAt: string;
}

interface Product {
    id: string;
    code: string;
    name: string;
    unit: string;
    stock: number;
}

interface KardexViewerProps {
    isOpen: boolean;
    onClose: () => void;
    product: Product | null;
    onStockChange?: () => void;
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

const typeConfig: Record<string, { label: string; color: string; icon: typeof ArrowDownCircle }> = {
    ENTRADA: { label: "Entrada", color: "text-green-500", icon: ArrowDownCircle },
    SALIDA: { label: "Salida", color: "text-red-500", icon: ArrowUpCircle },
    AJUSTE: { label: "Ajuste", color: "text-blue-500", icon: RefreshCw },
    TRANSFERENCIA: { label: "Transfer.", color: "text-purple-500", icon: RefreshCw }
};

export function KardexViewer({ isOpen, onClose, product, onStockChange }: KardexViewerProps) {
    const [movements, setMovements] = useState<Movement[]>([]);
    const [pagination, setPagination] = useState<Pagination>({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0
    });
    const [loading, setLoading] = useState(false);
    const [showAdjustForm, setShowAdjustForm] = useState(false);

    // Form de ajuste
    const [adjustType, setAdjustType] = useState<"ENTRADA" | "SALIDA" | "AJUSTE">("ENTRADA");
    const [adjustQuantity, setAdjustQuantity] = useState("");
    const [adjustReason, setAdjustReason] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const fetchMovements = useCallback(async () => {
        if (!product) return;

        try {
            setLoading(true);
            const params = new URLSearchParams({
                productId: product.id,
                page: pagination.page.toString(),
                limit: pagination.limit.toString()
            });

            const res = await fetch(`/api/kardex?${params}`);
            if (res.ok) {
                const data = await res.json();
                setMovements(data.movements);
                setPagination(data.pagination);
            }
        } catch (error) {
            console.error("Error fetching movements:", error);
        } finally {
            setLoading(false);
        }
    }, [product, pagination.page, pagination.limit]);

    useEffect(() => {
        if (isOpen && product) {
            fetchMovements();
        }
    }, [isOpen, product, fetchMovements]);

    const handleAdjust = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!product) return;

        const qty = parseInt(adjustQuantity);
        if (isNaN(qty) || qty <= 0) {
            setError("Ingrese una cantidad válida");
            return;
        }

        setSaving(true);
        setError("");

        try {
            const res = await fetch("/api/kardex", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    productId: product.id,
                    type: adjustType,
                    quantity: qty,
                    reason: adjustReason || `${adjustType === "ENTRADA" ? "Ingreso" : adjustType === "SALIDA" ? "Egreso" : "Ajuste"} manual`
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Error al registrar movimiento");
            }

            // Reset form
            setAdjustQuantity("");
            setAdjustReason("");
            setShowAdjustForm(false);

            // Refresh
            fetchMovements();
            onStockChange?.();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error al registrar");
        } finally {
            setSaving(false);
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString("es-PE", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    if (!product) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Kardex: {product.name}
                    </DialogTitle>
                </DialogHeader>

                {/* Info producto */}
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                        <span className="font-mono text-sm text-muted-foreground">{product.code}</span>
                        <p className="font-medium">{product.name}</p>
                    </div>
                    <div className="text-right">
                        <span className="text-sm text-muted-foreground">Stock Actual</span>
                        <p className="text-2xl font-bold">{product.stock} {product.unit}</p>
                    </div>
                </div>

                {/* Botón agregar movimiento */}
                {!showAdjustForm ? (
                    <Button onClick={() => setShowAdjustForm(true)} className="w-full">
                        <Plus className="h-4 w-4 mr-2" />
                        Registrar Movimiento
                    </Button>
                ) : (
                    <form onSubmit={handleAdjust} className="p-4 border rounded-lg space-y-4">
                        <h3 className="font-medium">Nuevo Movimiento</h3>

                        {error && (
                            <div className="p-2 text-sm text-red-500 bg-red-500/10 rounded">
                                {error}
                            </div>
                        )}

                        <div className="grid grid-cols-3 gap-2">
                            <Button
                                type="button"
                                variant={adjustType === "ENTRADA" ? "default" : "outline"}
                                onClick={() => setAdjustType("ENTRADA")}
                                className="flex-col h-auto py-3"
                            >
                                <ArrowDownCircle className="h-5 w-5 text-green-500 mb-1" />
                                Entrada
                            </Button>
                            <Button
                                type="button"
                                variant={adjustType === "SALIDA" ? "default" : "outline"}
                                onClick={() => setAdjustType("SALIDA")}
                                className="flex-col h-auto py-3"
                            >
                                <ArrowUpCircle className="h-5 w-5 text-red-500 mb-1" />
                                Salida
                            </Button>
                            <Button
                                type="button"
                                variant={adjustType === "AJUSTE" ? "default" : "outline"}
                                onClick={() => setAdjustType("AJUSTE")}
                                className="flex-col h-auto py-3"
                            >
                                <RefreshCw className="h-5 w-5 text-blue-500 mb-1" />
                                Ajuste
                            </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label>
                                    {adjustType === "AJUSTE" ? "Nuevo Stock" : "Cantidad"}
                                </Label>
                                <Input
                                    type="number"
                                    min="1"
                                    value={adjustQuantity}
                                    onChange={(e) => setAdjustQuantity(e.target.value)}
                                    placeholder={adjustType === "AJUSTE" ? "Stock final" : "Cantidad"}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label>Motivo</Label>
                                <Input
                                    value={adjustReason}
                                    onChange={(e) => setAdjustReason(e.target.value)}
                                    placeholder="Ej: Compra, Inventario..."
                                    className="mt-1"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setShowAdjustForm(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={saving}>
                                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                Registrar
                            </Button>
                        </div>
                    </form>
                )}

                {/* Tabla de movimientos */}
                <div className="border rounded-lg">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : movements.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No hay movimientos registrados
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Tipo</TableHead>
                                    <TableHead className="text-right">Cant.</TableHead>
                                    <TableHead className="text-right">Stock</TableHead>
                                    <TableHead>Motivo</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {movements.map((mov) => {
                                    const config = typeConfig[mov.type] || typeConfig.AJUSTE;
                                    const Icon = config.icon;
                                    return (
                                        <TableRow key={mov.id}>
                                            <TableCell className="text-sm">
                                                {formatDate(mov.createdAt)}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={config.color}>
                                                    <Icon className="h-3 w-3 mr-1" />
                                                    {config.label}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-mono">
                                                <span className={mov.quantity >= 0 ? "text-green-500" : "text-red-500"}>
                                                    {mov.quantity >= 0 ? "+" : ""}{mov.quantity}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <span className="text-muted-foreground">{mov.previousStock}</span>
                                                <span className="mx-1">→</span>
                                                <span className="font-medium">{mov.newStock}</span>
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">
                                                {mov.reason || "-"}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                            {pagination.total} movimientos
                        </span>
                        <div className="flex gap-1">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={pagination.page === 1}
                                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={pagination.page === pagination.totalPages}
                                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

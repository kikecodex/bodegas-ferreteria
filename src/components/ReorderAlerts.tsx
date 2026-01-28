"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    AlertTriangle,
    Package,
    CheckCircle2,
    ShoppingCart,
    Clock,
    RefreshCw,
    Loader2
} from "lucide-react";

interface ReorderAlert {
    id: string;
    type: string;
    currentStock: number;
    minStock: number;
    reorderPoint: number | null;
    status: string;
    createdAt: string;
    product: {
        id: string;
        code: string;
        name: string;
        stock: number;
        minStock: number;
        reorderPoint: number | null;
        preferredVendor: string | null;
        unit: string;
        category: {
            name: string;
            color: string;
        };
    };
}

interface ReorderAlertsProps {
    onProductClick?: (productId: string) => void;
    compact?: boolean;
}

export function ReorderAlerts({ onProductClick, compact = false }: ReorderAlertsProps) {
    const [alerts, setAlerts] = useState<ReorderAlert[]>([]);
    const [counts, setCounts] = useState({
        PENDING: 0,
        ACKNOWLEDGED: 0,
        ORDERED: 0,
        RESOLVED: 0
    });
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("PENDING");
    const [updating, setUpdating] = useState<string | null>(null);

    const fetchAlerts = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/alerts/reorder?status=${filter}`);
            if (res.ok) {
                const data = await res.json();
                setAlerts(data.alerts);
                setCounts(data.counts);
            }
        } catch (error) {
            console.error("Error fetching alerts:", error);
        } finally {
            setLoading(false);
        }
    }, [filter]);

    useEffect(() => {
        fetchAlerts();

        // Auto-refresh cada 5 minutos
        const interval = setInterval(fetchAlerts, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [fetchAlerts]);

    const updateAlertStatus = async (alertId: string, newStatus: string) => {
        try {
            setUpdating(alertId);
            const res = await fetch(`/api/alerts/reorder/${alertId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus })
            });

            if (res.ok) {
                fetchAlerts();
            }
        } catch (error) {
            console.error("Error updating alert:", error);
        } finally {
            setUpdating(null);
        }
    };

    const checkStock = async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/alerts/check-stock", { method: "POST" });
            if (res.ok) {
                const data = await res.json();
                if (data.alertsCreated > 0) {
                    alert(`Se crearon ${data.alertsCreated} nuevas alertas`);
                }
                fetchAlerts();
            }
        } catch (error) {
            console.error("Error checking stock:", error);
        }
    };

    const getAlertIcon = (type: string) => {
        switch (type) {
            case "OUT_OF_STOCK":
                return <AlertTriangle className="h-4 w-4 text-red-500" />;
            case "LOW_STOCK":
                return <AlertTriangle className="h-4 w-4 text-amber-500" />;
            default:
                return <Clock className="h-4 w-4 text-blue-500" />;
        }
    };

    const getAlertBadge = (type: string) => {
        switch (type) {
            case "OUT_OF_STOCK":
                return <Badge variant="destructive">Sin Stock</Badge>;
            case "LOW_STOCK":
                return <Badge className="bg-amber-500">Stock Bajo</Badge>;
            default:
                return <Badge variant="outline">Punto de Reorden</Badge>;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "PENDING":
                return "border-amber-500/50 bg-amber-500/5";
            case "ACKNOWLEDGED":
                return "border-blue-500/50 bg-blue-500/5";
            case "ORDERED":
                return "border-green-500/50 bg-green-500/5";
            default:
                return "";
        }
    };

    if (compact) {
        // Versión compacta para Dashboard
        return (
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-amber-500" />
                            Alertas de Stock
                        </span>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={fetchAlerts}
                            disabled={loading}
                        >
                            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                        </Button>
                    </CardTitle>
                    <CardDescription>
                        {counts.PENDING} pendientes · {counts.ORDERED} pedidos
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-4">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : alerts.length === 0 ? (
                        <p className="text-center text-muted-foreground py-4">
                            No hay alertas pendientes 🎉
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {alerts.slice(0, 5).map((alert) => (
                                <div
                                    key={alert.id}
                                    className={`p-3 rounded-lg border ${getStatusColor(alert.status)}`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                {getAlertIcon(alert.type)}
                                                <p className="font-medium text-sm truncate">
                                                    {alert.product.name}
                                                </p>
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Stock: {alert.currentStock} / Mín: {alert.minStock}
                                            </p>
                                        </div>
                                        {getAlertBadge(alert.type)}
                                    </div>
                                </div>
                            ))}

                            {alerts.length > 5 && (
                                <p className="text-xs text-center text-muted-foreground pt-2">
                                    +{alerts.length - 5} alertas más
                                </p>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        );
    }

    // Versión completa
    return (
        <div className="space-y-4">
            {/* Filtros y acciones */}
            <div className="flex flex-wrap gap-2 items-center justify-between">
                <div className="flex gap-2">
                    {[
                        { key: "PENDING", label: "Pendientes", count: counts.PENDING },
                        { key: "ORDERED", label: "Pedidos", count: counts.ORDERED },
                        { key: "RESOLVED", label: "Resueltos", count: counts.RESOLVED },
                        { key: "ALL", label: "Todos", count: null }
                    ].map((f) => (
                        <Button
                            key={f.key}
                            variant={filter === f.key ? "default" : "outline"}
                            size="sm"
                            onClick={() => setFilter(f.key)}
                        >
                            {f.label}
                            {f.count !== null && f.count > 0 && (
                                <Badge variant="secondary" className="ml-2">
                                    {f.count}
                                </Badge>
                            )}
                        </Button>
                    ))}
                </div>

                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={checkStock}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Verificar Stock
                    </Button>
                </div>
            </div>

            {/* Lista de alertas */}
            {loading ? (
                <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : alerts.length === 0 ? (
                <Card>
                    <CardContent className="py-8 text-center">
                        <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
                        <p className="text-muted-foreground">
                            {filter === "PENDING"
                                ? "¡No hay alertas pendientes!"
                                : "No hay alertas en esta categoría"}
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {alerts.map((alert) => (
                        <Card
                            key={alert.id}
                            className={`${getStatusColor(alert.status)} transition-all`}
                        >
                            <CardContent className="p-4">
                                <div className="flex items-start gap-4">
                                    {/* Info del producto */}
                                    <div
                                        className="flex-1 min-w-0 cursor-pointer"
                                        onClick={() => onProductClick?.(alert.product.id)}
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            {getAlertIcon(alert.type)}
                                            <span className="font-medium">{alert.product.name}</span>
                                            {getAlertBadge(alert.type)}
                                        </div>

                                        <div className="text-sm text-muted-foreground space-y-1">
                                            <p>
                                                Código: {alert.product.code} ·
                                                <span
                                                    className="ml-1 px-1.5 py-0.5 rounded text-xs"
                                                    style={{
                                                        backgroundColor: alert.product.category.color + "20",
                                                        color: alert.product.category.color
                                                    }}
                                                >
                                                    {alert.product.category.name}
                                                </span>
                                            </p>
                                            <p>
                                                <Package className="h-3 w-3 inline mr-1" />
                                                Stock actual: <strong>{alert.currentStock}</strong> {alert.product.unit}
                                                {" · "}
                                                Mínimo: {alert.minStock}
                                                {alert.reorderPoint && ` · Punto reorden: ${alert.reorderPoint}`}
                                            </p>
                                            {alert.product.preferredVendor && (
                                                <p>
                                                    Proveedor: {alert.product.preferredVendor}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Acciones */}
                                    <div className="flex flex-col gap-2">
                                        {alert.status === "PENDING" && (
                                            <>
                                                <Button
                                                    size="sm"
                                                    onClick={() => updateAlertStatus(alert.id, "ORDERED")}
                                                    disabled={updating === alert.id}
                                                >
                                                    {updating === alert.id ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <>
                                                            <ShoppingCart className="h-4 w-4 mr-1" />
                                                            Pedido
                                                        </>
                                                    )}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => updateAlertStatus(alert.id, "ACKNOWLEDGED")}
                                                    disabled={updating === alert.id}
                                                >
                                                    Ignorar
                                                </Button>
                                            </>
                                        )}

                                        {alert.status === "ORDERED" && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => updateAlertStatus(alert.id, "RESOLVED")}
                                                disabled={updating === alert.id}
                                            >
                                                {updating === alert.id ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <>
                                                        <CheckCircle2 className="h-4 w-4 mr-1" />
                                                        Recibido
                                                    </>
                                                )}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}

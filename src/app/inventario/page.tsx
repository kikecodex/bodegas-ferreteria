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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
    Plus,
    Minus,
    RefreshCw,
    ArrowUpCircle,
    ArrowDownCircle,
    History,
    Loader2,
    AlertTriangle
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Product {
    id: string;
    code: string;
    name: string;
    stock: number;
    minStock: number;
    unit: string;
    category?: { name: string };
}

interface StockMovement {
    id: string;
    type: string;
    quantity: number;
    previousStock: number;
    newStock: number;
    reason: string;
    reference: string;
    createdAt: string;
    product: {
        id: string;
        code: string;
        name: string;
    };
}

const navItems = [
    { icon: Home, label: "Dashboard", href: "/" },
    { icon: Package, label: "Productos", href: "/productos" },
    { icon: ShoppingCart, label: "Ventas", href: "/ventas" },
    { icon: Users, label: "Clientes", href: "/clientes" },
    { icon: Box, label: "Inventario", href: "/inventario", active: true },
    { icon: Receipt, label: "Facturas", href: "/facturas" },
    { icon: FileText, label: "Reportes", href: "/reportes" },
];

export default function InventarioPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [movements, setMovements] = useState<StockMovement[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState<"all" | "low" | "out">("all");

    // Modal de ajuste
    const [showAdjust, setShowAdjust] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [adjustType, setAdjustType] = useState<"ENTRADA" | "SALIDA" | "AJUSTE">("ENTRADA");
    const [adjustQuantity, setAdjustQuantity] = useState("");
    const [adjustReason, setAdjustReason] = useState("");
    const [processing, setProcessing] = useState(false);

    // Tab activo
    const [activeTab, setActiveTab] = useState<"productos" | "movimientos">("productos");

    const fetchProducts = useCallback(async () => {
        try {
            const params = new URLSearchParams({ limit: "100" });
            if (search) params.append("search", search);

            const res = await fetch(`/api/products?${params}`);
            if (res.ok) {
                const data = await res.json();
                setProducts(data.products || []);
            }
        } catch (error) {
            console.error("Error fetching products:", error);
        }
    }, [search]);

    const fetchMovements = useCallback(async () => {
        try {
            const res = await fetch("/api/kardex?limit=50");
            if (res.ok) {
                const data = await res.json();
                setMovements(data.movements || []);
            }
        } catch (error) {
            console.error("Error fetching movements:", error);
        }
    }, []);

    useEffect(() => {
        setLoading(true);
        Promise.all([fetchProducts(), fetchMovements()]).finally(() => setLoading(false));
    }, [fetchProducts, fetchMovements]);

    // Filtrar productos
    const filteredProducts = products.filter(p => {
        if (filter === "low") return p.stock > 0 && p.stock <= p.minStock;
        if (filter === "out") return p.stock === 0;
        return true;
    });

    // Estadísticas
    const stats = {
        total: products.length,
        lowStock: products.filter(p => p.stock > 0 && p.stock <= p.minStock).length,
        outOfStock: products.filter(p => p.stock === 0).length,
        totalValue: products.reduce((sum, p) => sum + p.stock, 0)
    };

    // Abrir modal de ajuste
    const openAdjustModal = (product: Product, type: "ENTRADA" | "SALIDA" | "AJUSTE") => {
        setSelectedProduct(product);
        setAdjustType(type);
        setAdjustQuantity("");
        setAdjustReason("");
        setShowAdjust(true);
    };

    // Procesar ajuste de stock
    const handleAdjust = async () => {
        if (!selectedProduct || !adjustQuantity) return;

        setProcessing(true);
        try {
            const quantity = parseInt(adjustQuantity);
            const finalQuantity = adjustType === "SALIDA" ? -Math.abs(quantity) : Math.abs(quantity);

            const res = await fetch("/api/kardex", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    productId: selectedProduct.id,
                    type: adjustType,
                    quantity: finalQuantity,
                    reason: adjustReason || `${adjustType} manual`
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error);
            }

            setShowAdjust(false);
            await Promise.all([fetchProducts(), fetchMovements()]);
        } catch (error) {
            alert(error instanceof Error ? error.message : "Error al ajustar stock");
        } finally {
            setProcessing(false);
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
                    <h1 className="text-2xl font-bold">Inventario</h1>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => { fetchProducts(); fetchMovements(); }}>
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
                        <Card className="cursor-pointer hover:border-primary" onClick={() => setFilter("all")}>
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Total Productos</p>
                                        <p className="text-2xl font-bold">{stats.total}</p>
                                    </div>
                                    <Package className="h-8 w-8 text-muted-foreground" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="cursor-pointer hover:border-amber-500" onClick={() => setFilter("low")}>
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Stock Bajo</p>
                                        <p className="text-2xl font-bold text-amber-500">{stats.lowStock}</p>
                                    </div>
                                    <AlertTriangle className="h-8 w-8 text-amber-500" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="cursor-pointer hover:border-red-500" onClick={() => setFilter("out")}>
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Sin Stock</p>
                                        <p className="text-2xl font-bold text-red-500">{stats.outOfStock}</p>
                                    </div>
                                    <Box className="h-8 w-8 text-red-500" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Unidades Totales</p>
                                        <p className="text-2xl font-bold text-green-600">{stats.totalValue}</p>
                                    </div>
                                    <Box className="h-8 w-8 text-green-600" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-2">
                        <Button
                            variant={activeTab === "productos" ? "default" : "outline"}
                            onClick={() => setActiveTab("productos")}
                        >
                            <Package className="h-4 w-4 mr-2" />
                            Productos
                        </Button>
                        <Button
                            variant={activeTab === "movimientos" ? "default" : "outline"}
                            onClick={() => setActiveTab("movimientos")}
                        >
                            <History className="h-4 w-4 mr-2" />
                            Movimientos
                        </Button>
                    </div>

                    {activeTab === "productos" ? (
                        <Card>
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-lg">
                                        Stock de Productos
                                        {filter !== "all" && (
                                            <Badge variant="outline" className="ml-2">
                                                {filter === "low" ? "Stock Bajo" : "Sin Stock"}
                                            </Badge>
                                        )}
                                    </CardTitle>
                                    <div className="relative w-64">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            placeholder="Buscar producto..."
                                            className="pl-9"
                                        />
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                {loading ? (
                                    <div className="flex justify-center py-12">
                                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                    </div>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Código</TableHead>
                                                <TableHead>Producto</TableHead>
                                                <TableHead>Categoría</TableHead>
                                                <TableHead className="text-center">Stock</TableHead>
                                                <TableHead className="text-center">Mínimo</TableHead>
                                                <TableHead>Estado</TableHead>
                                                <TableHead className="text-right">Acciones</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredProducts.map(product => (
                                                <TableRow key={product.id}>
                                                    <TableCell className="font-mono">{product.code}</TableCell>
                                                    <TableCell className="font-medium">{product.name}</TableCell>
                                                    <TableCell>{product.category?.name || "-"}</TableCell>
                                                    <TableCell className="text-center font-bold">
                                                        {product.stock} {product.unit}
                                                    </TableCell>
                                                    <TableCell className="text-center text-muted-foreground">
                                                        {product.minStock}
                                                    </TableCell>
                                                    <TableCell>
                                                        {product.stock === 0 ? (
                                                            <Badge variant="destructive">Sin stock</Badge>
                                                        ) : product.stock <= product.minStock ? (
                                                            <Badge className="bg-amber-500">Stock bajo</Badge>
                                                        ) : (
                                                            <Badge className="bg-green-500">Normal</Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-green-600"
                                                            onClick={() => openAdjustModal(product, "ENTRADA")}
                                                        >
                                                            <Plus className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-red-600"
                                                            onClick={() => openAdjustModal(product, "SALIDA")}
                                                            disabled={product.stock === 0}
                                                        >
                                                            <Minus className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>
                    ) : (
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg">Últimos Movimientos</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Fecha</TableHead>
                                            <TableHead>Producto</TableHead>
                                            <TableHead>Tipo</TableHead>
                                            <TableHead className="text-center">Cantidad</TableHead>
                                            <TableHead className="text-center">Stock Anterior</TableHead>
                                            <TableHead className="text-center">Stock Nuevo</TableHead>
                                            <TableHead>Motivo</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {movements.map(mov => (
                                            <TableRow key={mov.id}>
                                                <TableCell className="text-sm">
                                                    {formatDate(mov.createdAt)}
                                                </TableCell>
                                                <TableCell>
                                                    <div>
                                                        <p className="font-medium">{mov.product.name}</p>
                                                        <p className="text-xs text-muted-foreground">{mov.product.code}</p>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {mov.type === "ENTRADA" ? (
                                                        <Badge className="bg-green-500">
                                                            <ArrowUpCircle className="h-3 w-3 mr-1" />
                                                            Entrada
                                                        </Badge>
                                                    ) : mov.type === "SALIDA" ? (
                                                        <Badge variant="destructive">
                                                            <ArrowDownCircle className="h-3 w-3 mr-1" />
                                                            Salida
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="secondary">{mov.type}</Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className={`text-center font-bold ${mov.quantity > 0 ? "text-green-600" : "text-red-600"}`}>
                                                    {mov.quantity > 0 ? "+" : ""}{mov.quantity}
                                                </TableCell>
                                                <TableCell className="text-center">{mov.previousStock}</TableCell>
                                                <TableCell className="text-center font-medium">{mov.newStock}</TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {mov.reason || mov.reference || "-"}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </main>

            {/* Modal de Ajuste */}
            <Dialog open={showAdjust} onOpenChange={setShowAdjust}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {adjustType === "ENTRADA" ? (
                                <ArrowUpCircle className="h-5 w-5 text-green-600" />
                            ) : (
                                <ArrowDownCircle className="h-5 w-5 text-red-600" />
                            )}
                            {adjustType === "ENTRADA" ? "Entrada de Stock" : "Salida de Stock"}
                        </DialogTitle>
                    </DialogHeader>

                    {selectedProduct && (
                        <div className="space-y-4">
                            <div className="p-3 bg-muted rounded-lg">
                                <p className="font-medium">{selectedProduct.name}</p>
                                <p className="text-sm text-muted-foreground">
                                    Código: {selectedProduct.code} | Stock actual: {selectedProduct.stock} {selectedProduct.unit}
                                </p>
                            </div>

                            <div>
                                <Label>Cantidad</Label>
                                <Input
                                    type="number"
                                    min="1"
                                    max={adjustType === "SALIDA" ? selectedProduct.stock : undefined}
                                    value={adjustQuantity}
                                    onChange={(e) => setAdjustQuantity(e.target.value)}
                                    placeholder="Cantidad a ajustar"
                                    className="mt-1"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <Label>Motivo</Label>
                                <Textarea
                                    value={adjustReason}
                                    onChange={(e) => setAdjustReason(e.target.value)}
                                    placeholder="Motivo del ajuste..."
                                    rows={2}
                                    className="mt-1"
                                />
                            </div>

                            <Button
                                onClick={handleAdjust}
                                disabled={processing || !adjustQuantity}
                                className="w-full"
                            >
                                {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                Confirmar {adjustType === "ENTRADA" ? "Entrada" : "Salida"}
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

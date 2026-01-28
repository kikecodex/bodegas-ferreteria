"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Home,
    Package,
    ShoppingCart,
    Users,
    Box,
    Receipt,
    FileText,
    Settings,
    Truck,
    Plus,
    Minus,
    Search,
    Loader2,
    Trash2,
    X,
    Check
} from "lucide-react";

interface Supplier {
    id: string;
    ruc: string;
    name: string;
}

interface Product {
    id: string;
    code: string;
    name: string;
    cost: number;
    stock: number;
}

interface CartItem {
    productId: string;
    code: string;
    name: string;
    unitCost: number;
    quantity: number;
    subtotal: number;
}

const navItems = [
    { icon: Home, label: "Dashboard", href: "/" },
    { icon: Package, label: "Productos", href: "/productos" },
    { icon: ShoppingCart, label: "Ventas", href: "/ventas" },
    { icon: Users, label: "Clientes", href: "/clientes" },
    { icon: Truck, label: "Proveedores", href: "/proveedores" },
    { icon: Box, label: "Compras", href: "/compras", active: true },
    { icon: Receipt, label: "Facturas", href: "/facturas" },
    { icon: FileText, label: "Reportes", href: "/reportes" },
];

export default function ComprasPage() {
    // Estados
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
    const [supplierSearch, setSupplierSearch] = useState("");
    const [supplierDropdownOpen, setSupplierDropdownOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [products, setProducts] = useState<Product[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingSuppliers, setLoadingSuppliers] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [invoiceNumber, setInvoiceNumber] = useState("");
    const [showSuccess, setShowSuccess] = useState(false);
    const [lastPurchase, setLastPurchase] = useState<{ number: string; total: number } | null>(null);

    // Buscar proveedores por nombre/RUC/DNI
    const searchSuppliers = useCallback(async (query: string) => {
        setLoadingSuppliers(true);
        try {
            const url = query.trim()
                ? `/api/suppliers?search=${encodeURIComponent(query)}&limit=20`
                : `/api/suppliers?limit=20`;
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                setSuppliers(data.suppliers || []);
            }
        } catch (error) {
            console.error("Error searching suppliers:", error);
        } finally {
            setLoadingSuppliers(false);
        }
    }, []);

    // Cargar proveedores iniciales y cuando cambia la búsqueda
    useEffect(() => {
        const timer = setTimeout(() => searchSuppliers(supplierSearch), 300);
        return () => clearTimeout(timer);
    }, [supplierSearch, searchSuppliers]);

    // Buscar productos
    const searchProducts = useCallback(async (query: string) => {
        if (!query.trim()) {
            setProducts([]);
            return;
        }
        setLoading(true);
        try {
            const res = await fetch(`/api/products?search=${encodeURIComponent(query)}&limit=10`);
            if (res.ok) {
                const data = await res.json();
                setProducts(data.products || []);
            }
        } catch (error) {
            console.error("Error:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => searchProducts(search), 300);
        return () => clearTimeout(timer);
    }, [search, searchProducts]);

    // Agregar al carrito
    const addToCart = (product: Product) => {
        setCart(prev => {
            const existing = prev.find(i => i.productId === product.id);
            if (existing) {
                return prev.map(i =>
                    i.productId === product.id
                        ? { ...i, quantity: i.quantity + 1, subtotal: (i.quantity + 1) * i.unitCost }
                        : i
                );
            }
            return [...prev, {
                productId: product.id,
                code: product.code,
                name: product.name,
                unitCost: product.cost,
                quantity: 1,
                subtotal: product.cost
            }];
        });
        setSearch("");
        setProducts([]);
    };

    // Modificar cantidad
    const updateQuantity = (productId: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.productId === productId) {
                const newQty = Math.max(1, item.quantity + delta);
                return { ...item, quantity: newQty, subtotal: newQty * item.unitCost };
            }
            return item;
        }));
    };

    // Modificar costo
    const updateCost = (productId: string, cost: number) => {
        setCart(prev => prev.map(item => {
            if (item.productId === productId) {
                return { ...item, unitCost: cost, subtotal: item.quantity * cost };
            }
            return item;
        }));
    };

    // Eliminar
    const removeFromCart = (productId: string) => {
        setCart(prev => prev.filter(i => i.productId !== productId));
    };

    // Totales
    const subtotal = cart.reduce((sum, i) => sum + i.subtotal, 0);
    const tax = Math.round(subtotal * 0.18 * 100) / 100;
    const total = Math.round((subtotal + tax) * 100) / 100;

    // Registrar compra
    const processPurchase = async () => {
        if (!selectedSupplier || cart.length === 0) return;

        setProcessing(true);
        try {
            const res = await fetch("/api/purchases", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    supplierId: selectedSupplier.id,
                    invoiceNumber: invoiceNumber || null,
                    items: cart.map(i => ({
                        productId: i.productId,
                        quantity: i.quantity,
                        unitCost: i.unitCost
                    }))
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Error al registrar compra");
            }

            const purchase = await res.json();
            setLastPurchase({ number: purchase.number, total });
            setCart([]);
            setSelectedSupplier(null);
            setInvoiceNumber("");
            setShowSuccess(true);
        } catch (error) {
            alert(error instanceof Error ? error.message : "Error");
        } finally {
            setProcessing(false);
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
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${item.active ? "bg-red-600 text-white" : "text-muted-foreground hover:bg-accent"
                                    }`}
                            >
                                <Icon className="h-5 w-5" />
                                <span className="font-medium">{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>
                <div className="p-3 border-t">
                    <Link href="/configuracion" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-accent">
                        <Settings className="h-5 w-5" />
                        <span className="font-medium">Configuración</span>
                    </Link>
                </div>
            </aside>

            {/* Main */}
            <main className="flex-1 flex flex-col">
                <header className="h-16 border-b bg-card px-6 flex items-center">
                    <h1 className="text-2xl font-bold">Registro de Compras</h1>
                    <Badge variant="secondary" className="ml-4">Entrada de Mercadería</Badge>
                </header>

                <div className="flex-1 p-6 flex gap-4">
                    {/* Panel izquierdo */}
                    <div className="w-1/2 space-y-4">
                        {/* Seleccionar proveedor */}
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <Truck className="h-4 w-4" />
                                    Proveedor
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {selectedSupplier ? (
                                    <div className="flex items-center justify-between bg-muted p-3 rounded-lg">
                                        <div>
                                            <p className="font-medium">{selectedSupplier.name}</p>
                                            <p className="text-sm text-muted-foreground">RUC: {selectedSupplier.ruc}</p>
                                        </div>
                                        <Button variant="ghost" size="sm" onClick={() => setSelectedSupplier(null)}>
                                            Cambiar
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                value={supplierSearch}
                                                onChange={(e) => {
                                                    setSupplierSearch(e.target.value);
                                                    setSupplierDropdownOpen(true);
                                                }}
                                                onFocus={() => setSupplierDropdownOpen(true)}
                                                placeholder="Buscar por nombre, RUC o DNI..."
                                                className="pl-10"
                                            />
                                            {loadingSuppliers && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />}
                                        </div>
                                        {supplierDropdownOpen && (
                                            <div className="absolute z-10 w-full mt-1 bg-card border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                                {suppliers.length === 0 ? (
                                                    <div className="p-4 text-center text-muted-foreground">
                                                        {loadingSuppliers ? "Buscando..." : "No se encontraron proveedores"}
                                                    </div>
                                                ) : (
                                                    suppliers.map(s => (
                                                        <button
                                                            key={s.id}
                                                            className="w-full p-3 text-left hover:bg-accent flex justify-between items-center"
                                                            onClick={() => {
                                                                setSelectedSupplier(s);
                                                                setSupplierDropdownOpen(false);
                                                                setSupplierSearch("");
                                                            }}
                                                        >
                                                            <div>
                                                                <p className="font-medium">{s.name}</p>
                                                                <p className="text-sm text-muted-foreground">RUC: {s.ruc}</p>
                                                            </div>
                                                        </button>
                                                    ))
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Buscar productos */}
                        <Card>
                            <CardContent className="p-4">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="Buscar producto por código o nombre..."
                                        className="pl-10"
                                    />
                                    {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Resultados */}
                        <Card className="flex-1">
                            <CardContent className="p-4 max-h-[400px] overflow-y-auto">
                                {products.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                        <p>Busca productos para agregarlos</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {products.map(p => (
                                            <button
                                                key={p.id}
                                                onClick={() => addToCart(p)}
                                                className="w-full p-3 flex justify-between rounded-lg border hover:bg-accent"
                                            >
                                                <div className="text-left">
                                                    <p className="font-medium">{p.name}</p>
                                                    <p className="text-sm text-muted-foreground">{p.code} • Stock: {p.stock}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold">S/ {p.cost.toFixed(2)}</p>
                                                    <p className="text-xs text-muted-foreground">Costo</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Panel derecho - Carrito */}
                    <div className="w-1/2 space-y-4">
                        <Card className="flex-1">
                            <CardHeader className="pb-2">
                                <CardTitle className="flex items-center gap-2">
                                    <Box className="h-5 w-5" />
                                    Items de Compra ({cart.length})
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="max-h-[350px] overflow-y-auto">
                                {cart.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <Box className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                        <p>Agrega productos a la compra</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {cart.map(item => (
                                            <div key={item.productId} className="flex items-center gap-2 p-2 border rounded-lg">
                                                <div className="flex-1">
                                                    <p className="font-medium text-sm">{item.name}</p>
                                                    <p className="text-xs text-muted-foreground">{item.code}</p>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.productId, -1)}>
                                                        <Minus className="h-3 w-3" />
                                                    </Button>
                                                    <span className="w-8 text-center">{item.quantity}</span>
                                                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.productId, 1)}>
                                                        <Plus className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    value={item.unitCost}
                                                    onChange={(e) => updateCost(item.productId, parseFloat(e.target.value) || 0)}
                                                    className="w-20 text-right"
                                                />
                                                <span className="w-20 text-right font-bold">S/ {item.subtotal.toFixed(2)}</span>
                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => removeFromCart(item.productId)}>
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Factura proveedor */}
                        <Card>
                            <CardContent className="p-4">
                                <label className="text-sm font-medium">N° Factura del Proveedor (opcional)</label>
                                <Input
                                    value={invoiceNumber}
                                    onChange={(e) => setInvoiceNumber(e.target.value)}
                                    placeholder="F001-00001234"
                                    className="mt-1"
                                />
                            </CardContent>
                        </Card>

                        {/* Totales */}
                        <Card className="bg-green-500/10">
                            <CardContent className="p-4 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span>Subtotal</span>
                                    <span>S/ {subtotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span>IGV (18%)</span>
                                    <span>S/ {tax.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-xl font-bold border-t pt-2">
                                    <span>TOTAL</span>
                                    <span>S/ {total.toFixed(2)}</span>
                                </div>
                                <Button
                                    className="w-full h-12 text-lg bg-green-600 hover:bg-green-700"
                                    onClick={processPurchase}
                                    disabled={!selectedSupplier || cart.length === 0 || processing}
                                >
                                    {processing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5 mr-2" />}
                                    REGISTRAR COMPRA
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>

            {/* Modal éxito */}
            {showSuccess && lastPurchase && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <Card className="w-[400px]">
                        <CardContent className="p-6 text-center">
                            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                                <Check className="h-10 w-10 text-green-500" />
                            </div>
                            <h3 className="text-2xl font-bold mb-2">¡Compra Registrada!</h3>
                            <p className="text-muted-foreground mb-4">N° {lastPurchase.number}</p>
                            <p className="text-xl font-bold mb-4">Total: S/ {lastPurchase.total.toFixed(2)}</p>
                            <p className="text-sm text-green-600 mb-4">Stock actualizado automáticamente ✓</p>
                            <Button className="w-full" onClick={() => setShowSuccess(false)}>
                                Continuar
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}

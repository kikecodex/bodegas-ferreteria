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
    Search,
    Loader2,
    FileEdit,
    FileCheck,
    Eye,
    Printer,
    X,
    Minus,
    DollarSign,
    Check
} from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

interface SalesNote {
    id: string;
    number: string;
    client?: { id: string; name: string; document: string };
    user: { name: string };
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
    paymentMethod: string;
    status: string;
    createdAt: string;
    _count: { items: number };
}

interface Product {
    id: string;
    code: string;
    name: string;
    price: number;
    stock: number;
}

interface CartItem {
    productId: string;
    code: string;
    name: string;
    unitPrice: number;
    quantity: number;
    subtotal: number;
}

const navItems = [
    { icon: Home, label: "Dashboard", href: "/" },
    { icon: Package, label: "Productos", href: "/productos" },
    { icon: ShoppingCart, label: "Ventas", href: "/ventas" },
    { icon: Users, label: "Clientes", href: "/clientes" },
    { icon: Truck, label: "Proveedores", href: "/proveedores" },
    { icon: Box, label: "Compras", href: "/compras" },
    { icon: FileEdit, label: "Cotizaciones", href: "/cotizaciones" },
    { icon: Receipt, label: "Notas de Venta", href: "/notas-venta", active: true },
    { icon: FileText, label: "Reportes", href: "/reportes" },
];

const paymentMethods = [
    { value: "EFECTIVO", label: "Efectivo" },
    { value: "YAPE", label: "Yape" },
    { value: "PLIN", label: "Plin" },
    { value: "TARJETA", label: "Tarjeta" },
    { value: "TRANSFERENCIA", label: "Transferencia" },
];

export default function NotasVentaPage() {
    const [salesNotes, setSalesNotes] = useState<SalesNote[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [showForm, setShowForm] = useState(false);

    // Form state
    const [productSearch, setProductSearch] = useState("");
    const [products, setProducts] = useState<Product[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [paymentMethod, setPaymentMethod] = useState("EFECTIVO");
    const [amountPaid, setAmountPaid] = useState<number>(0);
    const [notes, setNotes] = useState("");
    const [saving, setSaving] = useState(false);
    const [searchingProducts, setSearchingProducts] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [lastNote, setLastNote] = useState<{ number: string; total: number } | null>(null);

    const fetchSalesNotes = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (search) params.append("search", search);

            const res = await fetch(`/api/sales-notes?${params}`);
            if (res.ok) {
                const data = await res.json();
                setSalesNotes(data.salesNotes || []);
            }
        } catch (error) {
            console.error("Error:", error);
        } finally {
            setLoading(false);
        }
    }, [search]);

    useEffect(() => {
        const timer = setTimeout(fetchSalesNotes, 300);
        return () => clearTimeout(timer);
    }, [fetchSalesNotes]);

    // Search products
    const searchProducts = useCallback(async (query: string) => {
        if (!query.trim()) {
            setProducts([]);
            return;
        }
        setSearchingProducts(true);
        try {
            const res = await fetch(`/api/products?search=${encodeURIComponent(query)}&limit=10`);
            if (res.ok) {
                const data = await res.json();
                setProducts(data.products || []);
            }
        } catch (error) {
            console.error("Error:", error);
        } finally {
            setSearchingProducts(false);
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => searchProducts(productSearch), 300);
        return () => clearTimeout(timer);
    }, [productSearch, searchProducts]);

    const addToCart = (product: Product) => {
        if (product.stock <= 0) {
            alert("Producto sin stock");
            return;
        }

        setCart(prev => {
            const existing = prev.find(i => i.productId === product.id);
            if (existing) {
                if (existing.quantity >= product.stock) {
                    alert("Stock insuficiente");
                    return prev;
                }
                return prev.map(i =>
                    i.productId === product.id
                        ? { ...i, quantity: i.quantity + 1, subtotal: (i.quantity + 1) * i.unitPrice }
                        : i
                );
            }
            return [...prev, {
                productId: product.id,
                code: product.code,
                name: product.name,
                unitPrice: product.price,
                quantity: 1,
                subtotal: product.price
            }];
        });
        setProductSearch("");
        setProducts([]);
    };

    const updateQuantity = (productId: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.productId === productId) {
                const newQty = Math.max(1, item.quantity + delta);
                return { ...item, quantity: newQty, subtotal: newQty * item.unitPrice };
            }
            return item;
        }));
    };

    const removeFromCart = (productId: string) => {
        setCart(prev => prev.filter(i => i.productId !== productId));
    };

    const subtotal = cart.reduce((sum, i) => sum + i.subtotal, 0);
    const tax = Math.round(subtotal * 0.18 * 100) / 100;
    const total = Math.round((subtotal + tax) * 100) / 100;
    const change = amountPaid > total ? amountPaid - total : 0;

    const handleSubmit = async () => {
        if (cart.length === 0) return;
        if (amountPaid < total) {
            alert("Monto insuficiente");
            return;
        }

        setSaving(true);
        try {
            const res = await fetch("/api/sales-notes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    items: cart.map(i => ({
                        productId: i.productId,
                        quantity: i.quantity,
                        unitPrice: i.unitPrice
                    })),
                    paymentMethod,
                    amountPaid,
                    notes
                })
            });

            if (res.ok) {
                const data = await res.json();
                setLastNote({ number: data.number, total: data.total });
                setShowForm(false);
                setCart([]);
                setNotes("");
                setAmountPaid(0);
                setShowSuccess(true);
                fetchSalesNotes();
            } else {
                const data = await res.json();
                alert(data.error || "Error al crear nota de venta");
            }
        } catch (error) {
            alert("Error al crear nota de venta");
        } finally {
            setSaving(false);
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString("es-PE", {
            day: "2-digit",
            month: "short",
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
                <header className="h-16 border-b bg-card px-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <h1 className="text-2xl font-bold">Notas de Venta</h1>
                        <Badge variant="secondary">{salesNotes.length} registros</Badge>
                    </div>
                    <Button onClick={() => setShowForm(true)} className="bg-green-600 hover:bg-green-700">
                        <Plus className="h-4 w-4 mr-2" />
                        Nueva Nota de Venta
                    </Button>
                </header>

                <div className="flex-1 p-6">
                    {/* Búsqueda */}
                    <div className="flex gap-4 mb-6">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Buscar por número o cliente..."
                                className="pl-10"
                            />
                        </div>
                    </div>

                    {/* Tabla */}
                    <Card>
                        <CardContent className="p-0">
                            {loading ? (
                                <div className="flex justify-center py-12">
                                    <Loader2 className="h-8 w-8 animate-spin" />
                                </div>
                            ) : salesNotes.length === 0 ? (
                                <div className="text-center py-12">
                                    <FileCheck className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                                    <p className="text-muted-foreground">No hay notas de venta</p>
                                    <Button className="mt-4 bg-green-600 hover:bg-green-700" onClick={() => setShowForm(true)}>
                                        <Plus className="h-4 w-4 mr-2" />
                                        Crear primera nota
                                    </Button>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Número</TableHead>
                                            <TableHead>Cliente</TableHead>
                                            <TableHead>Items</TableHead>
                                            <TableHead>Total</TableHead>
                                            <TableHead>Método Pago</TableHead>
                                            <TableHead>Vendedor</TableHead>
                                            <TableHead>Fecha</TableHead>
                                            <TableHead className="w-24">Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {salesNotes.map((note) => (
                                            <TableRow key={note.id}>
                                                <TableCell className="font-mono font-medium">{note.number}</TableCell>
                                                <TableCell>
                                                    {note.client ? note.client.name : <span className="text-muted-foreground">Público General</span>}
                                                </TableCell>
                                                <TableCell>{note._count.items} productos</TableCell>
                                                <TableCell className="font-bold text-green-600">S/ {note.total.toFixed(2)}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">{note.paymentMethod}</Badge>
                                                </TableCell>
                                                <TableCell>{note.user.name}</TableCell>
                                                <TableCell className="text-sm">{formatDate(note.createdAt)}</TableCell>
                                                <TableCell>
                                                    <div className="flex gap-1">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                                            <Printer className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </main>

            {/* Modal Nueva Nota de Venta */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <Card className="w-[900px] max-h-[90vh] overflow-y-auto">
                        <CardHeader className="bg-green-600 text-white rounded-t-lg">
                            <CardTitle className="flex items-center gap-2">
                                <Receipt className="h-5 w-5" />
                                Nueva Nota de Venta
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-6">
                                {/* Panel izquierdo - Productos */}
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-sm font-medium">Agregar Productos</label>
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                value={productSearch}
                                                onChange={(e) => setProductSearch(e.target.value)}
                                                placeholder="Buscar producto..."
                                                className="pl-10"
                                            />
                                            {searchingProducts && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />}
                                        </div>
                                        {products.length > 0 && (
                                            <div className="border rounded-lg mt-2 max-h-40 overflow-y-auto">
                                                {products.map(p => (
                                                    <button
                                                        key={p.id}
                                                        onClick={() => addToCart(p)}
                                                        className="w-full p-2 text-left hover:bg-accent flex justify-between"
                                                    >
                                                        <div>
                                                            <span className="font-medium">{p.name}</span>
                                                            <span className="text-sm text-muted-foreground ml-2">Stock: {p.stock}</span>
                                                        </div>
                                                        <span className="font-bold">S/ {p.price.toFixed(2)}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Items */}
                                    <div className="border rounded-lg p-4 min-h-[200px]">
                                        <h4 className="font-medium mb-2">Items ({cart.length})</h4>
                                        {cart.length === 0 ? (
                                            <p className="text-muted-foreground text-center py-8">Busca y agrega productos</p>
                                        ) : (
                                            <div className="space-y-2">
                                                {cart.map(item => (
                                                    <div key={item.productId} className="flex items-center gap-2 p-2 bg-muted rounded">
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
                                                        <span className="w-20 text-right font-bold">S/ {item.subtotal.toFixed(2)}</span>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => removeFromCart(item.productId)}>
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Panel derecho - Pago */}
                                <div className="space-y-4">
                                    {/* Totales */}
                                    <div className="bg-gray-900 text-white p-4 rounded-lg space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span>Subtotal</span>
                                            <span>S/ {subtotal.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span>IGV (18%)</span>
                                            <span>S/ {tax.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between text-2xl font-bold border-t border-gray-700 pt-2">
                                            <span>TOTAL</span>
                                            <span className="text-green-400">S/ {total.toFixed(2)}</span>
                                        </div>
                                    </div>

                                    {/* Método de pago */}
                                    <div>
                                        <label className="text-sm font-medium">Método de Pago</label>
                                        <div className="grid grid-cols-3 gap-2 mt-1">
                                            {paymentMethods.map(pm => (
                                                <Button
                                                    key={pm.value}
                                                    type="button"
                                                    variant={paymentMethod === pm.value ? "default" : "outline"}
                                                    onClick={() => setPaymentMethod(pm.value)}
                                                    className="h-12"
                                                >
                                                    {pm.label}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Monto recibido */}
                                    <div>
                                        <label className="text-sm font-medium">Monto Recibido</label>
                                        <div className="relative">
                                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                type="number"
                                                step="0.01"
                                                value={amountPaid || ""}
                                                onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                                                placeholder="0.00"
                                                className="pl-10 text-xl h-12"
                                            />
                                        </div>
                                        {/* Montos rápidos */}
                                        <div className="flex gap-2 mt-2">
                                            <Button variant="outline" size="sm" onClick={() => setAmountPaid(total)}>Exacto</Button>
                                            <Button variant="outline" size="sm" onClick={() => setAmountPaid(Math.ceil(total / 10) * 10)}>S/ {Math.ceil(total / 10) * 10}</Button>
                                            <Button variant="outline" size="sm" onClick={() => setAmountPaid(Math.ceil(total / 50) * 50)}>S/ {Math.ceil(total / 50) * 50}</Button>
                                            <Button variant="outline" size="sm" onClick={() => setAmountPaid(100)}>S/ 100</Button>
                                        </div>
                                    </div>

                                    {/* Vuelto */}
                                    {change > 0 && (
                                        <div className="bg-blue-500/20 text-blue-500 p-4 rounded-lg text-center">
                                            <p className="text-sm">Vuelto</p>
                                            <p className="text-2xl font-bold">S/ {change.toFixed(2)}</p>
                                        </div>
                                    )}

                                    {/* Notas */}
                                    <div>
                                        <label className="text-sm font-medium">Notas (opcional)</label>
                                        <Input
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            placeholder="Observaciones..."
                                        />
                                    </div>

                                    {/* Botones */}
                                    <div className="flex gap-2 pt-2">
                                        <Button variant="outline" className="flex-1" onClick={() => { setShowForm(false); setCart([]); }}>
                                            Cancelar
                                        </Button>
                                        <Button
                                            className="flex-1 bg-green-600 hover:bg-green-700 h-12 text-lg"
                                            onClick={handleSubmit}
                                            disabled={saving || cart.length === 0 || amountPaid < total}
                                        >
                                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                                                <>
                                                    <Check className="h-5 w-5 mr-2" />
                                                    COBRAR
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Modal Éxito */}
            {showSuccess && lastNote && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <Card className="w-[400px]">
                        <CardContent className="p-6 text-center">
                            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                                <Check className="h-10 w-10 text-green-500" />
                            </div>
                            <h3 className="text-2xl font-bold mb-2">¡Venta Registrada!</h3>
                            <p className="text-muted-foreground mb-4">{lastNote.number}</p>
                            <p className="text-xl font-bold mb-4">Total: S/ {lastNote.total.toFixed(2)}</p>
                            <p className="text-sm text-green-600 mb-4">Stock actualizado ✓</p>
                            <div className="flex gap-2">
                                <Button variant="outline" className="flex-1" onClick={() => setShowSuccess(false)}>
                                    Cerrar
                                </Button>
                                <Button className="flex-1">
                                    <Printer className="h-4 w-4 mr-2" />
                                    Imprimir
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}

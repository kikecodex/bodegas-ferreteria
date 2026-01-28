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
    Calendar,
    Eye,
    Printer,
    CheckCircle,
    XCircle,
    Clock,
    ArrowRightCircle,
    X,
    Minus
} from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

interface Quotation {
    id: string;
    number: string;
    client?: { id: string; name: string; document: string };
    user: { name: string };
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
    status: string;
    validUntil: string;
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
    { icon: FileEdit, label: "Cotizaciones", href: "/cotizaciones", active: true },
    { icon: Receipt, label: "Notas de Venta", href: "/notas-venta" },
    { icon: FileText, label: "Reportes", href: "/reportes" },
];

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    PENDIENTE: { label: "Pendiente", color: "bg-yellow-500/20 text-yellow-500", icon: Clock },
    ACEPTADA: { label: "Aceptada", color: "bg-green-500/20 text-green-500", icon: CheckCircle },
    RECHAZADA: { label: "Rechazada", color: "bg-red-500/20 text-red-500", icon: XCircle },
    VENCIDA: { label: "Vencida", color: "bg-gray-500/20 text-gray-500", icon: Calendar },
    CONVERTIDA: { label: "Convertida", color: "bg-blue-500/20 text-blue-500", icon: ArrowRightCircle },
};

export default function CotizacionesPage() {
    const [quotations, setQuotations] = useState<Quotation[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [showForm, setShowForm] = useState(false);

    // Form state
    const [productSearch, setProductSearch] = useState("");
    const [products, setProducts] = useState<Product[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [validDays, setValidDays] = useState(15);
    const [notes, setNotes] = useState("");
    const [saving, setSaving] = useState(false);
    const [searchingProducts, setSearchingProducts] = useState(false);

    const fetchQuotations = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (search) params.append("search", search);
            if (statusFilter) params.append("status", statusFilter);

            const res = await fetch(`/api/quotations?${params}`);
            if (res.ok) {
                const data = await res.json();
                setQuotations(data.quotations || []);
            }
        } catch (error) {
            console.error("Error:", error);
        } finally {
            setLoading(false);
        }
    }, [search, statusFilter]);

    useEffect(() => {
        const timer = setTimeout(fetchQuotations, 300);
        return () => clearTimeout(timer);
    }, [fetchQuotations]);

    // Search products for form
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
        setCart(prev => {
            const existing = prev.find(i => i.productId === product.id);
            if (existing) {
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

    const handleSubmit = async () => {
        if (cart.length === 0) return;

        setSaving(true);
        try {
            const res = await fetch("/api/quotations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    items: cart.map(i => ({
                        productId: i.productId,
                        quantity: i.quantity,
                        unitPrice: i.unitPrice
                    })),
                    validDays,
                    notes
                })
            });

            if (res.ok) {
                setShowForm(false);
                setCart([]);
                setNotes("");
                fetchQuotations();
            } else {
                const data = await res.json();
                alert(data.error || "Error al crear cotización");
            }
        } catch (error) {
            alert("Error al crear cotización");
        } finally {
            setSaving(false);
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString("es-PE", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    };

    const isExpired = (dateStr: string) => new Date(dateStr) < new Date();

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
                        <h1 className="text-2xl font-bold">Cotizaciones</h1>
                        <Badge variant="secondary">{quotations.length} registros</Badge>
                    </div>
                    <Button onClick={() => setShowForm(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Nueva Cotización
                    </Button>
                </header>

                <div className="flex-1 p-6">
                    {/* Filtros */}
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
                        <select
                            className="h-10 px-3 border rounded-lg bg-background"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="">Todos los estados</option>
                            <option value="PENDIENTE">Pendiente</option>
                            <option value="ACEPTADA">Aceptada</option>
                            <option value="RECHAZADA">Rechazada</option>
                            <option value="VENCIDA">Vencida</option>
                            <option value="CONVERTIDA">Convertida</option>
                        </select>
                    </div>

                    {/* Tabla */}
                    <Card>
                        <CardContent className="p-0">
                            {loading ? (
                                <div className="flex justify-center py-12">
                                    <Loader2 className="h-8 w-8 animate-spin" />
                                </div>
                            ) : quotations.length === 0 ? (
                                <div className="text-center py-12">
                                    <FileEdit className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                                    <p className="text-muted-foreground">No hay cotizaciones</p>
                                    <Button className="mt-4" onClick={() => setShowForm(true)}>
                                        <Plus className="h-4 w-4 mr-2" />
                                        Crear primera cotización
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
                                            <TableHead>Estado</TableHead>
                                            <TableHead>Válido hasta</TableHead>
                                            <TableHead>Fecha</TableHead>
                                            <TableHead className="w-24">Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {quotations.map((q) => {
                                            const status = statusConfig[q.status] || statusConfig.PENDIENTE;
                                            const StatusIcon = status.icon;
                                            const expired = q.status === "PENDIENTE" && isExpired(q.validUntil);

                                            return (
                                                <TableRow key={q.id}>
                                                    <TableCell className="font-mono font-medium">{q.number}</TableCell>
                                                    <TableCell>
                                                        {q.client ? q.client.name : <span className="text-muted-foreground">Sin cliente</span>}
                                                    </TableCell>
                                                    <TableCell>{q._count.items} productos</TableCell>
                                                    <TableCell className="font-bold">S/ {q.total.toFixed(2)}</TableCell>
                                                    <TableCell>
                                                        <Badge className={`${expired ? "bg-gray-500/20 text-gray-500" : status.color} gap-1`}>
                                                            <StatusIcon className="h-3 w-3" />
                                                            {expired ? "Vencida" : status.label}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className={expired ? "text-red-500" : ""}>
                                                        {formatDate(q.validUntil)}
                                                    </TableCell>
                                                    <TableCell>{formatDate(q.createdAt)}</TableCell>
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
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </main>

            {/* Modal Nueva Cotización */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <Card className="w-[800px] max-h-[90vh] overflow-y-auto">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileEdit className="h-5 w-5" />
                                Nueva Cotización
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Buscar productos */}
                            <div>
                                <label className="text-sm font-medium">Agregar Productos</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        value={productSearch}
                                        onChange={(e) => setProductSearch(e.target.value)}
                                        placeholder="Buscar producto por código o nombre..."
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
                                                <span>{p.name} ({p.code})</span>
                                                <span className="font-bold">S/ {p.price.toFixed(2)}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Items */}
                            <div className="border rounded-lg p-4">
                                <h4 className="font-medium mb-2">Items ({cart.length})</h4>
                                {cart.length === 0 ? (
                                    <p className="text-muted-foreground text-center py-4">Agrega productos a la cotización</p>
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
                                                <span className="w-24 text-right font-bold">S/ {item.subtotal.toFixed(2)}</span>
                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => removeFromCart(item.productId)}>
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Opciones */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium">Válido por (días)</label>
                                    <Input
                                        type="number"
                                        min="1"
                                        value={validDays}
                                        onChange={(e) => setValidDays(parseInt(e.target.value) || 15)}
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Notas</label>
                                    <Input
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="Observaciones..."
                                    />
                                </div>
                            </div>

                            {/* Totales */}
                            <div className="bg-muted p-4 rounded-lg space-y-1">
                                <div className="flex justify-between text-sm">
                                    <span>Subtotal</span>
                                    <span>S/ {subtotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span>IGV (18%)</span>
                                    <span>S/ {tax.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-lg font-bold border-t pt-2">
                                    <span>Total</span>
                                    <span>S/ {total.toFixed(2)}</span>
                                </div>
                            </div>

                            {/* Botones */}
                            <div className="flex gap-2">
                                <Button variant="outline" className="flex-1" onClick={() => { setShowForm(false); setCart([]); }}>
                                    Cancelar
                                </Button>
                                <Button className="flex-1" onClick={handleSubmit} disabled={saving || cart.length === 0}>
                                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Crear Cotización"}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}

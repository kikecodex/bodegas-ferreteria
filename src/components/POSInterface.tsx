"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Search,
    Plus,
    Minus,
    Trash2,
    ShoppingCart,
    CreditCard,
    Banknote,
    Smartphone,
    Receipt,
    Loader2,
    Package,
    X,
    Calculator,
    Printer,
    Building2,
    CheckCircle
} from "lucide-react";
import { ClientSelector } from "@/components/ClientSelector";

interface Product {
    id: string;
    code: string;
    name: string;
    price: number;
    stock: number;
    unit: string;
    image?: string;
    category?: { name: string };
}

interface CartItem {
    productId: string;
    code: string;
    name: string;
    price: number;
    quantity: number;
    discount: number;
    subtotal: number;
    maxStock: number;
}

interface POSInterfaceProps {
    onSaleComplete?: () => void;
}

const paymentMethods = [
    { id: "EFECTIVO", label: "Efectivo", icon: Banknote, color: "bg-green-500" },
    { id: "TARJETA", label: "Tarjeta", icon: CreditCard, color: "bg-blue-500" },
    { id: "YAPE", label: "Yape", icon: Smartphone, color: "bg-purple-500" },
    { id: "PLIN", label: "Plin", icon: Smartphone, color: "bg-cyan-500" },
    { id: "TRANSFERENCIA", label: "Transferencia", icon: Receipt, color: "bg-orange-500" }
];

export function POSInterface({ onSaleComplete }: POSInterfaceProps) {
    // Estados
    const [search, setSearch] = useState("");
    const [products, setProducts] = useState<Product[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState(false);

    // Modal de pago
    const [showPayment, setShowPayment] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState("EFECTIVO");
    const [amountPaid, setAmountPaid] = useState("");
    const [documentType, setDocumentType] = useState("BOLETA");

    // Cliente para Factura
    const [showClientSelector, setShowClientSelector] = useState(false);
    const [selectedClient, setSelectedClient] = useState<{
        id: string;
        documentType: string;
        document: string;
        name: string;
    } | null>(null);

    // Venta completada (para mostrar modal de éxito)
    const [completedSale, setCompletedSale] = useState<{
        id: string;
        number: string;
        total: number;
        change: number;
    } | null>(null);

    const searchRef = useRef<HTMLInputElement>(null);

    // Calcular totales
    const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
    const totalDiscount = cart.reduce((sum, item) => sum + item.discount, 0);
    const taxableAmount = subtotal - totalDiscount;
    const tax = Math.round(taxableAmount * 0.18 * 100) / 100;
    const total = Math.round((taxableAmount + tax) * 100) / 100;
    const change = Math.max(0, parseFloat(amountPaid || "0") - total);

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
            console.error("Error searching products:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            searchProducts(search);
        }, 300);
        return () => clearTimeout(timer);
    }, [search, searchProducts]);

    // Agregar al carrito
    const addToCart = (product: Product) => {
        setCart(prev => {
            const existing = prev.find(item => item.productId === product.id);
            if (existing) {
                // Incrementar cantidad si hay stock disponible
                if (existing.quantity < product.stock) {
                    return prev.map(item =>
                        item.productId === product.id
                            ? {
                                ...item,
                                quantity: item.quantity + 1,
                                subtotal: (item.quantity + 1) * item.price
                            }
                            : item
                    );
                }
                return prev;
            }
            // Agregar nuevo item
            return [...prev, {
                productId: product.id,
                code: product.code,
                name: product.name,
                price: product.price,
                quantity: 1,
                discount: 0,
                subtotal: product.price,
                maxStock: product.stock
            }];
        });

        setSearch("");
        setProducts([]);
        searchRef.current?.focus();
    };

    // Modificar cantidad
    const updateQuantity = (productId: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.productId === productId) {
                const newQty = Math.max(1, Math.min(item.maxStock, item.quantity + delta));
                return {
                    ...item,
                    quantity: newQty,
                    subtotal: newQty * item.price
                };
            }
            return item;
        }));
    };

    // Eliminar del carrito
    const removeFromCart = (productId: string) => {
        setCart(prev => prev.filter(item => item.productId !== productId));
    };

    // Limpiar carrito
    const clearCart = () => {
        setCart([]);
        setSearch("");
        searchRef.current?.focus();
    };

    // Procesar venta
    const processSale = async () => {
        if (cart.length === 0) return;

        // Validar cliente para Factura
        if (documentType === "FACTURA" && !selectedClient) {
            setShowClientSelector(true);
            return;
        }

        setProcessing(true);
        try {
            const res = await fetch("/api/sales", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    items: cart.map(item => ({
                        productId: item.productId,
                        quantity: item.quantity,
                        unitPrice: item.price,
                        discount: item.discount
                    })),
                    paymentMethod,
                    amountPaid: parseFloat(amountPaid) || total,
                    documentType,
                    clientId: selectedClient?.id || null
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Error al procesar venta");
            }

            const sale = await res.json();

            // Guardar venta completada para mostrar modal
            setCompletedSale({
                id: sale.id,
                number: sale.number,
                total: total,
                change: change
            });

            // Reset
            setCart([]);
            setShowPayment(false);
            setAmountPaid("");
            setPaymentMethod("EFECTIVO");
            setSelectedClient(null);

            onSaleComplete?.();
        } catch (error) {
            alert(error instanceof Error ? error.message : "Error al procesar venta");
        } finally {
            setProcessing(false);
        }
    };

    // Abrir PDF en nueva pestaña
    const openPDF = (saleId: string) => {
        window.open(`/api/sales/${saleId}/pdf`, "_blank");
    };

    // Cerrar modal de venta completada
    const closeCompletedModal = () => {
        setCompletedSale(null);
        searchRef.current?.focus();
    };

    // Atajos de teclado
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "F2") {
                e.preventDefault();
                searchRef.current?.focus();
            }
            if (e.key === "F4" && cart.length > 0) {
                e.preventDefault();
                setShowPayment(true);
            }
            if (e.key === "Escape") {
                setShowPayment(false);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [cart.length]);

    return (
        <div className="flex h-[calc(100vh-120px)] gap-4">
            {/* Panel izquierdo - Búsqueda y productos */}
            <div className="w-1/2 flex flex-col gap-4">
                {/* Barra de búsqueda */}
                <Card>
                    <CardContent className="p-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input
                                ref={searchRef}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Buscar producto por código o nombre... (F2)"
                                className="pl-10 h-12 text-lg"
                                autoFocus
                            />
                            {loading && (
                                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-muted-foreground" />
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Resultados de búsqueda */}
                <Card className="flex-1 overflow-hidden">
                    <CardContent className="p-4 h-full overflow-y-auto">
                        {products.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                                <Package className="h-16 w-16 mb-4 opacity-50" />
                                <p>Busca productos para agregarlos</p>
                                <p className="text-sm">Escanea código de barras o escribe el nombre</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {products.map(product => (
                                    <button
                                        key={product.id}
                                        onClick={() => addToCart(product)}
                                        disabled={product.stock === 0}
                                        className="w-full p-3 flex items-center justify-between rounded-lg border hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                                                <Package className="h-6 w-6" />
                                            </div>
                                            <div className="text-left">
                                                <p className="font-medium">{product.name}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {product.code} • Stock: {product.stock} {product.unit}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xl font-bold">S/ {product.price.toFixed(2)}</p>
                                            {product.stock === 0 && (
                                                <Badge variant="destructive">Sin stock</Badge>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Panel derecho - Carrito */}
            <div className="w-1/2 flex flex-col gap-4">
                {/* Carrito */}
                <Card className="flex-1 overflow-hidden">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center justify-between">
                            <span className="flex items-center gap-2">
                                <ShoppingCart className="h-5 w-5" />
                                Carrito ({cart.length})
                            </span>
                            {cart.length > 0 && (
                                <Button variant="ghost" size="sm" onClick={clearCart}>
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    Limpiar
                                </Button>
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 h-[calc(100%-60px)] overflow-y-auto">
                        {cart.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                                <ShoppingCart className="h-16 w-16 mb-4 opacity-50" />
                                <p>Carrito vacío</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {cart.map(item => (
                                    <div key={item.productId} className="flex items-center gap-2 p-2 rounded-lg border">
                                        <div className="flex-1">
                                            <p className="font-medium text-sm">{item.name}</p>
                                            <p className="text-xs text-muted-foreground">{item.code}</p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-7 w-7"
                                                onClick={() => updateQuantity(item.productId, -1)}
                                            >
                                                <Minus className="h-3 w-3" />
                                            </Button>
                                            <span className="w-8 text-center font-medium">{item.quantity}</span>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-7 w-7"
                                                onClick={() => updateQuantity(item.productId, 1)}
                                                disabled={item.quantity >= item.maxStock}
                                            >
                                                <Plus className="h-3 w-3" />
                                            </Button>
                                        </div>
                                        <div className="w-24 text-right">
                                            <p className="font-bold">S/ {item.subtotal.toFixed(2)}</p>
                                            <p className="text-xs text-muted-foreground">@ {item.price.toFixed(2)}</p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-red-500"
                                            onClick={() => removeFromCart(item.productId)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Totales y Pago */}
                <Card className="bg-primary/5">
                    <CardContent className="p-4 space-y-3">
                        <div className="flex justify-between text-sm">
                            <span>Subtotal</span>
                            <span>S/ {subtotal.toFixed(2)}</span>
                        </div>
                        {totalDiscount > 0 && (
                            <div className="flex justify-between text-sm text-green-600">
                                <span>Descuento</span>
                                <span>-S/ {totalDiscount.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-sm text-muted-foreground">
                            <span>IGV (18%)</span>
                            <span>S/ {tax.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-2xl font-bold border-t pt-2">
                            <span>TOTAL</span>
                            <span>S/ {total.toFixed(2)}</span>
                        </div>

                        <Button
                            className="w-full h-14 text-lg"
                            size="lg"
                            disabled={cart.length === 0}
                            onClick={() => setShowPayment(true)}
                        >
                            <Calculator className="h-5 w-5 mr-2" />
                            COBRAR (F4)
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Modal de Pago */}
            {showPayment && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <Card className="w-[500px] max-h-[90vh] overflow-y-auto">
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                <span>Procesar Pago</span>
                                <Button variant="ghost" size="icon" onClick={() => setShowPayment(false)}>
                                    <X className="h-5 w-5" />
                                </Button>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Total */}
                            <div className="text-center py-4 bg-primary/10 rounded-lg">
                                <p className="text-sm text-muted-foreground">Total a Pagar</p>
                                <p className="text-4xl font-bold">S/ {total.toFixed(2)}</p>
                            </div>

                            {/* Tipo de comprobante */}
                            <div className="grid grid-cols-2 gap-2">
                                <Button
                                    variant={documentType === "BOLETA" ? "default" : "outline"}
                                    onClick={() => {
                                        setDocumentType("BOLETA");
                                        setSelectedClient(null);
                                    }}
                                >
                                    Boleta
                                </Button>
                                <Button
                                    variant={documentType === "FACTURA" ? "default" : "outline"}
                                    onClick={() => setDocumentType("FACTURA")}
                                >
                                    Factura
                                </Button>
                            </div>

                            {/* Cliente (obligatorio para Factura) */}
                            {documentType === "FACTURA" && (
                                <div className="space-y-2">
                                    <p className="text-sm font-medium flex items-center gap-2">
                                        <Building2 className="h-4 w-4" />
                                        Cliente <span className="text-red-500">*</span>
                                    </p>
                                    {selectedClient ? (
                                        <div className="p-3 bg-muted rounded-lg flex items-center justify-between">
                                            <div>
                                                <p className="font-medium">{selectedClient.name}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {selectedClient.documentType}: {selectedClient.document}
                                                </p>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setShowClientSelector(true)}
                                            >
                                                Cambiar
                                            </Button>
                                        </div>
                                    ) : (
                                        <Button
                                            variant="outline"
                                            className="w-full"
                                            onClick={() => setShowClientSelector(true)}
                                        >
                                            <Building2 className="h-4 w-4 mr-2" />
                                            Seleccionar Cliente
                                        </Button>
                                    )}
                                </div>
                            )}

                            {/* Métodos de pago */}
                            <div className="space-y-2">
                                <p className="text-sm font-medium">Método de Pago</p>
                                <div className="grid grid-cols-3 gap-2">
                                    {paymentMethods.map(method => {
                                        const Icon = method.icon;
                                        return (
                                            <Button
                                                key={method.id}
                                                variant={paymentMethod === method.id ? "default" : "outline"}
                                                className="flex-col h-auto py-3"
                                                onClick={() => setPaymentMethod(method.id)}
                                            >
                                                <Icon className="h-5 w-5 mb-1" />
                                                <span className="text-xs">{method.label}</span>
                                            </Button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Monto recibido (solo efectivo) */}
                            {paymentMethod === "EFECTIVO" && (
                                <div className="space-y-2">
                                    <p className="text-sm font-medium">Monto Recibido</p>
                                    <Input
                                        type="number"
                                        step="0.10"
                                        min={total}
                                        value={amountPaid}
                                        onChange={(e) => setAmountPaid(e.target.value)}
                                        placeholder={total.toFixed(2)}
                                        className="text-2xl h-14 text-center"
                                        autoFocus
                                    />
                                    <div className="grid grid-cols-4 gap-2">
                                        {[10, 20, 50, 100].map(val => (
                                            <Button
                                                key={val}
                                                variant="outline"
                                                onClick={() => setAmountPaid(val.toString())}
                                            >
                                                S/ {val}
                                            </Button>
                                        ))}
                                    </div>
                                    {parseFloat(amountPaid) >= total && (
                                        <div className="text-center py-3 bg-green-500/10 rounded-lg">
                                            <p className="text-sm text-muted-foreground">Vuelto</p>
                                            <p className="text-2xl font-bold text-green-600">
                                                S/ {change.toFixed(2)}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Botón confirmar */}
                            <Button
                                className="w-full h-14 text-lg"
                                onClick={processSale}
                                disabled={processing || (paymentMethod === "EFECTIVO" && parseFloat(amountPaid || "0") < total)}
                            >
                                {processing ? (
                                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                                ) : (
                                    <Receipt className="h-5 w-5 mr-2" />
                                )}
                                CONFIRMAR VENTA
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Selector de Cliente */}
            <ClientSelector
                isOpen={showClientSelector}
                onClose={() => setShowClientSelector(false)}
                onSelect={(client) => {
                    setSelectedClient(client);
                    setShowClientSelector(false);
                }}
                required={documentType === "FACTURA"}
            />

            {/* Modal de Venta Completada */}
            {completedSale && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <Card className="w-[400px]">
                        <CardContent className="p-6 text-center">
                            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                                <CheckCircle className="h-10 w-10 text-green-500" />
                            </div>
                            <h3 className="text-2xl font-bold mb-2">¡Venta Exitosa!</h3>
                            <p className="text-muted-foreground mb-4">
                                Venta {completedSale.number}
                            </p>
                            <div className="bg-muted rounded-lg p-4 mb-4">
                                <div className="flex justify-between mb-2">
                                    <span>Total:</span>
                                    <span className="font-bold">S/ {completedSale.total.toFixed(2)}</span>
                                </div>
                                {completedSale.change > 0 && (
                                    <div className="flex justify-between text-green-600">
                                        <span>Vuelto:</span>
                                        <span className="font-bold">S/ {completedSale.change.toFixed(2)}</span>
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={closeCompletedModal}
                                >
                                    Cerrar
                                </Button>
                                <Button
                                    className="flex-1"
                                    onClick={() => {
                                        openPDF(completedSale.id);
                                        closeCompletedModal();
                                    }}
                                >
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

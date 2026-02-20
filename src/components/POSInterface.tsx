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
    CheckCircle,
    AlertTriangle
} from "lucide-react";
import { ClientSelector } from "@/components/ClientSelector";
import { calculateTaxes } from "@/lib/tax-utils";

interface Product {
    id: string;
    code: string;
    name: string;
    price: number;
    stock: number;
    unit: string;
    image?: string;
    category?: { name: string };
    igvExento?: boolean;  // Productos exonerados de IGV
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
    igvExento?: boolean;  // Producto exonerado de IGV
}

interface POSInterfaceProps {
    onSaleComplete?: () => void;
}

const paymentMethods = [
    { id: "EFECTIVO", label: "Efectivo", icon: Banknote, color: "bg-green-500" },
    { id: "YAPE", label: "Yape", icon: Smartphone, color: "bg-purple-500" },
    { id: "CREDITO", label: "Crédito", icon: CreditCard, color: "bg-amber-500" }
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
    const [saleNotes, setSaleNotes] = useState("");

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

    // Estado para edición inline de precio
    const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
    const [editingPriceValue, setEditingPriceValue] = useState("");

    const searchRef = useRef<HTMLInputElement>(null);

    // Calcular totales - Los precios YA INCLUYEN IGV
    // Separar productos gravados y exonerados
    const taxableItems = cart.filter(item => !item.igvExento);
    const exemptItems = cart.filter(item => item.igvExento);

    const taxableTotal = taxableItems.reduce((sum, item) => sum + item.subtotal, 0);
    const taxableDiscount = taxableItems.reduce((sum, item) => sum + item.discount, 0);
    const exemptTotal = exemptItems.reduce((sum, item) => sum + item.subtotal - item.discount, 0);

    // IGV solo para productos gravados (incluido en precio)
    const taxCalc = calculateTaxes(taxableTotal - taxableDiscount, true);
    const subtotal = taxCalc.subtotal + exemptTotal; // Base gravada + exonerado
    const tax = taxCalc.tax;                         // IGV solo de productos gravados
    const total = taxCalc.total + exemptTotal;       // Total con gravados y exonerados
    const change = Math.max(0, parseFloat(amountPaid || "0") - total);
    const pendingAmount = Math.max(0, total - parseFloat(amountPaid || "0"));
    const isPartialPayment = paymentMethod === "EFECTIVO" && pendingAmount > 0.009 && parseFloat(amountPaid || "0") > 0;

    // Función auxiliar para agregar producto directamente al carrito
    const addProductToCart = useCallback((product: Product) => {
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
                maxStock: product.stock,
                igvExento: product.igvExento || false
            }];
        });
    }, []);

    // Buscar productos - Primero intenta búsqueda exacta por código de barras
    const searchProducts = useCallback(async (query: string) => {
        if (!query.trim()) {
            setProducts([]);
            return;
        }

        setLoading(true);
        try {
            const trimmedQuery = query.trim();

            // Detectar si parece ser un código de barras:
            // - Es mayormente numérico (más del 50% son dígitos)
            // - O tiene al menos 8 caracteres sin espacios y contiene números
            const digitCount = (trimmedQuery.match(/\d/g) || []).length;
            const isNumeric = digitCount > 0 && digitCount >= trimmedQuery.length * 0.5;
            const looksLikeBarcode = !trimmedQuery.includes(' ') && (isNumeric || (trimmedQuery.length >= 8 && digitCount >= 4));

            if (looksLikeBarcode) {
                // Primero intentar búsqueda exacta por código de barras
                const barcodeRes = await fetch(`/api/products/by-code?code=${encodeURIComponent(trimmedQuery)}`);
                if (barcodeRes.ok) {
                    const barcodeData = await barcodeRes.json();
                    if (barcodeData.found && barcodeData.product) {
                        // ¡Producto encontrado por código exacto! Agregar directamente al carrito
                        const product = barcodeData.product;

                        // Si el producto tiene la unidad de medida que coincidió, usar ese precio
                        const matchedUnit = barcodeData.matchedUnit;
                        const finalProduct: Product = {
                            id: product.id,
                            code: product.code,
                            name: matchedUnit
                                ? `${product.name} (${matchedUnit.name})`
                                : product.name,
                            price: matchedUnit?.price ?? product.price,
                            stock: product.stock,
                            unit: matchedUnit?.abbreviation ?? product.unit,
                            category: product.category,
                            igvExento: product.igvExento
                        };

                        addProductToCart(finalProduct);
                        setSearch("");
                        setProducts([]);
                        searchRef.current?.focus();
                        setLoading(false);
                        return;
                    }
                }
            }

            // Búsqueda normal por nombre/código parcial
            const res = await fetch(`/api/products?search=${encodeURIComponent(trimmedQuery)}&limit=10`);
            if (res.ok) {
                const data = await res.json();
                setProducts(data.products || []);
            }
        } catch (error) {
            console.error("Error searching products:", error);
        } finally {
            setLoading(false);
        }
    }, [addProductToCart]);

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
                maxStock: product.stock,
                igvExento: product.igvExento || false  // Heredar estado de exoneración
            }];
        });

        setSearch("");
        setProducts([]);
        searchRef.current?.focus();
    };

    // Modificar cantidad (incremento/decremento)
    const updateQuantity = (productId: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.productId === productId) {
                const newQty = Math.max(0.01, Math.min(item.maxStock, item.quantity + delta));
                return {
                    ...item,
                    quantity: newQty,
                    subtotal: newQty * item.price
                };
            }
            return item;
        }));
    };

    // Establecer cantidad directamente (para entrada decimal)
    const setQuantity = (productId: string, newQty: number) => {
        setCart(prev => prev.map(item => {
            if (item.productId === productId) {
                const validQty = Math.max(0.01, Math.min(item.maxStock, newQty));
                return {
                    ...item,
                    quantity: validQty,
                    subtotal: validQty * item.price
                };
            }
            return item;
        }));
    };

    // Actualizar precio de un item (para edición rápida)
    const updateItemPrice = (productId: string, newPrice: number) => {
        setCart(prev => prev.map(item => {
            if (item.productId === productId) {
                const validPrice = Math.max(0.01, newPrice);
                return {
                    ...item,
                    price: validPrice,
                    subtotal: item.quantity * validPrice
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

    // Procesar venta - PROTECCIÓN ANTI-DUPLICADOS
    const processSale = async () => {
        // Prevenir múltiples ejecuciones (doble clic, Enter rápido, etc.)
        if (processing) return;
        if (cart.length === 0) return;

        // Validar cliente para Factura
        if (documentType === "FACTURA" && !selectedClient) {
            setShowClientSelector(true);
            return;
        }

        // Validar cliente para pago parcial (necesitamos saber quién debe)
        if (isPartialPayment && !selectedClient) {
            alert("Debe seleccionar un cliente para registrar el pago parcial como crédito.");
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
                    paymentMethod: isPartialPayment ? "CREDITO" : paymentMethod,
                    amountPaid: parseFloat(amountPaid) || total,
                    documentType,
                    clientId: selectedClient?.id || null,
                    notes: isPartialPayment
                        ? `PAGO PARCIAL: Pagó S/ ${parseFloat(amountPaid).toFixed(2)} en Efectivo. Pendiente: S/ ${pendingAmount.toFixed(2)}${saleNotes ? `. ${saleNotes}` : ""}`
                        : saleNotes || null
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
            setSaleNotes("");
            setPaymentMethod("EFECTIVO");
            setSelectedClient(null);

            onSaleComplete?.();
        } catch (error) {
            alert(error instanceof Error ? error.message : "Error al procesar venta");
        } finally {
            setProcessing(false);
        }
    };

    // Imprimir PDF — Abre en ventana popup que NO desaparece
    const openPDF = (saleId: string) => {
        const printUrl = `/api/sales/${saleId}/pdf`;
        const popup = window.open(
            printUrl,
            'ImprimirTicket',
            'width=450,height=700,left=100,top=100,scrollbars=yes,resizable=yes,toolbar=no,menubar=no,location=no,status=no'
        );

        if (popup) {
            popup.focus();
        } else {
            // Si el popup fue bloqueado, abrir en nueva pestaña
            window.open(printUrl, '_blank');
        }
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
                setAmountPaid(total.toFixed(2)); // Por defecto = total
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
            {/* Panel izquierdo - Búsqueda, resultados y totales */}
            <div className="w-2/5 flex flex-col gap-3">
                {/* Barra de búsqueda - más compacta */}
                <Card>
                    <CardContent className="p-3">
                        <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                ref={searchRef}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Buscar producto... (F2)"
                                className="pl-8 h-9 text-sm"
                                autoFocus
                            />
                            {loading && (
                                <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Resultados de búsqueda */}
                <Card className="flex-1 overflow-hidden">
                    <CardContent className="p-3 h-full overflow-y-auto">
                        {products.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                                <Package className="h-12 w-12 mb-3 opacity-50" />
                                <p className="text-sm">Busca productos para agregarlos</p>
                                <p className="text-xs">Escanea código de barras o escribe el nombre</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {products.map(product => (
                                    <button
                                        key={product.id}
                                        onClick={() => addToCart(product)}
                                        disabled={product.stock === 0}
                                        className="w-full p-2 flex items-center justify-between rounded-lg border hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                                                <Package className="h-5 w-5" />
                                            </div>
                                            <div className="text-left">
                                                <p className="font-medium text-sm">{product.name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {product.code} • Stock: {product.stock} {product.unit}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-bold">S/ {product.price.toFixed(2)}</p>
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

                {/* Totales y Pago - Ahora en el lado izquierdo */}
                <Card className="bg-primary/5">
                    <CardContent className="p-3 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span>Subtotal</span>
                            <span>S/ {subtotal.toFixed(2)}</span>
                        </div>
                        {cart.reduce((sum, item) => sum + item.discount, 0) > 0 && (
                            <div className="flex justify-between text-sm text-green-600">
                                <span>Descuento</span>
                                <span>-S/ {cart.reduce((sum, item) => sum + item.discount, 0).toFixed(2)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-sm text-muted-foreground">
                            <span>IGV (18%)</span>
                            <span>S/ {tax.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-xl font-bold border-t pt-2">
                            <span>TOTAL</span>
                            <span>S/ {total.toFixed(2)}</span>
                        </div>

                        <Button
                            className="w-full h-12 text-lg"
                            size="lg"
                            disabled={cart.length === 0}
                            onClick={() => {
                                setAmountPaid(total.toFixed(2));
                                setShowPayment(true);
                            }}
                        >
                            <Calculator className="h-5 w-5 mr-2" />
                            COBRAR (F4)
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Panel derecho - Solo Carrito con productos */}
            <div className="w-3/5 flex flex-col">
                <Card className="flex-1 overflow-hidden flex flex-col">
                    <CardHeader className="py-2 px-4 flex-shrink-0">
                        <CardTitle className="flex items-center justify-between text-base">
                            <span className="flex items-center gap-2">
                                <ShoppingCart className="h-4 w-4" />
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
                    <CardContent className="p-3 pt-0 flex-1 overflow-y-auto">
                        {cart.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                                <ShoppingCart className="h-12 w-12 mb-3 opacity-50" />
                                <p className="text-sm">Carrito vacío</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {cart.map(item => (
                                    <div key={item.productId} className="flex items-center gap-2 p-2 rounded-lg border">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm truncate">{item.name}</p>
                                            <p className="text-xs text-muted-foreground">{item.code}</p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-7 w-7"
                                                onClick={() => updateQuantity(item.productId, -0.5)}
                                            >
                                                <Minus className="h-3 w-3" />
                                            </Button>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                min="0.01"
                                                max={item.maxStock}
                                                value={item.quantity}
                                                onChange={(e) => {
                                                    const val = parseFloat(e.target.value);
                                                    if (!isNaN(val) && val > 0) {
                                                        setQuantity(item.productId, val);
                                                    }
                                                }}
                                                className="w-16 h-7 text-center text-sm font-medium px-1"
                                            />
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-7 w-7"
                                                onClick={() => updateQuantity(item.productId, 0.5)}
                                                disabled={item.quantity >= item.maxStock}
                                            >
                                                <Plus className="h-3 w-3" />
                                            </Button>
                                        </div>
                                        <div className="w-24 text-right">
                                            <p className="font-bold text-sm">S/ {item.subtotal.toFixed(2)}</p>
                                            {editingPriceId === item.productId ? (
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    min="0.01"
                                                    autoFocus
                                                    value={editingPriceValue}
                                                    onChange={(e) => setEditingPriceValue(e.target.value)}
                                                    onBlur={() => {
                                                        const newPrice = parseFloat(editingPriceValue);
                                                        if (!isNaN(newPrice) && newPrice > 0) {
                                                            updateItemPrice(item.productId, newPrice);
                                                        }
                                                        setEditingPriceId(null);
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter") {
                                                            const newPrice = parseFloat(editingPriceValue);
                                                            if (!isNaN(newPrice) && newPrice > 0) {
                                                                updateItemPrice(item.productId, newPrice);
                                                            }
                                                            setEditingPriceId(null);
                                                        }
                                                        if (e.key === "Escape") {
                                                            setEditingPriceId(null);
                                                        }
                                                    }}
                                                    className="w-20 h-5 text-xs px-1 text-right"
                                                />
                                            ) : (
                                                <p
                                                    className="text-xs text-muted-foreground cursor-pointer hover:text-primary hover:underline"
                                                    onDoubleClick={() => {
                                                        setEditingPriceId(item.productId);
                                                        setEditingPriceValue(item.price.toFixed(2));
                                                    }}
                                                    title="Doble clic para editar precio"
                                                >
                                                    @ {item.price.toFixed(2)}
                                                </p>
                                            )}
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
            </div>

            {/* Modal de Pago */}
            {showPayment && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <Card className="w-[420px]">
                        <CardHeader className="py-2 px-4">
                            <CardTitle className="flex items-center justify-between text-base">
                                <span>Procesar Pago</span>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowPayment(false)}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 px-4 pb-4">
                            {/* Total */}
                            <div className="text-center py-2 bg-primary/10 rounded-lg">
                                <p className="text-xs text-muted-foreground">Total a Pagar</p>
                                <p className="text-3xl font-bold">S/ {total.toFixed(2)}</p>
                            </div>

                            {/* Tipo de comprobante */}
                            <div className="grid grid-cols-3 gap-2">
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
                                <Button
                                    variant={documentType === "NOTA_VENTA" ? "default" : "outline"}
                                    onClick={() => {
                                        setDocumentType("NOTA_VENTA");
                                        setSelectedClient(null);
                                    }}
                                >
                                    Nota Venta
                                </Button>
                            </div>

                            {/* Cliente (obligatorio para Factura, opcional para resto) */}
                            <div className="space-y-2">
                                <p className="text-sm font-medium flex items-center gap-2">
                                    <Building2 className="h-4 w-4" />
                                    Cliente {documentType === "FACTURA" && <span className="text-red-500">*</span>}
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
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" && !processing && parseFloat(amountPaid || "0") >= total) {
                                                e.preventDefault();
                                                processSale();
                                            }
                                        }}
                                    />
                                    {parseFloat(amountPaid) >= total && (
                                        <div className="text-center py-2 bg-green-500/10 rounded-lg">
                                            <p className="text-xs text-muted-foreground">Vuelto</p>
                                            <p className="text-xl font-bold text-green-600">
                                                S/ {change.toFixed(2)}
                                            </p>
                                        </div>
                                    )}
                                    {isPartialPayment && (
                                        <div className="py-2 px-3 bg-amber-500/10 border border-amber-500/30 rounded-lg space-y-1">
                                            <div className="flex items-center gap-2">
                                                <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                                                <p className="text-sm font-semibold text-amber-700">Pago Parcial</p>
                                            </div>
                                            <p className="text-xs text-amber-600">
                                                Pendiente: <span className="font-bold text-base">S/ {pendingAmount.toFixed(2)}</span>
                                            </p>
                                            <p className="text-xs text-amber-600/80">
                                                Se registrará como crédito del cliente
                                            </p>
                                            {!selectedClient && (
                                                <p className="text-xs text-red-500 font-medium">
                                                    ⚠ Seleccione un cliente para continuar
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Nota para la venta (pago parcial, observaciones) */}
                            <div className="space-y-1">
                                <p className="text-xs text-muted-foreground">Nota / Observación (opcional)</p>
                                <textarea
                                    value={saleNotes}
                                    onChange={(e) => setSaleNotes(e.target.value)}
                                    placeholder="Ej: Falta pagar S/ 0.50, cliente pagará mañana..."
                                    className="w-full h-14 text-sm p-2 rounded-lg border border-input bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                                    maxLength={200}
                                />
                            </div>

                            {/* Botón confirmar */}
                            <Button
                                className="w-full h-10"
                                onClick={processSale}
                                disabled={processing || (paymentMethod === "EFECTIVO" && parseFloat(amountPaid || "0") <= 0) || (isPartialPayment && !selectedClient)}
                            >
                                {processing ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                    <Receipt className="h-4 w-4 mr-2" />
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
                                        // Abrir PDF en nueva pestaña (más confiable que popup)
                                        window.open(`/api/sales/${completedSale.id}/pdf`, '_blank');
                                        // Cerrar modal DESPUÉS de un delay para no robar foco
                                        setTimeout(() => {
                                            setCompletedSale(null);
                                        }, 500);
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

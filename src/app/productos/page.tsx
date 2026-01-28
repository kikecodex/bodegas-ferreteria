"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import {
    Package,
    Plus,
    Search,
    Barcode,
    Filter,
    MoreVertical,
    Pencil,
    Trash2,
    AlertTriangle,
    ChevronLeft,
    ChevronRight,
    Loader2,
    Home,
    ShoppingCart,
    Users,
    Box,
    Receipt,
    FileText,
    Settings,
    Bell,
    ClipboardList
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProductForm } from "@/components/ProductForm";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { CategoryManager } from "@/components/CategoryManager";
import { KardexViewer } from "@/components/KardexViewer";

interface Category {
    id: string;
    name: string;
    color: string;
}

interface UnitOfMeasure {
    id: string;
    name: string;
    abbreviation: string;
    conversionFactor: number;
    price: number;
    barcode?: string;
    isDefault: boolean;
}

interface Product {
    id: string;
    code: string;
    name: string;
    description?: string;
    price: number;
    cost: number;
    stock: number;
    minStock: number;
    reorderPoint?: number;
    preferredVendor?: string;
    unit: string;
    isActive: boolean;
    category: Category;
    unitsOfMeasure: UnitOfMeasure[];
    _count: { reorderAlerts: number };
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

// Navigation items
const navItems = [
    { icon: Home, label: "Dashboard", href: "/", active: false },
    { icon: Package, label: "Productos", href: "/productos", active: true },
    { icon: ShoppingCart, label: "Ventas", href: "/ventas", active: false },
    { icon: Users, label: "Clientes", href: "/clientes", active: false },
    { icon: Box, label: "Inventario", href: "/inventario", active: false },
    { icon: Receipt, label: "Facturas", href: "/facturas", active: false },
    { icon: FileText, label: "Reportes", href: "/reportes", active: false },
];

export default function ProductosPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [pagination, setPagination] = useState<Pagination>({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0
    });
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("");
    const [stockFilter, setStockFilter] = useState("");
    const [categories, setCategories] = useState<Category[]>([]);

    // Modals
    const [showProductForm, setShowProductForm] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [showScanner, setShowScanner] = useState(false);
    const [scannedCode, setScannedCode] = useState("");
    const [showCategoryManager, setShowCategoryManager] = useState(false);
    const [showKardex, setShowKardex] = useState(false);
    const [kardexProduct, setKardexProduct] = useState<Product | null>(null);

    const fetchProducts = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                page: pagination.page.toString(),
                limit: pagination.limit.toString()
            });

            if (search) params.append("search", search);
            if (categoryFilter) params.append("categoryId", categoryFilter);
            if (stockFilter) params.append("stockStatus", stockFilter);

            const res = await fetch(`/api/products?${params}`);
            if (res.ok) {
                const data = await res.json();
                setProducts(data.products);
                setPagination(data.pagination);
            }
        } catch (error) {
            console.error("Error fetching products:", error);
        } finally {
            setLoading(false);
        }
    }, [pagination.page, pagination.limit, search, categoryFilter, stockFilter]);

    const fetchCategories = async () => {
        try {
            const res = await fetch("/api/categories");
            if (res.ok) {
                const data = await res.json();
                setCategories(data);
            }
        } catch (error) {
            console.error("Error fetching categories:", error);
        }
    };

    useEffect(() => {
        fetchProducts();
        fetchCategories();
    }, [fetchProducts]);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (pagination.page === 1) {
                fetchProducts();
            } else {
                setPagination(prev => ({ ...prev, page: 1 }));
            }
        }, 300);

        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, categoryFilter, stockFilter]);

    const handleScan = async (code: string) => {
        setShowScanner(false);

        // Buscar producto por código
        try {
            const res = await fetch(`/api/products/by-code?code=${encodeURIComponent(code)}`);
            const data = await res.json();

            if (data.found) {
                // Producto encontrado - abrir para editar
                setEditingProduct(data.product);
                setShowProductForm(true);
            } else {
                // Producto no encontrado - crear nuevo con código
                setScannedCode(code);
                setEditingProduct(null);
                setShowProductForm(true);
            }
        } catch (error) {
            console.error("Error searching product:", error);
        }
    };

    const handleEdit = (product: Product) => {
        setEditingProduct(product);
        setShowProductForm(true);
    };

    const handleDelete = async (productId: string) => {
        if (!confirm("¿Estás seguro de eliminar este producto?")) return;

        try {
            const res = await fetch(`/api/products/${productId}`, { method: "DELETE" });
            if (res.ok) {
                fetchProducts();
            } else {
                const error = await res.json();
                alert(error.error || "Error al eliminar");
            }
        } catch (error) {
            console.error("Error deleting product:", error);
        }
    };

    const getStockStatus = (product: Product) => {
        if (product.stock === 0) {
            return { color: "bg-red-500", label: "Sin Stock", icon: "🔴" };
        }
        if (product.stock <= product.minStock) {
            return { color: "bg-amber-500", label: "Stock Bajo", icon: "🟡" };
        }
        if (product.reorderPoint && product.stock <= product.reorderPoint) {
            return { color: "bg-blue-500", label: "Reordenar", icon: "🔵" };
        }
        return { color: "bg-green-500", label: "OK", icon: "🟢" };
    };

    return (
        <div className="flex h-screen overflow-hidden">
            {/* Sidebar */}
            <aside className="hidden md:flex w-64 flex-col bg-sidebar border-r border-sidebar-border">
                {/* Logo */}
                <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
                    <Image
                        src="/logo.jpeg"
                        alt="Corporación Oropeza's"
                        width={180}
                        height={45}
                        className="object-contain"
                        priority
                    />
                </div>

                {/* Navigation */}
                <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
                    {navItems.map((item) => (
                        <Link
                            key={item.label}
                            href={item.href}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${item.active
                                ? "bg-primary text-primary-foreground"
                                : "text-sidebar-foreground hover:bg-sidebar-accent"
                                }`}
                        >
                            <item.icon className={`h-5 w-5 ${item.active ? "" : "text-muted-foreground group-hover:text-foreground"}`} />
                            <span className="font-medium">{item.label}</span>
                        </Link>
                    ))}
                </nav>

                {/* User section */}
                <div className="p-4 border-t border-sidebar-border">
                    <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                            <AvatarImage src="" />
                            <AvatarFallback className="bg-primary text-primary-foreground">AD</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">Administrador</p>
                            <p className="text-xs text-muted-foreground truncate">admin@oropezas.com</p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Settings className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm flex items-center px-6 gap-4">
                    <div className="flex-1">
                        <h1 className="text-xl font-bold">Productos</h1>
                    </div>

                    <Button variant="ghost" size="icon" className="relative">
                        <Bell className="h-5 w-5" />
                        <span className="absolute top-1 right-1 h-2 w-2 bg-primary rounded-full"></span>
                    </Button>
                </header>

                {/* Page content */}
                <main className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Actions bar */}
                    <div className="flex flex-wrap gap-4 items-center justify-between">
                        <div className="flex gap-2 flex-1 max-w-2xl">
                            {/* Search */}
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar por nombre, código..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-9"
                                />
                            </div>

                            {/* Scan button */}
                            <Button variant="outline" onClick={() => setShowScanner(true)}>
                                <Barcode className="h-4 w-4 mr-2" />
                                Escanear
                            </Button>

                            {/* Filters */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline">
                                        <Filter className="h-4 w-4 mr-2" />
                                        Filtros
                                        {(categoryFilter || stockFilter) && (
                                            <Badge variant="secondary" className="ml-2">
                                                {[categoryFilter, stockFilter].filter(Boolean).length}
                                            </Badge>
                                        )}
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56">
                                    <div className="p-2">
                                        <label className="text-xs font-medium">Categoría</label>
                                        <select
                                            className="w-full mt-1 p-2 rounded border bg-background"
                                            value={categoryFilter}
                                            onChange={(e) => setCategoryFilter(e.target.value)}
                                        >
                                            <option value="">Todas</option>
                                            {categories.map(cat => (
                                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="p-2">
                                        <label className="text-xs font-medium">Estado Stock</label>
                                        <select
                                            className="w-full mt-1 p-2 rounded border bg-background"
                                            value={stockFilter}
                                            onChange={(e) => setStockFilter(e.target.value)}
                                        >
                                            <option value="">Todos</option>
                                            <option value="out">Sin Stock</option>
                                            <option value="low">Stock Bajo</option>
                                            <option value="ok">Stock OK</option>
                                        </select>
                                    </div>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => { setCategoryFilter(""); setStockFilter(""); }}>
                                        Limpiar filtros
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setShowCategoryManager(true)}>
                                Categorías
                            </Button>
                            <Button onClick={() => { setEditingProduct(null); setScannedCode(""); setShowProductForm(true); }}>
                                <Plus className="h-4 w-4 mr-2" />
                                Nuevo Producto
                            </Button>
                        </div>
                    </div>

                    {/* Products table */}
                    <Card>
                        <CardContent className="p-0">
                            {loading ? (
                                <div className="flex justify-center py-12">
                                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                </div>
                            ) : products.length === 0 ? (
                                <div className="text-center py-12">
                                    <Package className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                                    <p className="text-muted-foreground">No se encontraron productos</p>
                                    <Button
                                        className="mt-4"
                                        onClick={() => { setEditingProduct(null); setShowProductForm(true); }}
                                    >
                                        <Plus className="h-4 w-4 mr-2" />
                                        Crear primer producto
                                    </Button>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Código</TableHead>
                                            <TableHead>Producto</TableHead>
                                            <TableHead>Categoría</TableHead>
                                            <TableHead>Precio</TableHead>
                                            <TableHead>Stock</TableHead>
                                            <TableHead>Unidades</TableHead>
                                            <TableHead className="w-12"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {products.map((product) => {
                                            const stockStatus = getStockStatus(product);
                                            return (
                                                <TableRow
                                                    key={product.id}
                                                    className="cursor-pointer hover:bg-muted/50"
                                                    onClick={() => handleEdit(product)}
                                                >
                                                    <TableCell className="font-mono text-sm">
                                                        {product.code}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-medium">{product.name}</span>
                                                            {product._count.reorderAlerts > 0 && (
                                                                <AlertTriangle className="h-4 w-4 text-amber-500" />
                                                            )}
                                                        </div>
                                                        {product.description && (
                                                            <p className="text-xs text-muted-foreground truncate max-w-xs">
                                                                {product.description}
                                                            </p>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            variant="outline"
                                                            style={{
                                                                borderColor: product.category.color,
                                                                color: product.category.color
                                                            }}
                                                        >
                                                            {product.category.name}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className="font-medium">S/ {product.price.toFixed(2)}</span>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <span>{stockStatus.icon}</span>
                                                            <span>{product.stock} {product.unit}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        {product.unitsOfMeasure.length > 1 && (
                                                            <Badge variant="secondary">
                                                                {product.unitsOfMeasure.length} unidades
                                                            </Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                                    <MoreVertical className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(product); }}>
                                                                    <Pencil className="h-4 w-4 mr-2" />
                                                                    Editar
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setKardexProduct(product); setShowKardex(true); }}>
                                                                    <ClipboardList className="h-4 w-4 mr-2" />
                                                                    Ver Kardex
                                                                </DropdownMenuItem>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem
                                                                    className="text-red-600"
                                                                    onClick={(e) => { e.stopPropagation(); handleDelete(product.id); }}
                                                                >
                                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                                    Eliminar
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>

                    {/* Pagination */}
                    {pagination.totalPages > 1 && (
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">
                                Mostrando {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total}
                            </p>
                            <div className="flex gap-2">
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
                </main>
            </div>

            {/* Modals */}
            <ProductForm
                isOpen={showProductForm}
                onClose={() => { setShowProductForm(false); setEditingProduct(null); setScannedCode(""); }}
                onSave={() => { fetchProducts(); fetchCategories(); }}
                editProduct={editingProduct ? {
                    ...editingProduct,
                    categoryId: editingProduct.category.id,
                    maxStock: null,
                    image: "",
                    description: editingProduct.description || "",
                    reorderPoint: editingProduct.reorderPoint || null,
                    preferredVendor: editingProduct.preferredVendor || "",
                    unitsOfMeasure: editingProduct.unitsOfMeasure || []
                } : null}
                initialCode={scannedCode}
            />

            <BarcodeScanner
                isOpen={showScanner}
                onClose={() => setShowScanner(false)}
                onScan={handleScan}
            />

            <CategoryManager
                isOpen={showCategoryManager}
                onClose={() => { setShowCategoryManager(false); fetchCategories(); }}
            />

            <KardexViewer
                isOpen={showKardex}
                onClose={() => { setShowKardex(false); setKardexProduct(null); }}
                product={kardexProduct}
                onStockChange={fetchProducts}
            />
        </div>
    );
}

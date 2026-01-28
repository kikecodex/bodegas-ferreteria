"use client";

import { useState, useEffect } from "react";
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
    Phone,
    Mail,
    MapPin,
    Edit,
    Building2
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface Supplier {
    id: string;
    ruc: string;
    name: string;
    tradeName?: string;
    phone?: string;
    email?: string;
    address?: string;
    isActive: boolean;
    _count: { purchases: number };
}

const navItems = [
    { icon: Home, label: "Dashboard", href: "/" },
    { icon: Package, label: "Productos", href: "/productos" },
    { icon: ShoppingCart, label: "Ventas", href: "/ventas" },
    { icon: Users, label: "Clientes", href: "/clientes" },
    { icon: Truck, label: "Proveedores", href: "/proveedores", active: true },
    { icon: Box, label: "Compras", href: "/compras" },
    { icon: Receipt, label: "Facturas", href: "/facturas" },
    { icon: FileText, label: "Reportes", href: "/reportes" },
];

export default function ProveedoresPage() {
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        ruc: "", name: "", tradeName: "", phone: "", email: "", address: ""
    });
    const [saving, setSaving] = useState(false);

    const fetchSuppliers = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/suppliers?search=${encodeURIComponent(search)}`);
            if (res.ok) {
                const data = await res.json();
                setSuppliers(data.suppliers || []);
            }
        } catch (error) {
            console.error("Error:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(fetchSuppliers, 300);
        return () => clearTimeout(timer);
    }, [search]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch("/api/suppliers", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                setShowForm(false);
                setFormData({ ruc: "", name: "", tradeName: "", phone: "", email: "", address: "" });
                fetchSuppliers();
            } else {
                const data = await res.json();
                alert(data.error || "Error al guardar");
            }
        } catch (error) {
            alert("Error al guardar proveedor");
        } finally {
            setSaving(false);
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
                <header className="h-16 border-b bg-card px-6 flex items-center justify-between">
                    <h1 className="text-2xl font-bold">Proveedores</h1>
                    <Button onClick={() => setShowForm(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Nuevo Proveedor
                    </Button>
                </header>

                <div className="flex-1 p-6">
                    {/* Búsqueda */}
                    <div className="mb-6">
                        <div className="relative max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Buscar por RUC o nombre..."
                                className="pl-10"
                            />
                        </div>
                    </div>

                    {/* Lista */}
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    ) : suppliers.length === 0 ? (
                        <Card>
                            <CardContent className="py-12 text-center">
                                <Truck className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                                <p className="text-muted-foreground">No hay proveedores registrados</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {suppliers.map((supplier) => (
                                <Card key={supplier.id} className="hover:border-primary/50 transition-colors">
                                    <CardContent className="p-4">
                                        <div className="flex items-start gap-3">
                                            <Avatar className="h-12 w-12">
                                                <AvatarFallback className="bg-orange-100 text-orange-600">
                                                    {supplier.name.charAt(0)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold truncate">{supplier.name}</h3>
                                                <p className="text-sm text-muted-foreground">RUC: {supplier.ruc}</p>
                                            </div>
                                            <Badge variant="outline">{supplier._count.purchases} compras</Badge>
                                        </div>
                                        <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                                            {supplier.phone && (
                                                <p className="flex items-center gap-2">
                                                    <Phone className="h-3 w-3" /> {supplier.phone}
                                                </p>
                                            )}
                                            {supplier.email && (
                                                <p className="flex items-center gap-2">
                                                    <Mail className="h-3 w-3" /> {supplier.email}
                                                </p>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* Modal Nuevo Proveedor */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <Card className="w-[500px]">
                        <CardHeader>
                            <CardTitle>Nuevo Proveedor</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-medium">RUC *</label>
                                        <Input
                                            value={formData.ruc}
                                            onChange={(e) => setFormData({ ...formData, ruc: e.target.value })}
                                            placeholder="20XXXXXXXXX"
                                            maxLength={11}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium">Teléfono</label>
                                        <Input
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            placeholder="(01) 123-4567"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Razón Social *</label>
                                    <Input
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Empresa S.A.C."
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Nombre Comercial</label>
                                    <Input
                                        value={formData.tradeName}
                                        onChange={(e) => setFormData({ ...formData, tradeName: e.target.value })}
                                        placeholder="Nombre de fantasía"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Email</label>
                                    <Input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="proveedor@empresa.com"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Dirección</label>
                                    <Input
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        placeholder="Av. Principal 123"
                                    />
                                </div>
                                <div className="flex gap-2 pt-2">
                                    <Button type="button" variant="outline" className="flex-1" onClick={() => setShowForm(false)}>
                                        Cancelar
                                    </Button>
                                    <Button type="submit" className="flex-1" disabled={saving}>
                                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar"}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}

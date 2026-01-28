"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import {
    Users,
    Plus,
    Search,
    Filter,
    MoreVertical,
    Pencil,
    Trash2,
    ChevronLeft,
    ChevronRight,
    Loader2,
    Home,
    Package,
    ShoppingCart,
    Box,
    Receipt,
    FileText,
    Settings,
    Truck,
    Bell,
    CreditCard,
    Phone,
    Mail
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
import { ClientForm } from "@/components/ClientForm";

interface Client {
    id: string;
    documentType: string;
    document: string;
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    creditLimit?: number;
    currentDebt: number;
    segment: string;
    isActive: boolean;
    _count: { sales: number };
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
    { icon: Package, label: "Productos", href: "/productos", active: false },
    { icon: ShoppingCart, label: "Ventas", href: "/ventas", active: false },
    { icon: Users, label: "Clientes", href: "/clientes", active: true },
    { icon: Truck, label: "Proveedores", href: "/proveedores", active: false },
    { icon: Box, label: "Compras", href: "/compras", active: false },
    { icon: Receipt, label: "Facturas", href: "/facturas", active: false },
    { icon: FileText, label: "Reportes", href: "/reportes", active: false },
];

const segmentConfig: Record<string, { label: string; color: string; bgColor: string }> = {
    VIP: { label: "VIP", color: "text-amber-500", bgColor: "bg-amber-500/10" },
    FRECUENTE: { label: "Frecuente", color: "text-blue-500", bgColor: "bg-blue-500/10" },
    REGULAR: { label: "Regular", color: "text-gray-400", bgColor: "bg-gray-500/10" },
    NUEVO: { label: "Nuevo", color: "text-green-500", bgColor: "bg-green-500/10" },
    INACTIVO: { label: "Inactivo", color: "text-red-500", bgColor: "bg-red-500/10" }
};

export default function ClientesPage() {
    const [clients, setClients] = useState<Client[]>([]);
    const [pagination, setPagination] = useState<Pagination>({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0
    });
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [segmentFilter, setSegmentFilter] = useState("");

    // Modals
    const [showClientForm, setShowClientForm] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);

    const fetchClients = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                page: pagination.page.toString(),
                limit: pagination.limit.toString()
            });

            if (search) params.append("search", search);
            if (segmentFilter) params.append("segment", segmentFilter);

            const res = await fetch(`/api/clients?${params}`);
            if (res.ok) {
                const data = await res.json();
                setClients(data.clients);
                setPagination(data.pagination);
            }
        } catch (error) {
            console.error("Error fetching clients:", error);
        } finally {
            setLoading(false);
        }
    }, [pagination.page, pagination.limit, search, segmentFilter]);

    useEffect(() => {
        fetchClients();
    }, [fetchClients]);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (pagination.page === 1) {
                fetchClients();
            } else {
                setPagination(prev => ({ ...prev, page: 1 }));
            }
        }, 300);

        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, segmentFilter]);

    const handleEdit = (client: Client) => {
        setEditingClient(client);
        setShowClientForm(true);
    };

    const handleDelete = async (clientId: string) => {
        if (!confirm("¿Estás seguro de desactivar este cliente?")) return;

        try {
            const res = await fetch(`/api/clients/${clientId}`, { method: "DELETE" });
            if (res.ok) {
                fetchClients();
            } else {
                const error = await res.json();
                alert(error.error || "Error al eliminar");
            }
        } catch (error) {
            console.error("Error deleting client:", error);
        }
    };

    const getInitials = (name: string) => {
        return name.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase();
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
                        <h1 className="text-xl font-bold">Clientes</h1>
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
                                    placeholder="Buscar por nombre, DNI, RUC, teléfono..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-9"
                                />
                            </div>

                            {/* Filters */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline">
                                        <Filter className="h-4 w-4 mr-2" />
                                        Filtros
                                        {segmentFilter && (
                                            <Badge variant="secondary" className="ml-2">1</Badge>
                                        )}
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56">
                                    <div className="p-2">
                                        <label className="text-xs font-medium">Segmento</label>
                                        <select
                                            className="w-full mt-1 p-2 rounded border bg-background"
                                            value={segmentFilter}
                                            onChange={(e) => setSegmentFilter(e.target.value)}
                                        >
                                            <option value="">Todos</option>
                                            <option value="VIP">VIP</option>
                                            <option value="FRECUENTE">Frecuente</option>
                                            <option value="REGULAR">Regular</option>
                                            <option value="NUEVO">Nuevo</option>
                                            <option value="INACTIVO">Inactivo</option>
                                        </select>
                                    </div>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => setSegmentFilter("")}>
                                        Limpiar filtros
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        <Button onClick={() => { setEditingClient(null); setShowClientForm(true); }}>
                            <Plus className="h-4 w-4 mr-2" />
                            Nuevo Cliente
                        </Button>
                    </div>

                    {/* Clients table */}
                    <Card>
                        <CardContent className="p-0">
                            {loading ? (
                                <div className="flex justify-center py-12">
                                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                </div>
                            ) : clients.length === 0 ? (
                                <div className="text-center py-12">
                                    <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                                    <p className="text-muted-foreground">No se encontraron clientes</p>
                                    <Button
                                        className="mt-4"
                                        onClick={() => { setEditingClient(null); setShowClientForm(true); }}
                                    >
                                        <Plus className="h-4 w-4 mr-2" />
                                        Crear primer cliente
                                    </Button>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Cliente</TableHead>
                                            <TableHead>Documento</TableHead>
                                            <TableHead>Contacto</TableHead>
                                            <TableHead>Segmento</TableHead>
                                            <TableHead>Compras</TableHead>
                                            <TableHead>Deuda</TableHead>
                                            <TableHead className="w-12"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {clients.map((client) => {
                                            const segment = segmentConfig[client.segment] || segmentConfig.REGULAR;
                                            return (
                                                <TableRow
                                                    key={client.id}
                                                    className="cursor-pointer hover:bg-muted/50"
                                                    onClick={() => handleEdit(client)}
                                                >
                                                    <TableCell>
                                                        <div className="flex items-center gap-3">
                                                            <Avatar className="h-9 w-9">
                                                                <AvatarFallback className={`${segment.bgColor} ${segment.color}`}>
                                                                    {getInitials(client.name)}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <div>
                                                                <p className="font-medium">{client.name}</p>
                                                                {client.address && (
                                                                    <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                                                        {client.address}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <CreditCard className="h-4 w-4 text-muted-foreground" />
                                                            <span className="font-mono text-sm">
                                                                {client.documentType}: {client.document}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="space-y-1">
                                                            {client.phone && (
                                                                <div className="flex items-center gap-1 text-sm">
                                                                    <Phone className="h-3 w-3 text-muted-foreground" />
                                                                    {client.phone}
                                                                </div>
                                                            )}
                                                            {client.email && (
                                                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                                                    <Mail className="h-3 w-3" />
                                                                    {client.email}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge className={`${segment.bgColor} ${segment.color} border-0`}>
                                                            {segment.label}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className="text-muted-foreground">
                                                            {client._count.sales} ventas
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>
                                                        {client.currentDebt > 0 ? (
                                                            <span className="text-red-500 font-medium">
                                                                S/ {client.currentDebt.toFixed(2)}
                                                            </span>
                                                        ) : (
                                                            <span className="text-green-500">-</span>
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
                                                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(client); }}>
                                                                    <Pencil className="h-4 w-4 mr-2" />
                                                                    Editar
                                                                </DropdownMenuItem>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem
                                                                    className="text-red-600"
                                                                    onClick={(e) => { e.stopPropagation(); handleDelete(client.id); }}
                                                                >
                                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                                    Desactivar
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
            <ClientForm
                isOpen={showClientForm}
                onClose={() => { setShowClientForm(false); setEditingClient(null); }}
                onSave={fetchClients}
                editClient={editingClient ? {
                    ...editingClient,
                    phone: editingClient.phone || "",
                    email: editingClient.email || "",
                    address: editingClient.address || "",
                    creditLimit: editingClient.creditLimit || null
                } : null}
            />
        </div>
    );
}

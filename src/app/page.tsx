"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Package,
  ShoppingCart,
  Users,
  BarChart3,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Settings,
  Bell,
  Search,
  Menu,
  Home,
  Box,
  Receipt,
  FileText,
  Truck,
  LogOut,
  Loader2,
  Lock,
  FileEdit
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ReorderAlerts } from "@/components/ReorderAlerts";
import { Sidebar } from "@/components/Sidebar";

interface SalesReport {
  resumen: {
    hoy: { total: number; cantidad: number };
    semana: { total: number; cantidad: number };
    mes: { total: number; cantidad: number };
  };
  porMetodoPago: Record<string, { cantidad: number; total: number }>;
}

interface TopProduct {
  rank: number;
  name: string;
  cantidadVendida: number;
  totalVentas: number;
}

interface RecentSale {
  id: string;
  number: string;
  total: number;
  createdAt: string;
  client?: { name: string };
  _count: { items: number };
}

// Formatear moneda
const formatCurrency = (value: number) => {
  return `S/ ${value.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Formatear tiempo relativo
const timeAgo = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diff < 60) return "hace unos segundos";
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} hora(s)`;
  return date.toLocaleDateString("es-PE");
};

export default function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [salesReport, setSalesReport] = useState<SalesReport | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [recentSales, setRecentSales] = useState<RecentSale[]>([]);
  const [stats, setStats] = useState({ products: 0, clients: 0, lowStock: 0 });

  // Cargar datos
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [salesRes, topRes, recentRes, productsRes, clientsRes, lowStockRes] = await Promise.all([
          fetch("/api/reports/sales?period=day"),
          fetch("/api/reports/top-products?limit=5"),
          fetch("/api/sales?limit=5"),
          fetch("/api/products?limit=1"),
          fetch("/api/clients?limit=1"),
          fetch("/api/products?lowStock=true&limit=100")
        ]);

        if (salesRes.ok) {
          const data = await salesRes.json();
          setSalesReport(data);
        }

        if (topRes.ok) {
          const data = await topRes.json();
          setTopProducts(data.topProducts || []);
        }

        if (recentRes.ok) {
          const data = await recentRes.json();
          setRecentSales(data.sales || []);
        }

        if (productsRes.ok) {
          const data = await productsRes.json();
          setStats(prev => ({ ...prev, products: data.pagination?.total || 0 }));
        }

        if (clientsRes.ok) {
          const data = await clientsRes.json();
          setStats(prev => ({ ...prev, clients: data.pagination?.total || 0 }));
        }

        if (lowStockRes.ok) {
          const data = await lowStockRes.json();
          setStats(prev => ({ ...prev, lowStock: data.pagination?.total || 0 }));
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // KPIs dinámicos
  const kpiData = [
    {
      title: "Ventas Hoy",
      value: salesReport ? formatCurrency(salesReport.resumen.hoy.total) : "S/ 0.00",
      subvalue: salesReport ? `${salesReport.resumen.hoy.cantidad} ventas` : "0 ventas",
      icon: DollarSign,
      color: "text-green-500",
      bgColor: "bg-green-500/10"
    },
    {
      title: "Ventas Semana",
      value: salesReport ? formatCurrency(salesReport.resumen.semana.total) : "S/ 0.00",
      subvalue: salesReport ? `${salesReport.resumen.semana.cantidad} ventas` : "0 ventas",
      icon: TrendingUp,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10"
    },
    {
      title: "Ventas Mes",
      value: salesReport ? formatCurrency(salesReport.resumen.mes.total) : "S/ 0.00",
      subvalue: salesReport ? `${salesReport.resumen.mes.cantidad} ventas` : "0 ventas",
      icon: BarChart3,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10"
    },
    {
      title: "Stock Bajo",
      value: stats.lowStock.toString(),
      subvalue: "productos",
      icon: AlertTriangle,
      color: stats.lowStock > 0 ? "text-amber-500" : "text-green-500",
      bgColor: stats.lowStock > 0 ? "bg-amber-500/10" : "bg-green-500/10"
    },
  ];

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar - Componente dinámico */}
      <Sidebar />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm flex items-center px-6 gap-4">
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>

          {/* Search */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar productos, clientes, ventas..."
                className="pl-9 bg-background/50"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  {stats.lowStock > 0 && (
                    <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Notificaciones</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {stats.lowStock > 0 && (
                  <DropdownMenuItem>
                    <AlertTriangle className="h-4 w-4 mr-2 text-amber-500" />
                    <span>{stats.lowStock} productos con stock bajo</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Quick POS button */}
            <Link href="/ventas">
              <Button className="gap-2 bg-primary hover:bg-primary/90">
                <ShoppingCart className="h-4 w-4" />
                <span className="hidden sm:inline">Nueva Venta</span>
              </Button>
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Page title */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Dashboard</h1>
              <p className="text-muted-foreground">
                Resumen de tu negocio en tiempo real
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1">
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                Sistema activo
              </Badge>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <>
              {/* KPI Cards */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {kpiData.map((kpi) => (
                  <Card key={kpi.title} className="overflow-hidden">
                    <CardContent className="p-0">
                      <div className="flex items-center">
                        <div className={`w-2 h-full min-h-[100px] ${kpi.bgColor}`}></div>
                        <div className="flex-1 p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-muted-foreground">{kpi.title}</span>
                            <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                          </div>
                          <div className="text-2xl font-bold">{kpi.value}</div>
                          <div className="text-xs text-muted-foreground mt-1">{kpi.subvalue}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Main grid */}
              <div className="grid gap-6 lg:grid-cols-3">
                {/* Recent Sales */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Receipt className="h-5 w-5 text-primary" />
                      Ventas Recientes
                    </CardTitle>
                    <CardDescription>
                      Últimas ventas del sistema
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {recentSales.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No hay ventas registradas</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {recentSales.map((sale) => (
                          <div
                            key={sale.id}
                            className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <ShoppingCart className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium">{sale.client?.name || "Cliente General"}</p>
                                <p className="text-sm text-muted-foreground">
                                  {sale.number} • {sale._count?.items || 0} productos
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">{formatCurrency(sale.total)}</p>
                              <p className="text-xs text-muted-foreground">{timeAgo(sale.createdAt)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Low Stock Alerts - Dynamic */}
                <ReorderAlerts compact />
              </div>

              {/* Top Products & Stats */}
              <div className="grid gap-4 md:grid-cols-3">
                {/* Top Products */}
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-green-500" />
                      Productos Más Vendidos
                    </CardTitle>
                    <CardDescription>Este mes</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {topProducts.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">Sin datos aún</p>
                    ) : (
                      <div className="space-y-3">
                        {topProducts.map((product, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${i === 0 ? "bg-yellow-500/20 text-yellow-600" :
                              i === 1 ? "bg-gray-300/20 text-gray-500" :
                                i === 2 ? "bg-orange-500/20 text-orange-600" :
                                  "bg-muted text-muted-foreground"
                              }`}>
                              {product.rank}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{product.name}</p>
                              <p className="text-xs text-muted-foreground">{product.cantidadVendida} vendidos</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-green-600">{formatCurrency(product.totalVentas)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Quick Stats */}
                <div className="space-y-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Productos
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.products.toLocaleString()}</div>
                      <p className="text-xs text-muted-foreground mt-1">productos activos</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Clientes
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.clients.toLocaleString()}</div>
                      <p className="text-xs text-muted-foreground mt-1">clientes registrados</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Search,
    Loader2,
    User,
    Building2,
    Plus,
    Check,
    X
} from "lucide-react";

interface Client {
    id: string;
    documentType: string;
    document: string;
    name: string;
    address?: string;
    phone?: string;
    email?: string;
}

interface ClientSelectorProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (client: Client) => void;
    required?: boolean;
}

export function ClientSelector({ isOpen, onClose, onSelect, required }: ClientSelectorProps) {
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(false);
    const [lookingUp, setLookingUp] = useState(false);
    const [results, setResults] = useState<Client[]>([]);
    const [newClient, setNewClient] = useState<Partial<Client> | null>(null);
    const [saving, setSaving] = useState(false);

    // Buscar clientes existentes
    const searchClients = async (query: string) => {
        if (!query.trim() || query.length < 3) {
            setResults([]);
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`/api/clients?search=${encodeURIComponent(query)}&limit=5`);
            if (res.ok) {
                const data = await res.json();
                setResults(data.clients || []);
            }
        } catch (error) {
            console.error("Error buscando clientes:", error);
        } finally {
            setLoading(false);
        }
    };

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            searchClients(search);
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    // Consultar SUNAT por RUC/DNI o permitir ingreso manual
    const lookupDocument = async () => {
        if (!search.trim()) return;

        const isRUC = search.length === 11;
        const isDNI = search.length === 8;

        if (!isRUC && !isDNI) {
            return;
        }

        setLookingUp(true);
        try {
            const type = isRUC ? "ruc" : "dni";
            const res = await fetch(`/api/lookup/sunat?type=${type}&number=${search}`);

            if (res.ok) {
                const data = await res.json();
                if (data.found) {
                    setNewClient({
                        documentType: isRUC ? "RUC" : "DNI",
                        document: search,
                        name: data.name || "",
                        address: data.address || ""
                    });
                } else {
                    // No se encontró en SUNAT, permitir ingreso manual
                    setNewClient({
                        documentType: isRUC ? "RUC" : "DNI",
                        document: search,
                        name: "",
                        address: ""
                    });
                }
            } else {
                // Error de API, permitir ingreso manual
                setNewClient({
                    documentType: isRUC ? "RUC" : "DNI",
                    document: search,
                    name: "",
                    address: ""
                });
            }
        } catch (error) {
            console.error("Error consultando documento:", error);
            // Error de conexión, permitir ingreso manual
            setNewClient({
                documentType: isRUC ? "RUC" : "DNI",
                document: search,
                name: "",
                address: ""
            });
        } finally {
            setLookingUp(false);
        }
    };

    // Guardar nuevo cliente
    const saveNewClient = async () => {
        if (!newClient?.document || !newClient?.name) return;

        setSaving(true);
        try {
            const res = await fetch("/api/clients", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    documentType: newClient.documentType || "DNI",
                    document: newClient.document,
                    name: newClient.name,
                    address: newClient.address || "",
                    phone: newClient.phone || "",
                    email: newClient.email || ""
                })
            });

            if (res.ok) {
                const client = await res.json();
                onSelect(client);
            } else {
                const error = await res.json();
                alert(error.error || "Error al guardar cliente");
            }
        } catch (error) {
            console.error("Error guardando cliente:", error);
            alert("Error al guardar cliente");
        } finally {
            setSaving(false);
        }
    };

    // Reset al cerrar
    const handleClose = () => {
        if (!required) {
            setSearch("");
            setResults([]);
            setNewClient(null);
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-[500px] max-h-[80vh] overflow-hidden">
                <CardContent className="p-4">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <Building2 className="h-5 w-5" />
                            Seleccionar Cliente
                        </h3>
                        {!required && (
                            <Button variant="ghost" size="icon" onClick={handleClose}>
                                <X className="h-5 w-5" />
                            </Button>
                        )}
                    </div>

                    {required && (
                        <div className="bg-amber-500/10 text-amber-600 text-sm p-2 rounded-lg mb-4">
                            ⚠️ Para Factura es obligatorio seleccionar un cliente con RUC
                        </div>
                    )}

                    {/* Búsqueda */}
                    <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar por RUC, DNI o nombre..."
                            className="pl-10"
                            autoFocus
                        />
                        {loading && (
                            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />
                        )}
                    </div>

                    {/* Resultados */}
                    {results.length > 0 && (
                        <div className="space-y-2 mb-4 max-h-[200px] overflow-y-auto">
                            {results.map((client) => (
                                <button
                                    key={client.id}
                                    onClick={() => onSelect(client)}
                                    className="w-full p-3 flex items-center gap-3 rounded-lg border hover:bg-accent transition-colors text-left"
                                >
                                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                                        {client.documentType === "RUC" ? (
                                            <Building2 className="h-5 w-5" />
                                        ) : (
                                            <User className="h-5 w-5" />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium">{client.name}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {client.documentType}: {client.document}
                                        </p>
                                    </div>
                                    <Badge variant="outline">{client.documentType}</Badge>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Opción crear nuevo - visible cuando hay documentos válidos */}
                    {search.length >= 8 && results.length === 0 && !newClient && (
                        <Button
                            variant="outline"
                            className="w-full mb-4 border-blue-200 text-blue-600 hover:bg-blue-50"
                            onClick={lookupDocument}
                            disabled={lookingUp}
                        >
                            {lookingUp ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <Search className="h-4 w-4 mr-2" />
                            )}
                            Consultar {search.length === 11 ? "RUC" : "DNI"} en SUNAT
                        </Button>
                    )}

                    {/* Botón crear manualmente - siempre visible cuando no hay resultados */}
                    {search.length >= 3 && results.length === 0 && !newClient && !loading && (
                        <Button
                            variant="outline"
                            className="w-full mb-4 border-green-200 text-green-600 hover:bg-green-50"
                            onClick={() => setNewClient({
                                documentType: search.length === 11 ? "RUC" : "DNI",
                                document: search.length >= 8 && search.length <= 11 && /^\d+$/.test(search) ? search : "",
                                name: /^\d+$/.test(search) ? "" : search, // Si no es número, usar como nombre
                                address: ""
                            })}
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Agregar Nuevo Cliente
                        </Button>
                    )}

                    {/* Formulario nuevo cliente */}
                    {newClient && (
                        <div className="border rounded-lg p-4 space-y-3 bg-green-50/50 border-green-200">
                            <h4 className="font-medium flex items-center gap-2 text-green-700">
                                <Plus className="h-4 w-4" />
                                Nuevo Cliente
                            </h4>

                            <div className="space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-xs text-muted-foreground">Tipo Doc.</label>
                                        <select
                                            value={newClient.documentType || "DNI"}
                                            onChange={(e) => setNewClient({ ...newClient, documentType: e.target.value })}
                                            className="w-full h-10 px-3 border rounded-md bg-white"
                                        >
                                            <option value="DNI">DNI</option>
                                            <option value="RUC">RUC</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs text-muted-foreground">Número</label>
                                        <Input
                                            value={newClient.document || ""}
                                            onChange={(e) => setNewClient({ ...newClient, document: e.target.value })}
                                            placeholder={newClient.documentType === "RUC" ? "20XXXXXXXXX" : "XXXXXXXX"}
                                            maxLength={11}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs text-muted-foreground">Nombre / Razón Social *</label>
                                    <Input
                                        value={newClient.name || ""}
                                        onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                                        placeholder="Nombre completo o razón social"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-muted-foreground">Dirección</label>
                                    <Input
                                        value={newClient.address || ""}
                                        onChange={(e) => setNewClient({ ...newClient, address: e.target.value })}
                                        placeholder="Dirección fiscal"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-xs text-muted-foreground">Teléfono</label>
                                        <Input
                                            value={newClient.phone || ""}
                                            onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                                            placeholder="999 999 999"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-muted-foreground">Email</label>
                                        <Input
                                            value={newClient.email || ""}
                                            onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                                            placeholder="email@ejemplo.com"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2 pt-2">
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => setNewClient(null)}
                                >
                                    <X className="h-4 w-4 mr-1" />
                                    Cancelar
                                </Button>
                                <Button
                                    className="flex-1 bg-green-600 hover:bg-green-700"
                                    onClick={saveNewClient}
                                    disabled={saving || !newClient.name || !newClient.document}
                                >
                                    {saving ? (
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                        <Check className="h-4 w-4 mr-2" />
                                    )}
                                    Guardar y Usar
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Mensaje de ayuda */}
                    {search.length > 0 && search.length < 3 && results.length === 0 && !loading && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                            Ingresa al menos 3 caracteres para buscar
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, User, CreditCard, Phone, Mail, MapPin, Search, CheckCircle, XCircle } from "lucide-react";

interface ClientFormData {
    id?: string;
    documentType: string;
    document: string;
    name: string;
    phone: string;
    email: string;
    address: string;
    creditLimit: number | null;
    segment: string;
}

interface ClientFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    editClient?: ClientFormData | null;
}

interface LookupResult {
    found: boolean;
    name?: string;
    address?: string;
    status?: string;
    condition?: string;
    message?: string;
}

const emptyClient: ClientFormData = {
    documentType: "DNI",
    document: "",
    name: "",
    phone: "",
    email: "",
    address: "",
    creditLimit: null,
    segment: "REGULAR"
};

const segments = [
    { value: "VIP", label: "VIP", color: "text-amber-500" },
    { value: "FRECUENTE", label: "Frecuente", color: "text-blue-500" },
    { value: "REGULAR", label: "Regular", color: "text-gray-500" },
    { value: "NUEVO", label: "Nuevo", color: "text-green-500" },
    { value: "INACTIVO", label: "Inactivo", color: "text-red-500" }
];

export function ClientForm({ isOpen, onClose, onSave, editClient }: ClientFormProps) {
    const [formData, setFormData] = useState<ClientFormData>(emptyClient);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    // Estado para búsqueda SUNAT/RENIEC
    const [lookingUp, setLookingUp] = useState(false);
    const [lookupStatus, setLookupStatus] = useState<"idle" | "found" | "not_found" | "error">("idle");
    const [lookupMessage, setLookupMessage] = useState("");

    useEffect(() => {
        if (isOpen) {
            if (editClient) {
                setFormData(editClient);
            } else {
                setFormData(emptyClient);
            }
            setError("");
            setLookupStatus("idle");
            setLookupMessage("");
        }
    }, [isOpen, editClient]);

    // Función para buscar datos en SUNAT/RENIEC
    const lookupDocument = useCallback(async (docType: string, docNumber: string) => {
        // Validar longitud antes de buscar
        const isValidDNI = docType === "DNI" && /^\d{8}$/.test(docNumber);
        const isValidRUC = docType === "RUC" && /^(10|20)\d{9}$/.test(docNumber);

        if (!isValidDNI && !isValidRUC) {
            setLookupStatus("idle");
            return;
        }

        setLookingUp(true);
        setLookupStatus("idle");
        setLookupMessage("");

        try {
            const type = docType.toLowerCase();
            const res = await fetch(`/api/lookup/sunat?type=${type}&number=${docNumber}`);
            const data: LookupResult = await res.json();

            if (data.found && data.name) {
                // Autocompletar datos
                setFormData(prev => ({
                    ...prev,
                    name: data.name || prev.name,
                    address: data.address || prev.address
                }));
                setLookupStatus("found");

                // Mostrar estado SUNAT si es RUC
                if (data.status) {
                    setLookupMessage(`SUNAT: ${data.status} - ${data.condition || "N/A"}`);
                } else {
                    setLookupMessage("Datos encontrados ✓");
                }
            } else {
                setLookupStatus("not_found");
                setLookupMessage(data.message || "No se encontraron datos");
            }
        } catch (err) {
            console.error("Lookup error:", err);
            setLookupStatus("error");
            setLookupMessage("Error al consultar");
        } finally {
            setLookingUp(false);
        }
    }, []);

    // Auto-búsqueda cuando se completa el documento
    useEffect(() => {
        const docType = formData.documentType;
        const docNumber = formData.document.trim();

        // Solo buscar si no estamos editando un cliente existente
        if (editClient?.id) return;

        // Verificar si el documento está completo
        const isComplete =
            (docType === "DNI" && docNumber.length === 8) ||
            (docType === "RUC" && docNumber.length === 11);

        if (isComplete) {
            // Debounce de 500ms
            const timer = setTimeout(() => {
                lookupDocument(docType, docNumber);
            }, 500);
            return () => clearTimeout(timer);
        } else {
            setLookupStatus("idle");
            setLookupMessage("");
        }
    }, [formData.documentType, formData.document, editClient?.id, lookupDocument]);

    const handleChange = (field: keyof ClientFormData, value: unknown) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setError("");
    };

    const validateDocument = () => {
        const doc = formData.document.trim();
        if (formData.documentType === "DNI") {
            if (!/^\d{8}$/.test(doc)) {
                return "DNI debe tener exactamente 8 dígitos";
            }
        } else if (formData.documentType === "RUC") {
            if (!/^(10|20)\d{9}$/.test(doc)) {
                return "RUC debe tener 11 dígitos y comenzar con 10 o 20";
            }
        }
        return null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validaciones
        if (!formData.document.trim() || !formData.name.trim()) {
            setError("Documento y nombre son requeridos");
            return;
        }

        const docError = validateDocument();
        if (docError) {
            setError(docError);
            return;
        }

        setSaving(true);
        setError("");

        try {
            const url = editClient?.id
                ? `/api/clients/${editClient.id}`
                : "/api/clients";

            const method = editClient?.id ? "PUT" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...formData,
                    creditLimit: formData.creditLimit || null
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Error al guardar");
            }

            onSave();
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error al guardar cliente");
        } finally {
            setSaving(false);
        }
    };

    const handleManualLookup = () => {
        lookupDocument(formData.documentType, formData.document.trim());
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        {editClient?.id ? "Editar Cliente" : "Nuevo Cliente"}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="p-3 text-sm text-red-500 bg-red-500/10 rounded-lg">
                            {error}
                        </div>
                    )}

                    {/* Documento con búsqueda automática */}
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <Label>Tipo Doc.</Label>
                            <select
                                className="w-full mt-1 p-2 rounded-md border bg-background"
                                value={formData.documentType}
                                onChange={(e) => handleChange("documentType", e.target.value)}
                            >
                                <option value="DNI">DNI</option>
                                <option value="RUC">RUC</option>
                                <option value="CE">CE</option>
                                <option value="PASAPORTE">Pasaporte</option>
                            </select>
                        </div>
                        <div className="col-span-2">
                            <Label className="flex items-center justify-between">
                                <span>Documento *</span>
                                {lookingUp && (
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                        Consultando SUNAT...
                                    </span>
                                )}
                            </Label>
                            <div className="relative mt-1">
                                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    value={formData.document}
                                    onChange={(e) => handleChange("document", e.target.value.replace(/\D/g, ""))}
                                    placeholder={formData.documentType === "RUC" ? "20123456789" : "12345678"}
                                    className="pl-9 pr-10"
                                    maxLength={formData.documentType === "RUC" ? 11 : 8}
                                />
                                {/* Botón de búsqueda manual */}
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                                    onClick={handleManualLookup}
                                    disabled={lookingUp}
                                >
                                    {lookingUp ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : lookupStatus === "found" ? (
                                        <CheckCircle className="h-4 w-4 text-green-500" />
                                    ) : lookupStatus === "not_found" || lookupStatus === "error" ? (
                                        <XCircle className="h-4 w-4 text-amber-500" />
                                    ) : (
                                        <Search className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                            {/* Mensaje de estado de búsqueda */}
                            {lookupMessage && (
                                <p className={`text-xs mt-1 ${lookupStatus === "found" ? "text-green-500" :
                                        lookupStatus === "error" ? "text-red-500" :
                                            "text-amber-500"
                                    }`}>
                                    {lookupMessage}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Nombre - se autocompleta desde SUNAT */}
                    <div>
                        <Label className="flex items-center gap-2">
                            Nombre / Razón Social *
                            {lookupStatus === "found" && (
                                <span className="text-xs text-green-500 font-normal">(desde SUNAT)</span>
                            )}
                        </Label>
                        <div className="relative mt-1">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                value={formData.name}
                                onChange={(e) => handleChange("name", e.target.value)}
                                placeholder="Juan Pérez / Empresa S.A.C."
                                className={`pl-9 ${lookupStatus === "found" ? "border-green-500/50" : ""}`}
                            />
                        </div>
                    </div>

                    {/* Teléfono y Email */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label>Teléfono</Label>
                            <div className="relative mt-1">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    value={formData.phone}
                                    onChange={(e) => handleChange("phone", e.target.value)}
                                    placeholder="987654321"
                                    className="pl-9"
                                />
                            </div>
                        </div>
                        <div>
                            <Label>Email</Label>
                            <div className="relative mt-1">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => handleChange("email", e.target.value)}
                                    placeholder="cliente@email.com"
                                    className="pl-9"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Dirección - se autocompleta desde SUNAT */}
                    <div>
                        <Label className="flex items-center gap-2">
                            Dirección
                            {lookupStatus === "found" && formData.address && (
                                <span className="text-xs text-green-500 font-normal">(desde SUNAT)</span>
                            )}
                        </Label>
                        <div className="relative mt-1">
                            <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Textarea
                                value={formData.address}
                                onChange={(e) => handleChange("address", e.target.value)}
                                placeholder="Av. Principal 123, Lima"
                                className={`pl-9 min-h-[60px] ${lookupStatus === "found" && formData.address ? "border-green-500/50" : ""}`}
                            />
                        </div>
                    </div>

                    {/* Segmento y Límite de Crédito */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label>Segmento</Label>
                            <select
                                className="w-full mt-1 p-2 rounded-md border bg-background"
                                value={formData.segment}
                                onChange={(e) => handleChange("segment", e.target.value)}
                            >
                                {segments.map(seg => (
                                    <option key={seg.value} value={seg.value}>
                                        {seg.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <Label>Límite de Crédito (S/)</Label>
                            <Input
                                type="number"
                                min="0"
                                step="100"
                                value={formData.creditLimit || ""}
                                onChange={(e) => handleChange("creditLimit", e.target.value ? parseFloat(e.target.value) : null)}
                                placeholder="0.00"
                                className="mt-1"
                            />
                        </div>
                    </div>

                    {/* Botones */}
                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={saving || lookingUp}>
                            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            {editClient?.id ? "Guardar Cambios" : "Crear Cliente"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

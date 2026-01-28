"use client";

import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { UnitManager, UnitOfMeasure } from "./UnitManager";
import { CategoryManager } from "./CategoryManager";
import { BarcodeScanner } from "./BarcodeScanner";
import {
    Loader2,
    Barcode,
    ChevronDown,
    ChevronUp,
    FolderOpen,
    Plus
} from "lucide-react";

interface Category {
    id: string;
    name: string;
    color?: string;
}

interface ProductFormData {
    id?: string;
    code: string;
    name: string;
    description: string;
    price: number;
    cost: number;
    stock: number;
    minStock: number;
    maxStock: number | null;
    unit: string;
    categoryId: string;
    reorderPoint: number | null;
    preferredVendor: string;
    image: string;
    unitsOfMeasure: UnitOfMeasure[];
}

interface ProductFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    editProduct?: ProductFormData | null;
    initialCode?: string;
}

const emptyProduct: ProductFormData = {
    code: "",
    name: "",
    description: "",
    price: 0,
    cost: 0,
    stock: 0,
    minStock: 5,
    maxStock: null,
    unit: "UND",
    categoryId: "",
    reorderPoint: null,
    preferredVendor: "",
    image: "",
    unitsOfMeasure: []
};

export function ProductForm({ isOpen, onClose, onSave, editProduct, initialCode }: ProductFormProps) {
    const [formData, setFormData] = useState<ProductFormData>(emptyProduct);
    const [categories, setCategories] = useState<Category[]>([]);
    const [saving, setSaving] = useState(false);
    const [showUnits, setShowUnits] = useState(false);
    const [showScanner, setShowScanner] = useState(false);
    const [showCategoryManager, setShowCategoryManager] = useState(false);

    const isEditing = !!editProduct?.id;

    // Fetch categories
    const fetchCategories = useCallback(async () => {
        try {
            const res = await fetch("/api/categories");
            if (res.ok) {
                const data = await res.json();
                setCategories(data);
            }
        } catch (error) {
            console.error("Error fetching categories:", error);
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            fetchCategories();

            if (editProduct) {
                setFormData(editProduct);
            } else {
                setFormData({
                    ...emptyProduct,
                    code: initialCode || ""
                });
            }
        }
    }, [isOpen, editProduct, initialCode, fetchCategories]);

    const handleChange = (field: keyof ProductFormData, value: unknown) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleScan = (code: string) => {
        handleChange("code", code);
        setShowScanner(false);
    };

    const handleCategorySelect = (category: Category) => {
        handleChange("categoryId", category.id);
        setShowCategoryManager(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validaciones
        if (!formData.code || !formData.name || !formData.categoryId) {
            alert("Código, nombre y categoría son requeridos");
            return;
        }

        try {
            setSaving(true);

            const url = isEditing
                ? `/api/products/${editProduct?.id}`
                : "/api/products";

            const method = isEditing ? "PUT" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...formData,
                    price: Number(formData.price),
                    cost: Number(formData.cost),
                    stock: Number(formData.stock),
                    minStock: Number(formData.minStock),
                    maxStock: formData.maxStock ? Number(formData.maxStock) : null,
                    reorderPoint: formData.reorderPoint ? Number(formData.reorderPoint) : null
                })
            });

            if (res.ok) {
                onSave();
                onClose();
            } else {
                const error = await res.json();
                alert(error.error || "Error al guardar producto");
            }
        } catch (error) {
            console.error("Error saving product:", error);
            alert("Error al guardar producto");
        } finally {
            setSaving(false);
        }
    };

    const selectedCategory = categories.find(c => c.id === formData.categoryId);

    // Calcular margen
    const margin = formData.price && formData.cost
        ? (((formData.price - formData.cost) / formData.price) * 100).toFixed(1)
        : "0.0";

    return (
        <>
            <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {isEditing ? "Editar Producto" : "Nuevo Producto"}
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Código */}
                        <div>
                            <Label htmlFor="code">Código / SKU *</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="code"
                                    value={formData.code}
                                    onChange={(e) => handleChange("code", e.target.value)}
                                    placeholder="Código de barras o SKU"
                                    disabled={isEditing}
                                    className="flex-1"
                                />
                                {!isEditing && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setShowScanner(true)}
                                    >
                                        <Barcode className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Nombre y Categoría */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="name">Nombre *</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => handleChange("name", e.target.value)}
                                    placeholder="Nombre del producto"
                                />
                            </div>
                            <div>
                                <Label>Categoría *</Label>
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="flex-1 justify-start"
                                        onClick={() => setShowCategoryManager(true)}
                                    >
                                        {selectedCategory ? (
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="w-3 h-3 rounded-full"
                                                    style={{ backgroundColor: selectedCategory.color || "#6b7280" }}
                                                />
                                                {selectedCategory.name}
                                            </div>
                                        ) : (
                                            <span className="text-muted-foreground">Seleccionar...</span>
                                        )}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        onClick={() => setShowCategoryManager(true)}
                                    >
                                        <FolderOpen className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Descripción */}
                        <div>
                            <Label htmlFor="description">Descripción</Label>
                            <Input
                                id="description"
                                value={formData.description}
                                onChange={(e) => handleChange("description", e.target.value)}
                                placeholder="Descripción del producto (opcional)"
                            />
                        </div>

                        <Separator />

                        {/* Precios */}
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <Label htmlFor="cost">Costo (S/) *</Label>
                                <Input
                                    id="cost"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.cost}
                                    onChange={(e) => handleChange("cost", e.target.value)}
                                    placeholder="0.00"
                                />
                            </div>
                            <div>
                                <Label htmlFor="price">Precio Venta (S/) *</Label>
                                <Input
                                    id="price"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.price}
                                    onChange={(e) => handleChange("price", e.target.value)}
                                    placeholder="0.00"
                                />
                            </div>
                            <div>
                                <Label>Margen</Label>
                                <div className="h-9 flex items-center">
                                    <Badge
                                        variant={Number(margin) >= 20 ? "default" : "destructive"}
                                        className="text-sm"
                                    >
                                        {margin}%
                                    </Badge>
                                </div>
                            </div>
                        </div>

                        {/* Stock */}
                        <div className="grid grid-cols-4 gap-4">
                            <div>
                                <Label htmlFor="stock">Stock Actual</Label>
                                <Input
                                    id="stock"
                                    type="number"
                                    min="0"
                                    value={formData.stock}
                                    onChange={(e) => handleChange("stock", e.target.value)}
                                />
                            </div>
                            <div>
                                <Label htmlFor="minStock">Stock Mínimo</Label>
                                <Input
                                    id="minStock"
                                    type="number"
                                    min="0"
                                    value={formData.minStock}
                                    onChange={(e) => handleChange("minStock", e.target.value)}
                                />
                            </div>
                            <div>
                                <Label htmlFor="reorderPoint">Punto Reorden</Label>
                                <Input
                                    id="reorderPoint"
                                    type="number"
                                    min="0"
                                    value={formData.reorderPoint || ""}
                                    onChange={(e) => handleChange("reorderPoint", e.target.value ? Number(e.target.value) : null)}
                                    placeholder="Opcional"
                                />
                            </div>
                            <div>
                                <Label htmlFor="unit">Unidad Base</Label>
                                <Input
                                    id="unit"
                                    value={formData.unit}
                                    onChange={(e) => handleChange("unit", e.target.value.toUpperCase())}
                                    placeholder="UND"
                                    maxLength={5}
                                />
                            </div>
                        </div>

                        {/* Proveedor */}
                        <div>
                            <Label htmlFor="preferredVendor">Proveedor Preferido</Label>
                            <Input
                                id="preferredVendor"
                                value={formData.preferredVendor}
                                onChange={(e) => handleChange("preferredVendor", e.target.value)}
                                placeholder="Nombre del proveedor (opcional)"
                            />
                        </div>

                        <Separator />

                        {/* Unidades de Medida (colapsable) */}
                        <div className="border rounded-lg">
                            <Button
                                type="button"
                                variant="ghost"
                                className="w-full justify-between p-4"
                                onClick={() => setShowUnits(!showUnits)}
                            >
                                <span className="flex items-center gap-2">
                                    <Plus className="h-4 w-4" />
                                    Unidades de Medida
                                    {formData.unitsOfMeasure.length > 0 && (
                                        <Badge variant="secondary">{formData.unitsOfMeasure.length}</Badge>
                                    )}
                                </span>
                                {showUnits ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>

                            {showUnits && (
                                <div className="p-4 pt-0">
                                    <UnitManager
                                        units={formData.unitsOfMeasure}
                                        baseUnit={formData.unit || "UND"}
                                        basePrice={Number(formData.price) || 0}
                                        onChange={(units) => handleChange("unitsOfMeasure", units)}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Botones */}
                        <div className="flex gap-3 justify-end pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onClose}
                                disabled={saving}
                            >
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={saving}>
                                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                {isEditing ? "Actualizar" : "Crear Producto"}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modales secundarios */}
            <BarcodeScanner
                isOpen={showScanner}
                onClose={() => setShowScanner(false)}
                onScan={handleScan}
            />

            <CategoryManager
                isOpen={showCategoryManager}
                onClose={() => setShowCategoryManager(false)}
                onSelect={handleCategorySelect}
            />
        </>
    );
}

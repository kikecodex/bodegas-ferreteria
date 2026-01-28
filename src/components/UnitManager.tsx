"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Star, Barcode } from "lucide-react";

export interface UnitOfMeasure {
    id?: string;
    name: string;
    abbreviation: string;
    conversionFactor: number;
    price: number;
    barcode?: string;
    isDefault: boolean;
}

interface UnitManagerProps {
    units: UnitOfMeasure[];
    baseUnit: string;
    basePrice: number;
    onChange: (units: UnitOfMeasure[]) => void;
}

export function UnitManager({ units, baseUnit, basePrice, onChange }: UnitManagerProps) {
    const [isAdding, setIsAdding] = useState(false);
    const [newUnit, setNewUnit] = useState<Partial<UnitOfMeasure>>({
        name: "",
        abbreviation: "",
        conversionFactor: 1,
        price: 0,
        barcode: "",
        isDefault: false
    });

    // Asegurar que siempre existe la unidad base
    const allUnits = units.length === 0 ? [{
        name: "Unidad",
        abbreviation: baseUnit,
        conversionFactor: 1,
        price: basePrice,
        isDefault: true
    }] : units;

    const handleAddUnit = () => {
        if (!newUnit.name || !newUnit.abbreviation || !newUnit.conversionFactor) {
            return;
        }

        // Verificar que no exista la misma abreviación
        if (allUnits.find(u => u.abbreviation === newUnit.abbreviation)) {
            alert("Ya existe una unidad con esa abreviación");
            return;
        }

        const unit: UnitOfMeasure = {
            name: newUnit.name!,
            abbreviation: newUnit.abbreviation!.toUpperCase(),
            conversionFactor: Number(newUnit.conversionFactor),
            price: Number(newUnit.price) || 0,
            barcode: newUnit.barcode || undefined,
            isDefault: false
        };

        onChange([...allUnits, unit]);
        setNewUnit({
            name: "",
            abbreviation: "",
            conversionFactor: 1,
            price: 0,
            barcode: "",
            isDefault: false
        });
        setIsAdding(false);
    };

    const handleRemoveUnit = (index: number) => {
        const unit = allUnits[index];
        if (unit.isDefault) {
            alert("No se puede eliminar la unidad base");
            return;
        }

        const updated = allUnits.filter((_, i) => i !== index);
        onChange(updated);
    };

    const handleSetDefault = (index: number) => {
        const updated = allUnits.map((u, i) => ({
            ...u,
            isDefault: i === index
        }));
        onChange(updated);
    };

    // Sugerir precio basado en factor
    const suggestPrice = (factor: number) => {
        return (basePrice * factor * 0.95).toFixed(2); // 5% descuento por volumen
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Unidades de Medida</Label>
                {!isAdding && (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsAdding(true)}
                    >
                        <Plus className="h-4 w-4 mr-1" />
                        Agregar
                    </Button>
                )}
            </div>

            {/* Lista de unidades */}
            <div className="space-y-2">
                {allUnits.map((unit, index) => (
                    <div
                        key={unit.abbreviation}
                        className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border"
                    >
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="font-medium">{unit.name}</span>
                                <Badge variant="outline" className="text-xs">
                                    {unit.abbreviation}
                                </Badge>
                                {unit.isDefault && (
                                    <Badge className="text-xs bg-primary">
                                        <Star className="h-3 w-3 mr-1" />
                                        Default
                                    </Badge>
                                )}
                            </div>
                            <div className="text-sm text-muted-foreground flex gap-3">
                                <span>×{unit.conversionFactor} unidades</span>
                                <span>S/ {unit.price.toFixed(2)}</span>
                                {unit.barcode && (
                                    <span className="flex items-center gap-1">
                                        <Barcode className="h-3 w-3" />
                                        {unit.barcode}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-1">
                            {!unit.isDefault && (
                                <>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => handleSetDefault(index)}
                                        title="Marcar como default"
                                    >
                                        <Star className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-red-500 hover:text-red-600"
                                        onClick={() => handleRemoveUnit(index)}
                                        title="Eliminar"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Formulario para agregar */}
            {isAdding && (
                <div className="p-3 rounded-lg border-2 border-dashed border-primary/50 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label className="text-xs">Nombre</Label>
                            <Input
                                placeholder="Ej: Caja, Docena"
                                value={newUnit.name}
                                onChange={(e) => setNewUnit({ ...newUnit, name: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label className="text-xs">Abreviación</Label>
                            <Input
                                placeholder="Ej: CJA, DOC"
                                value={newUnit.abbreviation}
                                onChange={(e) => setNewUnit({ ...newUnit, abbreviation: e.target.value.toUpperCase() })}
                                maxLength={5}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <Label className="text-xs">Factor (×unidades)</Label>
                            <Input
                                type="number"
                                min="1"
                                placeholder="12"
                                value={newUnit.conversionFactor}
                                onChange={(e) => {
                                    const factor = Number(e.target.value);
                                    setNewUnit({
                                        ...newUnit,
                                        conversionFactor: factor,
                                        price: Number(suggestPrice(factor))
                                    });
                                }}
                            />
                        </div>
                        <div>
                            <Label className="text-xs">Precio (S/)</Label>
                            <Input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                value={newUnit.price}
                                onChange={(e) => setNewUnit({ ...newUnit, price: Number(e.target.value) })}
                            />
                        </div>
                        <div>
                            <Label className="text-xs">Código de barras</Label>
                            <Input
                                placeholder="Opcional"
                                value={newUnit.barcode}
                                onChange={(e) => setNewUnit({ ...newUnit, barcode: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="flex gap-2 justify-end">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setIsAdding(false)}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            onClick={handleAddUnit}
                            disabled={!newUnit.name || !newUnit.abbreviation}
                        >
                            Agregar Unidad
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

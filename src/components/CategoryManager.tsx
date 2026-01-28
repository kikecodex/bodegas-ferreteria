"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";

interface Category {
    id: string;
    name: string;
    description?: string;
    color?: string;
    icon?: string;
    isActive: boolean;
    _count?: { products: number };
}

interface CategoryManagerProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect?: (category: Category) => void;
}

export function CategoryManager({ isOpen, onClose, onSelect }: CategoryManagerProps) {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");
    const [editDescription, setEditDescription] = useState("");
    const [editColor, setEditColor] = useState("#6b7280");
    const [isCreating, setIsCreating] = useState(false);
    const [newName, setNewName] = useState("");
    const [newDescription, setNewDescription] = useState("");
    const [newColor, setNewColor] = useState("#6b7280");

    const fetchCategories = async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/categories");
            if (res.ok) {
                const data = await res.json();
                setCategories(data);
            }
        } catch (error) {
            console.error("Error fetching categories:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchCategories();
        }
    }, [isOpen]);

    const handleCreate = async () => {
        if (!newName.trim()) return;

        try {
            setSaving(true);
            const res = await fetch("/api/categories", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: newName.trim(),
                    description: newDescription.trim() || null,
                    color: newColor
                })
            });

            if (res.ok) {
                setNewName("");
                setNewDescription("");
                setNewColor("#6b7280");
                setIsCreating(false);
                fetchCategories();
            } else {
                const error = await res.json();
                alert(error.error || "Error al crear categoría");
            }
        } catch (error) {
            console.error("Error creating category:", error);
        } finally {
            setSaving(false);
        }
    };

    const handleUpdate = async (id: string) => {
        if (!editName.trim()) return;

        try {
            setSaving(true);
            const res = await fetch(`/api/categories/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: editName.trim(),
                    description: editDescription.trim() || null,
                    color: editColor
                })
            });

            if (res.ok) {
                setEditingId(null);
                fetchCategories();
            } else {
                const error = await res.json();
                alert(error.error || "Error al actualizar categoría");
            }
        } catch (error) {
            console.error("Error updating category:", error);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        const category = categories.find(c => c.id === id);
        if (category?._count?.products && category._count.products > 0) {
            alert(`No se puede eliminar: tiene ${category._count.products} productos asociados`);
            return;
        }

        if (!confirm("¿Eliminar esta categoría?")) return;

        try {
            const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
            if (res.ok) {
                fetchCategories();
            } else {
                const error = await res.json();
                alert(error.error || "Error al eliminar categoría");
            }
        } catch (error) {
            console.error("Error deleting category:", error);
        }
    };

    const startEditing = (category: Category) => {
        setEditingId(category.id);
        setEditName(category.name);
        setEditDescription(category.description || "");
        setEditColor(category.color || "#6b7280");
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Gestión de Categorías</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Botón crear */}
                    {!isCreating && (
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => setIsCreating(true)}
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Nueva Categoría
                        </Button>
                    )}

                    {/* Formulario crear */}
                    {isCreating && (
                        <div className="p-3 rounded-lg border-2 border-dashed border-primary/50 space-y-3">
                            <div>
                                <Label className="text-xs">Nombre</Label>
                                <Input
                                    placeholder="Nombre de la categoría"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            <div>
                                <Label className="text-xs">Descripción (opcional)</Label>
                                <Input
                                    placeholder="Descripción breve"
                                    value={newDescription}
                                    onChange={(e) => setNewDescription(e.target.value)}
                                />
                            </div>
                            <div>
                                <Label className="text-xs">Color</Label>
                                <div className="flex gap-2">
                                    <input
                                        type="color"
                                        value={newColor}
                                        onChange={(e) => setNewColor(e.target.value)}
                                        className="h-9 w-12 rounded cursor-pointer"
                                    />
                                    <Input
                                        value={newColor}
                                        onChange={(e) => setNewColor(e.target.value)}
                                        className="flex-1"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-2 justify-end">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsCreating(false)}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={handleCreate}
                                    disabled={!newName.trim() || saving}
                                >
                                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                    Crear
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Lista de categorías */}
                    {loading ? (
                        <div className="text-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {categories.map((category) => (
                                <div
                                    key={category.id}
                                    className="p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                                >
                                    {editingId === category.id ? (
                                        // Modo edición
                                        <div className="space-y-2">
                                            <Input
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                autoFocus
                                            />
                                            <Input
                                                placeholder="Descripción"
                                                value={editDescription}
                                                onChange={(e) => setEditDescription(e.target.value)}
                                            />
                                            <div className="flex gap-2">
                                                <input
                                                    type="color"
                                                    value={editColor}
                                                    onChange={(e) => setEditColor(e.target.value)}
                                                    className="h-9 w-12 rounded cursor-pointer"
                                                />
                                                <div className="flex-1 flex gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setEditingId(null)}
                                                    >
                                                        Cancelar
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleUpdate(category.id)}
                                                        disabled={!editName.trim() || saving}
                                                    >
                                                        {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                                        Guardar
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        // Modo visualización
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="w-4 h-4 rounded-full flex-shrink-0"
                                                style={{ backgroundColor: category.color || "#6b7280" }}
                                            />
                                            <div
                                                className="flex-1 cursor-pointer"
                                                onClick={() => onSelect?.(category)}
                                            >
                                                <div className="font-medium">{category.name}</div>
                                                {category.description && (
                                                    <div className="text-sm text-muted-foreground">
                                                        {category.description}
                                                    </div>
                                                )}
                                            </div>
                                            <Badge variant="outline" className="text-xs">
                                                {category._count?.products || 0} productos
                                            </Badge>
                                            <div className="flex gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={() => startEditing(category)}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-red-500 hover:text-red-600"
                                                    onClick={() => handleDelete(category.id)}
                                                    disabled={(category._count?.products || 0) > 0}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}

                            {categories.length === 0 && (
                                <p className="text-center text-muted-foreground py-4">
                                    No hay categorías. Crea la primera.
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

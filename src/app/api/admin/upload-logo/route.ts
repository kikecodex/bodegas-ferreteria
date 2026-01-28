import { NextRequest, NextResponse } from "next/server";
import { isSuperAdmin } from "@/lib/tenant-context";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

// POST /api/admin/upload-logo - Subir logo de tenant
export async function POST(request: NextRequest) {
    try {
        const isAdmin = await isSuperAdmin();

        if (!isAdmin) {
            return NextResponse.json(
                { error: "No autorizado" },
                { status: 403 }
            );
        }

        const formData = await request.formData();
        const file = formData.get("file") as File;
        const tenantId = formData.get("tenantId") as string;

        if (!file) {
            return NextResponse.json(
                { error: "No se proporcionó archivo" },
                { status: 400 }
            );
        }

        // Validar formato
        const validTypes = ["image/jpeg", "image/png", "image/webp"];
        if (!validTypes.includes(file.type)) {
            return NextResponse.json(
                { error: "Formato no válido. Use JPG, PNG o WEBP" },
                { status: 400 }
            );
        }

        // Validar tamaño (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            return NextResponse.json(
                { error: "El archivo es muy grande. Máximo 2MB" },
                { status: 400 }
            );
        }

        // Crear directorio si no existe
        const uploadDir = path.join(process.cwd(), "public", "uploads", "logos");
        await mkdir(uploadDir, { recursive: true });

        // Generar nombre de archivo
        const ext = file.name.split(".").pop();
        const fileName = tenantId
            ? `${tenantId}.${ext}`
            : `temp_${Date.now()}.${ext}`;
        const filePath = path.join(uploadDir, fileName);

        // Guardar archivo
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        await writeFile(filePath, buffer);

        const logoUrl = `/uploads/logos/${fileName}`;

        return NextResponse.json({
            success: true,
            logoUrl,
            fileName
        });
    } catch (error) {
        console.error("Error uploading logo:", error);
        return NextResponse.json(
            { error: "Error al subir logo" },
            { status: 500 }
        );
    }
}

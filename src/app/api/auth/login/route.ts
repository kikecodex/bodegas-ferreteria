import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// POST /api/auth/login - Iniciar sesión
export async function POST(request: NextRequest) {
    try {
        const { email, password } = await request.json();

        if (!email || !password) {
            return NextResponse.json(
                { error: "Email y contraseña son requeridos" },
                { status: 400 }
            );
        }

        // Buscar usuario
        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() }
        });

        if (!user || !user.isActive) {
            return NextResponse.json(
                { error: "Credenciales inválidas" },
                { status: 401 }
            );
        }

        // Verificar contraseña
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return NextResponse.json(
                { error: "Credenciales inválidas" },
                { status: 401 }
            );
        }

        // Crear sesión
        const sessionToken = crypto.randomUUID();
        const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 días

        await prisma.session.create({
            data: {
                sessionToken,
                userId: user.id,
                expires
            }
        });

        // Crear respuesta con cookie
        const response = NextResponse.json({
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                avatar: user.avatar
            }
        });

        response.cookies.set("session-token", sessionToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            expires,
            path: "/"
        });

        return response;
    } catch (error) {
        console.error("Error en login:", error);
        return NextResponse.json(
            { error: "Error al iniciar sesión" },
            { status: 500 }
        );
    }
}

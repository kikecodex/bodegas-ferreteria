import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Rutas públicas que no requieren autenticación
const publicPaths = [
    "/login",
    "/register",      // Registro de nuevos negocios
    "/api/auth/login",
    "/api/auth/logout",
    "/api/auth/register", // API de registro
    "/api/seed",       // Para desarrollo
    "/api/seed-superadmin",
    "/api/seed-bodega",
    "/api/fix-admin",
    "/api/fix-tenant",
];

// Rutas de admin (solo SUPERADMIN)
const adminPaths = [
    "/admin",
    "/api/admin"
];

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Permitir rutas públicas
    if (publicPaths.some(path => pathname.startsWith(path))) {
        return NextResponse.next();
    }

    // Permitir archivos estáticos
    if (
        pathname.startsWith("/_next") ||
        pathname.startsWith("/favicon") ||
        pathname.includes(".")
    ) {
        return NextResponse.next();
    }

    // Verificar sesión
    const sessionToken = request.cookies.get("session-token")?.value;

    if (!sessionToken) {
        // Para APIs, retornar 401
        if (pathname.startsWith("/api/")) {
            return NextResponse.json(
                { error: "No autenticado" },
                { status: 401 }
            );
        }

        // Para páginas, redirigir a login
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("redirect", pathname);
        return NextResponse.redirect(loginUrl);
    }

    // Para rutas de admin, la validación de SUPERADMIN se hace en las API routes
    // porque el middleware de Edge no puede hacer queries a la DB

    // Agregar header con el session token para facilitar acceso en APIs
    const response = NextResponse.next();
    response.headers.set("x-session-token", sessionToken);

    return response;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        "/((?!_next/static|_next/image|favicon.ico).*)"
    ]
};

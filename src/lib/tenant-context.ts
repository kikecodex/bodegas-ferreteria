// src/lib/tenant-context.ts
// Contexto de tenant para operaciones multi-tenant

import { cookies } from "next/headers";
import { prisma } from "./prisma";

// Tipo para el contexto de tenant
export interface TenantContext {
    tenantId: string;
    tenantSlug: string;
    tenantName: string;
    plan: string;
    isActive: boolean;
}

/**
 * Obtiene el tenantId del usuario autenticado
 */
export async function getTenantFromSession(): Promise<TenantContext | null> {
    try {
        const cookieStore = await cookies();
        const sessionToken = cookieStore.get("session-token")?.value;

        if (!sessionToken) {
            return null;
        }

        const session = await prisma.session.findUnique({
            where: { sessionToken },
            include: {
                user: {
                    select: {
                        tenantId: true,
                        tenant: {
                            select: {
                                id: true,
                                slug: true,
                                name: true,
                                plan: true,
                                isActive: true,
                                planExpiresAt: true,
                            }
                        }
                    }
                }
            }
        });

        if (!session?.user?.tenant) {
            return null;
        }

        const { tenant } = session.user;

        // Verificar si el tenant está activo
        if (!tenant.isActive) {
            return null;
        }

        // Verificar si el plan no ha expirado
        if (tenant.planExpiresAt && new Date(tenant.planExpiresAt) < new Date()) {
            return null;
        }

        return {
            tenantId: tenant.id,
            tenantSlug: tenant.slug,
            tenantName: tenant.name,
            plan: tenant.plan,
            isActive: tenant.isActive,
        };
    } catch (error) {
        console.error("Error getting tenant context:", error);
        return null;
    }
}

/**
 * Obtiene el tenantId o lanza error si no existe
 */
export async function requireTenant(): Promise<TenantContext> {
    const tenant = await getTenantFromSession();

    if (!tenant) {
        throw new Error("Tenant context required");
    }

    return tenant;
}

/**
 * Helper para agregar filtro de tenant a queries Prisma
 */
export function withTenantFilter<T extends { tenantId?: string }>(
    where: T,
    tenantId: string
): T & { tenantId: string } {
    return {
        ...where,
        tenantId,
    };
}

/**
 * Verifica si un usuario es SuperAdmin (no tiene tenant, manejará todos)
 */
// Tipo para el contexto de usuario
export interface UserContext {
    id: string;
    name: string;
    role: string;
    tenantId: string | null;
}

/**
 * Obtiene el usuario autenticado de la sesión
 */
export async function getUserFromSession(): Promise<UserContext | null> {
    try {
        const cookieStore = await cookies();
        const sessionToken = cookieStore.get("session-token")?.value;

        if (!sessionToken) {
            return null;
        }

        const session = await prisma.session.findUnique({
            where: { sessionToken },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        role: true,
                        tenantId: true,
                    }
                }
            }
        });

        if (!session?.user) {
            return null;
        }

        return {
            id: session.user.id,
            name: session.user.name || "Usuario",
            role: session.user.role,
            tenantId: session.user.tenantId,
        };
    } catch (error) {
        console.error("Error getting user from session:", error);
        return null;
    }
}

export async function isSuperAdmin(): Promise<boolean> {
    try {
        const cookieStore = await cookies();
        const sessionToken = cookieStore.get("session-token")?.value;

        if (!sessionToken) {
            return false;
        }

        const session = await prisma.session.findUnique({
            where: { sessionToken },
            include: {
                user: {
                    select: {
                        role: true,
                        tenantId: true,
                    }
                }
            }
        });

        // SuperAdmin no tiene tenantId y tiene rol SUPERADMIN
        return session?.user?.role === "SUPERADMIN" && !session?.user?.tenantId;
    } catch {
        return false;
    }
}

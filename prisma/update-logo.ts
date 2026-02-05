import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateLogo() {
    try {
        // Listar todos los tenants primero
        const allTenants = await prisma.tenant.findMany({
            select: { id: true, name: true, slug: true, logo: true }
        });
        console.log('Tenants existentes:', allTenants);

        // Actualizar todos los tenants que contengan "oropez" en el nombre o slug
        const result = await prisma.tenant.updateMany({
            where: {
                OR: [
                    { slug: { contains: 'oropez', mode: 'insensitive' } },
                    { name: { contains: 'oropez', mode: 'insensitive' } }
                ]
            },
            data: {
                logo: '/uploads/logos/oropeza-logo.jpeg'
            }
        });

        console.log(`Actualizados ${result.count} tenant(s) con el logo`);

        // Mostrar tenants actualizados
        const updatedTenants = await prisma.tenant.findMany({
            where: {
                logo: '/uploads/logos/oropeza-logo.jpeg'
            },
            select: { id: true, name: true, slug: true, logo: true }
        });

        console.log('Tenants con logo:', updatedTenants);
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

updateLogo();

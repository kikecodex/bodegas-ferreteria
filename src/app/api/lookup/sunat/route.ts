import { NextRequest, NextResponse } from "next/server";

// API para consultar DNI/RUC desde SUNAT/RENIEC
// Usa Migo.pe como proveedor principal

// GET /api/lookup/sunat?type=ruc&number=20123456789
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get("type"); // "dni" o "ruc"
        const number = searchParams.get("number");

        if (!type || !number) {
            return NextResponse.json(
                { error: "type y number son requeridos" },
                { status: 400 }
            );
        }

        // Validar formato
        const numberTrimmed = number.trim();

        if (type === "dni" && !/^\d{8}$/.test(numberTrimmed)) {
            return NextResponse.json(
                { error: "DNI debe tener 8 dígitos" },
                { status: 400 }
            );
        }

        if (type === "ruc" && !/^(10|20)\d{9}$/.test(numberTrimmed)) {
            return NextResponse.json(
                { error: "RUC debe tener 11 dígitos y empezar con 10 o 20" },
                { status: 400 }
            );
        }

        // Obtener token de Migo
        const token = process.env.MIGO_API_TOKEN;

        if (!token) {
            return NextResponse.json({
                found: false,
                type,
                number: numberTrimmed,
                message: "Token no configurado. Configure MIGO_API_TOKEN en .env"
            });
        }

        // Consultar Migo API
        const result = await queryMigoAPI(type, numberTrimmed, token);
        return result;

    } catch (error) {
        console.error("Error in SUNAT/RENIEC lookup:", error);
        return NextResponse.json(
            { error: "Error al consultar documento", found: false },
            { status: 500 }
        );
    }
}

// Consultar Migo.pe API
async function queryMigoAPI(type: string, number: string, token: string) {
    try {
        const apiUrl = type === "ruc"
            ? "https://api.migo.pe/api/v1/ruc"
            : "https://api.migo.pe/api/v1/dni";

        const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                token: token,
                [type]: number
            })
        });

        const data = await response.json();

        console.log("Migo API response:", JSON.stringify(data));

        if (!response.ok || !data.success) {
            return NextResponse.json({
                found: false,
                type,
                number,
                message: data.message || "No encontrado en SUNAT/RENIEC"
            });
        }

        if (type === "ruc") {
            return NextResponse.json({
                found: true,
                type: "ruc",
                number: data.ruc || number,
                name: data.nombre_o_razon_social || "",
                address: data.direccion || data.direccion_completa || "",
                status: data.estado || "",
                condition: data.condicion || "",
                location: {
                    department: data.departamento || "",
                    province: data.provincia || "",
                    district: data.distrito || ""
                }
            });
        } else {
            // DNI
            const fullName = data.nombre || [
                data.nombres,
                data.apellido_paterno,
                data.apellido_materno
            ].filter(Boolean).join(" ");

            return NextResponse.json({
                found: true,
                type: "dni",
                number: data.dni || number,
                name: fullName,
                firstName: data.nombres || "",
                lastName: `${data.apellido_paterno || ""} ${data.apellido_materno || ""}`.trim()
            });
        }
    } catch (error) {
        console.error("Migo API error:", error);
        return NextResponse.json({
            found: false,
            type,
            number,
            message: "Error al consultar Migo API"
        });
    }
}

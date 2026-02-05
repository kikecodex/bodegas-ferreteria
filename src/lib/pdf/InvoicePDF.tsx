// PDF Component for Invoice Generation (Server-side)

import {
    Document,
    Page,
    Text,
    View,
    Image,
    StyleSheet
} from "@react-pdf/renderer";

// Tipos
interface SaleItem {
    productCode: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    subtotal: number;
}

interface Client {
    documentType: string;
    document: string;
    name: string;
    address?: string;
}

interface Sale {
    number: string;
    documentType: string;
    documentNumber?: string;
    createdAt: string;
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
    paymentMethod: string;
    items: SaleItem[];
    client?: Client;
}

interface CompanyInfo {
    name: string;
    ruc: string;
    address: string;
    phone: string;
    email?: string;
    logo?: string;
}

interface InvoicePDFProps {
    sale: Sale;
    company: CompanyInfo;
}

// Formato ticket POS: 72.1mm x 297mm (aprox 204.3 x 841.8 puntos)
const TICKET_WIDTH = 204.3;

// Estilos OPTIMIZADOS para impresora térmica POS-80
const styles = StyleSheet.create({
    page: {
        padding: 8,
        fontSize: 9,  // Aumentado de 7 a 9
        fontFamily: "Helvetica-Bold",  // Bold para mejor legibilidad
        width: TICKET_WIDTH,
        color: "#000000"  // Negro puro
    },
    // Logo centrado arriba con línea debajo
    logoContainer: {
        alignItems: "center",
        marginBottom: 6,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: "#000"
    },
    logo: {
        width: 188,  // Ancho casi completo del papel (72mm - padding)
        height: "auto",
        marginBottom: 4
    },
    // Datos de empresa
    companySection: {
        alignItems: "center",
        marginBottom: 6,
        paddingBottom: 4,
        borderBottomWidth: 1,
        borderBottomColor: "#000"
    },
    companyName: {
        fontSize: 10,  // Aumentado de 8 a 10
        fontWeight: "bold",
        textAlign: "center",
        marginBottom: 2
    },
    companyInfo: {
        fontSize: 8,  // Aumentado de 6 a 8
        textAlign: "center",
        marginBottom: 1
    },
    // Tipo de documento
    documentSection: {
        alignItems: "center",
        marginBottom: 6,
        paddingVertical: 4
    },
    documentType: {
        fontSize: 10,  // Aumentado de 8 a 10
        fontWeight: "bold",
        textAlign: "center",
        marginBottom: 2
    },
    documentNumber: {
        fontSize: 10,  // Aumentado de 8 a 10
        fontWeight: "bold"
    },
    // Fechas
    infoSection: {
        marginBottom: 6,
        fontSize: 8  // Aumentado de 6 a 8
    },
    infoRow: {
        flexDirection: "row",
        marginBottom: 1
    },
    infoLabel: {
        width: 60
    },
    infoValue: {
        flex: 1
    },
    // Separador
    separator: {
        borderBottomWidth: 1,
        borderBottomStyle: "dashed",
        borderBottomColor: "#000",
        marginVertical: 4
    },
    // Tabla de items
    tableHeader: {
        flexDirection: "row",
        borderBottomWidth: 1,
        borderBottomColor: "#000",
        paddingBottom: 2,
        marginBottom: 4,
        fontWeight: "bold",
        fontSize: 8  // Aumentado de 6 a 8
    },
    colCant: { width: 25, textAlign: "center" },
    colProducto: { flex: 1 },
    colPrecio: { width: 35, textAlign: "right" },
    colTotal: { width: 35, textAlign: "right" },
    tableRow: {
        flexDirection: "row",
        marginBottom: 2,
        fontSize: 8  // Aumentado de 6 a 8
    },
    // Totales estilo Oropeza
    totalsSection: {
        marginTop: 6,
        borderTopWidth: 1,
        borderTopStyle: "dashed",
        borderTopColor: "#000",
        paddingTop: 4
    },
    totalsRow: {
        flexDirection: "row",
        justifyContent: "flex-end",
        marginBottom: 1,
        fontSize: 8  // Aumentado de 6 a 8
    },
    totalsLabel: {
        width: 60,
        textAlign: "right",
        marginRight: 8
    },
    totalsValue: {
        width: 45,
        textAlign: "right"
    },
    totalFinalRow: {
        flexDirection: "row",
        justifyContent: "flex-end",
        marginTop: 2,
        paddingTop: 2,
        borderTopWidth: 1,
        borderTopColor: "#000"
    },
    totalFinalLabel: {
        width: 60,
        textAlign: "right",
        marginRight: 8,
        fontSize: 10,  // Aumentado de 8 a 10
        fontWeight: "bold"
    },
    totalFinalValue: {
        width: 45,
        textAlign: "right",
        fontSize: 10,  // Aumentado de 8 a 10
        fontWeight: "bold"
    },
    // Footer
    footer: {
        marginTop: 10,
        alignItems: "center"
    },
    thanksText: {
        fontSize: 9,  // Aumentado de 7 a 9
        fontWeight: "bold",
        textAlign: "center"
    }
});

// Formateo
const formatCurrency = (amount: number): string => amount.toFixed(2);

const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("es-PE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });
};

const formatDateTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("es-PE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    }) + " " + date.toLocaleTimeString("es-PE", {
        hour: "2-digit",
        minute: "2-digit"
    });
};

// Obtener nombre del tipo de documento
const getDocumentTypeName = (type: string): string => {
    switch (type) {
        case "FACTURA":
            return "FACTURA ELECTRONICA";
        case "NOTA_VENTA":
            return "NOTA DE VENTA";
        case "BOLETA":
        default:
            return "BOLETA DE VENTA ELECTRONICA";
    }
};

// Componente PDF Ticket - Modelo Oropeza
export function InvoicePDF({ sale, company }: InvoicePDFProps) {
    return (
        <Document>
            <Page size={[TICKET_WIDTH, 700]} style={styles.page}>
                {/* Logo B/N para impresoras térmicas */}
                {company.logo && (
                    <View style={styles.logoContainer}>
                        <Image src={company.logo} style={styles.logo} />
                    </View>
                )}

                {/* Datos de empresa */}
                <View style={styles.companySection}>
                    <Text style={styles.companyName}>CORPORACIÓN OROPEZA'S</Text>
                    <Text style={styles.companyInfo}>RUC: 10712870058</Text>
                    <Text style={styles.companyInfo}>YANAC LOPEZ CHRISTIAN FRANKLIN</Text>
                    <Text style={styles.companyInfo}>Dirección: Calle Marian s/n Independencia-Huaraz</Text>
                    <Text style={styles.companyInfo}>Cel: 938408777</Text>
                </View>

                {/* Tipo y Número de Documento */}
                <View style={styles.documentSection}>
                    <Text style={styles.documentType}>
                        {getDocumentTypeName(sale.documentType)}
                    </Text>
                    <Text style={styles.documentNumber}>
                        {sale.documentNumber || sale.number}
                    </Text>
                </View>

                {/* Fechas e info (como en el modelo) */}
                <View style={styles.infoSection}>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>F.EMISION:</Text>
                        <Text style={styles.infoValue}>{formatDate(sale.createdAt)}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>FORMA PAGO:</Text>
                        <Text style={styles.infoValue}>{sale.paymentMethod}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>F.IMPRESION:</Text>
                        <Text style={styles.infoValue}>{formatDateTime(sale.createdAt)}</Text>
                    </View>
                    {sale.client && (
                        <>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>{sale.client.documentType}:</Text>
                                <Text style={styles.infoValue}>{sale.client.document}</Text>
                            </View>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>CLIENTE:</Text>
                                <Text style={styles.infoValue}>{sale.client.name}</Text>
                            </View>
                        </>
                    )}
                </View>

                <View style={styles.separator} />

                {/* Encabezado de tabla */}
                <View style={styles.tableHeader}>
                    <Text style={styles.colCant}>CANT</Text>
                    <Text style={styles.colProducto}>PRODUCTO</Text>
                    <Text style={styles.colPrecio}>PRECIO</Text>
                    <Text style={styles.colTotal}>TOTAL</Text>
                </View>

                {/* Items */}
                {sale.items.map((item, index) => (
                    <View key={index} style={styles.tableRow}>
                        <Text style={styles.colCant}>{item.quantity}</Text>
                        <Text style={styles.colProducto}>{item.productName}</Text>
                        <Text style={styles.colPrecio}>{formatCurrency(item.unitPrice)}</Text>
                        <Text style={styles.colTotal}>{formatCurrency(item.subtotal)}</Text>
                    </View>
                ))}

                <View style={styles.separator} />

                {/* Totales (estilo Oropeza) */}
                <View style={styles.totalsSection}>
                    {sale.discount > 0 && (
                        <View style={styles.totalsRow}>
                            <Text style={styles.totalsLabel}>DESCUENTO:</Text>
                            <Text style={styles.totalsValue}>S/. {formatCurrency(sale.discount)}</Text>
                        </View>
                    )}
                    <View style={styles.totalsRow}>
                        <Text style={styles.totalsLabel}>SUBTOTAL:</Text>
                        <Text style={styles.totalsValue}>S/. {formatCurrency(sale.subtotal)}</Text>
                    </View>
                    <View style={styles.totalsRow}>
                        <Text style={styles.totalsLabel}>IGV:</Text>
                        <Text style={styles.totalsValue}>S/. {formatCurrency(sale.tax)}</Text>
                    </View>
                    <View style={styles.totalsRow}>
                        <Text style={styles.totalsLabel}>ICBPER:</Text>
                        <Text style={styles.totalsValue}>S/. 0.00</Text>
                    </View>
                    <View style={styles.totalFinalRow}>
                        <Text style={styles.totalFinalLabel}>TOTAL:</Text>
                        <Text style={styles.totalFinalValue}>S/. {formatCurrency(sale.total)}</Text>
                    </View>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={styles.thanksText}>Gracias por su preferencia</Text>
                </View>
            </Page>
        </Document>
    );
}

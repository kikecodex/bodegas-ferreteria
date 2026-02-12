// PDF Component for Quotation Generation (Server-side) - Formato Ticket POS
import {
    Document,
    Page,
    Text,
    View,
    Image,
    StyleSheet
} from "@react-pdf/renderer";

// Tipos
interface QuotationItem {
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

interface Quotation {
    number: string;
    createdAt: string;
    validUntil: string;
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
    notes?: string | null;
    items: QuotationItem[];
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

interface QuotationPDFProps {
    quotation: Quotation;
    company: CompanyInfo;
}

// Formato ticket POS: 72.1mm x 297mm (aprox 204.3 x 841.8 puntos)
const TICKET_WIDTH = 204.3;

// Estilos OPTIMIZADOS para impresora térmica POS-80 (igual que InvoicePDF)
const styles = StyleSheet.create({
    page: {
        paddingTop: 0,     // ← CERO margen arriba: logo pegado al borde del corte
        paddingLeft: 4,
        paddingRight: 4,
        paddingBottom: 4,
        marginTop: 0,
        fontSize: 9,
        fontFamily: "Helvetica-Bold",
        width: TICKET_WIDTH,
        color: "#000000"
    },
    logoContainer: {
        alignItems: "center",
        marginBottom: 0,
        paddingBottom: 0
    },
    logo: {
        width: 188,
        height: "auto",
        marginBottom: 0
    },
    companySection: {
        alignItems: "center",
        marginBottom: 4,
        paddingBottom: 3,
        borderBottomWidth: 1,
        borderBottomColor: "#000"
    },
    companyName: {
        fontSize: 10,
        fontWeight: "bold",
        textAlign: "center",
        marginBottom: 2
    },
    companyInfo: {
        fontSize: 8,
        textAlign: "center",
        marginBottom: 1
    },
    documentSection: {
        alignItems: "center",
        marginBottom: 6,
        paddingVertical: 4
    },
    documentType: {
        fontSize: 10,
        fontWeight: "bold",
        textAlign: "center",
        marginBottom: 2
    },
    documentNumber: {
        fontSize: 10,
        fontWeight: "bold"
    },
    infoSection: {
        marginBottom: 6,
        fontSize: 8
    },
    infoRow: {
        flexDirection: "row",
        marginBottom: 1
    },
    infoLabel: {
        width: 65
    },
    infoValue: {
        flex: 1
    },
    separator: {
        borderBottomWidth: 1,
        borderBottomStyle: "dashed",
        borderBottomColor: "#000",
        marginVertical: 4
    },
    tableHeader: {
        flexDirection: "row",
        borderBottomWidth: 1,
        borderBottomColor: "#000",
        paddingBottom: 2,
        marginBottom: 4,
        fontWeight: "bold",
        fontSize: 8
    },
    colCant: { width: 25, textAlign: "center" },
    colProducto: { flex: 1 },
    colPrecio: { width: 35, textAlign: "right" },
    colTotal: { width: 35, textAlign: "right" },
    tableRow: {
        flexDirection: "row",
        marginBottom: 2,
        fontSize: 8
    },
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
        fontSize: 8
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
        fontSize: 10,
        fontWeight: "bold"
    },
    totalFinalValue: {
        width: 45,
        textAlign: "right",
        fontSize: 10,
        fontWeight: "bold"
    },
    validitySection: {
        marginTop: 6,
        paddingTop: 4,
        borderTopWidth: 1,
        borderTopStyle: "dashed",
        borderTopColor: "#000",
        alignItems: "center"
    },
    validityText: {
        fontSize: 8,
        textAlign: "center"
    },
    footer: {
        marginTop: 10,
        alignItems: "center"
    },
    thanksText: {
        fontSize: 9,
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

// Componente PDF Cotización - Formato Ticket POS
export function QuotationPDF({ quotation, company }: QuotationPDFProps) {
    // Calcular subtotal e IGV correctamente desde el total
    // Total ya incluye IGV, así que: subtotal = total / 1.18, igv = total - subtotal
    const subtotalCalculado = quotation.total / 1.18;
    const igvCalculado = quotation.total - subtotalCalculado;

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
                    <Text style={styles.documentType}>COTIZACIÓN</Text>
                    <Text style={styles.documentNumber}>{quotation.number}</Text>
                </View>

                {/* Fechas e info */}
                <View style={styles.infoSection}>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>F.EMISION:</Text>
                        <Text style={styles.infoValue}>{formatDate(quotation.createdAt)}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>VÁLIDO:</Text>
                        <Text style={styles.infoValue}>{formatDate(quotation.validUntil)}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>F.IMPRESION:</Text>
                        <Text style={styles.infoValue}>{formatDateTime(new Date().toISOString())}</Text>
                    </View>
                    {quotation.client && (
                        <>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>{quotation.client.documentType}:</Text>
                                <Text style={styles.infoValue}>{quotation.client.document}</Text>
                            </View>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>CLIENTE:</Text>
                                <Text style={styles.infoValue}>{quotation.client.name}</Text>
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
                {quotation.items.map((item, index) => (
                    <View key={index} style={styles.tableRow}>
                        <Text style={styles.colCant}>{item.quantity}</Text>
                        <Text style={styles.colProducto}>{item.productName}</Text>
                        <Text style={styles.colPrecio}>{formatCurrency(item.unitPrice)}</Text>
                        <Text style={styles.colTotal}>{formatCurrency(item.subtotal)}</Text>
                    </View>
                ))}

                <View style={styles.separator} />

                {/* Totales (estilo Oropeza) - Cálculo correcto */}
                <View style={styles.totalsSection}>
                    {quotation.discount > 0 && (
                        <View style={styles.totalsRow}>
                            <Text style={styles.totalsLabel}>DESCUENTO:</Text>
                            <Text style={styles.totalsValue}>S/. {formatCurrency(quotation.discount)}</Text>
                        </View>
                    )}
                    <View style={styles.totalsRow}>
                        <Text style={styles.totalsLabel}>SUBTOTAL:</Text>
                        <Text style={styles.totalsValue}>S/. {formatCurrency(subtotalCalculado)}</Text>
                    </View>
                    <View style={styles.totalsRow}>
                        <Text style={styles.totalsLabel}>IGV (18%):</Text>
                        <Text style={styles.totalsValue}>S/. {formatCurrency(igvCalculado)}</Text>
                    </View>
                    <View style={styles.totalFinalRow}>
                        <Text style={styles.totalFinalLabel}>TOTAL:</Text>
                        <Text style={styles.totalFinalValue}>S/. {formatCurrency(quotation.total)}</Text>
                    </View>
                </View>

                {/* Validez */}
                <View style={styles.validitySection}>
                    <Text style={styles.validityText}>
                        Esta cotización es válida hasta el {formatDate(quotation.validUntil)}
                    </Text>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={styles.thanksText}>Gracias por su preferencia</Text>
                </View>
            </Page>
        </Document>
    );
}

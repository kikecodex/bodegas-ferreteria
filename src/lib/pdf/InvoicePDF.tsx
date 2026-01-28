import {
    Document,
    Page,
    Text,
    View,
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
}

interface InvoicePDFProps {
    sale: Sale;
    company: CompanyInfo;
}

// Estilos
const styles = StyleSheet.create({
    page: {
        padding: 40,
        fontSize: 10,
        fontFamily: "Helvetica"
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 20,
        paddingBottom: 15,
        borderBottomWidth: 2,
        borderBottomColor: "#dc2626"
    },
    companySection: {
        flex: 1
    },
    companyName: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#dc2626",
        marginBottom: 4
    },
    companyInfo: {
        fontSize: 9,
        color: "#666",
        marginBottom: 2
    },
    documentBox: {
        padding: 12,
        borderWidth: 2,
        borderColor: "#dc2626",
        borderRadius: 4,
        alignItems: "center",
        width: 160
    },
    documentType: {
        fontSize: 14,
        fontWeight: "bold",
        color: "#dc2626",
        marginBottom: 4
    },
    documentNumber: {
        fontSize: 12,
        fontWeight: "bold"
    },
    documentDate: {
        fontSize: 9,
        color: "#666",
        marginTop: 4
    },
    clientSection: {
        marginBottom: 20,
        padding: 12,
        backgroundColor: "#f9fafb",
        borderRadius: 4
    },
    clientTitle: {
        fontSize: 10,
        fontWeight: "bold",
        marginBottom: 8,
        color: "#374151"
    },
    clientRow: {
        flexDirection: "row",
        marginBottom: 4
    },
    clientLabel: {
        width: 80,
        fontWeight: "bold",
        color: "#6b7280"
    },
    clientValue: {
        flex: 1
    },
    table: {
        marginBottom: 20
    },
    tableHeader: {
        flexDirection: "row",
        backgroundColor: "#dc2626",
        color: "#fff",
        padding: 8,
        fontWeight: "bold"
    },
    tableRow: {
        flexDirection: "row",
        borderBottomWidth: 1,
        borderBottomColor: "#e5e7eb",
        padding: 8
    },
    tableRowAlt: {
        backgroundColor: "#f9fafb"
    },
    colItem: { flex: 3 },
    colQty: { width: 50, textAlign: "center" },
    colPrice: { width: 70, textAlign: "right" },
    colSubtotal: { width: 80, textAlign: "right" },
    totalsSection: {
        alignItems: "flex-end",
        marginBottom: 20
    },
    totalsBox: {
        width: 220,
        padding: 12,
        backgroundColor: "#f9fafb",
        borderRadius: 4
    },
    totalsRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 4
    },
    totalsLabel: {
        color: "#6b7280"
    },
    totalsValue: {
        fontWeight: "bold"
    },
    totalFinal: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 2,
        borderTopColor: "#dc2626"
    },
    totalLabel: {
        fontSize: 14,
        fontWeight: "bold"
    },
    totalValue: {
        fontSize: 14,
        fontWeight: "bold",
        color: "#dc2626"
    },
    footer: {
        position: "absolute",
        bottom: 30,
        left: 40,
        right: 40,
        textAlign: "center",
        fontSize: 8,
        color: "#9ca3af",
        borderTopWidth: 1,
        borderTopColor: "#e5e7eb",
        paddingTop: 10
    },
    paymentMethod: {
        marginTop: 10,
        padding: 8,
        backgroundColor: "#dcfce7",
        borderRadius: 4,
        textAlign: "center"
    },
    paymentText: {
        color: "#166534",
        fontWeight: "bold"
    }
});

// Función para formatear moneda
const formatCurrency = (amount: number): string => {
    return `S/ ${amount.toFixed(2)}`;
};

// Función para formatear fecha
const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("es-PE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });
};

// Componente PDF
export function InvoicePDF({ sale, company }: InvoicePDFProps) {
    const isFactura = sale.documentType === "FACTURA";

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Cabecera */}
                <View style={styles.header}>
                    <View style={styles.companySection}>
                        <Text style={styles.companyName}>{company.name}</Text>
                        <Text style={styles.companyInfo}>RUC: {company.ruc}</Text>
                        <Text style={styles.companyInfo}>{company.address}</Text>
                        <Text style={styles.companyInfo}>Tel: {company.phone}</Text>
                        {company.email && (
                            <Text style={styles.companyInfo}>{company.email}</Text>
                        )}
                    </View>
                    <View style={styles.documentBox}>
                        <Text style={styles.documentType}>
                            {isFactura ? "FACTURA ELECTRÓNICA" : "BOLETA DE VENTA"}
                        </Text>
                        <Text style={styles.documentNumber}>
                            {sale.documentNumber || sale.number}
                        </Text>
                        <Text style={styles.documentDate}>
                            Fecha: {formatDate(sale.createdAt)}
                        </Text>
                    </View>
                </View>

                {/* Datos del Cliente */}
                <View style={styles.clientSection}>
                    <Text style={styles.clientTitle}>DATOS DEL CLIENTE</Text>
                    {sale.client ? (
                        <>
                            <View style={styles.clientRow}>
                                <Text style={styles.clientLabel}>
                                    {sale.client.documentType}:
                                </Text>
                                <Text style={styles.clientValue}>
                                    {sale.client.document}
                                </Text>
                            </View>
                            <View style={styles.clientRow}>
                                <Text style={styles.clientLabel}>
                                    {isFactura ? "Razón Social:" : "Nombre:"}
                                </Text>
                                <Text style={styles.clientValue}>{sale.client.name}</Text>
                            </View>
                            {sale.client.address && (
                                <View style={styles.clientRow}>
                                    <Text style={styles.clientLabel}>Dirección:</Text>
                                    <Text style={styles.clientValue}>
                                        {sale.client.address}
                                    </Text>
                                </View>
                            )}
                        </>
                    ) : (
                        <Text style={styles.clientValue}>CLIENTE VARIOS</Text>
                    )}
                </View>

                {/* Tabla de Items */}
                <View style={styles.table}>
                    <View style={styles.tableHeader}>
                        <Text style={styles.colItem}>DESCRIPCIÓN</Text>
                        <Text style={styles.colQty}>CANT.</Text>
                        <Text style={styles.colPrice}>P. UNIT.</Text>
                        <Text style={styles.colSubtotal}>SUBTOTAL</Text>
                    </View>
                    {sale.items.map((item, index) => (
                        <View
                            key={index}
                            style={index % 2 === 1 ? { ...styles.tableRow, ...styles.tableRowAlt } : styles.tableRow}
                        >
                            <View style={styles.colItem}>
                                <Text>{item.productName}</Text>
                                <Text style={{ fontSize: 8, color: "#6b7280" }}>
                                    Código: {item.productCode}
                                </Text>
                            </View>
                            <Text style={styles.colQty}>{item.quantity}</Text>
                            <Text style={styles.colPrice}>
                                {formatCurrency(item.unitPrice)}
                            </Text>
                            <Text style={styles.colSubtotal}>
                                {formatCurrency(item.subtotal)}
                            </Text>
                        </View>
                    ))}
                </View>

                {/* Totales */}
                <View style={styles.totalsSection}>
                    <View style={styles.totalsBox}>
                        <View style={styles.totalsRow}>
                            <Text style={styles.totalsLabel}>Subtotal:</Text>
                            <Text style={styles.totalsValue}>
                                {formatCurrency(sale.subtotal)}
                            </Text>
                        </View>
                        {sale.discount > 0 && (
                            <View style={styles.totalsRow}>
                                <Text style={styles.totalsLabel}>Descuento:</Text>
                                <Text style={styles.totalsValue}>
                                    -{formatCurrency(sale.discount)}
                                </Text>
                            </View>
                        )}
                        <View style={styles.totalsRow}>
                            <Text style={styles.totalsLabel}>IGV (18%):</Text>
                            <Text style={styles.totalsValue}>
                                {formatCurrency(sale.tax)}
                            </Text>
                        </View>
                        <View style={styles.totalFinal}>
                            <Text style={styles.totalLabel}>TOTAL:</Text>
                            <Text style={styles.totalValue}>
                                {formatCurrency(sale.total)}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Método de Pago */}
                <View style={styles.paymentMethod}>
                    <Text style={styles.paymentText}>
                        Pagado con: {sale.paymentMethod}
                    </Text>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text>
                        Representación impresa del comprobante electrónico.
                    </Text>
                    <Text style={{ marginTop: 4 }}>
                        Autorizado mediante Resolución de SUNAT. Consulte en www.sunat.gob.pe
                    </Text>
                    <Text style={{ marginTop: 4, fontWeight: "bold" }}>
                        ¡Gracias por su preferencia!
                    </Text>
                </View>
            </Page>
        </Document>
    );
}

// PDF Component for Quotation Generation (Server-side)

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

// Formato A4 para cotizaciones
const styles = StyleSheet.create({
    page: {
        padding: 40,
        fontSize: 10,
        fontFamily: "Helvetica"
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 30,
        borderBottomWidth: 2,
        borderBottomColor: "#e5e5e5",
        paddingBottom: 20
    },
    logoContainer: {
        width: 150
    },
    logo: {
        width: 120,
        height: "auto",
        objectFit: "contain"
    },
    companyInfo: {
        textAlign: "right"
    },
    companyName: {
        fontSize: 16,
        fontWeight: "bold",
        fontFamily: "Helvetica-Bold",
        color: "#c41e3a"
    },
    companyDetail: {
        fontSize: 9,
        color: "#666",
        marginTop: 2
    },
    documentHeader: {
        backgroundColor: "#c41e3a",
        padding: 15,
        marginBottom: 20,
        alignItems: "center"
    },
    documentTitle: {
        fontSize: 18,
        fontWeight: "bold",
        fontFamily: "Helvetica-Bold",
        color: "#ffffff"
    },
    documentNumber: {
        fontSize: 14,
        color: "#ffffff",
        marginTop: 5
    },
    infoSection: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 20
    },
    infoBox: {
        width: "48%",
        backgroundColor: "#f9f9f9",
        padding: 15,
        borderRadius: 4
    },
    infoTitle: {
        fontSize: 10,
        fontWeight: "bold",
        fontFamily: "Helvetica-Bold",
        marginBottom: 8,
        color: "#333"
    },
    infoRow: {
        flexDirection: "row",
        marginBottom: 4
    },
    infoLabel: {
        width: 80,
        fontSize: 9,
        color: "#666"
    },
    infoValue: {
        flex: 1,
        fontSize: 9,
        fontFamily: "Helvetica-Bold"
    },
    table: {
        marginTop: 10
    },
    tableHeader: {
        flexDirection: "row",
        backgroundColor: "#333",
        padding: 8
    },
    tableHeaderCell: {
        color: "#fff",
        fontSize: 9,
        fontFamily: "Helvetica-Bold"
    },
    tableRow: {
        flexDirection: "row",
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
        padding: 8
    },
    tableRowAlt: {
        backgroundColor: "#f9f9f9"
    },
    tableCell: {
        fontSize: 9
    },
    colCode: { width: "12%" },
    colDesc: { width: "38%" },
    colQty: { width: "10%", textAlign: "center" },
    colPrice: { width: "15%", textAlign: "right" },
    colDisc: { width: "10%", textAlign: "right" },
    colSubtotal: { width: "15%", textAlign: "right" },
    totalsSection: {
        marginTop: 20,
        alignItems: "flex-end"
    },
    totalsBox: {
        width: 250,
        backgroundColor: "#f9f9f9",
        padding: 15
    },
    totalsRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 5
    },
    totalsLabel: {
        fontSize: 10,
        color: "#666"
    },
    totalsValue: {
        fontSize: 10,
        fontFamily: "Helvetica-Bold"
    },
    totalFinal: {
        flexDirection: "row",
        justifyContent: "space-between",
        borderTopWidth: 2,
        borderTopColor: "#c41e3a",
        paddingTop: 10,
        marginTop: 10
    },
    totalFinalLabel: {
        fontSize: 14,
        fontFamily: "Helvetica-Bold"
    },
    totalFinalValue: {
        fontSize: 14,
        fontFamily: "Helvetica-Bold",
        color: "#c41e3a"
    },
    notes: {
        marginTop: 30,
        padding: 15,
        backgroundColor: "#fff9e6",
        borderLeftWidth: 4,
        borderLeftColor: "#f0c14b"
    },
    notesTitle: {
        fontSize: 10,
        fontFamily: "Helvetica-Bold",
        marginBottom: 5
    },
    notesText: {
        fontSize: 9,
        color: "#666"
    },
    validity: {
        marginTop: 20,
        padding: 15,
        backgroundColor: "#e8f4e8",
        textAlign: "center"
    },
    validityText: {
        fontSize: 10,
        color: "#2d6a2d"
    },
    footer: {
        position: "absolute",
        bottom: 30,
        left: 40,
        right: 40,
        textAlign: "center",
        borderTopWidth: 1,
        borderTopColor: "#eee",
        paddingTop: 15
    },
    footerText: {
        fontSize: 9,
        color: "#999"
    }
});

// Formateo
const formatCurrency = (amount: number): string => `S/ ${amount.toFixed(2)}`;

const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("es-PE", {
        day: "2-digit",
        month: "long",
        year: "numeric"
    });
};

// Componente PDF Cotización
export function QuotationPDF({ quotation, company }: QuotationPDFProps) {
    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.logoContainer}>
                        {company.logo && (
                            <Image src={company.logo} style={styles.logo} />
                        )}
                    </View>
                    <View style={styles.companyInfo}>
                        <Text style={styles.companyName}>{company.name}</Text>
                        <Text style={styles.companyDetail}>RUC: {company.ruc}</Text>
                        <Text style={styles.companyDetail}>{company.address}</Text>
                        <Text style={styles.companyDetail}>Tel: {company.phone}</Text>
                        {company.email && (
                            <Text style={styles.companyDetail}>{company.email}</Text>
                        )}
                    </View>
                </View>

                {/* Document Title */}
                <View style={styles.documentHeader}>
                    <Text style={styles.documentTitle}>COTIZACIÓN</Text>
                    <Text style={styles.documentNumber}>{quotation.number}</Text>
                </View>

                {/* Info Section */}
                <View style={styles.infoSection}>
                    <View style={styles.infoBox}>
                        <Text style={styles.infoTitle}>DATOS DEL CLIENTE</Text>
                        {quotation.client ? (
                            <>
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>{quotation.client.documentType}:</Text>
                                    <Text style={styles.infoValue}>{quotation.client.document}</Text>
                                </View>
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Cliente:</Text>
                                    <Text style={styles.infoValue}>{quotation.client.name}</Text>
                                </View>
                                {quotation.client.address && (
                                    <View style={styles.infoRow}>
                                        <Text style={styles.infoLabel}>Dirección:</Text>
                                        <Text style={styles.infoValue}>{quotation.client.address}</Text>
                                    </View>
                                )}
                            </>
                        ) : (
                            <Text style={styles.infoValue}>Sin cliente asignado</Text>
                        )}
                    </View>
                    <View style={styles.infoBox}>
                        <Text style={styles.infoTitle}>DATOS DE LA COTIZACIÓN</Text>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Fecha:</Text>
                            <Text style={styles.infoValue}>{formatDate(quotation.createdAt)}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Válida hasta:</Text>
                            <Text style={styles.infoValue}>{formatDate(quotation.validUntil)}</Text>
                        </View>
                    </View>
                </View>

                {/* Items Table */}
                <View style={styles.table}>
                    <View style={styles.tableHeader}>
                        <Text style={[styles.tableHeaderCell, styles.colCode]}>CÓDIGO</Text>
                        <Text style={[styles.tableHeaderCell, styles.colDesc]}>DESCRIPCIÓN</Text>
                        <Text style={[styles.tableHeaderCell, styles.colQty]}>CANT.</Text>
                        <Text style={[styles.tableHeaderCell, styles.colPrice]}>P. UNIT.</Text>
                        <Text style={[styles.tableHeaderCell, styles.colDisc]}>DESC.</Text>
                        <Text style={[styles.tableHeaderCell, styles.colSubtotal]}>SUBTOTAL</Text>
                    </View>
                    {quotation.items.map((item, index) => (
                        <View key={index} style={index % 2 === 1 ? [styles.tableRow, styles.tableRowAlt] : styles.tableRow}>
                            <Text style={[styles.tableCell, styles.colCode]}>{item.productCode}</Text>
                            <Text style={[styles.tableCell, styles.colDesc]}>{item.productName}</Text>
                            <Text style={[styles.tableCell, styles.colQty]}>{item.quantity}</Text>
                            <Text style={[styles.tableCell, styles.colPrice]}>{formatCurrency(item.unitPrice)}</Text>
                            <Text style={[styles.tableCell, styles.colDisc]}>{formatCurrency(item.discount)}</Text>
                            <Text style={[styles.tableCell, styles.colSubtotal]}>{formatCurrency(item.subtotal)}</Text>
                        </View>
                    ))}
                </View>

                {/* Totals */}
                <View style={styles.totalsSection}>
                    <View style={styles.totalsBox}>
                        <View style={styles.totalsRow}>
                            <Text style={styles.totalsLabel}>Subtotal:</Text>
                            <Text style={styles.totalsValue}>{formatCurrency(quotation.subtotal)}</Text>
                        </View>
                        {quotation.discount > 0 && (
                            <View style={styles.totalsRow}>
                                <Text style={styles.totalsLabel}>Descuento:</Text>
                                <Text style={styles.totalsValue}>-{formatCurrency(quotation.discount)}</Text>
                            </View>
                        )}
                        <View style={styles.totalsRow}>
                            <Text style={styles.totalsLabel}>IGV (18%):</Text>
                            <Text style={styles.totalsValue}>{formatCurrency(quotation.tax)}</Text>
                        </View>
                        <View style={styles.totalFinal}>
                            <Text style={styles.totalFinalLabel}>TOTAL:</Text>
                            <Text style={styles.totalFinalValue}>{formatCurrency(quotation.total)}</Text>
                        </View>
                    </View>
                </View>

                {/* Notes */}
                {quotation.notes && (
                    <View style={styles.notes}>
                        <Text style={styles.notesTitle}>Observaciones:</Text>
                        <Text style={styles.notesText}>{quotation.notes}</Text>
                    </View>
                )}

                {/* Validity Notice */}
                <View style={styles.validity}>
                    <Text style={styles.validityText}>
                        ✓ Esta cotización es válida hasta el {formatDate(quotation.validUntil)}
                    </Text>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        Gracias por su preferencia • {company.name} • {company.phone}
                    </Text>
                </View>
            </Page>
        </Document>
    );
}

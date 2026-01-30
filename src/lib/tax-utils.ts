/**
 * Tax calculation utilities for IGV (Peru VAT)
 * Handles both cases:
 * - Prices that already INCLUDE IGV (igvIncluido = true)
 * - Prices that EXCLUDE IGV (igvIncluido = false)
 */

const IGV_RATE = 0.18;

export interface TaxCalculation {
    subtotal: number;      // Base imponible (sin IGV)
    tax: number;           // IGV calculado
    total: number;         // Total con IGV
    igvIncluded: boolean;  // Si el precio original incluía IGV
}

/**
 * Calculate taxes for a sale
 * @param amount - The sum of item prices (qty * price - discount)
 * @param igvIncluded - If true, prices already include IGV (common in retail)
 * @returns TaxCalculation with subtotal, tax, and total
 */
export function calculateTaxes(amount: number, igvIncluded: boolean): TaxCalculation {
    if (igvIncluded) {
        // Prices INCLUDE IGV - Extract IGV from the total
        // Formula: subtotal = amount / 1.18, tax = amount - subtotal
        const subtotal = Math.round((amount / (1 + IGV_RATE)) * 100) / 100;
        const tax = Math.round((amount - subtotal) * 100) / 100;
        const total = Math.round(amount * 100) / 100;

        return { subtotal, tax, total, igvIncluded };
    } else {
        // Prices EXCLUDE IGV - Add IGV to the subtotal
        // Formula: tax = subtotal * 0.18, total = subtotal + tax
        const subtotal = Math.round(amount * 100) / 100;
        const tax = Math.round((subtotal * IGV_RATE) * 100) / 100;
        const total = Math.round((subtotal + tax) * 100) / 100;

        return { subtotal, tax, total, igvIncluded };
    }
}

/**
 * Get the IGV rate as a decimal
 */
export function getIgvRate(): number {
    return IGV_RATE;
}

/**
 * Format tax calculation for display
 */
export function formatTaxBreakdown(calc: TaxCalculation): string {
    if (calc.igvIncluded) {
        return `Precio incluye IGV - Base: S/ ${calc.subtotal.toFixed(2)}, IGV: S/ ${calc.tax.toFixed(2)}`;
    } else {
        return `Subtotal: S/ ${calc.subtotal.toFixed(2)} + IGV: S/ ${calc.tax.toFixed(2)}`;
    }
}

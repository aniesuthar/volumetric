/**
 * Amazon Closing Fees Calculator
 * Based on official Amazon India seller fees structure
 * Last updated: 2026-01-14
 */

export type ShippingMethod = "easyShip" | "easyShipPrime" | "selfShip"

interface FeesSlab {
    max: number
    fee: number
}

/**
 * Amazon Closing Fees Table
 * Updated as per Amazon India seller fees
 * 
 * Note: Self-Ship rates (20, 25) are temporary from Sep 25, 2025 to Feb 15, 2026
 * After Feb 15, 2026, they will likely revert to higher rates
 */
const CLOSING_FEES_TABLE: Record<ShippingMethod, FeesSlab[]> = {
    easyShip: [
        { max: 300, fee: 6 },
        { max: 500, fee: 11 },
        { max: 1000, fee: 34 },
        { max: Number.POSITIVE_INFINITY, fee: 65 },
    ],
    easyShipPrime: [
        { max: 300, fee: 6 },
        { max: 500, fee: 11 },
        { max: 1000, fee: 34 },
        { max: Number.POSITIVE_INFINITY, fee: 65 },
    ],
    selfShip: [
        { max: 300, fee: 20 }, // Temporary rate (Sep 25, 2025 - Feb 15, 2026)
        { max: 500, fee: 25 }, // Temporary rate (Sep 25, 2025 - Feb 15, 2026)
        { max: 1000, fee: 50 },
        { max: Number.POSITIVE_INFINITY, fee: 100 },
    ],
}

/**
 * Get the closing fee for a given shipping method and item price
 * 
 * @param method - The shipping method (easyShip, easyShipPrime, or selfShip)
 * @param itemPrice - The item price including shipping charges (in INR)
 * @returns The closing fee in INR
 */
export function getAmazonClosingFee(method: ShippingMethod, itemPrice: number): number {
    const slabs = CLOSING_FEES_TABLE[method]

    for (const slab of slabs) {
        if (itemPrice <= slab.max) {
            return slab.fee
        }
    }

    // Fallback to highest slab (should never reach here due to POSITIVE_INFINITY)
    return slabs[slabs.length - 1].fee
}

/**
 * Get all possible closing fees for a shipping method
 * Useful for iterating through possible fees during price calculation
 * 
 * @param method - The shipping method
 * @returns Array of all possible closing fees for that method
 */
export function getPossibleClosingFees(method: ShippingMethod): number[] {
    return CLOSING_FEES_TABLE[method].map(slab => slab.fee)
}

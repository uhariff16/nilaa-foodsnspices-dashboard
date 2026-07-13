// Configuration for classifying Sales Transactions into Wholesale vs Retail channels.
// You can edit this file to fine-tune how customer names or product descriptions map to each channel.

export const RETAIL_CUSTOMERS = [
    'cash',
    'nfs delivery',
    'market shop' // Example: if market walk-ins should be retail
    // Add any other direct retail walk-ins or consumer accounts here (in lowercase)
];

export const WHOLESALE_CUSTOMERS = [
    // Add specific wholesale-only accounts here if you want to force them (optional)
];

/**
 * Determines whether a transaction belongs to the Retail channel.
 * @param {string} customerName 
 * @param {string} itemDesc 
 * @returns {boolean}
 */
export const isRetailTransaction = (customerName, itemDesc = '') => {
    const cust = String(customerName || '').toLowerCase().trim();
    
    // Rule 1: Match explicit retail customers list
    if (RETAIL_CUSTOMERS.includes(cust)) {
        return true;
    }
    
    // Rule 2: If the customer name is not explicitly in the retail list, 
    // it defaults to Wholesale (e.g. Hotel Bismi, Hassim Catering, etc.).
    return false;
};

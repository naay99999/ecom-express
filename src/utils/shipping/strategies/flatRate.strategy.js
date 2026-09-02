// Flat-rate shipping: each method charges a fixed amount regardless of cart
// contents. Amounts are integers in satang, matching product priceAmount.
const FLAT_RATES = {
  standard: { label: 'Standard Shipping', amount: 4000 },
  express: { label: 'Express Shipping', amount: 9900 },
};

export const flatRateStrategies = Object.fromEntries(
  Object.entries(FLAT_RATES).map(([key, { label, amount }]) => [
    key,
    { key, label, calculate: () => amount },
  ]),
);

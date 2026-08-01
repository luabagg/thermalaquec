export const PANELS = [
  { id: 'm555', model: 'Módulo 555 W', watt: 555, area_m2: 1.96 },
  { id: 'm585', model: 'Módulo 585 W', watt: 585, area_m2: 2.05 },
];

export const PRICING = { price_per_wp_min: 2.60, price_per_wp_max: 3.10 }; // R$/Wp

export const UTILITIES = [
  {
    id: 'ceee',
    name: 'CEEE (Equatorial RS)',
    price_per_kwh: 0.67404, // R$/kWh - tarifa convencional ANEEL 2024
    fixed_fee: 35.90,       // estimativa taxa mínima
    compensable_ratio: 1.00
  },
  {
    id: 'rge',
    name: 'RGE (Rio Grande Energia)',
    price_per_kwh: 0.60,    // valor placeholder - substituir por tarifa real da região
    fixed_fee: 30.00,
    compensable_ratio: 1.00
  }
];
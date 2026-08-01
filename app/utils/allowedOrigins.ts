export const allowedOrigins = [
    'https://thermalaquec.com.br',
    'https://www.thermalaquec.com.br',
    'https://dev.thermalaquec.com.br'
];

export function allowedOrigin(origin: string) {
    const url = new URL(origin);

    return allowedOrigins.includes(url.origin);
}

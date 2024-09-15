export const allowedOrigins = ['https://thermalaquecimento.com.br', 'https://www.thermalaquecimento.com.br', 'https://dev.thermalaquecimento.com.br'];

export function allowedOrigin(origin: string) {
    const url = new URL(origin);

    return allowedOrigins.includes(url.origin);
}
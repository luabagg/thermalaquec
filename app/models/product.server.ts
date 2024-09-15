import prisma from "~/libs/prisma/client.server";
import type { Product } from "@prisma/client";

export function getProduct({ id }: Pick<Product, "id">) {
    return prisma.product.findFirst({
        select: {
            id: true,
            name: true,
            description: true,
            Brand: true,
            model: true,
            categoryId: true,
            ProductSpec: true,
        },
        where: { id, visible: true },
    });
}

export function getProducts() {
    return prisma.product.findMany({
        select: {
            id: true,
            name: true,
            Brand: true,
            model: true,
            shortDescription: true
        },
        where: { visible: true },
    });
}

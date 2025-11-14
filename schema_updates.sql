-- Agregar los nuevos roles al tipo ENUM existente
ALTER TYPE public."enum_Users_role" ADD VALUE 'inventario';
ALTER TYPE public."enum_Users_role" ADD VALUE 'cajero';

-- Crear la tabla de Ventas (Sales)
CREATE TABLE public."Sales" (
    id SERIAL PRIMARY KEY,
    "userId" INTEGER REFERENCES public."Users"(id) ON UPDATE CASCADE ON DELETE SET NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "cashReceived" DOUBLE PRECISION NOT NULL,
    "changeGiven" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Crear la tabla de unión para Ventas y Productos (SaleProducts)
-- Esta tabla almacenará cada producto dentro de una venta
CREATE TABLE public."SaleProducts" (
    id SERIAL PRIMARY KEY,
    "saleId" INTEGER NOT NULL REFERENCES public."Sales"(id) ON UPDATE CASCADE ON DELETE CASCADE,
    "productId" INTEGER NOT NULL REFERENCES public."Products"(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    quantity INTEGER NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL, -- Guardar el precio al momento de la venta
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Opcional: Crear un trigger para actualizar "updatedAt" automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sales_updated_at BEFORE UPDATE ON public."Sales" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_saleproducts_updated_at BEFORE UPDATE ON public."SaleProducts" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

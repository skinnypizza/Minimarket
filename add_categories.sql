-- Agregar columna de categoría a la tabla Products
ALTER TABLE public."Products" 
ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'General';

-- Crear índice para mejorar búsquedas por categoría
CREATE INDEX IF NOT EXISTS idx_products_category ON public."Products"(category);

-- Actualizar productos existentes con categorías de ejemplo
UPDATE public."Products" SET category = 'Bebidas' WHERE name ILIKE '%coca%' OR name ILIKE '%pepsi%' OR name ILIKE '%agua%' OR name ILIKE '%jugo%';
UPDATE public."Products" SET category = 'Lácteos' WHERE name ILIKE '%leche%' OR name ILIKE '%yogurt%' OR name ILIKE '%queso%';
UPDATE public."Products" SET category = 'Panadería' WHERE name ILIKE '%pan%' OR name ILIKE '%galleta%';
UPDATE public."Products" SET category = 'Snacks' WHERE name ILIKE '%chips%' OR name ILIKE '%doritos%' OR name ILIKE '%cheetos%';
UPDATE public."Products" SET category = 'Limpieza' WHERE name ILIKE '%detergente%' OR name ILIKE '%jabón%' OR name ILIKE '%cloro%';
UPDATE public."Products" SET category = 'Higiene' WHERE name ILIKE '%shampoo%' OR name ILIKE '%pasta%' OR name ILIKE '%papel%';
UPDATE public."Products" SET category = 'Enlatados' WHERE name ILIKE '%atún%' OR name ILIKE '%sardina%' OR name ILIKE '%conserva%';
UPDATE public."Products" SET category = 'Despensa' WHERE name ILIKE '%arroz%' OR name ILIKE '%fideo%' OR name ILIKE '%aceite%' OR name ILIKE '%azúcar%' OR name ILIKE '%sal%';

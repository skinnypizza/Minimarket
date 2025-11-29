const { sequelize } = require('./config/db');

async function fixCascade() {
    try {
        console.log('🔧 Verificando constraint actual...');

        // Verificar constraint actual
        const [constraints] = await sequelize.query(`
      SELECT constraint_name, delete_rule
      FROM information_schema.referential_constraints
      WHERE constraint_name LIKE '%Batches%productId%'
    `);

        console.log('Constraints encontrados:', constraints);

        // Eliminar constraint existente
        console.log('🗑️  Eliminando constraint antiguo...');
        await sequelize.query(`
      ALTER TABLE "Batches" 
      DROP CONSTRAINT IF EXISTS "Batches_productId_fkey"
    `);

        // Crear nuevo constraint con CASCADE
        console.log('✨ Creando nuevo constraint con CASCADE...');
        await sequelize.query(`
      ALTER TABLE "Batches" 
      ADD CONSTRAINT "Batches_productId_fkey" 
      FOREIGN KEY ("productId") 
      REFERENCES "Products"(id) 
      ON DELETE CASCADE
    `);

        // Verificar que se aplicó correctamente
        const [newConstraints] = await sequelize.query(`
      SELECT constraint_name, delete_rule
      FROM information_schema.referential_constraints
      WHERE constraint_name = 'Batches_productId_fkey'
    `);

        console.log('✅ Nuevo constraint:', newConstraints);
        console.log('✅ CASCADE configurado correctamente!');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

fixCascade();

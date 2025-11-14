const { sequelize, User, Product, Batch, Sale, SaleProduct } = require('../config/db');

const seedDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log('PostgreSQL Conectado para el seeder...');

    // --- LIMPIAR BASE DE DATOS ---
    console.log('Limpiando la base de datos...');
    // Desactivar temporalmente las restricciones de clave foránea para truncar
    await sequelize.query('SET session_replication_role = \'replica\';');
    
    // Truncar todas las tablas en orden
    await SaleProduct.destroy({ truncate: true, cascade: true });
    await Sale.destroy({ truncate: true, cascade: true });
    await Batch.destroy({ truncate: true, cascade: true });
    await Product.destroy({ truncate: true, cascade: true });
    await User.destroy({ truncate: true, cascade: true });

    // Reactivar las restricciones
    await sequelize.query('SET session_replication_role = \'origin\';');
    console.log('Tablas limpiadas con éxito.');

    // --- CREAR USUARIOS ---
    console.log('Creando usuarios para cada rol...');
    const usersData = [
      { name: 'Admin User', email: 'admin@example.com', password: 'Password123*', role: 'admin' },
      { name: 'Inventario User', email: 'inventario@example.com', password: 'Password123*', role: 'inventario' },
      { name: 'Cajero User', email: 'cajero@example.com', password: 'Password123*', role: 'cajero' },
      { name: 'Cliente User', email: 'cliente@example.com', password: 'Password123*', role: 'user' }
    ];
    
    await User.bulkCreate(usersData, { validate: true, individualHooks: true });
    console.log('--- Credenciales de Usuario ---');
    usersData.forEach(u => console.log(`- Rol: ${u.role}, Email: ${u.email}, Pass: ${u.password}`));
    console.log('-----------------------------');


    // --- CREAR PRODUCTOS ---
    console.log('Creando productos de ejemplo...');
    const productsData = [
        { name: 'Leche Entera (1L)', description: 'Leche fresca de vaca, pasteurizada.', price: 8.50, image: '/img/products/product-1761706362950-532312654.png' },
        { name: 'Yogur Natural (500g)', description: 'Yogur natural sin sabor.', price: 12.50, image: '/img/products/product-1761706362950-532312654.png' },
        { name: 'Queso Fresco (500g)', description: 'Queso fresco de vaca.', price: 25.80, image: '/img/products/product-1761706362950-532312654.png' },
        { name: 'Pan de Molde', description: 'Pan blanco suave, ideal para sándwiches.', price: 10.20, image: '/img/products/product-1761706362950-532312654.png' },
        { name: 'Huevos (docena)', description: 'Huevos frescos de gallina, tamaño grande.', price: 15.00, image: '/img/products/product-1761706362950-532312654.png' },
        { name: 'Arroz (1kg)', description: 'Arroz blanco de grano largo.', price: 9.20, image: '/img/products/product-1761706362950-532312654.png' },
        { name: 'Aceite Vegetal (1L)', description: 'Aceite de girasol para cocinar.', price: 14.80, image: '/img/products/product-1761706362950-532312654.png' },
        { name: 'Sal Yodada (1kg)', description: 'Sal refinada con yodo.', price: 3.80, image: '/img/products/product-1761706362950-532312654.png' },
        { name: 'Azúcar Blanca (1kg)', description: 'Azúcar refinada.', price: 5.10, image: '/img/products/product-1761706362950-532312654.png' },
        { name: 'Tomates Enlatados (400g)', description: 'Tomates pelados en lata.', price: 7.50, image: '/img/products/product-1761706362950-532312654.png' },
        { name: 'Frijoles Enlatados (400g)', description: 'Frijoles cocidos en lata.', price: 6.20, image: '/img/products/product-1761706362950-532312654.png' },
        { name: 'Maíz Enlatado (340g)', description: 'Granos de maíz enlatados.', price: 4.95, image: '/img/products/product-1761706362950-532312654.png' },
        { name: 'Jugo de Naranja (1L)', description: 'Jugo natural de naranja fresco.', price: 11.50, image: '/img/products/product-1761706362950-532312654.png' },
        { name: 'Agua Mineral (1.5L)', description: 'Agua mineral purificada.', price: 5.00, image: '/img/products/product-1761706362950-532312654.png' },
        { name: 'Café Molido (500g)', description: 'Café de grano fino molido.', price: 35.50, image: '/img/products/product-1761706362950-532312654.png' },
        { name: 'Papas Fritas (150g)', description: 'Papas crujientes saladas.', price: 9.80, image: '/img/products/product-1761706362950-532312654.png' },
        { name: 'Galletas de Soda', description: 'Galletas saladas y crujientes.', price: 7.00, image: '/img/products/product-1761706362950-532312654.png' },
        { name: 'Jabón de Tocador', description: 'Jabón antibacterial para manos.', price: 6.50, image: '/img/products/product-1761706362950-532312654.png' },
        { name: 'Atún en lata', description: 'Lomos de atún en aceite.', price: 10.00, image: '/img/products/product-1761706362950-532312654.png' },
        { name: 'Pizza Congelada', description: 'Pizza margherita para hornear.', price: 28.50, image: '/img/products/product-1761706362950-532312654.png' }
    ];
    const products = await Product.bulkCreate(productsData);
    console.log(`${products.length} productos creados.`);

    // --- CREAR LOTES (BATCHES) ---
    console.log('Creando lotes para cada producto...');
    const batches = [];
    for (const product of products) {
      const numBatches = Math.floor(Math.random() * 3) + 1; // Entre 1 y 3 lotes
      for (let i = 0; i < numBatches; i++) {
        batches.push({
          productId: product.id,
          quantity: Math.floor(Math.random() * 150) + 20, // Stock entre 20 y 170
          purchasePrice: parseFloat((product.price * (Math.random() * 0.3 + 0.6)).toFixed(2)), // Precio de compra entre 60% y 90% del de venta
          purchaseDate: new Date(Date.now() - (Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000))
        });
      }
    }
    await Batch.bulkCreate(batches);
    console.log(`${batches.length} lotes creados.`);

    console.log('¡Seeder finalizado con éxito!');

  } catch (error) {
    console.error('Error al ejecutar el seeder:', error);
  } finally {
    await sequelize.close();
    console.log('Conexión con la base de datos cerrada.');
  }
};

seedDatabase();

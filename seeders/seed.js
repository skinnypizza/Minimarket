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
      { name: 'Leche Entera (1L)', description: 'Leche fresca de vaca, pasteurizada.', price: 8.50, category: 'Lácteos', image: 'https://www.sudamericarural.org/images/5931d634dfb81.jpeg' },
      { name: 'Yogur Natural (500g)', description: 'Yogur natural sin sabor.', price: 12.50, category: 'Lácteos', image: 'https://walmartcr.vtexassets.com/arquivos/ids/505426-800-450?v=638415995553570000&width=800&height=450&aspect=true' },
      { name: 'Queso Fresco (500g)', description: 'Queso fresco de vaca.', price: 25.80, category: 'Lácteos', image: 'http://quesoslatinos.com/wp-content/uploads/2023/08/40.png' },
      { name: 'Pan de Molde', description: 'Pan blanco suave, ideal para sándwiches.', price: 10.20, category: 'Panadería', image: 'https://lookaside.fbsbx.com/lookaside/crawler/media/?media_id=250729058980134' },
      { name: 'Huevos (docena)', description: 'Huevos frescos de gallina, tamaño grande.', price: 15.00, category: 'Despensa', image: 'https://gdb.voanews.com/800f0000-c0a8-0242-47bb-08dafee85b78_w408_r1.jpg' },
      { name: 'Arroz (1kg)', description: 'Arroz blanco de grano largo.', price: 9.20, category: 'Despensa', image: 'https://lookaside.fbsbx.com/lookaside/crawler/media/?media_id=1489128748861114' },
      { name: 'Aceite Vegetal (1L)', description: 'Aceite de girasol para cocinar.', price: 14.80, category: 'Despensa', image: 'https://inolsa.com.bo/wp-content/uploads/2024/11/Selecto-familia.jpg' },
      { name: 'Sal Yodada (1kg)', description: 'Sal refinada con yodo.', price: 3.80, category: 'Despensa', image: 'https://lavozdetarija.com/wp-content/uploads/2023/07/sal-yodada.jpg' },
      { name: 'Azúcar Blanca (1kg)', description: 'Azúcar refinada.', price: 5.10, category: 'Despensa', image: 'https://www.papyser.com/catalogo/1002404-1.jpg' },
      { name: 'Tomates Enlatados (400g)', description: 'Tomates pelados en lata.', price: 7.50, category: 'Enlatados', image: 'https://m.media-amazon.com/images/I/7153OXvGPaL._AC_UF894,1000_QL80_.jpg' },
      { name: 'Frijoles Enlatados (400g)', description: 'Frijoles cocidos en lata.', price: 6.20, category: 'Enlatados', image: 'https://m.media-amazon.com/images/I/71zjuaDhL0L._AC_UF894,1000_QL80_.jpg' },
      { name: 'Maíz Enlatado (340g)', description: 'Granos de maíz enlatados.', price: 4.95, category: 'Enlatados', image: 'https://m.media-amazon.com/images/I/615TWkOmLWL.jpg_BO30,255,255,255_UF900,850_SR1910,1000,0,C_QL100_.jpg' },
      { name: 'Jugo de Naranja (1L)', description: 'Jugo natural de naranja fresco.', price: 11.50, category: 'Bebidas', image: 'https://olimpica.vtexassets.com/arquivos/ids/766738-800-450?v=637807141987030000&width=800&height=450&aspect=true' },
      { name: 'Agua Mineral (1.5L)', description: 'Agua mineral purificada.', price: 5.00, category: 'Bebidas', image: 'https://i.ebayimg.com/images/g/pdEAAOSwfzFiZYRT/s-l1200.jpg' },
      { name: 'Café Molido (500g)', description: 'Café de grano fino molido.', price: 35.50, category: 'Bebidas', image: 'https://m.media-amazon.com/images/I/91PrctKjmzL._AC_UF350,350_QL80_.jpg' },
      { name: 'Papas Fritas (150g)', description: 'Papas crujientes saladas.', price: 9.80, category: 'Snacks', image: 'https://lookaside.fbsbx.com/lookaside/crawler/media/?media_id=2355809074505671' },
      { name: 'Galletas de Soda', description: 'Galletas saladas y crujientes.', price: 7.00, category: 'Snacks', image: 'https://images.openfoodfacts.org/images/products/762/221/067/5569/front_es.12.full.jpg' },
      { name: 'Jabón de Tocador', description: 'Jabón antibacterial para manos.', price: 6.50, category: 'Limpieza', image: 'https://m.media-amazon.com/images/I/81zEaguOWOL._SL1500_.jpg' },
      { name: 'Atún en lata', description: 'Lomos de atún en aceite.', price: 10.00, category: 'Enlatados', image: 'https://mixo.com.bo/media/catalog/product/cache/2c3902c409c7a000c9a4b95ec086ecc4/4/9/49700-1.jpg' },
      { name: 'Pizza Congelada', description: 'Pizza margherita para hornear.', price: 28.50, category: 'Congelados', image: 'https://walmartcr.vtexassets.com/arquivos/ids/929323-800-450?v=638833098323470000&width=800&height=450&aspect=true' }
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
          quantity: Math.floor(Math.random() * 150) + 5, // Stock entre 5 y 155
          purchasePrice: parseFloat((product.price * (Math.random() * 0.3 + 0.6)).toFixed(2)), // Precio de compra entre 60% y 90% del de venta
          purchaseDate: new Date(Date.now() - (Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000))
        });
      }
    }
    await Batch.bulkCreate(batches);
    console.log(`${batches.length} lotes creados.`);
    // --- CREAR VENTAS (SALES) ---
    console.log('Generando historial de ventas (últimos 30 días)...');
    const sales = [];
    const saleProducts = [];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    // Generar ventas aleatorias
    for (let i = 0; i < 50; i++) { // 50 ventas simuladas
      const saleDate = new Date(startDate.getTime() + Math.random() * (Date.now() - startDate.getTime()));
      const randomUser = usersData[Math.floor(Math.random() * usersData.length)];
      // Necesitamos el ID real del usuario, pero usersData no lo tiene.
      // Asumiremos IDs 1-4 ya que acabamos de truncar y crear.
      // Mejor práctica: buscar el usuario en la DB.
      const user = await User.findOne({ where: { email: randomUser.email } });
      if (!user) continue;
      // Seleccionar productos aleatorios para esta venta
      const numProducts = Math.floor(Math.random() * 5) + 1; // 1 a 5 productos
      let saleTotal = 0;
      const currentSaleProducts = [];
      for (let j = 0; j < numProducts; j++) {
        const product = products[Math.floor(Math.random() * products.length)];
        const qty = Math.floor(Math.random() * 3) + 1;
        const price = product.price;
        saleTotal += price * qty;
        currentSaleProducts.push({
          productId: product.id,
          quantity: qty,
          unitPrice: price
        });
      }
      // Crear la venta
      const sale = await Sale.create({
        userId: user.id,
        totalAmount: parseFloat(saleTotal.toFixed(2)),
        cashReceived: parseFloat((saleTotal + Math.random() * 20).toFixed(2)),
        createdAt: saleDate,
        updatedAt: saleDate
      });
      // Crear los detalles de venta (SaleProduct)
      for (const sp of currentSaleProducts) {
        await SaleProduct.create({
          saleId: sale.id,
          productId: sp.productId,
          quantity: sp.quantity,
          unitPrice: sp.unitPrice,
          createdAt: saleDate,
          updatedAt: saleDate
        });
      }
    }
    console.log('Ventas históricas generadas.');
    console.log('¡Seeder finalizado con éxito!');
  } catch (error) {
    console.error('Error al ejecutar el seeder:', error);
  } finally {
    await sequelize.close();
    console.log('Conexión con la base de datos cerrada.');
  }
};
seedDatabase();
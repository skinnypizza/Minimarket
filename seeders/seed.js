const { sequelize } = require('../config/db');
const User = require('../models/User');
const Product = require('../models/Product');
const Batch = require('../models/Batch');
const bcrypt = require('bcryptjs');

const seedDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log('PostgreSQL Connected for seeding...');

    // Sync models - this will create tables if they don't existz
    await sequelize.sync({ alter: true });
    console.log('Database synchronized.');

    // --- Seed Users ---
    const adminEmail = 'admin@admin.com';
    const adminPassword = 'Admin123*';

    let adminUser = await User.findOne({ where: { email: adminEmail } });

    if (!adminUser) {
      adminUser = await User.create({
        name: 'Admin User',
        email: adminEmail,
        password: adminPassword,
        role: 'admin'
      });
      console.log('Admin user created.');
    } else {
      const isMatch = await bcrypt.compare(adminPassword, adminUser.password);
      if (!isMatch) {
        adminUser.password = adminPassword;
        await adminUser.save();
        console.log('Admin user password updated.');
      } else {
        console.log('Admin user already exists and password is up to date.');
      }
    }

    const regularUserEmail = 'user@example.com';
    let regularUser = await User.findOne({ where: { email: regularUserEmail } });
    if (!regularUser) {
      regularUser = await User.create({
        name: 'Regular User',
        email: regularUserEmail,
        password: 'Password123*',
        role: 'user'
      });
      console.log('Regular user created.');
    } else {
      console.log('Regular user already exists.');
    }

    // --- Seed Products ---
    const productsData = [
      // Lácteos
      { name: 'Leche Entera (1L)', description: 'Leche fresca de vaca, pasteurizada.', price: 1.50, imageUrl: '/img/products/leche.png' },
      { name: 'Leche Descremada (1L)', description: 'Leche baja en grasa.', price: 1.30, imageUrl: '/img/products/leche_desc.png' },
      { name: 'Leche Evaporada (400ml)', description: 'Leche concentrada.', price: 1.00, imageUrl: '/img/products/leche_evap.png' },
      { name: 'Yogur Natural (500g)', description: 'Yogur natural sin sabor.', price: 2.50, imageUrl: '/img/products/yogur.png' },
      { name: 'Queso Fresco (500g)', description: 'Queso fresco de vaca.', price: 5.80, imageUrl: '/img/products/queso.png' },
      { name: 'Mantequilla (250g)', description: 'Mantequilla natural sin sal.', price: 4.20, imageUrl: '/img/products/mantequilla.png' },

      // Panadería
      { name: 'Pan de Molde', description: 'Pan blanco suave, ideal para sándwiches.', price: 2.20, imageUrl: '/img/products/pan.png' },
      { name: 'Pan Integral (500g)', description: 'Pan integral de trigo completo.', price: 2.80, imageUrl: '/img/products/pan_integral.png' },
      { name: 'Croissants (3 piezas)', description: 'Croissants frescos de mantequilla.', price: 3.50, imageUrl: '/img/products/croissants.png' },
      { name: 'Galletas de Chocolate (200g)', description: 'Galletas crujientes con chocolate.', price: 2.10, imageUrl: '/img/products/galletas.png' },

      // Proteínas
      { name: 'Huevos (docena)', description: 'Huevos frescos de gallina, tamaño grande.', price: 3.00, imageUrl: '/img/products/huevos.png' },
      { name: 'Pechuga de Pollo (1kg)', description: 'Pollo fresco sin piel.', price: 8.50, imageUrl: '/img/products/pollo.png' },
      { name: 'Carne Molida (500g)', description: 'Carne de res molida fresca.', price: 7.20, imageUrl: '/img/products/carne.png' },
      { name: 'Jamón Serrano (200g)', description: 'Jamón serrano de primera calidad.', price: 6.50, imageUrl: '/img/products/jamon.png' },

      // Granos y Cereales
      { name: 'Arroz (1kg)', description: 'Arroz blanco de grano largo.', price: 1.20, imageUrl: '/img/products/arroz.png' },
      { name: 'Arroz Integral (1kg)', description: 'Arroz integral orgánico.', price: 1.80, imageUrl: '/img/products/arroz_integral.png' },
      { name: 'Harina de Trigo (1kg)', description: 'Harina blanca de trigo.', price: 1.00, imageUrl: '/img/products/harina.png' },
      { name: 'Pasta Integral (500g)', description: 'Pasta de trigo integral.', price: 1.50, imageUrl: '/img/products/pasta.png' },
      { name: 'Avena (500g)', description: 'Avena en copos sin azúcar.', price: 2.20, imageUrl: '/img/products/avena.png' },

      // Aceites y Condimentos
      { name: 'Aceite Vegetal (1L)', description: 'Aceite de girasol para cocinar.', price: 2.80, imageUrl: '/img/products/aceite.png' },
      { name: 'Aceite de Oliva (500ml)', description: 'Aceite de oliva virgen extra.', price: 8.50, imageUrl: '/img/products/aceite_oliva.png' },
      { name: 'Sal Yodada (1kg)', description: 'Sal refinada con yodo.', price: 0.80, imageUrl: '/img/products/sal.png' },
      { name: 'Azúcar Blanca (1kg)', description: 'Azúcar refinada.', price: 1.10, imageUrl: '/img/products/azucar.png' },
      { name: 'Vinagre Blanco (750ml)', description: 'Vinagre blanco para cocinar.', price: 1.30, imageUrl: '/img/products/vinagre.png' },

      // Frutas y Verduras (envasadas/conservas)
      { name: 'Tomates Enlatados (400g)', description: 'Tomates pelados en lata.', price: 1.50, imageUrl: '/img/products/tomates.png' },
      { name: 'Frijoles Enlatados (400g)', description: 'Frijoles cocidos en lata.', price: 1.20, imageUrl: '/img/products/frijoles.png' },
      { name: 'Maíz Enlatado (340g)', description: 'Granos de maíz enlatados.', price: 0.95, imageUrl: '/img/products/maiz.png' },
      { name: 'Piña en Almíbar (565g)', description: 'Piña tropical enlatada.', price: 2.30, imageUrl: '/img/products/pina.png' },

      // Bebidas
      { name: 'Jugo de Naranja (1L)', description: 'Jugo natural de naranja fresco.', price: 2.50, imageUrl: '/img/products/jugo_naranja.png' },
      { name: 'Agua Mineral (1.5L)', description: 'Agua mineral purificada.', price: 1.00, imageUrl: '/img/products/agua.png' },
      { name: 'Café Molido (500g)', description: 'Café de grano fino molido.', price: 5.50, imageUrl: '/img/products/cafe.png' },
      { name: 'Té Negro (20 bolsitas)', description: 'Té negro premium.', price: 2.80, imageUrl: '/img/products/te.png' },

      // Snacks
      { name: 'Papas Fritas (150g)', description: 'Papas crujientes saladas.', price: 1.80, imageUrl: '/img/products/papas.png' },
      { name: 'Palomitas de Maíz (100g)', description: 'Palomitas naturales.', price: 1.50, imageUrl: '/img/products/palomitas.png' },
      { name: 'Chocolatina (100g)', description: 'Chocolate con leche.', price: 1.20, imageUrl: '/img/products/chocolate.png' },

      // Congelados
      { name: 'Verduras Congeladas (500g)', description: 'Mix de verduras congeladas.', price: 3.20, imageUrl: '/img/products/verduras_congeladas.png' },
      { name: 'Pizza Congelada (400g)', description: 'Pizza margherita congelada.', price: 4.50, imageUrl: '/img/products/pizza.png' },
    ];

    const createdProducts = [];
    for (const productData of productsData) {
      let product = await Product.findOne({ where: { name: productData.name } });
      if (!product) {
        product = await Product.create(productData);
        console.log(`Product created: ${product.name}`);
      } else {
        console.log(`Product already exists: ${product.name}`);
      }
      createdProducts.push(product);
    }

    console.log(`Total products: ${createdProducts.length}`);

    // --- Seed Batches ---
    // Crear múltiples lotes por producto con variaciones
    for (const product of createdProducts) {
      const existingBatches = await Batch.count({ where: { productId: product.id } });
      
      // Crear entre 2 y 4 lotes por producto
      const batchesPerProduct = Math.floor(Math.random() * 3) + 2;
      
      for (let i = 0; i < batchesPerProduct; i++) {
        await Batch.create({
          productId: product.id,
          quantity: Math.floor(Math.random() * 200) + 30, // Random quantity between 30 and 230
          purchasePrice: parseFloat((Math.random() * 8 + 0.30).toFixed(2)), // Random price between 0.30 and 8.30
          expirationDate: new Date(Date.now() + (Math.floor(Math.random() * 60) + 10) * 24 * 60 * 60 * 1000), // Expires between 10 and 70 days
          entryDate: new Date(Date.now() - (Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000)) // Entered between 0 and 30 days ago
        });
      }
      console.log(`${batchesPerProduct} batches created for product: ${product.name}`);
    }

    console.log('Database seeding complete!');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await sequelize.close();
  }
};

seedDatabase();
const { Sale, SaleProduct, Product, Batch, sequelize, Op } = require('../config/db');

const kpiController = {
    /**
     * Get comprehensive KPIs for dashboard (HU-02)
     * Includes: Summary cards, sales trends, inventory rotation, FIFO/LIFO analysis
     */
    getKPIs: async (req, res) => {
        try {
            const { startDate, endDate, period } = req.query;

            // Build date filter based on period or custom dates
            let dateFilter = {};
            let periodLabel = 'Últimos 30 días';

            if (startDate && endDate) {
                dateFilter.createdAt = {
                    [Op.between]: [new Date(startDate), new Date(endDate + 'T23:59:59')]
                };
                periodLabel = `${startDate} - ${endDate}`;
            } else if (period) {
                const now = new Date();
                let startPeriod = new Date();

                switch (period) {
                    case 'today':
                        startPeriod.setHours(0, 0, 0, 0);
                        periodLabel = 'Hoy';
                        break;
                    case 'week':
                        startPeriod.setDate(now.getDate() - 7);
                        periodLabel = 'Última semana';
                        break;
                    case 'month':
                        startPeriod.setMonth(now.getMonth() - 1);
                        periodLabel = 'Último mes';
                        break;
                    case 'quarter':
                        startPeriod.setMonth(now.getMonth() - 3);
                        periodLabel = 'Último trimestre';
                        break;
                    default:
                        startPeriod.setDate(now.getDate() - 30);
                }
                dateFilter.createdAt = { [Op.gte]: startPeriod };
            } else {
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                dateFilter.createdAt = { [Op.gte]: thirtyDaysAgo };
            }

            // ==================== SUMMARY KPIS ====================
            const summaryKPIs = await kpiController._getSummaryKPIs(dateFilter);

            // ==================== SALES OVER TIME ====================
            const salesOverTime = await kpiController._getSalesOverTime(dateFilter);

            // ==================== TOP SELLING PRODUCTS ====================
            const topSellingProducts = await kpiController._getTopSellingProducts(dateFilter);

            // ==================== LOW STOCK PRODUCTS ====================
            const lowStockProducts = await kpiController._getLowStockProducts();

            // ==================== INVENTORY ROTATION INDEX ====================
            const inventoryRotation = await kpiController._getInventoryRotation(dateFilter);

            // ==================== SALES BY CATEGORY ====================
            const salesByCategory = await kpiController._getSalesByCategory(dateFilter);

            // ==================== FIFO/LIFO ANALYSIS ====================
            const fifoLifoAnalysis = await kpiController._getFifoLifoAnalysis();

            // ==================== STOCK ALERTS ====================
            const stockAlerts = await kpiController._getStockAlerts();

            res.json({
                periodLabel,
                summaryKPIs,
                salesOverTime,
                topSellingProducts,
                lowStockProducts,
                inventoryRotation,
                salesByCategory,
                fifoLifoAnalysis,
                stockAlerts,
                generatedAt: new Date().toISOString()
            });

        } catch (error) {
            console.error('Error fetching KPIs:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    },

    // ==================== PRIVATE HELPER METHODS ====================

    /**
     * Get summary KPI cards data
     */
    _getSummaryKPIs: async (dateFilter) => {
        // Total sales in period
        const salesResult = await Sale.findAll({
            where: dateFilter,
            attributes: [
                [sequelize.fn('SUM', sequelize.col('totalAmount')), 'totalSales'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'totalTransactions'],
                [sequelize.fn('AVG', sequelize.col('totalAmount')), 'avgTicket']
            ],
            raw: true
        });

        // Today's sales
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todaySales = await Sale.sum('totalAmount', {
            where: { createdAt: { [Op.gte]: todayStart } }
        }) || 0;

        // Total products sold
        const productsSold = await SaleProduct.sum('quantity', {
            where: dateFilter
        }) || 0;

        // Total inventory value
        const inventoryValue = await Batch.findAll({
            attributes: [
                [sequelize.fn('SUM', sequelize.literal('"quantity" * "purchasePrice"')), 'totalValue']
            ],
            raw: true
        });

        // Total stock units
        const totalStock = await Batch.sum('quantity') || 0;

        const summary = salesResult[0] || {};

        return {
            totalSales: parseFloat(summary.totalSales) || 0,
            totalTransactions: parseInt(summary.totalTransactions) || 0,
            avgTicket: parseFloat(summary.avgTicket) || 0,
            todaySales,
            productsSold,
            inventoryValue: parseFloat(inventoryValue[0]?.totalValue) || 0,
            totalStock
        };
    },

    /**
     * Get sales over time chart data
     */
    _getSalesOverTime: async (dateFilter) => {
        // Use TO_CHAR for Postgres date formatting
        const dateCol = sequelize.literal("TO_CHAR(\"createdAt\", 'YYYY-MM-DD')");

        const sales = await Sale.findAll({
            where: dateFilter,
            attributes: [
                [dateCol, 'date'],
                [sequelize.fn('SUM', sequelize.col('totalAmount')), 'total'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            group: [dateCol],
            order: [[dateCol, 'ASC']],
            raw: true
        });

        return {
            labels: sales.map(s => s.date),
            data: sales.map(s => parseFloat(s.total)),
            transactions: sales.map(s => parseInt(s.count))
        };
    },

    /**
     * Get top selling products
     */
    _getTopSellingProducts: async (dateFilter) => {
        const topProducts = await SaleProduct.findAll({
            where: dateFilter,
            include: [{
                model: Product,
                attributes: ['name', 'price']
            }],
            attributes: [
                'productId',
                [sequelize.fn('SUM', sequelize.col('quantity')), 'totalQty'],
                [sequelize.fn('SUM', sequelize.literal('"SaleProduct"."quantity" * "SaleProduct"."unitPrice"')), 'totalRevenue']
            ],
            group: ['productId', 'Product.id', 'Product.name', 'Product.price'],
            order: [[sequelize.fn('SUM', sequelize.col('quantity')), 'DESC']],
            limit: 10
        });

        return {
            labels: topProducts.map(p => p.Product ? p.Product.name : 'Unknown'),
            data: topProducts.map(p => parseInt(p.get('totalQty'))),
            revenue: topProducts.map(p => parseFloat(p.get('totalRevenue')) || 0)
        };
    },

    /**
     * Get low stock products
     */
    _getLowStockProducts: async () => {
        const products = await Product.findAll({
            include: [{
                model: Batch,
                as: 'batches'
            }]
        });

        const lowStockData = products.map(p => {
            const stock = p.batches ? p.batches.reduce((sum, b) => sum + b.quantity, 0) : 0;
            return { id: p.id, name: p.name, stock, price: p.price };
        }).filter(p => p.stock < 20)
            .sort((a, b) => a.stock - b.stock)
            .slice(0, 10);

        return {
            labels: lowStockData.map(p => p.name),
            data: lowStockData.map(p => p.stock),
            products: lowStockData
        };
    },

    /**
     * Get inventory rotation index
     * Rotation = Cost of Goods Sold / Average Inventory
     */
    _getInventoryRotation: async (dateFilter) => {
        // Get products with their sales and current stock
        const products = await Product.findAll({
            include: [{
                model: Batch,
                as: 'batches'
            }]
        });

        // Get sales per product in period
        const salesByProduct = await SaleProduct.findAll({
            where: dateFilter,
            attributes: [
                'productId',
                [sequelize.fn('SUM', sequelize.col('quantity')), 'soldQty']
            ],
            group: ['productId'],
            raw: true
        });

        const salesMap = {};
        salesByProduct.forEach(s => {
            salesMap[s.productId] = parseInt(s.soldQty);
        });

        // Calculate rotation for each product
        const rotationData = products.map(p => {
            const currentStock = p.batches ? p.batches.reduce((sum, b) => sum + b.quantity, 0) : 0;
            const soldQty = salesMap[p.id] || 0;
            const avgInventory = (currentStock + soldQty) / 2;
            const rotation = avgInventory > 0 ? (soldQty / avgInventory).toFixed(2) : 0;

            return {
                id: p.id,
                name: p.name,
                currentStock,
                soldQty,
                rotation: parseFloat(rotation),
                status: parseFloat(rotation) > 1 ? 'alta' : parseFloat(rotation) > 0.5 ? 'media' : 'baja'
            };
        }).filter(p => p.currentStock > 0 || p.soldQty > 0)
            .sort((a, b) => b.rotation - a.rotation)
            .slice(0, 10);

        return {
            labels: rotationData.map(p => p.name),
            data: rotationData.map(p => p.rotation),
            details: rotationData
        };
    },

    /**
     * Get sales by category
     */
    _getSalesByCategory: async (dateFilter) => {
        const salesByCategory = await SaleProduct.findAll({
            where: dateFilter,
            include: [{
                model: Product,
                attributes: ['category']
            }],
            attributes: [
                [sequelize.fn('SUM', sequelize.col('quantity')), 'totalQty'],
                [sequelize.fn('SUM', sequelize.literal('"SaleProduct"."quantity" * "SaleProduct"."unitPrice"')), 'totalRevenue']
            ],
            group: ['Product.category', 'Product.id'],
            raw: true
        });

        // Aggregate by category
        const categoryMap = {};
        salesByCategory.forEach(s => {
            const cat = s['Product.category'] || 'Sin categoría';
            if (!categoryMap[cat]) {
                categoryMap[cat] = { qty: 0, revenue: 0 };
            }
            categoryMap[cat].qty += parseInt(s.totalQty) || 0;
            categoryMap[cat].revenue += parseFloat(s.totalRevenue) || 0;
        });

        const categories = Object.keys(categoryMap);
        return {
            labels: categories,
            data: categories.map(c => categoryMap[c].revenue),
            quantities: categories.map(c => categoryMap[c].qty)
        };
    },

    /**
     * Get FIFO/LIFO analysis for inventory valuation
     */
    _getFifoLifoAnalysis: async () => {
        // Get all batches ordered by date
        const batches = await Batch.findAll({
            where: { quantity: { [Op.gt]: 0 } },
            include: [{
                model: Product,
                attributes: ['name', 'price']
            }],
            order: [['purchaseDate', 'ASC']]
        });

        let fifoValue = 0;
        let lifoValue = 0;
        const productAnalysis = {};

        // Group batches by product
        batches.forEach(batch => {
            const productId = batch.productId;
            if (!productAnalysis[productId]) {
                productAnalysis[productId] = {
                    name: batch.Product ? batch.Product.name : 'Unknown',
                    salePrice: batch.Product ? batch.Product.price : 0,
                    batches: []
                };
            }
            productAnalysis[productId].batches.push({
                quantity: batch.quantity,
                purchasePrice: batch.purchasePrice,
                purchaseDate: batch.purchaseDate
            });
        });

        // Calculate FIFO and LIFO values
        const analysisResults = Object.keys(productAnalysis).map(productId => {
            const product = productAnalysis[productId];
            const sortedBatches = [...product.batches].sort((a, b) => new Date(a.purchaseDate) - new Date(b.purchaseDate));
            const reversedBatches = [...sortedBatches].reverse();

            // FIFO: Use oldest batches first
            const fifoTotal = sortedBatches.reduce((sum, b) => sum + (b.quantity * b.purchasePrice), 0);

            // LIFO: Use newest batches first (same calculation for inventory value, but different for COGS)
            const lifoTotal = reversedBatches.reduce((sum, b) => sum + (b.quantity * b.purchasePrice), 0);

            const totalQty = sortedBatches.reduce((sum, b) => sum + b.quantity, 0);
            const avgCost = totalQty > 0 ? fifoTotal / totalQty : 0;
            const potentialRevenue = totalQty * product.salePrice;
            const potentialProfit = potentialRevenue - fifoTotal;

            fifoValue += fifoTotal;
            lifoValue += lifoTotal;

            return {
                name: product.name,
                totalQty,
                fifoValue: fifoTotal,
                lifoValue: lifoTotal,
                avgCost: avgCost.toFixed(2),
                salePrice: product.salePrice,
                potentialProfit: potentialProfit.toFixed(2),
                margin: potentialRevenue > 0 ? ((potentialProfit / potentialRevenue) * 100).toFixed(1) : 0
            };
        }).filter(p => p.totalQty > 0)
            .sort((a, b) => b.fifoValue - a.fifoValue)
            .slice(0, 10);

        return {
            totalFifoValue: fifoValue,
            totalLifoValue: lifoValue,
            difference: Math.abs(fifoValue - lifoValue),
            products: analysisResults
        };
    },

    /**
     * Get stock alerts (expiring soon, low stock, out of stock)
     */
    _getStockAlerts: async () => {
        const now = new Date();
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(now.getDate() + 30);

        // Products with low stock
        const products = await Product.findAll({
            include: [{
                model: Batch,
                as: 'batches'
            }]
        });

        const lowStock = [];
        const outOfStock = [];

        products.forEach(p => {
            const stock = p.batches ? p.batches.reduce((sum, b) => sum + b.quantity, 0) : 0;
            if (stock === 0) {
                outOfStock.push({ id: p.id, name: p.name, stock: 0 });
            } else if (stock < 10) {
                lowStock.push({ id: p.id, name: p.name, stock });
            }
        });

        return {
            lowStock: lowStock.slice(0, 5),
            outOfStock: outOfStock.slice(0, 5),
            lowStockCount: lowStock.length,
            outOfStockCount: outOfStock.length
        };
    }
};

module.exports = kpiController;

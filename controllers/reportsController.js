const PDFDocument = require('pdfkit');
const { stringify } = require('csv-stringify/sync');
const path = require('path');
const fs = require('fs');
const { Sale, SaleProduct, Product, User, sequelize, Op } = require('../config/db');

/**
 * Reports Controller
 * Handles PDF and CSV report generation for admin users
 */
const reportsController = {

    /**
     * Get report preview with KPIs
     * @route GET /reports/preview
     */
    getReportPreview: async (req, res) => {
        try {
            const { startDate, endDate } = req.query;

            if (!startDate) {
                return res.status(400).json({ success: false, message: 'Se requiere fecha de inicio' });
            }

            const dateFilter = reportsController._buildDateFilter(startDate, endDate);
            const kpis = await reportsController._calculateKPIs(dateFilter);

            res.json({
                success: true,
                data: kpis
            });
        } catch (error) {
            console.error('Error en preview de reporte:', error);
            res.status(500).json({ success: false, message: 'Error al generar preview' });
        }
    },

    /**
     * Generate and download PDF report
     * @route GET /reports/pdf
     */
    generatePDFReport: async (req, res) => {
        try {
            const { startDate, endDate } = req.query;

            if (!startDate) {
                return res.status(400).json({ success: false, message: 'Se requiere fecha de inicio' });
            }

            const dateFilter = reportsController._buildDateFilter(startDate, endDate);
            const kpis = await reportsController._calculateKPIs(dateFilter);
            const sales = await reportsController._getSalesDetails(dateFilter);
            const topProducts = await reportsController._getTopProducts(dateFilter);
            const dailyBreakdown = await reportsController._getDailyBreakdown(dateFilter);

            // Create PDF
            const doc = new PDFDocument({ margin: 50, size: 'LETTER' });

            // Set response headers for download
            const fileName = endDate
                ? `reporte_ventas_${startDate}_a_${endDate}.pdf`
                : `reporte_ventas_${startDate}.pdf`;

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

            doc.pipe(res);

            // Generate PDF content
            await reportsController._buildPDFContent(doc, {
                user: req.session.user,
                startDate,
                endDate,
                kpis,
                sales,
                topProducts,
                dailyBreakdown
            });

            doc.end();

        } catch (error) {
            console.error('Error generando PDF:', error);
            res.status(500).json({ success: false, message: 'Error al generar PDF' });
        }
    },

    /**
     * Generate and download CSV report
     * @route GET /reports/csv
     */
    generateCSVReport: async (req, res) => {
        try {
            const { startDate, endDate } = req.query;

            if (!startDate) {
                return res.status(400).json({ success: false, message: 'Se requiere fecha de inicio' });
            }

            const dateFilter = reportsController._buildDateFilter(startDate, endDate);
            const sales = await reportsController._getSalesDetails(dateFilter);
            const kpis = await reportsController._calculateKPIs(dateFilter);
            const topProducts = await reportsController._getTopProducts(dateFilter);
            const dailyBreakdown = await reportsController._getDailyBreakdown(dateFilter);

            // Build CSV data with better organization
            const csvData = [];

            // ===== HEADER SECTION =====
            csvData.push(['═══════════════════════════════════════════════════════════════']);
            csvData.push(['', 'REPORTE DE VENTAS - MAXMARKET', '']);
            csvData.push(['═══════════════════════════════════════════════════════════════']);
            csvData.push([]);
            csvData.push(['INFORMACIÓN DEL REPORTE']);
            csvData.push(['───────────────────────────────────────────────────────────────']);
            csvData.push(['Generado por:', req.session.user.name]);
            csvData.push(['Email:', req.session.user.email]);
            csvData.push(['Fecha de generación:', new Date().toLocaleString('es-CL')]);
            csvData.push(['Período del reporte:', endDate ? `${startDate} al ${endDate}` : startDate]);
            csvData.push([]);

            // ===== KPIs SECTION =====
            csvData.push(['═══════════════════════════════════════════════════════════════']);
            csvData.push(['', 'INDICADORES CLAVE (KPIs)', '']);
            csvData.push(['═══════════════════════════════════════════════════════════════']);
            csvData.push([]);
            csvData.push(['Indicador', 'Valor', 'Descripción']);
            csvData.push(['───────────────────────────────────────────────────────────────']);
            csvData.push(['Total Ventas', `Bs. ${kpis.totalSales.toFixed(2)}`, 'Suma total de todas las ventas']);
            csvData.push(['Transacciones', kpis.totalTransactions, 'Número total de ventas realizadas']);
            csvData.push(['Ticket Promedio', `Bs. ${kpis.averageTicket.toFixed(2)}`, 'Promedio por transacción']);
            csvData.push(['Productos Vendidos', kpis.totalProductsSold, 'Cantidad total de items vendidos']);
            csvData.push([]);

            // ===== DAILY BREAKDOWN (if range) =====
            if (dailyBreakdown.length > 1) {
                csvData.push(['═══════════════════════════════════════════════════════════════']);
                csvData.push(['', 'DESGLOSE POR DÍA', '']);
                csvData.push(['═══════════════════════════════════════════════════════════════']);
                csvData.push([]);
                csvData.push(['Fecha', 'Ventas (Bs.)', 'Transacciones', 'Ticket Promedio (Bs.)']);
                csvData.push(['───────────────────────────────────────────────────────────────']);

                dailyBreakdown.forEach(day => {
                    csvData.push([
                        day.date,
                        `Bs. ${day.total.toFixed(2)}`,
                        day.transactions,
                        `Bs. ${day.average.toFixed(2)}`
                    ]);
                });
                csvData.push([]);
            }

            // ===== TOP PRODUCTS SECTION =====
            if (topProducts.length > 0) {
                csvData.push(['═══════════════════════════════════════════════════════════════']);
                csvData.push(['', 'TOP 5 PRODUCTOS MÁS VENDIDOS', '']);
                csvData.push(['═══════════════════════════════════════════════════════════════']);
                csvData.push([]);
                csvData.push(['Ranking', 'Producto', 'Cantidad Vendida']);
                csvData.push(['───────────────────────────────────────────────────────────────']);

                topProducts.forEach((product, index) => {
                    csvData.push([`#${index + 1}`, product.name, product.quantity]);
                });
                csvData.push([]);
            }

            // ===== SALES DETAIL SECTION =====
            csvData.push(['═══════════════════════════════════════════════════════════════']);
            csvData.push(['', 'DETALLE DE VENTAS', '']);
            csvData.push(['═══════════════════════════════════════════════════════════════']);
            csvData.push([]);
            csvData.push(['ID Venta', 'Fecha', 'Hora', 'Cajero', 'Cant. Items', 'Total Venta (Bs.)', 'Efectivo Recibido (Bs.)', 'Cambio (Bs.)']);
            csvData.push(['───────────────────────────────────────────────────────────────']);

            // Sales rows
            sales.forEach(sale => {
                const change = sale.cashReceived - sale.totalAmount;
                csvData.push([
                    sale.id,
                    new Date(sale.createdAt).toLocaleDateString('es-CL'),
                    new Date(sale.createdAt).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
                    sale.User ? sale.User.name : 'N/A',
                    sale.itemCount,
                    `Bs. ${sale.totalAmount.toFixed(2)}`,
                    `Bs. ${sale.cashReceived.toFixed(2)}`,
                    `Bs. ${change.toFixed(2)}`
                ]);
            });

            csvData.push([]);
            csvData.push(['───────────────────────────────────────────────────────────────']);
            csvData.push(['', '', '', 'TOTALES:', sales.reduce((sum, s) => sum + s.itemCount, 0), `Bs. ${kpis.totalSales.toFixed(2)}`, '', '']);
            csvData.push([]);

            // ===== FOOTER =====
            csvData.push(['═══════════════════════════════════════════════════════════════']);
            csvData.push(['Reporte generado automáticamente por MAXMARKET Sistema de Gestión']);
            csvData.push([`© ${new Date().getFullYear()} MAXMARKET - Todos los derechos reservados`]);
            csvData.push(['═══════════════════════════════════════════════════════════════']);

            const csvString = stringify(csvData);

            // Set response headers
            const fileName = endDate
                ? `reporte_ventas_${startDate}_a_${endDate}.csv`
                : `reporte_ventas_${startDate}.csv`;

            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

            // Add BOM for Excel UTF-8 compatibility
            res.send('\uFEFF' + csvString);

        } catch (error) {
            console.error('Error generando CSV:', error);
            res.status(500).json({ success: false, message: 'Error al generar CSV' });
        }
    },

    // ==================== PRIVATE HELPER METHODS ====================

    /**
     * Build date filter for queries
     */
    _buildDateFilter: (startDate, endDate) => {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);

        const end = endDate ? new Date(endDate) : new Date(startDate);
        end.setHours(23, 59, 59, 999);

        return {
            createdAt: {
                [Op.between]: [start, end]
            }
        };
    },

    /**
     * Calculate KPIs for the given date range
     */
    _calculateKPIs: async (dateFilter) => {
        // Get all sales in range
        const sales = await Sale.findAll({
            where: dateFilter,
            include: [{
                model: Product,
                through: { attributes: ['quantity'] }
            }]
        });

        const totalSales = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
        const totalTransactions = sales.length;
        const averageTicket = totalTransactions > 0 ? totalSales / totalTransactions : 0;

        // Count total products sold
        let totalProductsSold = 0;
        for (const sale of sales) {
            const saleProducts = await SaleProduct.findAll({
                where: { saleId: sale.id }
            });
            totalProductsSold += saleProducts.reduce((sum, sp) => sum + sp.quantity, 0);
        }

        return {
            totalSales,
            totalTransactions,
            averageTicket,
            totalProductsSold
        };
    },

    /**
     * Get daily breakdown of sales
     */
    _getDailyBreakdown: async (dateFilter) => {
        const sales = await Sale.findAll({
            where: dateFilter,
            order: [['createdAt', 'ASC']]
        });

        const dailyMap = {};

        sales.forEach(sale => {
            const dateKey = new Date(sale.createdAt).toLocaleDateString('es-CL');
            if (!dailyMap[dateKey]) {
                dailyMap[dateKey] = { total: 0, transactions: 0 };
            }
            dailyMap[dateKey].total += sale.totalAmount;
            dailyMap[dateKey].transactions += 1;
        });

        return Object.entries(dailyMap).map(([date, data]) => ({
            date,
            total: data.total,
            transactions: data.transactions,
            average: data.transactions > 0 ? data.total / data.transactions : 0
        }));
    },

    /**
     * Get detailed sales list
     */
    _getSalesDetails: async (dateFilter) => {
        const sales = await Sale.findAll({
            where: dateFilter,
            include: [{
                model: User,
                attributes: ['name']
            }],
            order: [['createdAt', 'DESC']]
        });

        // Add item count to each sale
        const salesWithCounts = await Promise.all(sales.map(async (sale) => {
            const saleProducts = await SaleProduct.findAll({
                where: { saleId: sale.id }
            });
            const itemCount = saleProducts.reduce((sum, sp) => sum + sp.quantity, 0);
            return {
                ...sale.toJSON(),
                itemCount
            };
        }));

        return salesWithCounts;
    },

    /**
     * Get top selling products
     */
    _getTopProducts: async (dateFilter) => {
        const sales = await Sale.findAll({
            where: dateFilter,
            attributes: ['id']
        });

        const saleIds = sales.map(s => s.id);

        if (saleIds.length === 0) {
            return [];
        }

        const topProducts = await SaleProduct.findAll({
            where: { saleId: { [Op.in]: saleIds } },
            attributes: [
                'productId',
                [sequelize.fn('SUM', sequelize.col('quantity')), 'totalQty']
            ],
            include: [{
                model: Product,
                attributes: ['name']
            }],
            group: ['productId', 'Product.id'],
            order: [[sequelize.literal('"totalQty"'), 'DESC']],
            limit: 5
        });

        return topProducts.map(tp => ({
            name: tp.Product ? tp.Product.name : 'Producto eliminado',
            quantity: parseInt(tp.getDataValue('totalQty'))
        }));
    },

    /**
     * Build PDF document content with enhanced KPIs
     */
    _buildPDFContent: async (doc, data) => {
        const { user, startDate, endDate, kpis, sales, topProducts, dailyBreakdown } = data;

        // Colors
        const brandColor = '#16a34a';
        const brandLight = '#dcfce7';
        const brandDark = '#14532d';
        const grayColor = '#4b5563';
        const lightGray = '#f3f4f6';
        const blueColor = '#3b82f6';
        const purpleColor = '#8b5cf6';
        const orangeColor = '#f97316';

        // Logo path
        const logoPath = path.join(__dirname, '..', 'public', 'img', 'logo.png');

        // ========== HEADER ==========
        // Logo (right side)
        if (fs.existsSync(logoPath)) {
            doc.image(logoPath, doc.page.width - 130, 35, { width: 80 });
        }

        // Title and meta info (left side)
        doc.fontSize(22)
            .fillColor(brandDark)
            .font('Helvetica-Bold')
            .text('REPORTE DE VENTAS', 50, 40);

        doc.fontSize(12)
            .fillColor(brandColor)
            .font('Helvetica')
            .text('MAXMARKET - Sistema de Gestión', 50, 65);

        doc.moveTo(50, 85)
            .lineTo(350, 85)
            .strokeColor(brandColor)
            .lineWidth(2)
            .stroke();

        doc.fontSize(9)
            .fillColor(grayColor)
            .font('Helvetica');

        const metaY = 95;
        doc.text(`Generado por: ${user.name}`, 50, metaY);
        doc.text(`Fecha solicitud: ${new Date().toLocaleString('es-CL')}`, 50, metaY + 12);
        doc.text(`Período: ${endDate ? `${startDate} al ${endDate}` : startDate}`, 50, metaY + 24);

        // ========== KPI SECTION TITLE ==========
        let currentY = 145;

        doc.fontSize(14)
            .fillColor(brandDark)
            .font('Helvetica-Bold')
            .text('📊 INDICADORES CLAVE DE RENDIMIENTO', 50, currentY);

        currentY += 25;

        // ========== ENHANCED KPI BOXES ==========
        const boxWidth = 125;
        const boxHeight = 75;
        const gap = 10;

        const kpiColors = [brandColor, blueColor, purpleColor, orangeColor];
        // Removed emojis to avoid encoding issues with standard fonts
        const kpiData = [
            { label: 'TOTAL VENTAS', value: `Bs. ${kpis.totalSales.toLocaleString('es-CL', { minimumFractionDigits: 0 })}`, sublabel: 'Ingresos del período' },
            { label: 'TRANSACCIONES', value: kpis.totalTransactions.toString(), sublabel: 'Ventas realizadas' },
            { label: 'TICKET PROMEDIO', value: `Bs. ${kpis.averageTicket.toLocaleString('es-CL', { minimumFractionDigits: 0 })}`, sublabel: 'Por transacción' },
            { label: 'PRODUCTOS', value: kpis.totalProductsSold.toString(), sublabel: 'Items vendidos' }
        ];

        kpiData.forEach((kpi, index) => {
            const x = 50 + (index * (boxWidth + gap));

            // Box border
            doc.roundedRect(x, currentY, boxWidth, boxHeight, 8)
                .strokeColor(kpiColors[index])
                .lineWidth(2)
                .stroke();

            // Header bar
            doc.roundedRect(x, currentY, boxWidth, 22, 8)
                .fillColor(kpiColors[index])
                .fill();

            // Fix corners
            doc.rect(x, currentY + 14, boxWidth, 8)
                .fillColor(kpiColors[index])
                .fill();

            // Label in header (without icon)
            doc.fontSize(9)
                .fillColor('#ffffff')
                .font('Helvetica-Bold')
                .text(kpi.label, x + 8, currentY + 6, { width: boxWidth - 16, align: 'center' });

            // Value
            doc.fontSize(20)
                .fillColor(kpiColors[index])
                .font('Helvetica-Bold')
                .text(kpi.value, x, currentY + 32, { width: boxWidth, align: 'center' });

            // Sublabel
            doc.fontSize(7)
                .fillColor(grayColor)
                .font('Helvetica')
                .text(kpi.sublabel, x, currentY + 58, { width: boxWidth, align: 'center' });
        });

        currentY += boxHeight + 25;

        // ========== TOP PRODUCTS SECTION ==========
        if (topProducts.length > 0) {
            doc.fontSize(12)
                .fillColor(brandDark)
                .font('Helvetica-Bold')
                .text('TOP 5 PRODUCTOS MÁS VENDIDOS', 50, currentY);

            currentY += 20;

            // Product bars
            const maxQty = Math.max(...topProducts.map(p => p.quantity));
            const barMaxWidth = 250;

            topProducts.forEach((product, index) => {
                const barWidth = (product.quantity / maxQty) * barMaxWidth;
                // Simple numbering instead of medals
                const rank = `#${index + 1}`;

                // Product name
                doc.fontSize(9)
                    .fillColor(grayColor)
                    .font('Helvetica')
                    .text(`${rank} ${product.name}`, 55, currentY + 2);

                // Progress bar background
                doc.roundedRect(200, currentY, barMaxWidth, 14, 3)
                    .fillColor(lightGray)
                    .fill();

                // Progress bar fill
                if (barWidth > 0) {
                    doc.roundedRect(200, currentY, barWidth, 14, 3)
                        .fillColor(brandColor)
                        .fill();
                }

                // Quantity label
                doc.fontSize(8)
                    .fillColor(brandDark)
                    .font('Helvetica-Bold')
                    .text(product.quantity.toString(), 460, currentY + 2);

                currentY += 20;
            });

            currentY += 10;
        }

        // ========== SALES TABLE ==========
        doc.fontSize(12)
            .fillColor(brandDark)
            .font('Helvetica-Bold')
            .text('DETALLE DE VENTAS', 50, currentY);

        currentY += 20;

        // Table header
        const colWidths = [35, 65, 50, 110, 45, 70, 70];
        const headers = ['ID', 'Fecha', 'Hora', 'Cajero', 'Items', 'Total', 'Efectivo'];

        doc.roundedRect(50, currentY, 510, 18, 4)
            .fillColor(brandColor)
            .fill();

        doc.fontSize(8)
            .fillColor('#ffffff')
            .font('Helvetica-Bold');

        let headerX = 55;
        headers.forEach((header, i) => {
            doc.text(header, headerX, currentY + 5, { width: colWidths[i] - 5 });
            headerX += colWidths[i];
        });

        currentY += 18;

        // Table rows
        doc.font('Helvetica')
            .fillColor(grayColor)
            .fontSize(8);

        const maxRows = Math.min(sales.length, 12);

        for (let i = 0; i < maxRows; i++) {
            const sale = sales[i];

            // Alternate row background
            if (i % 2 === 0) {
                doc.rect(50, currentY, 510, 16)
                    .fillColor('#fafafa')
                    .fill();
            }

            doc.fillColor(grayColor);

            let rowX = 55;
            const rowData = [
                sale.id.toString(),
                new Date(sale.createdAt).toLocaleDateString('es-CL'),
                new Date(sale.createdAt).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
                sale.User ? sale.User.name.substring(0, 18) : 'N/A',
                sale.itemCount.toString(),
                `Bs. ${sale.totalAmount.toLocaleString('es-CL', { minimumFractionDigits: 0 })}`,
                `Bs. ${sale.cashReceived.toLocaleString('es-CL', { minimumFractionDigits: 0 })}`
            ];

            rowData.forEach((cell, j) => {
                doc.text(cell, rowX, currentY + 4, { width: colWidths[j] - 5 });
                rowX += colWidths[j];
            });

            currentY += 16;
        }

        if (sales.length > maxRows) {
            doc.fontSize(8)
                .fillColor(grayColor)
                .font('Helvetica-Oblique')
                .text(`... y ${sales.length - maxRows} ventas adicionales`, 50, currentY + 3);
            currentY += 18;
        }

        // ========== SUMMARY ROW ==========
        doc.roundedRect(50, currentY, 510, 20, 4)
            .fillColor(brandLight)
            .fill();

        doc.fontSize(9)
            .fillColor(brandDark)
            .font('Helvetica-Bold')
            .text('TOTAL DEL PERÍODO:', 55, currentY + 5);

        doc.text(`${sales.reduce((sum, s) => sum + s.itemCount, 0)} items`, 310, currentY + 5);
        doc.text(`Bs. ${kpis.totalSales.toLocaleString('es-CL', { minimumFractionDigits: 0 })}`, 380, currentY + 5);

        // ========== FOOTER ==========
        const footerY = doc.page.height - 50;

        doc.moveTo(50, footerY)
            .lineTo(doc.page.width - 50, footerY)
            .strokeColor(brandColor)
            .lineWidth(1)
            .stroke();

        doc.fontSize(8)
            .fillColor(grayColor)
            .font('Helvetica')
            .text('MAXMARKET - Sistema de Gestión de Minimarket', 50, footerY + 8, {
                width: doc.page.width - 100,
                align: 'center'
            });

        doc.fontSize(7)
            .text(`Documento generado automáticamente el ${new Date().toLocaleString('es-CL')} | © ${new Date().getFullYear()}`, 50, footerY + 20, {
                width: doc.page.width - 100,
                align: 'center'
            });
    }
};

module.exports = reportsController;

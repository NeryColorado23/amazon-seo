const express = require('express');
const mongoose = require('mongoose');
const Listing = require('../models/Listing');
const Keyword = require('../models/Keyword');
const CostInventory = require('../models/CostInventory');
const PPC = require('../models/PPC');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/overview — datos unificados por SKU
router.get('/', auth, async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const { search, category } = req.query;

    // Obtener todas las fuentes
    const [listings, costs, ppcData] = await Promise.all([
      Listing.find({ userId }),
      CostInventory.find({ userId }),
      PPC.find({ userId }),
    ]);

    // Crear mapa por identifier/asin
    const costsMap = {};
    costs.forEach(c => { costsMap[c.identifier] = c; });

    const ppcMap = {};
    ppcData.forEach(p => { ppcMap[p.identifier] = p; });

    // Unificar por SKU
    let unified = listings.map(listing => {
      const sku = listing.asin;
      const cost = costsMap[sku] || {};
      const ppc = ppcMap[sku] || {};

      // Métricas unificadas
      const revenue = listing.orderedProductSales || 0;
      const units = listing.salesPerDay || 0;
      const adSpend = ppc.adSpend || 0;
      const cogs = cost.cogs || 0;
      const salePrice = cost.salePrice || 0;
      const margin = cost.margin || 0;
      const marginPct = cost.marginPct || 0;
      const fbaStock = cost.fbaStock || 0;
      const reorderPoint = cost.reorderPoint || 0;
      const stockStatus = cost.stockStatus || 'unknown';
      const acos = ppc.acos || 0;
      const roas = ppc.roas || 0;
      const clicks = ppc.clicks || 0;
      const impressions = ppc.impressions || 0;
      const orders = ppc.orders || 0;
      const ctr = ppc.ctr || 0;

      // Calcular profit real
      const totalCogs = units * cogs;
      const grossProfit = revenue - totalCogs - adSpend;

      // Score de salud del producto (0-100)
      let score = 100;
      const alerts = [];
      const recommendations = [];

      // ACOS
      if (acos > 40) { score -= 25; alerts.push({ type: 'danger', msg: `ACOS muy alto: ${acos.toFixed(1)}% (recomendado <30%)` }); recommendations.push('Optimiza tus bids de PPC y pausa keywords no rentables'); }
      else if (acos > 30) { score -= 10; alerts.push({ type: 'warning', msg: `ACOS elevado: ${acos.toFixed(1)}%` }); recommendations.push('Revisa y ajusta tus bids de PPC'); }

      // Stock
      if (stockStatus === 'out') { score -= 30; alerts.push({ type: 'danger', msg: 'Sin stock — producto pausado en Amazon' }); recommendations.push('Reabastece urgentemente para no perder ranking'); }
      else if (stockStatus === 'low') { score -= 15; alerts.push({ type: 'warning', msg: `Stock bajo: ${fbaStock} unidades (reorder point: ${reorderPoint})` }); recommendations.push(`Genera orden de compra — lead time: ${cost.leadTimeDays || 0} días`); }

      // Margen
      if (marginPct < 20) { score -= 20; alerts.push({ type: 'danger', msg: `Margen muy bajo: ${marginPct.toFixed(1)}%` }); recommendations.push('Negocia mejor precio con proveedor o aumenta el precio de venta'); }
      else if (marginPct < 30) { score -= 10; alerts.push({ type: 'warning', msg: `Margen ajustado: ${marginPct.toFixed(1)}%` }); recommendations.push('Considera optimizar costos o precio'); }

      // Ventas
      if (units === 0) { score -= 15; alerts.push({ type: 'warning', msg: 'Sin ventas registradas' }); recommendations.push('Verifica el listing y activa PPC para generar tráfico'); }

      // CTR bajo
      if (impressions > 0 && ctr < 0.3) { score -= 10; alerts.push({ type: 'info', msg: `CTR bajo: ${ctr.toFixed(2)}%` }); recommendations.push('Mejora la imagen principal y el título del listing para aumentar CTR'); }

      // Sin PPC
      if (adSpend === 0 && units > 0) { recommendations.push('Activa campañas PPC para acelerar ventas orgánicas'); }

      score = Math.max(0, Math.min(100, score));

      const scoreLabel = score >= 80 ? 'Excelente' : score >= 60 ? 'Bueno' : score >= 40 ? 'Regular' : 'Crítico';
      const scoreColor = score >= 80 ? 'green' : score >= 60 ? 'blue' : score >= 40 ? 'orange' : 'red';

      return {
        sku,
        title: listing.title,
        category: listing.category,
        // Ventas
        units,
        revenue,
        totalOrderItems: listing.totalOrderItems || 0,
        // Costos
        cogs,
        salePrice,
        margin,
        marginPct,
        grossProfit,
        // Inventario
        fbaStock,
        reorderPoint,
        stockStatus,
        leadTimeDays: cost.leadTimeDays || 0,
        supplier: cost.supplier || '',
        // PPC
        adSpend,
        impressions,
        clicks,
        orders,
        ctr,
        acos,
        roas,
        // Score
        score,
        scoreLabel,
        scoreColor,
        alerts,
        recommendations,
        hasSales: !!costsMap[sku] === false && units > 0,
        hasCosts: !!costsMap[sku],
        hasPPC: !!ppcMap[sku],
      };
    });

    // Filtros
    if (search) {
      const s = search.toLowerCase();
      unified = unified.filter(u =>
        u.sku.toLowerCase().includes(s) ||
        u.title.toLowerCase().includes(s) ||
        u.category.toLowerCase().includes(s)
      );
    }
    if (category) {
      unified = unified.filter(u => u.category === category);
    }

    // Stats generales
    const totalRevenue = unified.reduce((s, u) => s + u.revenue, 0);
    const totalAdSpend = unified.reduce((s, u) => s + u.adSpend, 0);
    const totalUnits = unified.reduce((s, u) => s + u.units, 0);
    const totalOrders = unified.reduce((s, u) => s + u.orders, 0);
    const avgScore = unified.length > 0
      ? unified.reduce((s, u) => s + u.score, 0) / unified.length : 0;
    const criticalProducts = unified.filter(u => u.score < 40).length;
    const lowStockCount = unified.filter(u => u.stockStatus === 'low' || u.stockStatus === 'out').length;

    // Stats por categoría
    const categoryMap = {};
    unified.forEach(u => {
      if (!categoryMap[u.category]) {
        categoryMap[u.category] = { category: u.category, products: 0, revenue: 0, adSpend: 0, units: 0, avgScore: 0, scores: [] };
      }
      categoryMap[u.category].products++;
      categoryMap[u.category].revenue += u.revenue;
      categoryMap[u.category].adSpend += u.adSpend;
      categoryMap[u.category].units += u.units;
      categoryMap[u.category].scores.push(u.score);
    });

    const byCategory = Object.values(categoryMap).map(c => ({
      ...c,
      avgScore: c.scores.reduce((s, v) => s + v, 0) / c.scores.length,
      scores: undefined,
    }));

    return res.json({
      products: unified,
      stats: {
        totalProducts: unified.length,
        totalRevenue,
        totalAdSpend,
        totalUnits,
        totalOrders,
        avgScore: parseFloat(avgScore.toFixed(1)),
        criticalProducts,
        lowStockCount,
        netProfit: totalRevenue - totalAdSpend,
      },
      byCategory,
      categories: [...new Set(unified.map(u => u.category))],
    });

  } catch (error) {
    console.error('Overview error:', error.message);
    return res.status(500).json({ message: 'Error del servidor', error: error.message });
  }
});

module.exports = router;
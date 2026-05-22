const express = require('express');
const Groq = require('groq-sdk');
const Keyword = require('../models/Keyword');
const auth = require('../middleware/auth');

const router = express.Router();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// POST /api/ai/generate-listing
router.post('/generate-listing', auth, async (req, res) => {
  try {
    const { category, keywords, productType, extraInfo } = req.body;

    if (!category) {
      return res.status(400).json({ message: 'La categoría es requerida.' });
    }

    let topKeywords = keywords || [];
    if (topKeywords.length === 0) {
      const dbKeywords = await Keyword.find({ userId: req.user.id, category })
        .sort({ searchVolume: -1 })
        .limit(20);
      topKeywords = dbKeywords.map(k => `${k.keyword} (vol: ${k.searchVolume})`);
    }

    const kwList = topKeywords.slice(0, 20).join('\n- ');

    const prompt = `Eres un experto en Amazon SEO con 10 años de experiencia optimizando listings para máximo ranking y conversión.

PRODUCTO A OPTIMIZAR:
- Categoría: ${category}
- Tipo: ${productType || category}
- Info extra: ${extraInfo || 'ninguna'}

KEYWORDS DISPONIBLES (úsalas TODAS en el listing):
- ${kwList}

INSTRUCCIONES CRÍTICAS — DEBES CUMPLIRLAS AL PIE DE LA LETRA:

TÍTULO (EXACTAMENTE entre 180-200 caracteres):
- Incluye las 5-6 keywords de mayor volumen
- Formato: [Keyword Principal] – [Keyword 2], [Keyword 3], [Beneficio], [Keyword 4], [Tamaño/Pack]
- CUENTA los caracteres y asegúrate de llegar a 180-200

BULLET POINTS (cada uno EXACTAMENTE entre 90-100 caracteres):
- Empieza con un BENEFICIO EN MAYÚSCULAS seguido de dos puntos
- Incluye 2-3 keywords por bullet
- CUENTA los caracteres — deben ser entre 90 y 100, ni más ni menos
- Si es corto, expándelo con más detalles del beneficio

DESCRIPCIÓN (entre 1500-2000 caracteres):
- Párrafo 1: problema que resuelve + keyword principal
- Párrafo 2: características + 4-5 keywords
- Párrafo 3: usos y ocasiones + 3-4 keywords
- Párrafo 4: call to action + keywords restantes

SEARCH TERMS (EXACTAMENTE entre 240-250 caracteres):
- Solo keywords NO usadas en título ni bullets
- Separadas por espacios, sin comas
- CUENTA los caracteres

Todo en INGLÉS como Amazon USA.

Responde ÚNICAMENTE con JSON válido sin backticks ni texto adicional:
{
  "title": "título de 180-200 chars aquí",
  "bullet1": "BENEFICIO: texto de exactamente 90-100 caracteres aquí con keywords",
  "bullet2": "BENEFICIO: texto de exactamente 90-100 caracteres aquí con keywords",
  "bullet3": "BENEFICIO: texto de exactamente 90-100 caracteres aquí con keywords",
  "bullet4": "BENEFICIO: texto de exactamente 90-100 caracteres aquí con keywords",
  "bullet5": "BENEFICIO: texto de exactamente 90-100 caracteres aquí con keywords",
  "description": "descripción de 1500-2000 chars",
  "searchTerms": "keywords de 240-250 chars",
  "keywordsUsed": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5", "keyword6", "keyword7", "keyword8"]
}`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.4,
      max_tokens: 3000,
    });

    const text = completion.choices[0]?.message?.content || '';
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    // Validar y truncar si excede límites
    if (parsed.title?.length > 200) parsed.title = parsed.title.slice(0, 200);
    if (parsed.bullet1?.length > 100) parsed.bullet1 = parsed.bullet1.slice(0, 100);
    if (parsed.bullet2?.length > 100) parsed.bullet2 = parsed.bullet2.slice(0, 100);
    if (parsed.bullet3?.length > 100) parsed.bullet3 = parsed.bullet3.slice(0, 100);
    if (parsed.bullet4?.length > 100) parsed.bullet4 = parsed.bullet4.slice(0, 100);
    if (parsed.bullet5?.length > 100) parsed.bullet5 = parsed.bullet5.slice(0, 100);
    if (parsed.searchTerms?.length > 250) parsed.searchTerms = parsed.searchTerms.slice(0, 250);

    return res.json({ success: true, listing: parsed });

  } catch (error) {
    console.error('AI generate error:', error.message);
    return res.status(500).json({ message: 'Error generando listing', error: error.message });
  }
});

// POST /api/ai/score-listing
router.post('/score-listing', auth, async (req, res) => {
  try {
    const { title, bullet1, bullet2, bullet3, bullet4, bullet5,
            description, searchTerms, category } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'El título es requerido para el análisis.' });
    }

    const dbKeywords = await Keyword.find({ userId: req.user.id, category })
      .sort({ searchVolume: -1 })
      .limit(30);

    const topKeywords = dbKeywords.map(k => k.keyword.toLowerCase());
    const allText = [title, bullet1, bullet2, bullet3, bullet4, bullet5, description, searchTerms]
      .join(' ').toLowerCase();
    const foundKeywords = topKeywords.filter(k => allText.includes(k));

    const prompt = `Eres un experto certificado en Amazon SEO con más de 10 años de experiencia optimizando listings.

Analiza este listing de Amazon y proporciona un análisis detallado:

TÍTULO (${title?.length || 0}/200 chars): ${title || 'vacío'}
BULLET 1 (${bullet1?.length || 0}/100 chars): ${bullet1 || 'vacío'}
BULLET 2 (${bullet2?.length || 0}/100 chars): ${bullet2 || 'vacío'}
BULLET 3 (${bullet3?.length || 0}/100 chars): ${bullet3 || 'vacío'}
BULLET 4 (${bullet4?.length || 0}/100 chars): ${bullet4 || 'vacío'}
BULLET 5 (${bullet5?.length || 0}/100 chars): ${bullet5 || 'vacío'}
DESCRIPCIÓN (${description?.length || 0}/2000 chars): ${description || 'vacía'}
SEARCH TERMS (${searchTerms?.length || 0}/250 chars): ${searchTerms || 'vacíos'}
CATEGORÍA: ${category || 'no especificada'}
KEYWORDS DE LA CATEGORÍA ENCONTRADAS EN EL LISTING: ${foundKeywords.join(', ') || 'ninguna'}
KEYWORDS TOP NO USADAS: ${topKeywords.filter(k => !allText.includes(k)).slice(0, 10).join(', ') || 'ninguna'}

Evalúa estos criterios y da un score justo:
1. Optimización de título (keywords, longitud, estructura)
2. Calidad de bullet points (beneficios claros, keywords, longitud)
3. Descripción (detalle, keywords secundarias, persuasión)
4. Search terms (cobertura, sin repeticiones)
5. Densidad y relevancia de keywords
6. Persuasión y conversión general

Responde ÚNICAMENTE con un JSON válido con este formato exacto, sin backticks ni texto adicional:
{
  "overallScore": 85,
  "grade": "A",
  "summary": "resumen ejecutivo de 2-3 oraciones",
  "scores": {
    "title": { "score": 90, "feedback": "comentario específico del título" },
    "bullets": { "score": 85, "feedback": "comentario específico de los bullets" },
    "description": { "score": 80, "feedback": "comentario específico de la descripción" },
    "searchTerms": { "score": 75, "feedback": "comentario específico de los search terms" },
    "keywords": { "score": 88, "feedback": "comentario sobre uso de keywords" },
    "conversion": { "score": 82, "feedback": "comentario sobre potencial de conversión" }
  },
  "strengths": ["fortaleza 1", "fortaleza 2", "fortaleza 3"],
  "improvements": [
    { "priority": "alta", "area": "área a mejorar", "suggestion": "sugerencia específica de mejora" },
    { "priority": "media", "area": "área a mejorar", "suggestion": "sugerencia específica" },
    { "priority": "baja", "area": "área a mejorar", "suggestion": "sugerencia específica" }
  ],
  "missingKeywords": ["keyword importante no usada 1", "keyword importante no usada 2"],
  "keywordCoverage": ${foundKeywords.length},
  "totalKeywordsAvailable": ${topKeywords.length}
}`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3,
      max_tokens: 2000,
    });

    const text = completion.choices[0]?.message?.content || '';
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    return res.json({ success: true, analysis: parsed });

  } catch (error) {
    console.error('AI score error:', error.message);
    return res.status(500).json({ message: 'Error analizando listing', error: error.message });
  }
});

module.exports = router;
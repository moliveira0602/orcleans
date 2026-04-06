# ORCA — SEO & Performance Checklist

Esta checklist documenta todas as otimizações de SEO, performance e acessibilidade implementadas na landing page ORCA.

---

## ✅ SEO — Meta Tags & Estrutura

### Meta Tags Principais
- [x] `<title>` otimizado com keywords principais (≤60 caracteres)
- [x] `<meta name="description">` persuasiva com CTA (≤160 caracteres)
- [x] `<meta name="keywords">` com termos relevantes B2B
- [x] `<link rel="canonical">` definido
- [x] `<meta name="robots">` configurado como `index, follow`
- [x] `<meta name="author">` definido

### Open Graph (Redes Sociais)
- [x] `og:type` = `website`
- [x] `og:url` = URL canônico
- [x] `og:title` otimizado
- [x] `og:description` persuasiva
- [x] `og:image` definida (ORCA.png)
- [x] `og:locale` = `pt_PT`
- [x] `og:site_name` = `ORCA`

### Twitter Card
- [x] `twitter:card` = `summary_large_image`
- [x] `twitter:title` otimizado
- [x] `twitter:description` persuasiva
- [x] `twitter:image` definida

### Schema.org JSON-LD
- [x] `SoftwareApplication` — nome, descrição, categoria, offers, rating
- [x] `Organization` — nome, URL, logo, sameAs (redes sociais), contactPoint
- [x] `FAQPage` — 4 perguntas/respostas estruturadas
- [x] `AggregateRating` — 4.8/5, 127 reviews

### Estrutura Semântica HTML
- [x] Apenás 1 `<h1>` na página (Hero section)
- [x] Cada secção usa `<section>` com `id` único
- [x] Hierarquia de headings correta (`h1` → `h2` → `h3`)
- [x] `<nav aria-label="Navegação principal">` no header
- [x] Botões com `aria-label` quando necessário
- [x] Imagens com `alt` descritivo
- [x] Footer usa `<footer>` semântico

### Sitemap & Robots
- [x] `public/sitemap.xml` criado com URLs principais
- [x] `public/robots.txt` criado com referência ao sitemap
- [x] Paths sensíveis (`/app/`, `/private/`) bloqueados

---

## ✅ Performance

### Imagens & Assets
- [ ] Todas as imagens com `loading="lazy"` (exceto above-the-fold)
- [ ] Imagens hero com `fetchpriority="high"`
- [ ] Imagens em formato WebP ou SVG
- [ ] `width` e `height` explícitos em todas as `<img>` (evitar CLS)

### Fontes
- [x] `preconnect` para Google Fonts definido
- [ ] Considerar migração para fontes locais
- [ ] `font-display: swap` configurado

### Vite Config
- [ ] `manualChunks` para vendor (react, react-dom)
- [ ] `minify: 'terser'` configurado
- [ ] `drop_console: true` em produção

### Lazy Loading React
- [ ] Secções abaixo do fold com `React.lazy()` + `Suspense`
- [ ] Hero e Nav carregam imediatamente

---

## ✅ Analytics & Tracking

### Google Analytics 4
- [ ] Configurar variável de ambiente `VITE_GA_ID`
- [ ] Adicionar gtag.js no index.html
- [ ] Configurar eventos de conversão:
  - [ ] `cta_click` — cliques em CTAs principais
  - [ ] `section_view` — secções em viewport (IntersectionObserver)
  - [ ] `pricing_toggle` — toggle mensal/anual
  - [ ] `faq_open` — abertura de perguntas FAQ

---

## ✅ Acessibilidade (a11y)

- [x] Contraste de cores adequado (WCAG AA)
- [x] Foco visível em elementos interativos
- [x] `aria-label` em botões sem texto
- [x] Navegação por teclado funcional
- [ ] Testar com screen reader (NVDA/VoiceOver)
- [ ] Skip link para conteúdo principal

---

## 🧪 Como Testar com Lighthouse

1. **Abrir Chrome DevTools** → F12
2. **Ir para aba "Lighthouse"**
3. **Selecionar categorias:**
   - Performance
   - Accessibility
   - Best Practices
   - SEO
4. **Clicar em "Analyze page load"**
5. **Verificar scores:**
   - Performance: ≥ 90
   - Accessibility: ≥ 95
   - Best Practices: ≥ 90
   - SEO: ≥ 95

### Testes Manuais
- [ ] Validar schema JSON-LD: https://search.google.com/test/rich-results
- [ ] Testar mobile-friendly: https://search.google.com/test/mobile-friendly
- [ ] Verificar indexação: `site:orca.ai` no Google
- [ ] Testar velocidade: https://pagespeed.web.dev/

---

## 📊 Métricas Alvo (Core Web Vitals)

| Métrica | Valor Alvo | Status |
|---------|-----------|--------|
| LCP (Largest Contentful Paint) | ≤ 2.5s | ⏳ |
| FID (First Input Delay) | ≤ 100ms | ⏳ |
| CLS (Cumulative Layout Shift) | ≤ 0.1 | ⏳ |
| INP (Interaction to Next Paint) | ≤ 200ms | ⏳ |

---

## 📝 Notas de Implementação

- **Idioma:** pt-PT (português de Portugal)
- **Público-alvo:** Equipas de vendas B2B
- **Keywords principais:** leads B2B, qualificação de leads, CRM inteligente, prospecção comercial, pipeline de vendas
- **CTA principal:** "Entrar na Plataforma"
- **CTA secundário:** "Explorar a ORCA"

---

## 🔄 Próximos Passos

1. Implementar Google Analytics 4
2. Otimizar imagens para WebP
3. Adicionar lazy loading React nas secções abaixo do fold
4. Configurar monitorização de Core Web Vitals
5. Submeter sitemap no Google Search Console

---

**Última atualização:** 2026-04-06
**Responsável:** Equipe de Desenvolvimento ORCA
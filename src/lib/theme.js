import { FONTS } from './defaults.js'

const loadedFonts = new Set()

function loadGoogleFont(font) {
  if (!font?.google || loadedFonts.has(font.key)) return
  loadedFonts.add(font.key)
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?family=${font.google}&display=swap`
  document.head.appendChild(link)
}

// 글 본문에서 <font face> 등으로 쓴 글꼴을 찾아 불러옵니다.
export function loadFontsIn(root) {
  const names = new Set()
  root.querySelectorAll('font[face], [style*="font-family"]').forEach((el) => {
    const raw = el.getAttribute('face') || el.style.fontFamily || ''
    raw.split(',').forEach((n) => names.add(n.trim().replace(/^['"]|['"]$/g, '')))
  })
  for (const font of FONTS) {
    const name = font.family.split(',')[0].trim().replace(/^['"]|['"]$/g, '')
    if (names.has(name)) loadGoogleFont(font)
  }
}

export function loadFontByKey(key) {
  loadGoogleFont(FONTS.find((f) => f.key === key))
}

function fontFamily(key, theme) {
  const font = FONTS.find((f) => f.key === key) || FONTS[0]
  loadGoogleFont(font)
  if (key === 'custom' && !theme.customFontUrl) return FONTS[0].family
  return font.family
}

function styleTag(id) {
  let el = document.getElementById(id)
  if (!el) {
    el = document.createElement('style')
    el.id = id
    document.head.appendChild(el)
  }
  return el
}

const PATTERNS = {
  dots: (c, s) => `radial-gradient(${c} 1.4px, transparent 1.6px) 0 0 / ${s}px ${s}px`,
  grid: (c, s) => `linear-gradient(${c} 1px, transparent 1px) 0 0 / ${s}px ${s}px, linear-gradient(90deg, ${c} 1px, transparent 1px) 0 0 / ${s}px ${s}px`,
  lines: (c, s) => `linear-gradient(transparent ${s - 1}px, ${c} ${s - 1}px) 0 0 / 100% ${s}px`,
  diagonal: (c, s) => `repeating-linear-gradient(45deg, ${c} 0 1px, transparent 1px ${Math.round(s / 2)}px)`,
  checker: (c, s) => `conic-gradient(${c} 25%, transparent 0 50%, ${c} 0 75%, transparent 0) 0 0 / ${s * 2}px ${s * 2}px`,
  hearts: (c, s) => svgPattern(`<path d="M12 21s-7-4.6-9.3-9C1 8.3 3.4 5 6.6 5c2 0 3.3 1.1 4.1 2.3h.6C12.1 6.1 13.4 5 15.4 5c3.2 0 5.6 3.3 3.9 7-2.3 4.4-9.3 9-9.3 9Z" transform="scale(.5) translate(12 12)" fill="${c}"/>`, s),
  stars: (c, s) => svgPattern(`<path d="M12 4l1.9 5.2H19l-4.2 3.2 1.6 5.2L12 14.4l-4.4 3.2 1.6-5.2L5 9.2h5.1Z" transform="scale(.5) translate(12 12)" fill="${c}"/>`, s),
}

function svgPattern(inner, size) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">${inner}</svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") 0 0 / ${size * 1.4}px ${size * 1.4}px`
}

function pageBackground(theme, pal, mode) {
  switch (theme.bgType) {
    case 'gradient':
      return `linear-gradient(${theme.bgAngle}deg, ${pal.bg} 0%, ${pal.bg2} 100%)`
    case 'pattern': {
      const make = PATTERNS[theme.pattern] || PATTERNS.dots
      return `${make(`color-mix(in srgb, ${pal.accent} 16%, transparent)`, Number(theme.patternSize) || 22)}, ${pal.bg}`
    }
    default:
      return pal.bg
  }
}

export function resolveMode(theme) {
  if (theme.allowToggle !== false) {
    try {
      const saved = localStorage.getItem('od-mode')
      if (saved === 'light' || saved === 'dark') return saved
    } catch {
      // 저장소를 못 쓰는 환경이면 기본값으로
    }
  }
  if (theme.mode === 'light' || theme.mode === 'dark') return theme.mode
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function applyTheme(theme, mode) {
  const root = document.documentElement
  const pal = mode === 'dark' ? theme.dark : theme.light
  const vars = {
    '--accent': pal.accent,
    '--on-accent': pal.accentText || '#fff',
    '--accent-soft': `color-mix(in srgb, ${pal.accent} 14%, transparent)`,
    '--bg': pal.bg,
    '--bg2': pal.bg2,
    '--surface': pal.surface,
    '--surface-2': pal.surface2,
    '--text': pal.text,
    '--text-sub': pal.textSub,
    '--line': pal.line,
    '--drawer-bg': pal.drawer,
    '--memo-bg': pal.memo,
    '--memo-text': pal.memoText,
    '--page-bg': pageBackground(theme, pal, mode),
    '--font': fontFamily(theme.font, theme),
    '--heading-font': theme.headingFont === 'same' ? 'var(--font)' : fontFamily(theme.headingFont, theme),
    '--font-scale': theme.fontScale,
    '--title-weight': theme.titleWeight,
    '--letter-spacing': `${theme.letterSpacing}em`,
    '--body-line': theme.lineHeight,
    '--radius': `${theme.radius}px`,
    '--radius-sm': `${Math.max(4, Math.round(theme.radius * 0.6))}px`,
    '--gap': `${theme.gap}px`,
    '--content-width': `${theme.contentWidth}px`,
    '--expanded-height': `${theme.expandedHeight}vh`,
    '--gallery-cols': theme.galleryColumns,
    '--btn-radius': theme.buttonShape === 'pill' ? '999px' : theme.buttonShape === 'square' ? '6px' : 'var(--radius-sm)',
  }
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, String(v))

  root.dataset.mode = mode
  root.dataset.card = theme.cardStyle
  root.dataset.header = theme.headerStyle
  root.dataset.nav = theme.navStyle
  root.dataset.drawer = theme.drawerSide
  root.dataset.anim = theme.animations ? 'on' : 'off'
  root.dataset.lift = theme.hoverLift ? 'on' : 'off'
  root.dataset.icons = theme.iconStyle
  root.style.colorScheme = mode

  const bgImage = mode === 'dark' && theme.bgImageDark ? theme.bgImageDark : theme.bgImage
  const bgCss =
    theme.bgType === 'image' && bgImage
      ? `body::before { content: ""; position: fixed; inset: ${-theme.bgBlur * 2}px; z-index: -2;
          background: url("${bgImage.replace(/"/g, '%22')}") center / ${theme.bgFit === 'repeat' ? 'auto' : theme.bgFit} ${theme.bgFit === 'repeat' ? 'repeat' : 'no-repeat'};
          filter: blur(${theme.bgBlur}px); }
        body::after { content: ""; position: fixed; inset: 0; z-index: -1; background: ${pal.bg}; opacity: ${theme.bgOverlay}; }
        body { background: ${pal.bg}; }`
      : ''
  const fontFace = theme.customFontUrl
    ? `@font-face { font-family: 'OD Custom Font'; src: url("${theme.customFontUrl.replace(/"/g, '%22')}"); font-display: swap; }`
    : ''
  styleTag('od-theme-extra').textContent = `${fontFace}\n${bgCss}`
  styleTag('od-custom-css').textContent = theme.customCss || ''

  const meta = document.querySelector('meta[name="theme-color"]') || document.head.appendChild(Object.assign(document.createElement('meta'), { name: 'theme-color' }))
  meta.content = pal.bg
}

export function setFavicon(value) {
  if (!value) return
  let link = document.querySelector('link[rel="icon"]')
  if (!link) {
    link = document.createElement('link')
    link.rel = 'icon'
    document.head.appendChild(link)
  }
  if (/^(https?:|\/)/.test(value)) link.href = value
  else link.href = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">${value}</text></svg>`)}`
}

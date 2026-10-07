import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api } from './api.js'
import { resolveHome, resolveSite, resolveTheme } from './defaults.js'
import { applyTheme, resolveMode, setFavicon } from './theme.js'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [previewTheme, setPreviewTheme] = useState(null) // 디자인 편집 중 미리보기
  const [modeOverride, setModeOverride] = useState(null)
  const [toast, setToast] = useState(null)
  const [, bumpSystemMode] = useState(0)

  const load = useCallback(async () => {
    try {
      const res = await api.bootstrap()
      setData(res)
      setError(null)
    } catch (e) {
      setError(e.message)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const site = useMemo(() => resolveSite(data?.site), [data?.site])
  const savedTheme = useMemo(() => resolveTheme(data?.theme), [data?.theme])
  const theme = previewTheme || savedTheme
  const home = useMemo(() => resolveHome(data?.home), [data?.home])
  const mode = modeOverride || resolveMode(theme)

  useEffect(() => {
    applyTheme(theme, mode)
  }, [theme, mode])

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!mq) return
    const fn = () => bumpSystemMode((n) => n + 1)
    mq.addEventListener?.('change', fn)
    return () => mq.removeEventListener?.('change', fn)
  }, [])

  useEffect(() => {
    setFavicon(site.favicon)
  }, [site.favicon])

  const toggleMode = useCallback(() => {
    const next = mode === 'dark' ? 'light' : 'dark'
    try {
      localStorage.setItem('od-mode', next)
    } catch {
      // 무시
    }
    setModeOverride(next)
  }, [mode])

  const saveSetting = useCallback(async (key, value) => {
    await api.saveSetting(key, value)
    setData((d) => ({ ...d, [key]: value }))
  }, [])

  const setCategories = useCallback((categories) => setData((d) => ({ ...d, categories })), [])

  const showToast = useCallback((message) => {
    setToast({ message, id: Date.now() })
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2600)
    return () => clearTimeout(t)
  }, [toast])

  const value = {
    ready: !!data,
    error,
    reload: load,
    admin: !!data?.admin,
    site,
    rawSite: data?.site,
    theme,
    savedTheme,
    rawTheme: data?.theme,
    setPreviewTheme,
    home,
    categories: data?.categories || [],
    setCategories,
    stats: data?.stats || {},
    mode,
    toggleMode,
    saveSetting,
    toast,
    showToast,
  }
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  return useContext(AppContext)
}

// 이름 변환: 글 속 {{나}} {{상대}} {{페어}} 를 프로필 이름으로 바꿉니다.
export function swapNames(html, site) {
  if (!html || site.features?.nameSwap === false) return html
  return html
    .replace(/\{\{\s*나\s*\}\}/g, escapeText(site.pair.me.name))
    .replace(/\{\{\s*상대\s*\}\}/g, escapeText(site.pair.partner.name))
    .replace(/\{\{\s*페어\s*\}\}/g, escapeText(site.pair.pairName))
}

function escapeText(s) {
  return String(s || '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c])
}

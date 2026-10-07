import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { useApp } from '../lib/store.jsx'
import { navigate, useLocation } from '../lib/router.js'
import { api } from '../lib/api.js'
import { isRecent } from '../lib/format.js'
import { BgmCard } from './Bgm.jsx'

const TitleContext = createContext({ setTitle: () => {}, setCollapsed: () => {} })

export function Shell({ children }) {
  const app = useApp()
  const loc = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [collapsed, setCollapsed] = useState(true)
  const nav = app.theme.navStyle

  useEffect(() => {
    setDrawerOpen(false)
  }, [loc.path, loc.search])

  useEffect(() => {
    document.body.classList.toggle('no-scroll', drawerOpen)
    if (!drawerOpen) return
    const onKey = (e) => e.key === 'Escape' && setDrawerOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drawerOpen])

  return (
    <TitleContext.Provider value={{ setTitle, setCollapsed }}>
      <div className={`app nav-${nav}`}>
        {nav !== 'bottom' && <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />}
        <div className={`drawer-dim ${drawerOpen ? 'active' : ''}`} onClick={() => setDrawerOpen(false)} />
        <TopBar title={title} collapsed={collapsed} onMenu={() => setDrawerOpen(true)} showMenu={nav !== 'bottom'} />
        <main className="page" id="main">
          {children}
        </main>
        <Footer />
        {nav !== 'drawer' && <BottomNav path={loc.path} />}
        {app.toast && (
          <div className="toast" key={app.toast.id} role="status">
            {app.toast.message}
          </div>
        )}
      </div>
    </TitleContext.Provider>
  )
}

// 큰 제목 없이 상단바 제목만 정할 때 씁니다.
export function useTopbarTitle(title) {
  const { setTitle, setCollapsed } = useContext(TitleContext)
  useEffect(() => {
    if (title === undefined) return
    setTitle(title)
    setCollapsed(true)
  }, [title, setTitle, setCollapsed])
}

/* One UI 특유의 “큰 제목” 영역. 스크롤해서 제목이 사라지면 상단바에 작은 제목이 나타나요. */
export function LargeTitle({ title, subtitle, children, eyebrow }) {
  const { setTitle, setCollapsed } = useContext(TitleContext)
  const ref = useRef(null)

  useEffect(() => {
    setTitle(title)
    const el = ref.current
    if (!el || !('IntersectionObserver' in window)) return
    const io = new IntersectionObserver(([entry]) => setCollapsed(!entry.isIntersecting), { rootMargin: '-56px 0px 0px 0px' })
    io.observe(el)
    return () => {
      io.disconnect()
      setCollapsed(true)
    }
  }, [title, setTitle, setCollapsed])

  return (
    <header className="large-title">
      <div className="large-title-inner">
        {eyebrow && <div className="large-title-eyebrow">{eyebrow}</div>}
        <h1 ref={ref}>{title}</h1>
        {subtitle && <p className="large-title-sub">{subtitle}</p>}
        {children}
      </div>
    </header>
  )
}

function TopBar({ title, collapsed, onMenu, showMenu }) {
  const app = useApp()
  return (
    <div className={`topbar ${collapsed ? 'show-title' : ''}`}>
      <div className="topbar-inner">
        {showMenu ? (
          <button type="button" className="icon-btn" onClick={onMenu} aria-label="메뉴 열기">
            <i className="fa-solid fa-bars" />
          </button>
        ) : (
          <a href="/" className="icon-btn" aria-label="홈">
            <i className="fa-solid fa-house" />
          </a>
        )}
        <div className="topbar-title">{title}</div>
        <div className="topbar-actions">
          <a href="/search" className="icon-btn" aria-label="검색">
            <i className="fa-solid fa-magnifying-glass" />
          </a>
          {app.theme.allowToggle !== false && (
            <button type="button" className="icon-btn" onClick={app.toggleMode} aria-label={app.mode === 'dark' ? '라이트 모드로' : '다크 모드로'}>
              <i className={`fa-solid ${app.mode === 'dark' ? 'fa-sun' : 'fa-moon'}`} />
            </button>
          )}
          {app.admin && (
            <a href="/write" className="icon-btn accent" aria-label="글쓰기">
              <i className="fa-solid fa-pen" />
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

function Drawer({ open, onClose }) {
  const app = useApp()
  const { site } = app
  const [q, setQ] = useState('')
  const [openCats, setOpenCats] = useState({})

  async function logout() {
    await api.logout()
    await app.reload()
    app.showToast('로그아웃했어요.')
    navigate('/')
  }

  const asideRef = useRef(null)
  useEffect(() => {
    if (asideRef.current) asideRef.current.inert = !open
  }, [open])

  const roots = app.categories.filter((c) => !c.parent_id)
  const children = (id) => app.categories.filter((c) => c.parent_id === id)
  const links = (site.links || []).filter((l) => l.url && l.url !== '#')

  return (
    <aside ref={asideRef} className={`drawer ${open ? 'open' : ''}`} aria-label="메뉴">
      <div className="drawer-head">
        <span className="drawer-title">MENU</span>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="메뉴 닫기">
          <i className="fa-solid fa-xmark" />
        </button>
      </div>
      <div className="drawer-scroll">
        <div className="drawer-section">
          <div className="drawer-icons">
            <a href="/" title="홈" aria-label="홈">
              <i className="fa-solid fa-house" />
            </a>
            {site.menu.notice && (
              <a href="/notice" title="공지사항" aria-label="공지사항">
                <i className="fa-solid fa-bullhorn" />
              </a>
            )}
            {site.menu.guestbook && site.features.guestbook !== false && (
              <a href="/guestbook" title="방명록" aria-label="방명록">
                <i className="fa-solid fa-comment-dots" />
              </a>
            )}
            {site.menu.tags && (
              <a href="/tags" title="태그" aria-label="태그">
                <i className="fa-solid fa-hashtag" />
              </a>
            )}
            {site.menu.calendar && (
              <a href="/calendar" title="캘린더" aria-label="캘린더">
                <i className="fa-regular fa-calendar" />
              </a>
            )}
            {app.theme.allowToggle !== false && (
              <button type="button" onClick={app.toggleMode} title="화면 모드" aria-label="화면 모드 바꾸기">
                <i className={`fa-solid ${app.mode === 'dark' ? 'fa-sun' : 'fa-moon'}`} />
              </button>
            )}
            {app.admin ? (
              <>
                <a href="/admin" title="관리" aria-label="관리">
                  <i className="fa-solid fa-gear" />
                </a>
                <button type="button" onClick={logout} title="로그아웃" aria-label="로그아웃">
                  <i className="fa-solid fa-right-from-bracket" />
                </button>
              </>
            ) : (
              <a href="/login" title="로그인" aria-label="로그인">
                <i className="fa-solid fa-right-to-bracket" />
              </a>
            )}
          </div>
          <form
            className="search-field"
            onSubmit={(e) => {
              e.preventDefault()
              if (q.trim()) navigate(`/search?q=${encodeURIComponent(q.trim())}`)
            }}
          >
            <i className="fa-solid fa-magnifying-glass" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="검색어 입력..." aria-label="검색어" />
          </form>
        </div>

        <div className="drawer-section">
          <span className="section-label">CATEGORY</span>
          <nav className="drawer-cats">
            {site.menu.archive && (
              <a href="/archive" className="cat-link">
                <i className="cat-icon fa-solid fa-layer-group" />
                <span>전체 기록</span>
                <span className="cat-count">{app.stats.posts || 0}</span>
              </a>
            )}
            {roots.map((c) => {
              const kids = children(c.id)
              const isOpen = openCats[c.id]
              return (
                <div key={c.id} className={`cat-item ${isOpen ? 'open' : ''}`}>
                  <a href={`/category/${encodeURIComponent(c.slug)}`} className="cat-link">
                    <i className={`cat-icon ${c.icon || 'fa-solid fa-folder'}`} />
                    <span>{c.name}</span>
                    {isRecent(c.latest) && <span className="new-badge">N</span>}
                    <span className="cat-count">{c.count + kids.reduce((s, k) => s + k.count, 0)}</span>
                  </a>
                  {kids.length > 0 && (
                    <>
                      <button
                        type="button"
                        className="cat-toggle"
                        onClick={() => setOpenCats((s) => ({ ...s, [c.id]: !s[c.id] }))}
                        aria-label={`${c.name} 하위 카테고리 ${isOpen ? '접기' : '펼치기'}`}
                        aria-expanded={!!isOpen}
                      >
                        <i className="fa-solid fa-chevron-down" />
                      </button>
                      <div className="cat-children">
                        {kids.map((k) => (
                          <a key={k.id} href={`/category/${encodeURIComponent(k.slug)}`} className="cat-link sub">
                            <i className={`cat-icon ${k.icon || 'fa-solid fa-angle-right'}`} />
                            <span>{k.name}</span>
                            {isRecent(k.latest) && <span className="new-badge">N</span>}
                            <span className="cat-count">{k.count}</span>
                          </a>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
            {!roots.length && app.admin && (
              <a href="/admin/categories" className="cat-link muted">
                <i className="cat-icon fa-solid fa-plus" />
                <span>카테고리 만들기</span>
              </a>
            )}
          </nav>
        </div>

        {links.length > 0 && (
          <div className="drawer-section">
            <span className="section-label">LINK</span>
            <div className="drawer-links">
              {links.map((l, i) => (
                <a key={i} href={l.url} target="_blank" rel="noopener noreferrer">
                  <i className={l.icon || 'fa-solid fa-link'} />
                  {l.name}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="drawer-foot">
        <BgmCard />
      </div>
    </aside>
  )
}

function BottomNav({ path }) {
  const { site } = useApp()
  const items = site.bottomNav?.length ? site.bottomNav : []
  if (!items.length) return null
  return (
    <nav className="bottom-nav" aria-label="하단 메뉴">
      {items.slice(0, 6).map((item, i) => {
        const active = item.href === '/' ? path === '/' : path.startsWith(item.href)
        return (
          <a key={i} href={item.href} className={active ? 'active' : ''}>
            <i className={item.icon || 'fa-solid fa-circle'} />
            <span>{item.label}</span>
          </a>
        )
      })}
    </nav>
  )
}

function Footer() {
  const { site } = useApp()
  return (
    <footer className="site-footer">
      {site.footer ? <span>{site.footer}</span> : <span>© {new Date().getFullYear()} {site.title}</span>}
    </footer>
  )
}

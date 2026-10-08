import React, { useEffect, useState } from 'react'
import { useApp } from '../lib/store.jsx'
import { api } from '../lib/api.js'
import { navigate } from '../lib/router.js'
import { formatDate } from '../lib/format.js'
import { LargeTitle } from '../components/Shell.jsx'
import { PostList } from '../components/PostList.jsx'
import { Empty, Paging, Spinner } from '../components/ui.jsx'
import { LIST_STYLES } from '../lib/defaults.js'
import { ThreadFeed } from '../components/Thread.jsx'

const STYLE_ICONS = {
  list: 'fa-solid fa-list',
  gallery: 'fa-solid fa-table-cells',
  memo: 'fa-regular fa-note-sticky',
  card: 'fa-regular fa-rectangle-list',
  timeline: 'fa-solid fa-timeline',
}

// 전체 / 카테고리 / 태그 / 검색 / 공지 목록을 모두 이 화면이 그려요.
export default function Archive({ kind, param, search }) {
  const app = useApp()
  const sp = new URLSearchParams(search)
  const page = Number(sp.get('page')) || 1
  const q = sp.get('q') || ''
  const date = sp.get('date') || ''
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [query, setQuery] = useState(q)
  const category = kind === 'category' ? app.categories.find((c) => c.slug === param) : null
  const isThread = category?.page_type === 'thread' && !date
  const scopeKey = `od-view-${kind}-${param || ''}`
  const baseStyle = category?.list_style || app.theme.listStyle
  const [viewStyle, setViewStyle] = useState(() => {
    try {
      return sessionStorage.getItem(scopeKey) || null
    } catch {
      return null
    }
  })
  const style = kind === 'notice' && !viewStyle ? 'list' : viewStyle || baseStyle

  useEffect(() => {
    setQuery(q)
  }, [q])

  useEffect(() => {
    if (kind === 'search' && !q) {
      setData({ items: [], total: 0, page: 1, pages: 1 })
      return
    }
    if (isThread) return
    let alive = true
    setData(null)
    setError(null)
    const params = { page, limit: app.site.postsPerPage || 12 }
    if (kind === 'category') params.category = param
    if (kind === 'tag') params.tag = param
    if (kind === 'search') params.q = q
    if (kind === 'notice') params.type = 'notice'
    if (date) params.date = date
    api
      .posts(params)
      .then((res) => alive && setData(res))
      .catch((e) => alive && setError(e.message))
    return () => {
      alive = false
    }
  }, [kind, param, q, page, date, app.site.postsPerPage, isThread])

  let title = '전체 기록'
  let subtitle = data ? `${data.total}개의 글` : ''
  if (kind === 'category') {
    title = category?.name || param
    subtitle = category?.description || subtitle
  }
  if (kind === 'tag') title = `#${param}`
  if (kind === 'search') title = q ? `'${q}' 검색 결과` : '검색'
  if (kind === 'notice') title = '공지사항'
  if (date) title = formatDate(date, date.length === 10 ? 'long' : 'dot')

  useEffect(() => {
    document.title = `${title} :: ${app.site.title}`
  }, [title, app.site.title])

  function goPage(n) {
    const next = new URLSearchParams(search)
    next.set('page', String(n))
    navigate(`${window.location.pathname}?${next.toString()}`)
  }

  function chooseStyle(s) {
    setViewStyle(s)
    try {
      sessionStorage.setItem(scopeKey, s)
    } catch {
      // 무시
    }
  }

  const subCats = category ? app.categories.filter((c) => c.parent_id === category.id) : []

  return (
    <div className="archive">
      <LargeTitle
        pageKey={!date && (kind === 'archive' || kind === 'notice' || (kind === 'search' && !q)) ? kind : undefined}
        title={title}
        subtitle={subtitle}
        eyebrow={kind === 'category' && category?.icon ? <i className={category.icon} /> : null}>
        {kind === 'search' && (
          <form
            className="search-field big"
            onSubmit={(e) => {
              e.preventDefault()
              if (query.trim()) navigate(`/search?q=${encodeURIComponent(query.trim())}`)
            }}
          >
            <i className="fa-solid fa-magnifying-glass" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="제목이나 내용으로 찾기" autoFocus aria-label="검색어" />
          </form>
        )}
      </LargeTitle>

      {subCats.length > 0 && (
        <div className="chip-row">
          {subCats.map((c) => (
            <a key={c.id} href={`/category/${encodeURIComponent(c.slug)}`} className="chip">
              {c.icon && <i className={c.icon} />} {c.name}
            </a>
          ))}
        </div>
      )}

      {isThread ? (
        <ThreadFeed category={category} search={search} />
      ) : (
        <>
      <div className="list-toolbar">
        <span className="list-count">{data ? `${data.total}개` : ''}</span>
        <div className="view-switch" role="radiogroup" aria-label="목록 모양">
          {LIST_STYLES.map((s) => (
            <button type="button" key={s.value} role="radio" aria-checked={style === s.value} className={style === s.value ? 'active' : ''} onClick={() => chooseStyle(s.value)} title={s.label} aria-label={s.label}>
              <i className={STYLE_ICONS[s.value]} />
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <Empty title="불러오지 못했어요">{error}</Empty>
      ) : !data ? (
        <Spinner />
      ) : data.items.length === 0 ? (
        <Empty icon={kind === 'search' ? 'fa-solid fa-magnifying-glass' : 'fa-regular fa-folder-open'} title={kind === 'search' && q ? '검색 결과가 없습니다.' : '아직 글이 없어요.'}>
          {kind === 'search' && q ? '다른 검색어로 다시 시도해보세요.' : app.admin ? '오른쪽 위 연필 버튼으로 첫 글을 써보세요.' : null}
        </Empty>
      ) : (
        <PostList items={data.items} style={style} />
      )}
      {data && <Paging page={data.page} pages={data.pages} onChange={goPage} />}
        </>
      )}
    </div>
  )
}

import React, { useEffect, useRef, useState } from 'react'
import { swapNames, useApp } from '../lib/store.jsx'
import { formatDate } from '../lib/format.js'

// 목록 9종: 리스트 / One UI 설정 목록 / 카드 / 매거진 / 갤러리 / 벽돌 갤러리 / 앨범 / 메모 / 타임라인
export function PostList({ items, style = 'list', compact = false }) {
  const { theme, categories, site } = useApp()
  const showThumbs = theme.showThumbs !== false
  const showExcerpt = theme.showExcerpt !== false
  const catName = (id) => categories.find((c) => c.id === id)?.name

  // 글마다 '목록에 요약 보이기'를 끌 수 있어요. (끈 글은 요약 없이 제목만)
  const wantExcerpt = (p) => showExcerpt && !p.hideExcerpt
  const excerptOf = (p) => (p.locked ? '보호되어 있는 글입니다.' : p.hideExcerpt ? '' : swapNames(p.excerpt, site))
  const thumbOf = (p) => (showThumbs && p.thumbnail && !p.locked ? p.thumbnail : null)

  if (style === 'masonry') return <MasonryList items={items} thumbOf={thumbOf} excerptOf={excerptOf} compact={compact} />
  if (style === 'album') return <AlbumList items={items} thumbOf={thumbOf} />

  if (style === 'group') {
    return (
      <div className={`post-list group ${compact ? 'compact' : ''}`}>
        {items.map((p) => {
          const thumb = thumbOf(p)
          return (
            <a key={p.id} href={`/post/${p.id}`} className={`group-row ${p.locked ? 'locked' : ''}`}>
              <span className="group-icon">
                {thumb ? <img src={thumb} alt="" loading="lazy" /> : <i className={p.locked ? 'fa-solid fa-lock' : p.pinned ? 'fa-solid fa-thumbtack' : 'fa-regular fa-file-lines'} />}
              </span>
              <span className="group-text">
                <strong>
                  {p.visibility === 'private' && <i className="fa-solid fa-eye-slash lock-icon" />}
                  {p.title || '(제목 없음)'}
                </strong>
                <span>
                  {formatDate(p.publishedAt)}
                  {p.commentCount > 0 && ` · 댓글 ${p.commentCount}`}
                  {!compact && wantExcerpt(p) && p.excerpt && !p.locked ? ` · ${swapNames(p.excerpt, site)}` : ''}
                </span>
              </span>
              <i className="fa-solid fa-chevron-right group-chevron" />
            </a>
          )
        })}
      </div>
    )
  }

  if (style === 'magazine') {
    // 사진이 있는 첫 글을 크게 보여주고, 나머지는 원래 순서대로 카드로 보여줘요.
    const heroIdx = Math.max(0, items.findIndex((p) => thumbOf(p)))
    const first = items[heroIdx]
    const rest = items.filter((_, i) => i !== heroIdx)
    if (!first) return null
    const ft = thumbOf(first)
    return (
      <div className="post-list magazine">
        <a href={`/post/${first.id}`} className={`magazine-hero ${ft ? 'has-thumb' : 'no-thumb'} ${first.locked ? 'locked' : ''}`}>
          {ft && <img src={ft} alt="" />}
          <span className="magazine-hero-text">
            {first.categoryId && <span className="post-cat">{catName(first.categoryId)}</span>}
            <strong>
              {first.locked && <i className="fa-solid fa-lock lock-icon" />}
              {first.title || '(제목 없음)'}
            </strong>
            {wantExcerpt(first) && <span className="magazine-excerpt">{excerptOf(first)}</span>}
            <span className="magazine-date">{formatDate(first.publishedAt)}</span>
          </span>
        </a>
        {rest.length > 0 && <PostList items={rest} style="card" compact={compact} />}
      </div>
    )
  }

  if (style === 'timeline') {
    let lastMonth = ''
    return (
      <div className={`post-list timeline ${compact ? 'compact' : ''}`}>
        {items.map((p) => {
          const month = p.publishedAt.slice(0, 7)
          const showMonth = month !== lastMonth
          lastMonth = month
          return (
            <React.Fragment key={p.id}>
              {showMonth && <div className="timeline-month">{month.replace('-', '. ')}</div>}
              <a href={`/post/${p.id}`} className={`timeline-item ${p.locked ? 'locked' : ''}`}>
                <span className="timeline-dot" />
                <span className="timeline-date">{formatDate(p.publishedAt, 'short')}</span>
                <span className="timeline-body">
                  <strong>
                    {p.locked && <i className="fa-solid fa-lock lock-icon" />}
                    {p.title || '(제목 없음)'}
                  </strong>
                  {wantExcerpt(p) && p.excerpt && <span className="timeline-excerpt">{swapNames(p.excerpt, site)}</span>}
                </span>
              </a>
            </React.Fragment>
          )
        })}
      </div>
    )
  }

  return (
    <div className={`post-list ${style} ${compact ? 'compact' : ''}`}>
      {items.map((p) => {
        const hasThumb = showThumbs && p.thumbnail && !p.locked
        return (
          <a
            key={p.id}
            href={`/post/${p.id}`}
            className={`post-item ${p.locked ? 'locked' : ''} ${p.visibility === 'private' ? 'private' : ''} ${hasThumb ? 'has-thumb' : 'no-thumb'}`}
          >
            {style === 'card' && hasThumb && (
              <div className="post-thumb">
                <img src={p.thumbnail} alt="" loading="lazy" />
              </div>
            )}
            <div className="post-info">
              {style === 'card' && p.categoryId && <span className="post-cat">{catName(p.categoryId)}</span>}
              <strong className="post-title">
                {p.pinned && <i className="fa-solid fa-thumbtack pin-icon" aria-label="고정됨" />}
                {p.visibility === 'private' && <i className="fa-solid fa-eye-slash lock-icon" aria-label="비공개" />}
                {p.title || '(제목 없음)'}
              </strong>
              {p.subtitle && style !== 'gallery' && <span className="post-subtitle">{p.subtitle}</span>}
              {(p.locked || !p.hideExcerpt) && (style === 'memo' || style === 'card' || (style === 'list' && showExcerpt && !compact)) && (
                <p className="post-excerpt">{excerptOf(p)}</p>
              )}
              <span className="post-meta">
                <span>{formatDate(p.publishedAt)}</span>
                {p.commentCount > 0 && (
                  <span>
                    <i className="fa-regular fa-comment" /> {p.commentCount}
                  </span>
                )}
                {site.features.showViews && (
                  <span>
                    <i className="fa-regular fa-eye" /> {p.views}
                  </span>
                )}
              </span>
            </div>
            {style !== 'card' && hasThumb && (
              <div className="post-thumb">
                <img src={p.thumbnail} alt="" loading="lazy" />
              </div>
            )}
            {style === 'gallery' && !hasThumb && (
              <div className="post-thumb placeholder">
                <i className={p.locked ? 'fa-solid fa-lock' : 'fa-regular fa-file-lines'} />
                <span>{p.title}</span>
              </div>
            )}
          </a>
        )
      })}
    </div>
  )
}

/* ---------------- 벽돌 갤러리: 사진 원래 비율대로 짧은 줄부터 쌓아요 ---------------- */

function useColumnCount(ref) {
  const [cols, setCols] = useState(3)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => {
      const w = el.clientWidth
      setCols(w < 480 ? 2 : w < 900 ? 3 : 4)
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return cols
}

function MasonryList({ items, thumbOf, excerptOf, compact }) {
  const ref = useRef(null)
  const cols = useColumnCount(ref)
  const [ratios, setRatios] = useState({}) // id -> 세로/가로

  // 높이를 모르는 사진은 일단 4:5로 치고, 사진이 열리면 실제 비율로 다시 배치해요.
  const columns = Array.from({ length: cols }, () => ({ h: 0, items: [] }))
  for (const p of items) {
    const thumb = thumbOf(p)
    const est = thumb ? ratios[p.id] || 1.25 : 0.75 + Math.min(0.6, (p.excerpt || '').length / 300)
    const col = columns.reduce((a, b) => (b.h < a.h ? b : a))
    col.items.push(p)
    col.h += est + 0.35
  }

  return (
    <div className={`post-list masonry ${compact ? 'compact' : ''}`} ref={ref} style={{ '--masonry-cols': cols }}>
      {columns.map((c, i) => (
        <div className="masonry-col" key={i}>
          {c.items.map((p) => {
            const thumb = thumbOf(p)
            return (
              <a key={p.id} href={`/post/${p.id}`} className={`masonry-item ${thumb ? 'has-thumb' : 'no-thumb'} ${p.locked ? 'locked' : ''}`}>
                {thumb ? (
                  <img
                    src={thumb}
                    alt=""
                    loading="lazy"
                    onLoad={(e) => {
                      const r = e.currentTarget.naturalHeight / e.currentTarget.naturalWidth
                      if (r && Math.abs((ratios[p.id] || 0) - r) > 0.01) setRatios((m) => ({ ...m, [p.id]: r }))
                    }}
                  />
                ) : (
                  <span className="masonry-text">
                    <i className={p.locked ? 'fa-solid fa-lock' : 'fa-solid fa-quote-left'} />
                    {!compact && excerptOf(p) && <span>{excerptOf(p)}</span>}
                  </span>
                )}
                <span className="masonry-caption">
                  <strong>{p.title || '(제목 없음)'}</strong>
                  <small>{formatDate(p.publishedAt)}</small>
                </span>
              </a>
            )
          })}
        </div>
      ))}
    </div>
  )
}

/* ---------------- 앨범: 갤러리 앱처럼 달별로 촘촘한 격자 ---------------- */

function AlbumList({ items, thumbOf }) {
  const groups = []
  for (const p of items) {
    const key = (p.publishedAt || '').slice(0, 7)
    let g = groups[groups.length - 1]
    if (!g || g.key !== key) groups.push((g = { key, items: [] }))
    g.items.push(p)
  }
  return (
    <div className="post-list album">
      {groups.map((g) => {
        const [y, m] = g.key.split('-')
        return (
          <section key={g.key} className="album-group">
            <h3 className="album-month">
              {y}년 {Number(m)}월 <small>{g.items.length}</small>
            </h3>
            <div className="album-grid">
              {g.items.map((p) => {
                const thumb = thumbOf(p)
                return (
                  <a key={p.id} href={`/post/${p.id}`} className={`album-cell ${thumb ? '' : 'no-thumb'}`} title={p.title}>
                    {thumb ? (
                      <img src={thumb} alt={p.title || ''} loading="lazy" />
                    ) : (
                      <span>
                        <i className={p.locked ? 'fa-solid fa-lock' : 'fa-regular fa-file-lines'} />
                        {p.title}
                      </span>
                    )}
                    {p.pinned && <i className="fa-solid fa-thumbtack album-pin" />}
                  </a>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}

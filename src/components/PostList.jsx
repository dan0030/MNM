import React from 'react'
import { swapNames, useApp } from '../lib/store.jsx'
import { formatDate } from '../lib/format.js'

// 목록 5종: 리스트 / 갤러리 / 메모 / 카드 / 타임라인
export function PostList({ items, style = 'list', compact = false }) {
  const { theme, categories, site } = useApp()
  const showThumbs = theme.showThumbs !== false
  const showExcerpt = theme.showExcerpt !== false
  const catName = (id) => categories.find((c) => c.id === id)?.name

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
                  {showExcerpt && p.excerpt && <span className="timeline-excerpt">{swapNames(p.excerpt, site)}</span>}
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
              {(style === 'memo' || style === 'card' || (style === 'list' && showExcerpt && !compact)) && (
                <p className="post-excerpt">{p.locked ? '보호되어 있는 글입니다.' : swapNames(p.excerpt, site)}</p>
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

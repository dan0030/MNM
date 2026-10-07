import React, { useEffect } from 'react'
import { useApp } from '../lib/store.jsx'
import { LargeTitle } from '../components/Shell.jsx'
import { Empty } from '../components/ui.jsx'
import { escapeHtml } from '../lib/format.js'

export function absoluteUrl(u) {
  if (!u) return ''
  try {
    return new URL(u, window.location.origin).href
  } catch {
    return u
  }
}

export function BannerGrid({ banners, size = 'normal' }) {
  return (
    <div className={`banner-board ${size}`}>
      {banners.map((b, i) => {
        const img = b.image ? <img src={b.image} alt={b.name || ''} loading="lazy" /> : <span className="banner-board-text">{b.name}</span>
        return (
          <figure key={i} className="banner-board-item">
            {b.url ? (
              <a href={b.url} target="_blank" rel="noopener noreferrer" title={b.desc || b.name}>
                {img}
              </a>
            ) : (
              img
            )}
            {(b.name || b.desc) && size !== 'small' && (
              <figcaption>
                {b.name && <strong>{b.name}</strong>}
                {b.desc && <span>{b.desc}</span>}
              </figcaption>
            )}
          </figure>
        )
      })}
    </div>
  )
}

// 배너 게시판: 우리 사이트 배너(퍼가기 코드) + 함께하는 분들의 링크 배너
export default function BannersPage() {
  const app = useApp()
  const { site } = app
  const banners = (site.banners || []).filter((b) => b.image || b.name)
  const mine = site.myBanner || {}

  useEffect(() => {
    document.title = `배너 :: ${site.title}`
  }, [site.title])

  const code = mine.image
    ? `<a href="${escapeHtml(absoluteUrl(mine.url || '/'))}" target="_blank"><img src="${escapeHtml(absoluteUrl(mine.image))}" alt="${escapeHtml(mine.alt || site.title)}"></a>`
    : ''

  async function copy() {
    try {
      await navigator.clipboard.writeText(code)
      app.showToast('배너 코드를 복사했어요.')
    } catch {
      window.prompt('아래 코드를 복사하세요', code)
    }
  }

  return (
    <div className="banners-page">
      <LargeTitle pageKey="banners" title="배너" subtitle={site.bannerIntro} />

      {mine.image && (
        <section className="card padded my-banner">
          <h2 className="section-title small">우리 배너</h2>
          <div className="my-banner-preview">
            <img src={mine.image} alt={mine.alt || site.title} />
          </div>
          {mine.note && <p className="muted my-banner-note">{mine.note}</p>}
          <div className="my-banner-code">
            <code>{code}</code>
            <button type="button" className="btn small primary" onClick={copy}>
              <i className="fa-regular fa-copy" /> 코드 복사
            </button>
          </div>
        </section>
      )}

      {banners.length ? (
        <section className="card padded">
          <h2 className="section-title small">링크 배너</h2>
          <BannerGrid banners={banners} />
        </section>
      ) : (
        <Empty icon="fa-solid fa-flag" title="아직 등록된 배너가 없어요">
          {app.admin ? <a href="/admin/banners" className="btn primary">배너 등록하기</a> : null}
        </Empty>
      )}

      {app.admin && banners.length > 0 && (
        <div className="row" style={{ justifyContent: 'center' }}>
          <a href="/admin/banners" className="btn small">
            <i className="fa-solid fa-pen" /> 배너 관리
          </a>
        </div>
      )}
    </div>
  )
}

import React, { useEffect, useMemo, useState } from 'react'
import { swapNames, useApp } from '../lib/store.jsx'
import { api } from '../lib/api.js'
import { navigate } from '../lib/router.js'
import { formatDate, uid } from '../lib/format.js'
import { LargeTitle } from '../components/Shell.jsx'
import { Fields } from '../components/Fields.jsx'
import { Empty, Paging, Segmented, Sheet, Spinner } from '../components/ui.jsx'

// 역극 로그 페이지
// 역극 하나 = 이 카테고리의 글 하나. 카드에는 제목·세계선(본편/IF/AU…)·진행 상태·기간·설명·태그가 짧게 보이고,
// 누르면 글(로그 전문)로 들어가요. 세계선별로 나눠 보고, 이 페이지 안에서만 검색할 수 있어요.
// 세계선 목록과 안내 문구는 카테고리의 config(JSON)에 저장돼요.

export const DEFAULT_WORLDS = [
  { key: 'main', name: '본편', desc: '', color: '#5b7bd5' },
  { key: 'if', name: 'IF', desc: '만약 그때 다른 선택을 했다면.', color: '#d58a5b' },
  { key: 'au', name: 'AU', desc: '전혀 다른 세계에서 만난 두 사람.', color: '#7a5bd5' },
]

export const RP_STATUS = [
  { value: '', label: '표시 안 함' },
  { value: 'ongoing', label: '진행 중' },
  { value: 'done', label: '완결' },
  { value: 'paused', label: '중단' },
]
const STATUS_LABEL = { ongoing: '진행 중', done: '완결', paused: '중단' }

export function worldsOf(config) {
  const list = Array.isArray(config?.worlds) && config.worlds.length ? config.worlds : DEFAULT_WORLDS
  return list.filter((w) => w && w.key)
}

// 카테고리 config를 불러오는 작은 훅 (글쓰기 화면에서도 써요)
export function useCategoryConfig(categoryId) {
  const [config, setConfig] = useState(null)
  useEffect(() => {
    if (!categoryId) {
      setConfig(null)
      return
    }
    let alive = true
    api
      .categoryConfig(categoryId)
      .then((res) => alive && setConfig(res.config || {}))
      .catch(() => alive && setConfig({}))
    return () => {
      alive = false
    }
  }, [categoryId])
  return [config, setConfig]
}

export default function RpPage({ category, search }) {
  const app = useApp()
  const sp = new URLSearchParams(search)
  const world = sp.get('w') || ''
  const tag = sp.get('tag') || ''
  const q = sp.get('q') || ''
  const page = Number(sp.get('page')) || 1
  const [config, setConfig] = useCategoryConfig(category.id)
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [query, setQuery] = useState(q)
  const [editing, setEditing] = useState(false)
  const worlds = worldsOf(config)
  const worldMap = useMemo(() => Object.fromEntries(worlds.map((w) => [w.key, w])), [worlds])
  const base = `/category/${encodeURIComponent(category.slug)}`

  useEffect(() => setQuery(q), [q])

  useEffect(() => {
    document.title = `${category.name} :: ${app.site.title}`
  }, [category.name, app.site.title])

  useEffect(() => {
    let alive = true
    setData(null)
    setError(null)
    const params = { category: category.slug, page, limit: 24, worldCounts: 1, pinned: 1 }
    if (world) params.world = world
    if (tag) params.tag = tag
    if (q) {
      params.q = q
      params.snippet = 1
    }
    api
      .posts(params)
      .then((res) => alive && setData(res))
      .catch((e) => alive && setError(e.message))
    return () => {
      alive = false
    }
  }, [category.slug, world, tag, q, page])

  // 주소창에 상태를 남겨서 뒤로 가기·공유가 자연스럽게
  function go(patch) {
    const next = new URLSearchParams(search)
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v)
      else next.delete(k)
    }
    if (!('page' in patch)) next.delete('page')
    const qs = next.toString()
    navigate(`${base}${qs ? `?${qs}` : ''}`, { keepScroll: true })
  }

  const counts = data?.worldCounts || {}
  const totalAll = Object.values(counts).reduce((a, b) => a + b, 0)
  const current = world ? worldMap[world] : null

  return (
    <div className="rp-page">
      <LargeTitle title={category.name} subtitle={category.description || ''} eyebrow={category.icon ? <i className={category.icon} /> : null} />
      {config?.intro && <p className="rp-intro">{swapNames(config.intro, app.site)}</p>}

      <div className="rp-toolbar">
        <form
          className="rp-search"
          role="search"
          onSubmit={(e) => {
            e.preventDefault()
            go({ q: query.trim() })
          }}
        >
          <i className="fa-solid fa-magnifying-glass" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="이 페이지의 역극에서 찾기" title="제목·로그 본문·카드 설명·태그에서 찾아요" aria-label="역극 로그 안에서 검색" />
          {q && (
            <button type="button" className="rp-search-clear" onClick={() => go({ q: '' })} aria-label="검색 지우기">
              <i className="fa-solid fa-xmark" />
            </button>
          )}
        </form>
        {app.admin && (
          <div className="rp-admin">
            <button type="button" className="btn small" onClick={() => setEditing(true)}>
              <i className="fa-solid fa-sliders" /> 세계선 · 안내
            </button>
            <a className="btn small primary" href={`/write?category=${category.id}${world ? `&world=${encodeURIComponent(world)}` : ''}`}>
              <i className="fa-solid fa-plus" /> 새 역극
            </a>
          </div>
        )}
      </div>

      <div className="rp-worlds" role="tablist" aria-label="세계선">
        <button type="button" role="tab" aria-selected={!world} className={!world ? 'active' : ''} onClick={() => go({ w: '' })}>
          전체 <small>{totalAll || ''}</small>
        </button>
        {worlds.map((w) => (
          <button
            type="button"
            role="tab"
            key={w.key}
            aria-selected={world === w.key}
            className={world === w.key ? 'active' : ''}
            style={w.color ? { '--wc': w.color } : undefined}
            onClick={() => go({ w: w.key })}
          >
            <span className="rp-world-dot" />
            {w.name} <small>{counts[w.key] || ''}</small>
          </button>
        ))}
      </div>

      {current?.desc && (
        <div className="rp-world-desc" style={current.color ? { '--wc': current.color } : undefined}>
          <strong>{current.name}</strong>
          <p>{swapNames(current.desc, app.site)}</p>
        </div>
      )}

      {(tag || q) && (
        <div className="rp-filters">
          {q && (
            <span className="chip">
              <i className="fa-solid fa-magnifying-glass" /> '{q}'
              <button type="button" onClick={() => go({ q: '' })} aria-label="검색 지우기">
                <i className="fa-solid fa-xmark" />
              </button>
            </span>
          )}
          {tag && (
            <span className="chip">
              #{tag}
              <button type="button" onClick={() => go({ tag: '' })} aria-label="태그 거르기 지우기">
                <i className="fa-solid fa-xmark" />
              </button>
            </span>
          )}
          {data && <span className="rp-filter-count">{data.total}개</span>}
        </div>
      )}

      {error ? (
        <Empty title="불러오지 못했어요">{error}</Empty>
      ) : !data ? (
        <Spinner />
      ) : data.items.length === 0 ? (
        <Empty icon="fa-solid fa-masks-theater" title={q || tag ? '찾는 역극이 없어요' : '아직 정리한 역극이 없어요'}>
          {q || tag ? '다른 검색어나 세계선으로 찾아보세요.' : app.admin ? "오른쪽 위 '새 역극'으로 첫 로그를 정리해보세요." : null}
        </Empty>
      ) : (
        <div className="rp-grid">
          {data.items.map((p) => (
            <RpCard key={p.id} post={p} world={worldMap[p.rpWorld]} query={q} onTag={(t) => go({ tag: t })} />
          ))}
        </div>
      )}
      {data && <Paging page={data.page} pages={data.pages} onChange={(n) => go({ page: String(n) })} />}

      {editing && (
        <RpConfigEditor
          initial={{ intro: config?.intro || '', worlds: worldsOf(config) }}
          onClose={() => setEditing(false)}
          onSave={async (next) => {
            const merged = { ...(config || {}), ...next }
            await api.saveCategoryConfig(category.id, merged)
            setConfig(merged)
            app.showToast('역극 페이지 설정을 저장했어요.')
            setEditing(false)
          }}
        />
      )}
    </div>
  )
}

function Highlight({ text, query }) {
  if (!query || !text) return text || null
  const lower = text.toLowerCase()
  const q = query.toLowerCase()
  const parts = []
  let i = 0
  while (i < text.length) {
    const at = lower.indexOf(q, i)
    if (at < 0) {
      parts.push(text.slice(i))
      break
    }
    if (at > i) parts.push(text.slice(i, at))
    parts.push(<mark key={at}>{text.slice(at, at + q.length)}</mark>)
    i = at + q.length
  }
  return parts
}

function RpCard({ post, world, query, onTag }) {
  const { site } = useApp()
  const status = STATUS_LABEL[post.rpStatus]
  return (
    <article className={`rp-card ${post.locked ? 'locked' : ''}`} style={world?.color ? { '--wc': world.color } : undefined}>
      <a href={`/post/${post.id}`} className="rp-card-link" aria-label={post.title}>
        <span className="rp-card-top">
          {world && (
            <span className="rp-badge world">
              <span className="rp-world-dot" />
              {world.name}
            </span>
          )}
          {status && <span className={`rp-badge status s-${post.rpStatus}`}>{status}</span>}
          {post.pinned && <i className="fa-solid fa-thumbtack rp-pin" aria-label="고정됨" />}
        </span>
        <strong className="rp-card-title">
          {post.locked && <i className="fa-solid fa-lock" />} <Highlight text={post.title || '(제목 없음)'} query={query} />
        </strong>
        <span className="rp-card-meta">
          <i className="fa-regular fa-calendar" /> {post.rpPeriod || formatDate(post.publishedAt)}
        </span>
        {post.snippet ? (
          <span className="rp-card-snippet">
            <Highlight text={post.snippet} query={query} />
          </span>
        ) : (
          (post.rpDesc || (post.locked ? '비밀번호가 걸린 역극이에요.' : '')) && (
            <span className="rp-card-desc">
              <Highlight text={swapNames(post.rpDesc || '비밀번호가 걸린 역극이에요.', site)} query={query} />
            </span>
          )
        )}
      </a>
      {post.tags?.length > 0 && (
        <div className="rp-card-tags">
          {post.tags.map((t) => (
            <button type="button" key={t} onClick={() => onTag(t)}>
              #<Highlight text={t} query={query} />
            </button>
          ))}
        </div>
      )}
    </article>
  )
}

/* ---------------- 페이지 설정 (세계선 · 안내) ---------------- */

const WORLD_FIELDS = [
  { key: 'name', label: '이름', placeholder: '본편 / IF / 현대 AU' },
  { key: 'desc', label: '설명 (탭을 고르면 위에 보여요)', type: 'textarea', rows: 2 },
  { key: 'color', label: '표시 색', type: 'color' },
]

function RpConfigEditor({ initial, onClose, onSave }) {
  const [draft, setDraft] = useState(() => JSON.parse(JSON.stringify(initial)))
  const [busy, setBusy] = useState(false)
  const fields = [
    { key: 'intro', label: '페이지 안내 문구 (제목 아래)', type: 'textarea', rows: 2 },
    {
      key: 'worlds',
      label: '세계선 (본편 · IF · AU 등)',
      type: 'list',
      itemLabel: '세계선',
      itemFields: WORLD_FIELDS,
    },
  ]
  async function save() {
    setBusy(true)
    try {
      // 새로 더한 세계선에는 바뀌지 않는 고유 키를 붙여요. (이름을 바꿔도 역극 분류가 유지되게)
      const worlds = (draft.worlds || [])
        .filter((w) => (w.name || '').trim())
        .map((w) => ({ ...w, name: w.name.trim(), key: w.key || uid('w') }))
      await onSave({ intro: draft.intro || '', worlds })
    } catch (e) {
      window.alert(e.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Sheet
      title="역극 페이지 설정"
      onClose={onClose}
      wide
      footer={
        <div className="row gap-s" style={{ width: '100%' }}>
          <button type="button" className="btn" onClick={onClose} style={{ flex: 1 }}>
            취소
          </button>
          <button type="button" className="btn primary" onClick={save} disabled={busy} style={{ flex: 2 }}>
            {busy ? '저장 중...' : '저장'}
          </button>
        </div>
      }
    >
      <p className="sheet-help">세계선마다 역극을 따로 모아 볼 수 있어요. 세계선을 지우면 그 세계선의 역극은 '전체'에서만 보여요. (역극 글은 지워지지 않아요)</p>
      <Fields fields={fields} value={draft} onChange={setDraft} />
    </Sheet>
  )
}

/* ---------------- 글쓰기 화면의 '역극 정보' 칸 ---------------- */

export function RpWriteFields({ categoryId, extra, setExtra }) {
  const [config] = useCategoryConfig(categoryId)
  const worlds = worldsOf(config)
  // 새 역극: 주소의 ?world= 또는 첫 번째 세계선으로 시작해요
  useEffect(() => {
    if (!config || extra.rpWorld) return
    const fromUrl = new URLSearchParams(window.location.search).get('world')
    setExtra({ rpWorld: worlds.some((w) => w.key === fromUrl) ? fromUrl : worlds[0]?.key || '' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config])
  return (
    <div className="rp-write card-inset">
      <h3 className="fields-heading">역극 정보</h3>
      <div className="field">
        <span className="field-label">세계선</span>
        <Segmented value={extra.rpWorld || ''} onChange={(v) => setExtra({ rpWorld: v })} options={worlds.map((w) => ({ value: w.key, label: w.name }))} />
      </div>
      <div className="field">
        <span className="field-label">진행 상태</span>
        <Segmented value={extra.rpStatus || ''} onChange={(v) => setExtra({ rpStatus: v })} options={RP_STATUS} />
      </div>
      <div className="field">
        <label className="field-label" htmlFor="rp-period">
          기간 · 회차 (선택)
        </label>
        <input id="rp-period" value={extra.rpPeriod || ''} onChange={(e) => setExtra({ rpPeriod: e.target.value })} placeholder="예: 2025.03 ~ 2025.05 / 3화" maxLength={60} />
        <p className="field-help">비우면 기록 날짜가 보여요.</p>
      </div>
      <div className="field">
        <label className="field-label" htmlFor="rp-desc">
          카드 설명
        </label>
        <textarea id="rp-desc" rows={3} value={extra.rpDesc || ''} onChange={(e) => setExtra({ rpDesc: e.target.value })} placeholder="카드에 짧게 보일 줄거리·설명" maxLength={400} />
      </div>
    </div>
  )
}

/* ---------------- 글 보기 화면 위쪽의 역극 정보 ---------------- */

export function RpPostInfo({ post, category }) {
  const { site } = useApp()
  const [config] = useCategoryConfig(category.id)
  const world = worldsOf(config).find((w) => w.key === post.rpWorld)
  const status = STATUS_LABEL[post.rpStatus]
  if (!world && !status && !post.rpPeriod && !post.rpDesc) return null
  return (
    <div className="rp-post-info" style={world?.color ? { '--wc': world.color } : undefined}>
      <div className="rp-card-top">
        {world && (
          <a className="rp-badge world" href={`/category/${encodeURIComponent(category.slug)}?w=${encodeURIComponent(world.key)}`}>
            <span className="rp-world-dot" />
            {world.name}
          </a>
        )}
        {status && <span className={`rp-badge status s-${post.rpStatus}`}>{status}</span>}
        {post.rpPeriod && (
          <span className="rp-card-meta">
            <i className="fa-regular fa-calendar" /> {post.rpPeriod}
          </span>
        )}
      </div>
      {post.rpDesc && <p>{swapNames(post.rpDesc, site)}</p>}
    </div>
  )
}

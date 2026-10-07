import React, { useEffect, useState } from 'react'
import { uploadFile, pickFile } from '../lib/image.js'
import { api } from '../lib/api.js'
import { useApp } from '../lib/store.jsx'
import { Segmented, Switch } from './ui.jsx'

export function getPath(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj)
}

export function setPath(obj, path, value) {
  const keys = path.split('.')
  const out = Array.isArray(obj) ? [...obj] : { ...(obj || {}) }
  let cur = out
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i]
    cur[k] = Array.isArray(cur[k]) ? [...cur[k]] : { ...(cur[k] || {}) }
    cur = cur[k]
  }
  cur[keys[keys.length - 1]] = value
  return out
}

// 설정 스키마(fields)를 받아 폼을 그려줍니다. 위젯 설정, 사이트 설정, 디자인 설정이 모두 이걸 써요.
export function Fields({ fields, value, onChange }) {
  return (
    <div className="fields">
      {fields.map((f, i) => {
        if (f.show && !f.show(value)) return null
        if (f.type === 'heading') {
          return (
            <h3 className="fields-heading" key={`h-${i}`}>
              {f.label}
              {f.help && <small>{f.help}</small>}
            </h3>
          )
        }
        return <Field key={f.key} field={f} value={getPath(value, f.key)} onChange={(v) => onChange(setPath(value, f.key, v))} />
      })}
    </div>
  )
}

export function Field({ field: f, value, onChange }) {
  const id = `f-${f.key.replace(/\./g, '-')}`
  if (f.type === 'toggle') {
    return (
      <div className="field">
        <Switch checked={value} onChange={onChange} label={f.label} description={f.help} />
      </div>
    )
  }
  return (
    <div className={`field field-${f.type || 'text'}`}>
      {f.label && (
        <label className="field-label" htmlFor={id}>
          {f.label}
        </label>
      )}
      <FieldInput id={id} f={f} value={value} onChange={onChange} />
      {f.help && <p className="field-help">{f.help}</p>}
    </div>
  )
}

function FieldInput({ id, f, value, onChange }) {
  switch (f.type) {
    case 'textarea':
    case 'html':
      return (
        <textarea
          id={id}
          className={f.type === 'html' ? 'code' : ''}
          rows={f.rows || (f.type === 'html' ? 8 : 4)}
          value={value ?? ''}
          placeholder={f.placeholder}
          spellCheck={f.type !== 'html'}
          onChange={(e) => onChange(e.target.value)}
        />
      )
    case 'number':
      return (
        <input
          id={id}
          type="number"
          min={f.min}
          max={f.max}
          step={f.step || 1}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        />
      )
    case 'range':
      return (
        <div className="range-row">
          <input id={id} type="range" min={f.min} max={f.max} step={f.step || 1} value={value ?? f.min} onChange={(e) => onChange(Number(e.target.value))} />
          <output>
            {value}
            {f.unit || ''}
          </output>
        </div>
      )
    case 'color':
      return <ColorInput id={id} value={value} onChange={onChange} />
    case 'select':
      return (
        <select id={id} value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
          {f.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )
    case 'segmented':
      return <Segmented value={value} options={f.options} onChange={onChange} />
    case 'date':
      return <input id={id} type="date" value={value || ''} onChange={(e) => onChange(e.target.value)} />
    case 'image':
      return <ImageInput id={id} value={value} onChange={onChange} accept={f.accept} uploadOptions={f.uploadOptions} />
    case 'icon':
      return <IconInput id={id} value={value} onChange={onChange} />
    case 'strings':
      return (
        <input
          id={id}
          value={(value || []).join(' ')}
          placeholder={f.placeholder}
          onChange={(e) => onChange(e.target.value.split(/\s+/).filter(Boolean))}
        />
      )
    case 'post':
      return <PostSelect id={id} value={value} onChange={onChange} />
    case 'category':
      return <CategorySelect id={id} value={value} onChange={onChange} />
    case 'list':
      return <ListInput f={f} value={value} onChange={onChange} />
    default:
      return <input id={id} type="text" value={value ?? ''} placeholder={f.placeholder} onChange={(e) => onChange(e.target.value)} />
  }
}

export function ColorInput({ id, value, onChange }) {
  const hex = /^#[0-9a-f]{6}$/i.test(value || '') ? value : '#000000'
  return (
    <div className="color-input">
      <input type="color" value={hex} onChange={(e) => onChange(e.target.value)} aria-label="색 고르기" />
      <input id={id} type="text" value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder="#ffffff 또는 rgba(...)" />
    </div>
  )
}

export function ImageInput({ id, value, onChange, accept = 'image/*', uploadOptions }) {
  const app = useApp()
  const [busy, setBusy] = useState(false)
  async function upload() {
    const [file] = await pickFile(accept)
    if (!file) return
    setBusy(true)
    try {
      onChange(await uploadFile(file, uploadOptions))
    } catch (e) {
      app.showToast(e.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="image-input">
      {value && /image|\.cur/.test(accept) ? <img src={value} alt="" /> : <div className="image-input-empty"><i className="fa-regular fa-image" /></div>}
      <div className="image-input-side">
        <input id={id} type="text" value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder="이미지 주소 또는 업로드" />
        <div className="row gap-s">
          <button type="button" className="btn small" onClick={upload} disabled={busy}>
            <i className="fa-solid fa-arrow-up-from-bracket" /> {busy ? '올리는 중' : '업로드'}
          </button>
          {value && (
            <button type="button" className="btn small ghost" onClick={() => onChange('')}>
              지우기
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export const COMMON_ICONS = [
  'fa-solid fa-heart', 'fa-regular fa-heart', 'fa-solid fa-star', 'fa-solid fa-moon', 'fa-solid fa-sun', 'fa-solid fa-cloud',
  'fa-solid fa-feather', 'fa-solid fa-pen-nib', 'fa-solid fa-book-open', 'fa-solid fa-bookmark', 'fa-solid fa-envelope', 'fa-solid fa-paper-plane',
  'fa-solid fa-music', 'fa-solid fa-headphones', 'fa-solid fa-camera', 'fa-regular fa-image', 'fa-solid fa-film', 'fa-solid fa-palette',
  'fa-solid fa-gift', 'fa-solid fa-cake-candles', 'fa-solid fa-mug-hot', 'fa-solid fa-ice-cream', 'fa-solid fa-utensils', 'fa-solid fa-seedling',
  'fa-solid fa-clover', 'fa-solid fa-leaf', 'fa-solid fa-snowflake', 'fa-solid fa-umbrella', 'fa-solid fa-gem', 'fa-solid fa-crown',
  'fa-solid fa-ring', 'fa-solid fa-key', 'fa-solid fa-lock', 'fa-solid fa-house', 'fa-solid fa-comment-dots', 'fa-solid fa-comments',
  'fa-solid fa-hashtag', 'fa-regular fa-calendar', 'fa-solid fa-clock', 'fa-solid fa-bell', 'fa-solid fa-bullhorn', 'fa-solid fa-link',
  'fa-solid fa-folder', 'fa-solid fa-layer-group', 'fa-solid fa-list-check', 'fa-solid fa-fire', 'fa-solid fa-wand-magic-sparkles', 'fa-solid fa-dove',
  'fa-solid fa-cat', 'fa-solid fa-dog', 'fa-solid fa-paw', 'fa-solid fa-ghost', 'fa-solid fa-gamepad', 'fa-solid fa-plane',
  'fa-brands fa-x-twitter', 'fa-brands fa-instagram', 'fa-brands fa-youtube', 'fa-brands fa-spotify', 'fa-brands fa-discord', 'fa-brands fa-pinterest',
]

export function IconInput({ id, value, onChange }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="icon-input">
      <div className="row gap-s">
        <span className="icon-preview">
          <i className={value || 'fa-solid fa-circle'} />
        </span>
        <input id={id} type="text" value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder="fa-solid fa-heart" />
        <button type="button" className="btn small" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          고르기
        </button>
      </div>
      {open && (
        <div className="icon-grid">
          {COMMON_ICONS.map((ic) => (
            <button
              type="button"
              key={ic}
              className={ic === value ? 'active' : ''}
              onClick={() => {
                onChange(ic)
                setOpen(false)
              }}
              aria-label={ic}
            >
              <i className={ic} />
            </button>
          ))}
          <a className="icon-grid-more" href="https://fontawesome.com/search?o=r&m=free" target="_blank" rel="noopener noreferrer">
            더 많은 아이콘 찾기 (Font Awesome)
          </a>
        </div>
      )}
    </div>
  )
}

let postCache = null
function PostSelect({ id, value, onChange }) {
  const [posts, setPosts] = useState(postCache || [])
  useEffect(() => {
    if (postCache) return
    api.posts({ limit: 60, type: 'all' }).then((res) => {
      postCache = res.items
      setPosts(res.items)
    })
  }, [])
  return (
    <select id={id} value={value || ''} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : '')}>
      <option value="">글 고르기</option>
      {posts.map((p) => (
        <option key={p.id} value={p.id}>
          {p.title || '(제목 없음)'}
        </option>
      ))}
    </select>
  )
}

function CategorySelect({ id, value, onChange }) {
  const { categories } = useApp()
  return (
    <select id={id} value={value || ''} onChange={(e) => onChange(e.target.value)}>
      <option value="">전체</option>
      {categories.map((c) => (
        <option key={c.id} value={c.slug}>
          {c.parent_id ? '└ ' : ''}
          {c.name}
        </option>
      ))}
    </select>
  )
}

function ListInput({ f, value, onChange }) {
  const items = Array.isArray(value) ? value : []
  const update = (i, v) => onChange(items.map((it, j) => (j === i ? v : it)))
  const move = (i, d) => {
    const j = i + d
    if (j < 0 || j >= items.length) return
    const next = [...items]
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }
  return (
    <div className="list-input">
      {items.map((item, i) => (
        <div className="list-input-item" key={i}>
          <div className="list-input-head">
            <span>
              {f.itemLabel || '항목'} {i + 1}
            </span>
            <div className="row gap-xs">
              <button type="button" className="icon-btn small" onClick={() => move(i, -1)} disabled={i === 0} aria-label="위로">
                <i className="fa-solid fa-arrow-up" />
              </button>
              <button type="button" className="icon-btn small" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label="아래로">
                <i className="fa-solid fa-arrow-down" />
              </button>
              <button type="button" className="icon-btn small danger" onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label="삭제">
                <i className="fa-solid fa-trash" />
              </button>
            </div>
          </div>
          <Fields fields={f.itemFields} value={item} onChange={(v) => update(i, v)} />
        </div>
      ))}
      <button type="button" className="btn small" onClick={() => onChange([...items, { ...(f.newItem || {}) }])}>
        <i className="fa-solid fa-plus" /> {f.itemLabel || '항목'} 추가
      </button>
    </div>
  )
}

import React, { useEffect, useRef } from 'react'

// One UI 스타일 하단 시트 (모바일에서는 아래에서 올라오고, 넓은 화면에서는 가운데 떠요)
export function Sheet({ title, onClose, children, footer, wide = false }) {
  const ref = useRef(null)
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    window.addEventListener('keydown', onKey)
    document.body.classList.add('no-scroll')
    ref.current?.focus()
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.classList.remove('no-scroll')
    }
  }, [onClose])
  return (
    <div className="sheet-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={`sheet ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref}>
        <div className="sheet-handle" />
        {title && <h2 className="sheet-title">{title}</h2>}
        <div className="sheet-body">{children}</div>
        {footer && <div className="sheet-footer">{footer}</div>}
      </div>
    </div>
  )
}

export function Switch({ checked, onChange, label, description }) {
  return (
    <label className="switch-row">
      <span className="switch-text">
        <span>{label}</span>
        {description && <small>{description}</small>}
      </span>
      <input type="checkbox" className="switch" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  )
}

export function Paging({ page, pages, onChange }) {
  if (pages <= 1) return null
  const start = Math.max(1, Math.min(page - 2, pages - 4))
  const nums = []
  for (let i = start; i <= Math.min(pages, start + 4); i++) nums.push(i)
  return (
    <nav className="paging" aria-label="페이지 이동">
      <button type="button" className="paging-arrow" onClick={() => onChange(page - 1)} disabled={page <= 1} aria-label="이전 페이지">
        <i className="fa-solid fa-chevron-left" />
      </button>
      <div className="paging-nums">
        {nums.map((n) => (
          <button
            type="button"
            key={n}
            className={n === page ? 'is-current' : ''}
            aria-current={n === page ? 'page' : undefined}
            onClick={() => onChange(n)}
            aria-label={`${n}페이지`}
          >
            {n}
          </button>
        ))}
      </div>
      <button type="button" className="paging-arrow" onClick={() => onChange(page + 1)} disabled={page >= pages} aria-label="다음 페이지">
        <i className="fa-solid fa-chevron-right" />
      </button>
    </nav>
  )
}

export function Empty({ icon = 'fa-solid fa-circle-exclamation', title, children }) {
  return (
    <div className="empty card">
      <i className={icon} />
      <h3>{title}</h3>
      {children && <p>{children}</p>}
    </div>
  )
}

export function Spinner({ label = '불러오는 중' }) {
  return (
    <div className="spinner" role="status" aria-label={label}>
      <span />
      <span />
      <span />
    </div>
  )
}

export function Segmented({ value, options, onChange, size }) {
  return (
    <div className={`segmented ${size || ''}`} role="radiogroup">
      {options.map((o) => (
        <button
          type="button"
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          className={value === o.value ? 'active' : ''}
          onClick={() => onChange(o.value)}
          title={o.label}
        >
          {o.icon && <i className={o.icon} />}
          {o.label && <span>{o.label}</span>}
        </button>
      ))}
    </div>
  )
}

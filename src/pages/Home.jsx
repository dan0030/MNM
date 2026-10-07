import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useApp } from '../lib/store.jsx'
import { LargeTitle, useTopbarTitle } from '../components/Shell.jsx'
import { Sheet } from '../components/ui.jsx'
import { Fields } from '../components/Fields.jsx'
import { COMMON_WIDGET_FIELDS, WIDGETS } from '../widgets/index.jsx'
import { DEFAULT_HOME } from '../lib/defaults.js'
import { uid } from '../lib/format.js'

const SIZE_LABEL = { S: '작게', M: '중간', L: '크게' }

export default function Home() {
  const app = useApp()
  const { site, theme } = app
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(null)
  const home = editing ? draft : app.home

  useTopbarTitle(theme.homeTitle ? undefined : site.title)

  useEffect(() => {
    document.title = site.title
  }, [site.title])

  function startEdit() {
    setDraft(JSON.parse(JSON.stringify(app.home)))
    setEditing(true)
  }

  async function saveDraft() {
    try {
      await app.saveSetting('home', draft)
      app.showToast('홈 화면을 저장했어요.')
      setEditing(false)
    } catch (e) {
      app.showToast(e.message)
    }
  }

  // 투두 체크처럼 홈 화면에서 바로 바뀌는 설정은 즉시 저장합니다.
  const quickUpdate = useCallback(
    async (pageIdx, widgetIdx, config) => {
      const next = JSON.parse(JSON.stringify(app.home))
      next.pages[pageIdx].widgets[widgetIdx].config = config
      try {
        await app.saveSetting('home', next)
      } catch (e) {
        app.showToast(e.message)
      }
    },
    [app],
  )

  return (
    <div className={`home ${editing ? 'editing' : ''}`}>
      {theme.homeTitle && !editing && <LargeTitle title={site.title} subtitle={site.description} />}
      {editing ? (
        <HomeEditor draft={draft} setDraft={setDraft} onCancel={() => setEditing(false)} onSave={saveDraft} />
      ) : (
        <HomePages home={home} layout={theme.homeLayout} dots={theme.dots} dotsPosition={theme.dotsPosition} onQuickUpdate={app.admin ? quickUpdate : null} />
      )}
      {app.admin && !editing && (
        <button type="button" className="fab" onClick={startEdit} aria-label="홈 화면 편집">
          <i className="fa-solid fa-pen-to-square" />
          <span>홈 편집</span>
        </button>
      )}
    </div>
  )
}

function HomePages({ home, layout, dots, dotsPosition, onQuickUpdate }) {
  const pages = home.pages
  const ref = useRef(null)
  const [active, setActive] = useState(0)
  const drag = useRef(null)

  useEffect(() => {
    const saved = Number(sessionStorage.getItem('od-home-page') || 0)
    if (saved && ref.current && saved < pages.length) {
      ref.current.scrollLeft = saved * ref.current.clientWidth
      setActive(saved)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function onScroll() {
    const el = ref.current
    if (!el) return
    const i = Math.round(el.scrollLeft / el.clientWidth)
    if (i !== active) {
      setActive(i)
      try {
        sessionStorage.setItem('od-home-page', String(i))
      } catch {
        // 무시
      }
    }
  }

  function goTo(i) {
    const el = ref.current
    if (!el) return
    const target = Math.max(0, Math.min(pages.length - 1, i))
    el.scrollTo({ left: target * el.clientWidth, behavior: 'smooth' })
  }

  // 마우스로도 옆으로 끌어서 넘길 수 있게 합니다.
  function onPointerDown(e) {
    if (e.pointerType !== 'mouse' || e.button !== 0) return
    if (e.target.closest('a, button, input, label, iframe, .slides-widget, textarea, select')) return
    drag.current = { x: e.clientX, left: ref.current.scrollLeft, moved: false }
    ref.current.classList.add('dragging')
  }
  function onPointerMove(e) {
    if (!drag.current) return
    const dx = e.clientX - drag.current.x
    if (Math.abs(dx) > 3) drag.current.moved = true
    ref.current.scrollLeft = drag.current.left - dx
  }
  function onPointerUp() {
    if (!drag.current) return
    const el = ref.current
    el.classList.remove('dragging')
    const dx = el.scrollLeft - drag.current.left
    const base = Math.round(drag.current.left / el.clientWidth)
    drag.current = null
    goTo(Math.abs(dx) > el.clientWidth * 0.15 ? base + Math.sign(dx) : base)
  }

  if (layout === 'stack' || pages.length === 1) {
    return (
      <div className="home-stack">
        {pages.map((page, pi) => (
          <WidgetGrid key={page.id} page={page} pageIdx={pi} onQuickUpdate={onQuickUpdate} />
        ))}
      </div>
    )
  }

  const indicator = dots !== 'none' && (
    <PageDots style={dots} count={pages.length} active={active} onSelect={goTo} />
  )

  return (
    <div className="home-swipe">
      {dotsPosition === 'top' && indicator}
      <div
        className="home-pages"
        ref={ref}
        onScroll={onScroll}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        tabIndex={0}
        aria-roledescription="홈 화면 페이지"
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') goTo(active + 1)
          if (e.key === 'ArrowLeft') goTo(active - 1)
        }}
      >
        {pages.map((page, pi) => (
          <section className="home-page" key={page.id} aria-label={`${pi + 1}페이지`} aria-hidden={pi !== active}>
            <WidgetGrid page={page} pageIdx={pi} onQuickUpdate={onQuickUpdate} />
          </section>
        ))}
      </div>
      <button type="button" className="page-arrow prev" onClick={() => goTo(active - 1)} disabled={active === 0} aria-label="이전 페이지">
        <i className="fa-solid fa-chevron-left" />
      </button>
      <button type="button" className="page-arrow next" onClick={() => goTo(active + 1)} disabled={active === pages.length - 1} aria-label="다음 페이지">
        <i className="fa-solid fa-chevron-right" />
      </button>
      {dotsPosition !== 'top' && indicator}
    </div>
  )
}

export function PageDots({ style, count, active, onSelect }) {
  if (style === 'number') {
    return (
      <div className="page-dots number" aria-live="polite">
        <button type="button" onClick={() => onSelect(active - 1)} aria-label="이전 페이지">
          <i className="fa-solid fa-chevron-left" />
        </button>
        <span>
          {active + 1} / {count}
        </span>
        <button type="button" onClick={() => onSelect(active + 1)} aria-label="다음 페이지">
          <i className="fa-solid fa-chevron-right" />
        </button>
      </div>
    )
  }
  return (
    <div className={`page-dots ${style}`} role="tablist">
      {Array.from({ length: count }, (_, i) => (
        <button
          type="button"
          key={i}
          role="tab"
          aria-selected={i === active}
          aria-label={`${i + 1}페이지`}
          className={i === active ? 'active' : ''}
          onClick={() => onSelect(i)}
        />
      ))}
    </div>
  )
}

function widgetStyle(config) {
  const style = {}
  if (config.bg) style['--w-bg'] = config.bg
  if (config.color) style['--w-color'] = config.color
  if (config.bgImage) style['--w-image'] = `url("${config.bgImage}")`
  return style
}

export function WidgetFrame({ widget, children, editing }) {
  const def = WIDGETS[widget.type]
  const config = widget.config || {}
  const styleName = config.style || (def?.bare ? 'bare' : 'card')
  return (
    <div
      className={`widget w-${widget.type} size-${widget.size || 'L'} style-${styleName} ${config.bgImage ? 'has-bg-image' : ''} ${config.align === 'center' ? 'align-center' : ''} ${editing ? 'is-editing' : ''}`}
      style={widgetStyle(config)}
    >
      {children}
    </div>
  )
}

function WidgetGrid({ page, pageIdx, onQuickUpdate }) {
  return (
    <div className="widget-grid">
      {page.widgets.map((w, wi) => {
        const def = WIDGETS[w.type]
        if (!def) return null
        const C = def.Component
        return (
          <WidgetFrame key={w.id} widget={w}>
            <C config={{ ...def.defaults, ...w.config }} size={w.size} onConfigChange={onQuickUpdate ? (c) => onQuickUpdate(pageIdx, wi, c) : null} />
          </WidgetFrame>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 홈 화면 편집                                                          */
/* ------------------------------------------------------------------ */

function HomeEditor({ draft, setDraft, onCancel, onSave }) {
  const [picker, setPicker] = useState(null) // 위젯을 추가할 페이지 번호
  const [editingWidget, setEditingWidget] = useState(null) // { pageIdx, widgetIdx }
  const [dragFrom, setDragFrom] = useState(null)

  const update = (fn) =>
    setDraft((d) => {
      const next = JSON.parse(JSON.stringify(d))
      fn(next)
      return next
    })

  function moveWidget(from, to) {
    update((d) => {
      const [w] = d.pages[from.pageIdx].widgets.splice(from.widgetIdx, 1)
      let idx = to.widgetIdx
      if (from.pageIdx === to.pageIdx && from.widgetIdx < to.widgetIdx) idx -= 1
      d.pages[to.pageIdx].widgets.splice(Math.max(0, idx), 0, w)
    })
  }

  function addWidget(pageIdx, type) {
    const def = WIDGETS[type]
    const w = { id: uid('w'), type, size: def.sizes.includes('L') ? 'L' : def.sizes[def.sizes.length - 1], config: JSON.parse(JSON.stringify(def.defaults || {})) }
    if (type === 'shortcut') w.size = 'S'
    update((d) => d.pages[pageIdx].widgets.push(w))
    setPicker(null)
    setEditingWidget({ pageIdx, widgetIdx: draft.pages[pageIdx].widgets.length })
  }

  const current = editingWidget && draft.pages[editingWidget.pageIdx]?.widgets[editingWidget.widgetIdx]

  return (
    <div className="home-editor">
      <div className="edit-bar">
        <div>
          <strong>홈 화면 편집</strong>
          <span>위젯을 끌어서 옮기거나, 버튼으로 순서·크기를 바꿔보세요.</span>
        </div>
        <div className="row gap-s">
          <button
            type="button"
            className="btn small ghost"
            onClick={() => window.confirm('기본 홈 화면으로 되돌릴까요? (저장 전까지는 반영되지 않아요)') && setDraft(JSON.parse(JSON.stringify(DEFAULT_HOME)))}
          >
            초기화
          </button>
          <button type="button" className="btn small" onClick={onCancel}>
            취소
          </button>
          <button type="button" className="btn small primary" onClick={onSave}>
            저장
          </button>
        </div>
      </div>

      {draft.pages.map((page, pi) => (
        <section key={page.id} className="edit-page">
          <div className="edit-page-head">
            <span className="edit-page-name">{pi + 1}페이지</span>
            <div className="row gap-xs">
              <button type="button" className="icon-btn small" disabled={pi === 0} onClick={() => update((d) => d.pages.splice(pi - 1, 0, d.pages.splice(pi, 1)[0]))} aria-label="페이지 앞으로">
                <i className="fa-solid fa-arrow-up" />
              </button>
              <button
                type="button"
                className="icon-btn small"
                disabled={pi === draft.pages.length - 1}
                onClick={() => update((d) => d.pages.splice(pi + 1, 0, d.pages.splice(pi, 1)[0]))}
                aria-label="페이지 뒤로"
              >
                <i className="fa-solid fa-arrow-down" />
              </button>
              <button
                type="button"
                className="icon-btn small danger"
                disabled={draft.pages.length === 1}
                onClick={() => window.confirm(`${pi + 1}페이지와 위젯을 모두 지울까요?`) && update((d) => d.pages.splice(pi, 1))}
                aria-label="페이지 삭제"
              >
                <i className="fa-solid fa-trash" />
              </button>
            </div>
          </div>
          <div
            className="widget-grid"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              if (e.target === e.currentTarget && dragFrom) moveWidget(dragFrom, { pageIdx: pi, widgetIdx: page.widgets.length })
              setDragFrom(null)
            }}
          >
            {page.widgets.map((w, wi) => {
              const def = WIDGETS[w.type]
              if (!def) return null
              const C = def.Component
              const sizes = def.sizes
              return (
                <div
                  key={w.id}
                  className={`edit-slot size-${w.size || 'L'} ${dragFrom?.pageIdx === pi && dragFrom?.widgetIdx === wi ? 'dragging' : ''}`}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = 'move'
                    setDragFrom({ pageIdx: pi, widgetIdx: wi })
                  }}
                  onDragEnd={() => setDragFrom(null)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    if (dragFrom) moveWidget(dragFrom, { pageIdx: pi, widgetIdx: wi })
                    setDragFrom(null)
                  }}
                >
                  <WidgetFrame widget={w} editing>
                    <div className="edit-preview" inert="">
                      <C config={{ ...def.defaults, ...w.config }} size={w.size} />
                    </div>
                  </WidgetFrame>
                  <div className="edit-tools">
                    <span className="edit-label">
                      <i className={def.icon} /> {def.label}
                    </span>
                    <div className="edit-buttons">
                      <button type="button" disabled={wi === 0} onClick={() => moveWidget({ pageIdx: pi, widgetIdx: wi }, { pageIdx: pi, widgetIdx: wi - 1 })} aria-label="앞으로">
                        <i className="fa-solid fa-arrow-left" />
                      </button>
                      <button
                        type="button"
                        disabled={wi === page.widgets.length - 1}
                        onClick={() => moveWidget({ pageIdx: pi, widgetIdx: wi }, { pageIdx: pi, widgetIdx: wi + 2 })}
                        aria-label="뒤로"
                      >
                        <i className="fa-solid fa-arrow-right" />
                      </button>
                      {sizes.length > 1 && (
                        <button
                          type="button"
                          onClick={() => update((d) => (d.pages[pi].widgets[wi].size = sizes[(sizes.indexOf(w.size) + 1) % sizes.length]))}
                          aria-label="크기 바꾸기"
                          title="크기 바꾸기"
                        >
                          {w.size || 'L'}
                        </button>
                      )}
                      <button type="button" onClick={() => setEditingWidget({ pageIdx: pi, widgetIdx: wi })} aria-label="설정">
                        <i className="fa-solid fa-sliders" />
                      </button>
                      <button type="button" className="danger" onClick={() => update((d) => d.pages[pi].widgets.splice(wi, 1))} aria-label="삭제">
                        <i className="fa-solid fa-trash" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
            <button type="button" className="add-widget size-L" onClick={() => setPicker(pi)}>
              <i className="fa-solid fa-plus" /> 위젯 추가
            </button>
          </div>
        </section>
      ))}

      <button type="button" className="btn block" onClick={() => update((d) => d.pages.push({ id: uid('page'), widgets: [] }))}>
        <i className="fa-solid fa-plus" /> 페이지 추가
      </button>

      {picker !== null && (
        <Sheet title="위젯 추가" onClose={() => setPicker(null)} wide>
          <div className="widget-picker">
            {Object.entries(WIDGETS).map(([type, def]) => (
              <button type="button" key={type} onClick={() => addWidget(picker, type)}>
                <span className="widget-picker-icon">
                  <i className={def.icon} />
                </span>
                <span>{def.label}</span>
              </button>
            ))}
          </div>
        </Sheet>
      )}

      {current && (
        <WidgetSettings
          widget={current}
          pageIdx={editingWidget.pageIdx}
          pageCount={draft.pages.length}
          onClose={() => setEditingWidget(null)}
          onChange={(w) => update((d) => (d.pages[editingWidget.pageIdx].widgets[editingWidget.widgetIdx] = w))}
          onMovePage={(target) => {
            moveWidget({ pageIdx: editingWidget.pageIdx, widgetIdx: editingWidget.widgetIdx }, { pageIdx: target, widgetIdx: draft.pages[target].widgets.length })
            setEditingWidget({ pageIdx: target, widgetIdx: draft.pages[target].widgets.length - (target === editingWidget.pageIdx ? 1 : 0) })
          }}
        />
      )}
    </div>
  )
}

function WidgetSettings({ widget, pageIdx, pageCount, onClose, onChange, onMovePage }) {
  const def = WIDGETS[widget.type]
  const config = { ...def.defaults, ...widget.config }
  return (
    <Sheet title={`${def.label} 설정`} onClose={onClose} wide footer={<button type="button" className="btn primary block" onClick={onClose}>완료</button>}>
      {def.help && <p className="sheet-help">{def.help}</p>}
      <div className="fields">
        {def.sizes.length > 1 && (
          <div className="field">
            <span className="field-label">크기</span>
            <div className="segmented">
              {def.sizes.map((s) => (
                <button type="button" key={s} className={widget.size === s ? 'active' : ''} onClick={() => onChange({ ...widget, size: s })}>
                  {s} · {SIZE_LABEL[s]}
                </button>
              ))}
            </div>
          </div>
        )}
        {pageCount > 1 && (
          <div className="field">
            <label className="field-label" htmlFor="widget-page">
              위치한 페이지
            </label>
            <select id="widget-page" value={pageIdx} onChange={(e) => onMovePage(Number(e.target.value))}>
              {Array.from({ length: pageCount }, (_, i) => (
                <option key={i} value={i}>
                  {i + 1}페이지
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      <Fields fields={[...def.fields, ...COMMON_WIDGET_FIELDS]} value={config} onChange={(c) => onChange({ ...widget, config: c })} />
    </Sheet>
  )
}

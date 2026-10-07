import React, { useEffect, useRef, useState } from 'react'
import { useApp } from '../lib/store.jsx'
import { uploadFile, pickFile } from '../lib/image.js'
import { escapeHtml, youtubeId } from '../lib/format.js'
import { FONTS } from '../lib/defaults.js'
import { loadFontByKey, loadFontsIn } from '../lib/theme.js'

const BLOCKS = [
  { value: 'p', label: '본문' },
  { value: 'h2', label: '제목 1' },
  { value: 'h3', label: '제목 2' },
  { value: 'h4', label: '제목 3' },
  { value: 'blockquote', label: '인용' },
  { value: 'pre', label: '코드' },
]

const SIZES = [
  { value: '2', label: '작게' },
  { value: '3', label: '보통' },
  { value: '4', label: '조금 크게' },
  { value: '5', label: '크게' },
  { value: '6', label: '아주 크게' },
  { value: '7', label: '제일 크게' },
]

const TEMPLATES = [
  {
    group: '대화',
    items: [
      {
        label: '메신저 대화',
        icon: 'fa-regular fa-comments',
        html: '<div class="chat"><div class="chat-row partner"><span class="chat-name">{{상대}}</span><div class="chat-bubble">메시지를 입력하세요</div></div><div class="chat-row me"><div class="chat-bubble">답장을 입력하세요</div></div></div><p><br></p>',
      },
      {
        label: '문자 메시지',
        icon: 'fa-regular fa-message',
        html: '<div class="chat sms"><div class="chat-time">오후 11:24</div><div class="chat-row partner"><div class="chat-bubble">자?</div></div><div class="chat-row me"><div class="chat-bubble">아니 아직</div></div></div><p><br></p>',
      },
      {
        label: '대사 (이름: 대사)',
        icon: 'fa-solid fa-quote-left',
        html: '<p class="line"><b class="line-name">{{상대}}</b> 대사를 입력하세요</p><p class="line"><b class="line-name">{{나}}</b> 대사를 입력하세요</p><p><br></p>',
      },
    ],
  },
  {
    group: '상자',
    items: [
      { label: '강조 상자', icon: 'fa-regular fa-square', html: '<div class="callout">강조하고 싶은 내용을 입력하세요</div><p><br></p>' },
      { label: '포인트 상자', icon: 'fa-solid fa-square', html: '<div class="callout accent">포인트 컬러 상자</div><p><br></p>' },
      { label: '메모지', icon: 'fa-regular fa-note-sticky', html: '<div class="memo-box">메모를 적어보세요</div><p><br></p>' },
      { label: '편지지', icon: 'fa-regular fa-envelope', html: '<div class="letter"><p>To. {{상대}}</p><p>편지 내용을 적어보세요.</p><p class="letter-from">From. {{나}}</p></div><p><br></p>' },
      { label: '접은 글', icon: 'fa-solid fa-caret-down', html: '<details class="fold"><summary>더보기</summary><p>접어둘 내용을 입력하세요</p></details><p><br></p>' },
      { label: '경고문 (트리거 주의)', icon: 'fa-solid fa-triangle-exclamation', html: '<div class="callout warn">⚠ 주의: 내용을 입력하세요</div><p><br></p>' },
    ],
  },
  {
    group: '구분선',
    items: [
      { label: '선', icon: 'fa-solid fa-minus', html: '<hr><p><br></p>' },
      { label: '점선', icon: 'fa-solid fa-ellipsis', html: '<hr class="dots"><p><br></p>' },
      { label: '하트', icon: 'fa-solid fa-heart', html: '<hr class="heart"><p><br></p>' },
      { label: '별', icon: 'fa-solid fa-star', html: '<hr class="star"><p><br></p>' },
      { label: '여백', icon: 'fa-solid fa-arrows-up-down', html: '<div class="spacer"></div><p><br></p>' },
    ],
  },
  {
    group: '기타',
    items: [
      {
        label: '표 (3×3)',
        icon: 'fa-solid fa-table',
        html: '<table><tbody><tr><th>제목</th><th>제목</th><th>제목</th></tr><tr><td>내용</td><td>내용</td><td>내용</td></tr><tr><td>내용</td><td>내용</td><td>내용</td></tr></tbody></table><p><br></p>',
      },
      { label: '프로필 카드', icon: 'fa-regular fa-id-card', html: '<div class="profile-card"><img src="" alt=""><div><strong>이름</strong><p>설명을 적어보세요</p></div></div><p><br></p>' },
    ],
  },
]

export function RichEditor({ value, onChange, mode, onModeChange }) {
  const app = useApp()
  const editorRef = useRef(null)
  const lastHtml = useRef(null)
  const savedRange = useRef(null)
  const [menu, setMenu] = useState(null)
  const [uploading, setUploading] = useState(0)
  const [state, setState] = useState({})

  // 바깥에서 값이 바뀌었을 때만 편집 영역을 다시 그립니다. (커서가 튀지 않게)
  useEffect(() => {
    const el = editorRef.current
    if (mode !== 'rich' || !el) return
    if (value !== lastHtml.current) {
      el.innerHTML = value || ''
      lastHtml.current = value
      loadFontsIn(el)
    }
  }, [value, mode])

  useEffect(() => {
    try {
      document.execCommand('defaultParagraphSeparator', false, 'p')
    } catch {
      // 지원하지 않는 브라우저
    }
    const onSel = () => {
      const sel = window.getSelection()
      if (!sel.rangeCount || !editorRef.current) return
      const range = sel.getRangeAt(0)
      if (editorRef.current.contains(range.commonAncestorContainer)) {
        savedRange.current = range.cloneRange()
        setState({
          bold: document.queryCommandState('bold'),
          italic: document.queryCommandState('italic'),
          underline: document.queryCommandState('underline'),
          strikeThrough: document.queryCommandState('strikeThrough'),
          ul: document.queryCommandState('insertUnorderedList'),
          ol: document.queryCommandState('insertOrderedList'),
          block: String(document.queryCommandValue('formatBlock') || 'p').toLowerCase(),
        })
      }
    }
    document.addEventListener('selectionchange', onSel)
    return () => document.removeEventListener('selectionchange', onSel)
  }, [])

  function emit() {
    const html = editorRef.current.innerHTML
    lastHtml.current = html
    onChange(html)
  }

  function restore() {
    const el = editorRef.current
    el.focus()
    if (savedRange.current) {
      const sel = window.getSelection()
      sel.removeAllRanges()
      sel.addRange(savedRange.current)
    }
  }

  function exec(cmd, arg = null) {
    restore()
    document.execCommand('styleWithCSS', false, ['foreColor', 'hiliteColor', 'backColor'].includes(cmd))
    document.execCommand(cmd, false, arg)
    emit()
  }

  function insertHtml(html) {
    restore()
    document.execCommand('insertHTML', false, html)
    emit()
    setMenu(null)
  }

  // 블록(대화·상자·사진 등)은 execCommand 대신 직접 끼워 넣어요. (크롬이 구조를 망가뜨리는 걸 막기 위해)
  function insertBlock(html) {
    const el = editorRef.current
    el.focus()
    const tpl = document.createElement('template')
    tpl.innerHTML = html
    const nodes = Array.from(tpl.content.childNodes)
    let anchor = savedRange.current?.startContainer
    while (anchor && anchor.parentNode !== el) anchor = anchor.parentNode
    if (anchor && anchor.nodeType === 3) {
      // 문단으로 감싸지지 않은 맨 윗줄 글자는 <p>로 감싸줍니다.
      const p = document.createElement('p')
      anchor.replaceWith(p)
      p.appendChild(anchor)
      anchor = p
    }
    const emptyAnchor = anchor && anchor.textContent.trim() === '' && !anchor.querySelector?.('img,iframe')
    if (anchor) anchor.after(...nodes)
    else el.append(...nodes)
    if (emptyAnchor) anchor.remove()
    const last = nodes[nodes.length - 1]
    if (last) {
      const range = document.createRange()
      range.selectNodeContents(last)
      range.collapse(false)
      const sel = window.getSelection()
      sel.removeAllRanges()
      sel.addRange(range)
      savedRange.current = range.cloneRange()
    }
    emit()
    setMenu(null)
  }

  function wrapSelection(className, tag = 'span') {
    restore()
    const sel = window.getSelection()
    const text = sel.toString()
    if (!text) {
      app.showToast('먼저 글자를 선택해주세요.')
      return
    }
    insertHtml(`<${tag} class="${className}">${escapeHtml(text)}</${tag}>`)
  }

  async function insertImages(files, asRow = false) {
    const images = files.filter((f) => f.type.startsWith('image/'))
    if (!images.length) return
    setUploading((n) => n + images.length)
    try {
      const urls = []
      for (const f of images) {
        urls.push(await uploadFile(f))
        setUploading((n) => n - 1)
      }
      const tags = urls.map((u) => `<img src="${u}" alt="">`).join('')
      insertBlock(asRow && urls.length > 1 ? `<div class="img-row">${tags}</div><p><br></p>` : `<p>${tags}</p><p><br></p>`)
    } catch (e) {
      app.showToast(e.message)
      setUploading(0)
    }
  }

  function onPaste(e) {
    const files = Array.from(e.clipboardData?.files || [])
    if (files.some((f) => f.type.startsWith('image/'))) {
      e.preventDefault()
      insertImages(files)
    }
  }

  function onDrop(e) {
    const files = Array.from(e.dataTransfer?.files || [])
    if (files.length) {
      e.preventDefault()
      const range = document.caretRangeFromPoint?.(e.clientX, e.clientY)
      if (range) savedRange.current = range
      insertImages(files, files.length > 1)
    }
  }

  function addLink() {
    const url = window.prompt('연결할 주소를 입력하세요', 'https://')
    if (!url) return
    const sel = savedRange.current?.toString()
    if (sel) exec('createLink', url)
    else insertHtml(`<a href="${escapeHtml(url)}">${escapeHtml(url)}</a>`)
  }

  function addYoutube() {
    const url = window.prompt('유튜브 주소를 붙여넣어 주세요')
    const id = youtubeId(url)
    if (!id) {
      if (url) app.showToast('유튜브 주소를 알아보지 못했어요.')
      return
    }
    insertBlock(
      `<div class="video-wrap"><iframe src="https://www.youtube.com/embed/${id}" title="YouTube" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div><p><br></p>`,
    )
  }

  const Btn = ({ icon, label, onClick, active, children }) => (
    <button
      type="button"
      className={`tb-btn ${active ? 'active' : ''}`}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active === undefined ? undefined : !!active}
    >
      {icon ? <i className={icon} /> : children}
    </button>
  )

  return (
    <div className={`rich-editor mode-${mode}`}>
      <div className="toolbar" role="toolbar" aria-label="글 서식">
        <div className="tb-mode segmented small">
          <button type="button" className={mode === 'rich' ? 'active' : ''} onClick={() => {
              lastHtml.current = null
              onModeChange('rich')
            }}>
            에디터
          </button>
          <button type="button" className={mode === 'html' ? 'active' : ''} onClick={() => {
              lastHtml.current = null
              onModeChange('html')
            }}>
            HTML
          </button>
        </div>
        {mode === 'rich' && (
          <>
            <span className="tb-sep" />
            <Btn icon="fa-solid fa-rotate-left" label="실행 취소" onClick={() => exec('undo')} />
            <Btn icon="fa-solid fa-rotate-right" label="다시 실행" onClick={() => exec('redo')} />
            <span className="tb-sep" />
            <select className="tb-select" value={BLOCKS.some((b) => b.value === state.block) ? state.block : 'p'} onChange={(e) => exec('formatBlock', e.target.value)} aria-label="문단 모양">
              {BLOCKS.map((b) => (
                <option key={b.value} value={b.value}>
                  {b.label}
                </option>
              ))}
            </select>
            <select
              className="tb-select"
              value=""
              onChange={(e) => {
                const font = FONTS.find((f) => f.key === e.target.value)
                if (!font) return
                loadFontByKey(font.key)
                exec('fontName', font.family.split(',')[0].replace(/['"]/g, '').trim())
              }}
              aria-label="글꼴"
            >
              <option value="">글꼴</option>
              {FONTS.filter((f) => f.key !== 'custom' && f.key !== 'system').map((f) => (
                <option key={f.key} value={f.key}>
                  {f.label}
                </option>
              ))}
            </select>
            <select className="tb-select" value="" onChange={(e) => e.target.value && exec('fontSize', e.target.value)} aria-label="글자 크기">
              <option value="">크기</option>
              {SIZES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <span className="tb-sep" />
            <Btn icon="fa-solid fa-bold" label="굵게" active={state.bold} onClick={() => exec('bold')} />
            <Btn icon="fa-solid fa-italic" label="기울임" active={state.italic} onClick={() => exec('italic')} />
            <Btn icon="fa-solid fa-underline" label="밑줄" active={state.underline} onClick={() => exec('underline')} />
            <Btn icon="fa-solid fa-strikethrough" label="취소선" active={state.strikeThrough} onClick={() => exec('strikeThrough')} />
            <label className="tb-btn tb-color" title="글자색" onMouseDown={() => restore()}>
              <i className="fa-solid fa-font" />
              <input type="color" onChange={(e) => exec('foreColor', e.target.value)} aria-label="글자색" />
            </label>
            <label className="tb-btn tb-color" title="형광펜" onMouseDown={() => restore()}>
              <i className="fa-solid fa-highlighter" />
              <input type="color" defaultValue="#fff59d" onChange={(e) => exec('hiliteColor', e.target.value)} aria-label="형광펜 색" />
            </label>
            <Btn icon="fa-solid fa-eye-slash" label="스포일러 (눌러야 보이는 글자)" onClick={() => wrapSelection('spoiler')} />
            <Btn icon="fa-solid fa-text-slash" label="서식 지우기" onClick={() => exec('removeFormat')} />
            <span className="tb-sep" />
            <Btn icon="fa-solid fa-align-left" label="왼쪽 정렬" onClick={() => exec('justifyLeft')} />
            <Btn icon="fa-solid fa-align-center" label="가운데 정렬" onClick={() => exec('justifyCenter')} />
            <Btn icon="fa-solid fa-align-right" label="오른쪽 정렬" onClick={() => exec('justifyRight')} />
            <Btn icon="fa-solid fa-align-justify" label="양쪽 정렬" onClick={() => exec('justifyFull')} />
            <span className="tb-sep" />
            <Btn icon="fa-solid fa-list-ul" label="글머리 목록" active={state.ul} onClick={() => exec('insertUnorderedList')} />
            <Btn icon="fa-solid fa-list-ol" label="번호 목록" active={state.ol} onClick={() => exec('insertOrderedList')} />
            <Btn icon="fa-solid fa-indent" label="들여쓰기" onClick={() => exec('indent')} />
            <Btn icon="fa-solid fa-outdent" label="내어쓰기" onClick={() => exec('outdent')} />
            <span className="tb-sep" />
            <Btn icon="fa-solid fa-link" label="링크" onClick={addLink} />
            <Btn icon="fa-regular fa-image" label="사진 올리기" onClick={async () => insertImages(await pickFile('image/*', true))} />
            <Btn icon="fa-solid fa-images" label="사진 나란히 올리기" onClick={async () => insertImages(await pickFile('image/*', true), true)} />
            <Btn icon="fa-brands fa-youtube" label="유튜브" onClick={addYoutube} />
            <span className="tb-sep" />
            <Btn label="이름 변환 넣기" onClick={() => setMenu(menu === 'names' ? null : 'names')} active={menu === 'names'}>
              <span className="tb-text">{'{{이름}}'}</span>
            </Btn>
            <Btn label="블록 넣기" onClick={() => setMenu(menu === 'blocks' ? null : 'blocks')} active={menu === 'blocks'}>
              <i className="fa-solid fa-plus" /> <span className="tb-text">블록</span>
            </Btn>
          </>
        )}
      </div>

      {menu === 'names' && (
        <div className="tb-menu">
          <p className="tb-menu-help">글을 볼 때 프로필 이름으로 바뀌어요. 이름을 바꾸면 모든 글에 한 번에 반영돼요.</p>
          <div className="tb-menu-items">
            {[
              ['{{나}}', app.site.pair.me.name],
              ['{{상대}}', app.site.pair.partner.name],
              ['{{페어}}', app.site.pair.pairName],
            ].map(([code, name]) => (
              <button type="button" key={code} onMouseDown={(e) => e.preventDefault()} onClick={() => insertHtml(code)}>
                <code>{code}</code> → {name}
              </button>
            ))}
          </div>
        </div>
      )}
      {menu === 'blocks' && (
        <div className="tb-menu">
          {TEMPLATES.map((g) => (
            <div key={g.group} className="tb-menu-group">
              <span className="tb-menu-label">{g.group}</span>
              <div className="tb-menu-items">
                {g.items.map((t) => (
                  <button type="button" key={t.label} onMouseDown={(e) => e.preventDefault()} onClick={() => insertBlock(t.html)}>
                    <i className={t.icon} /> {t.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {mode === 'rich' ? (
        <div
          ref={editorRef}
          className="editor-area prose"
          contentEditable
          suppressContentEditableWarning
          onInput={emit}
          onBlur={emit}
          onPaste={onPaste}
          onDrop={onDrop}
          role="textbox"
          aria-multiline="true"
          aria-label="본문"
          data-placeholder="내용을 입력하세요"
        />
      ) : (
        <textarea
          className="html-area code"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          aria-label="HTML 본문"
          placeholder="<p>HTML을 직접 입력하세요. <style>이나 <script>도 쓸 수 있어요.</p>"
          onKeyDown={(e) => {
            if (e.key === 'Tab') {
              e.preventDefault()
              const t = e.target
              const s = t.selectionStart
              const next = t.value.slice(0, s) + '  ' + t.value.slice(t.selectionEnd)
              onChange(next)
              requestAnimationFrame(() => t.setSelectionRange(s + 2, s + 2))
            }
          }}
        />
      )}
      {uploading > 0 && (
        <div className="upload-status">
          <i className="fa-solid fa-spinner fa-spin" /> 사진 {uploading}장 올리는 중...
        </div>
      )}
    </div>
  )
}

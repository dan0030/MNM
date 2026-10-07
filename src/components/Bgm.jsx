import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { youtubeId } from '../lib/format.js'
import { useApp } from '../lib/store.jsx'

const BgmContext = createContext(null)

let apiPromise = null
function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (!apiPromise) {
    apiPromise = new Promise((resolve, reject) => {
      const prev = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => {
        prev?.()
        resolve(window.YT)
      }
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      tag.onerror = () => {
        apiPromise = null
        reject(new Error('YouTube를 불러오지 못했어요.'))
      }
      document.head.appendChild(tag)
    })
  }
  return apiPromise
}

// 사이트 전체에서 하나만 쓰는 BGM 플레이어입니다. (서랍 메뉴와 BGM 위젯이 같은 플레이어를 조작해요)
export function BgmProvider({ children }) {
  const { site } = useApp()
  const tracks = (site.bgm || []).map((t, i) => ({ title: t.title || `Track ${i + 1}`, id: youtubeId(t.url) })).filter((t) => t.id)
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [volume, setVolumeState] = useState(50)
  const [error, setError] = useState(null)
  const playerRef = useRef(null)
  const holderRef = useRef(null)
  const tracksRef = useRef(tracks)
  tracksRef.current = tracks
  const indexRef = useRef(index)
  indexRef.current = index

  const ensurePlayer = useCallback(async () => {
    if (playerRef.current) return playerRef.current
    const YT = await loadYouTubeApi()
    return new Promise((resolve) => {
      const el = document.createElement('div')
      holderRef.current.appendChild(el)
      const player = new YT.Player(el, {
        height: '0',
        width: '0',
        videoId: tracksRef.current[indexRef.current]?.id,
        playerVars: { autoplay: 0, controls: 0, playsinline: 1 },
        events: {
          onReady: () => {
            player.setVolume(volume)
            playerRef.current = player
            resolve(player)
          },
          onStateChange: (e) => {
            if (e.data === YT.PlayerState.PLAYING) setPlaying(true)
            else if (e.data === YT.PlayerState.PAUSED) setPlaying(false)
            else if (e.data === YT.PlayerState.ENDED) {
              const n = tracksRef.current.length
              if (n) {
                const next = (indexRef.current + 1) % n
                setIndex(next)
                player.loadVideoById(tracksRef.current[next].id)
              }
            }
          },
        },
      })
    })
  }, [volume])

  useEffect(() => {
    if (!playing) return
    const t = setInterval(() => {
      const p = playerRef.current
      if (!p?.getDuration) return
      const d = p.getDuration()
      if (d > 0) setProgress((p.getCurrentTime() / d) * 100)
    }, 500)
    return () => clearInterval(t)
  }, [playing])

  const toggle = useCallback(async () => {
    if (!tracks.length) return
    try {
      setError(null)
      const p = await ensurePlayer()
      if (p.getPlayerState() === window.YT.PlayerState.PLAYING) p.pauseVideo()
      else p.playVideo()
    } catch (e) {
      setError(e.message)
    }
  }, [tracks.length, ensurePlayer])

  const go = useCallback(
    async (delta) => {
      if (!tracks.length) return
      const next = (index + delta + tracks.length) % tracks.length
      setIndex(next)
      setProgress(0)
      try {
        const p = await ensurePlayer()
        p.loadVideoById(tracks[next].id)
      } catch (e) {
        setError(e.message)
      }
    },
    [index, tracks, ensurePlayer],
  )

  const setVolume = useCallback((v) => {
    setVolumeState(v)
    playerRef.current?.setVolume?.(v)
  }, [])

  const value = {
    tracks,
    current: tracks[index] || null,
    playing,
    progress,
    volume,
    error,
    toggle,
    next: () => go(1),
    prev: () => go(-1),
    setVolume,
  }
  return (
    <BgmContext.Provider value={value}>
      {children}
      <div ref={holderRef} className="bgm-holder" aria-hidden="true" />
    </BgmContext.Provider>
  )
}

export function useBgm() {
  return useContext(BgmContext)
}

export function BgmCard({ compact = false }) {
  const bgm = useBgm()
  const { site } = useApp()
  const empty = !bgm.tracks.length
  return (
    <div className={`bgm-card ${compact ? 'compact' : ''}`}>
      <div className="bgm-info">
        <div className={`bgm-thumb ${bgm.playing ? 'spinning' : ''}`}>
          <i className="fa-solid fa-music" />
        </div>
        <div className="bgm-meta">
          <span className="bgm-title">{empty ? 'BGM이 설정되지 않음' : bgm.current?.title}</span>
          <span className="bgm-sub">{bgm.error || (bgm.playing ? site.bgmLabel || 'Now playing' : 'Ready to play')}</span>
        </div>
      </div>
      <div className="bgm-controls">
        <button type="button" onClick={bgm.prev} disabled={empty} aria-label="이전 곡">
          <i className="fa-solid fa-backward-step" />
        </button>
        <button type="button" className="bgm-play" onClick={bgm.toggle} disabled={empty} aria-label={bgm.playing ? '일시정지' : '재생'}>
          <i className={`fa-solid ${bgm.playing ? 'fa-pause' : 'fa-play'}`} />
        </button>
        <button type="button" onClick={bgm.next} disabled={empty} aria-label="다음 곡">
          <i className="fa-solid fa-forward-step" />
        </button>
        <label className="bgm-volume">
          <i className="fa-solid fa-volume-high" aria-hidden="true" />
          <input type="range" min="0" max="100" step="5" value={bgm.volume} onChange={(e) => bgm.setVolume(Number(e.target.value))} disabled={empty} aria-label="음량" />
        </label>
      </div>
      <div className="bgm-progress">
        <div style={{ width: `${bgm.progress}%` }} />
      </div>
    </div>
  )
}

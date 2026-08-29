'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { TEMPLATES } from '@/lib/tokens'
import { Appearance, applyAppearance, getStoredAppearance, storeAppearance } from '@/lib/appearance'
import AppearanceToggle from '@/components/AppearanceToggle'

function dot(color: string, size = 9): React.CSSProperties {
  return { width: size, height: size, borderRadius: '50%', background: color, flex: 'none', display: 'inline-block' }
}

function btn(kind: 'brass' | 'ghost', size?: 'lg'): React.CSSProperties {
  const pad = size === 'lg' ? '12px 20px' : '8px 14px'
  const fs = size === 'lg' ? 15 : 13.5
  const base: React.CSSProperties = {
    borderRadius: 9,
    padding: pad,
    fontSize: fs,
    fontWeight: 600,
    whiteSpace: 'nowrap',
    flex: 'none',
    transition: 'var(--t-btn)',
    display: 'inline-flex',
    alignItems: 'center',
  }
  return kind === 'brass'
    ? { ...base, border: '1px solid var(--brass)', background: 'var(--brass)', color: 'var(--brass-ink)' }
    : { ...base, border: '1px solid var(--chrome-line)', background: 'var(--chrome-2)', color: 'var(--chalk)' }
}

function card(i: number, top: number, left: number, w: number): React.CSSProperties {
  return {
    position: 'absolute',
    top,
    left: `${left}%`,
    width: `${w}%`,
    background: 'var(--card-bg)',
    border: '1px solid var(--card-line)',
    borderRadius: 10,
    padding: '14px 16px',
    zIndex: i,
    boxShadow: 'var(--shadow-note)',
  }
}

const HERO_CARDS = [
  { tmpl: 'meeting' as const, title: 'Q3 pricing review', fieldKey: 'Decisions', fieldVal: 'Hold the £29 tier.', pos: card(1, 0, 0, 74) },
  { tmpl: 'soap' as const, title: 'Patient RG — session 12', fieldKey: 'Assessment', fieldVal: 'GAD-7 down to 9 from 14.', pos: card(2, 132, 13, 74) },
  { tmpl: 'fieldlog' as const, title: 'Site visit — Warehouse 3', fieldKey: 'Conditions', fieldVal: '41°C, dry. Bay fans running.', pos: card(3, 264, 26, 74) },
]

const FEATURES = [
  { no: '01', title: 'Capture it however', body: 'Record straight into the app or paste what you already typed. Fragments and shorthand are fine — that is what the restructuring step is for.' },
  { no: '02', title: 'Templates that fit the work', body: 'Meeting minutes, SOAP notes, 1:1s, journals, lectures, interviews, field logs. Each keeps its own colour so the board stays readable.' },
  { no: '03', title: 'Nothing gets overwritten', body: 'The raw capture is kept exactly as you gave it, and every restructure is saved as a new version. Trying another shape costs you nothing.' },
]

export default function LandingPage() {
  const [appearance, setAppearance] = useState<Appearance>('light')

  useEffect(() => {
    setAppearance(getStoredAppearance())
  }, [])

  const changeAppearance = (mode: Appearance) => {
    setAppearance(mode)
    applyAppearance(mode)
    storeAppearance(mode)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--chrome)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      <header style={{ borderBottom: '1px solid var(--chrome-line)', position: 'sticky', top: 0, background: 'var(--chrome)', zIndex: 20 }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 28px', height: 68, display: 'flex', alignItems: 'center', gap: 18 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                display: 'grid',
                placeItems: 'center',
                width: 30,
                height: 30,
                border: '1px solid var(--card-line)',
                borderRadius: 8,
                background: 'var(--card-bg)',
                flex: 'none',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                <path d="M3 3.5h6.5M3 7h10M3 10.5h5" stroke="var(--ink-2)" strokeWidth="1.6" strokeLinecap="round" />
                <rect x="10.5" y="9.2" width="2.6" height="3.6" rx="0.5" fill="var(--brass)" />
              </svg>
            </span>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 19, letterSpacing: '-.03em', color: 'var(--chalk)' }}>
              Struc<span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 16, letterSpacing: '-.01em', color: 'var(--brass-text)' }}>.txt</span>
            </span>
          </Link>

          <div style={{ flex: 1 }} />

          <AppearanceToggle value={appearance} onChange={changeAppearance} />
          <Link href="/login" style={btn('ghost')}>
            Log in
          </Link>
          <Link href="/login?mode=signup" style={btn('brass')}>
            Get started
          </Link>
        </div>
      </header>

      <main style={{ flex: 1 }}>
        <section style={{ maxWidth: 1120, margin: '0 auto', padding: '74px 28px 10px', display: 'flex', flexWrap: 'wrap', gap: 56, alignItems: 'center' }}>
          <div style={{ flex: '1 1 380px', minWidth: 0 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--brass-text)' }}>
              Capture · restructure · pin
            </span>
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 800,
                fontSize: 'clamp(34px,5.2vw,56px)',
                lineHeight: 1.04,
                letterSpacing: '-.035em',
                margin: '18px 0 0',
                color: 'var(--chalk)',
              }}
            >
              Rough notes in.
              <br />
              Structured notes out.
            </h1>
            <p style={{ fontSize: 17.5, lineHeight: 1.6, color: 'var(--chalk-dim)', margin: '20px 0 0', maxWidth: '52ch' }}>
              Record or paste whatever you actually scribbled. Struc.txt reshapes it into the template you work in — meeting minutes, SOAP notes, field logs
              — then pins it to a board you arrange by hand.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 30 }}>
              <Link href="/login?mode=signup" style={btn('brass', 'lg')}>
                Create an account
              </Link>
              <Link href="/login" style={btn('ghost', 'lg')}>
                I already have one
              </Link>
            </div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, letterSpacing: '.05em', color: 'var(--muted)', margin: '18px 0 0' }}>
              Your raw capture is stored unedited. Every restructure keeps the earlier version.
            </p>
          </div>

          <div aria-hidden="true" style={{ position: 'relative', height: 412, flex: '1 1 340px', minWidth: 0, maxWidth: 420, alignSelf: 'stretch' }}>
            {HERO_CARDS.map((c) => {
              const t = TEMPLATES[c.tmpl]
              return (
                <div key={c.title} style={c.pos}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 7,
                      fontFamily: 'var(--font-mono)',
                      fontSize: 9.5,
                      letterSpacing: '.11em',
                      textTransform: 'uppercase',
                      color: 'var(--ink-2)',
                    }}
                  >
                    <span style={dot(t.pin, 7)} />
                    {t.name}
                  </div>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15.5, letterSpacing: '-.015em', lineHeight: 1.25, margin: '8px 0 10px', color: 'var(--ink)' }}>
                    {c.title}
                  </h3>
                  <div style={{ height: 1, background: 'var(--card-rule)', margin: '0 -16px 10px' }} />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '.11em', textTransform: 'uppercase', color: 'var(--ink-2)', display: 'block', marginBottom: 3 }}>
                    {c.fieldKey}
                  </span>
                  <p style={{ fontSize: 12.5, lineHeight: 1.45, color: 'var(--ink)', margin: 0 }}>{c.fieldVal}</p>
                </div>
              )
            })}
          </div>
        </section>

        <section style={{ maxWidth: 1120, margin: '0 auto', padding: '76px 28px 0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 20 }}>
            {FEATURES.map((f) => (
              <div key={f.no} style={{ border: '1px solid var(--chrome-line)', borderRadius: 12, padding: 22, background: 'var(--chrome-2)' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--brass-text)' }}>{f.no}</span>
                <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 19, letterSpacing: '-.02em', margin: '12px 0 8px', color: 'var(--chalk)' }}>{f.title}</h2>
                <p style={{ fontSize: 14.5, lineHeight: 1.6, color: 'var(--chalk-dim)', margin: 0 }}>{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section style={{ maxWidth: 1120, margin: '0 auto', padding: '64px 28px 0' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 24, letterSpacing: '-.025em', margin: '0 0 6px', color: 'var(--chalk)' }}>
            Seven templates to start
          </h2>
          <p style={{ fontSize: 14.5, color: 'var(--chalk-dim)', margin: '0 0 20px' }}>Each one keeps its own colour on the board. Edit them, or add your own.</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9 }}>
            {Object.entries(TEMPLATES).map(([key, t]) => (
              <span
                key={key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  border: '1px solid var(--chrome-line)',
                  borderRadius: 99,
                  padding: '7px 14px',
                  fontSize: 13.5,
                  color: 'var(--chalk-dim)',
                  background: 'var(--chrome-2)',
                }}
              >
                <span style={dot(t.pin)} />
                {t.name}
              </span>
            ))}
          </div>
        </section>

        <section style={{ maxWidth: 1120, margin: '0 auto', padding: '70px 28px 90px' }}>
          <div
            style={{
              border: '1px solid var(--chrome-line)',
              borderRadius: 14,
              background: 'var(--chrome-2)',
              padding: 38,
              display: 'flex',
              gap: 26,
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ flex: 1, minWidth: 260 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 26, letterSpacing: '-.028em', margin: '0 0 8px', color: 'var(--chalk)' }}>
                Start with one messy note
              </h2>
              <p style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--chalk-dim)', margin: 0, maxWidth: '56ch' }}>
                Paste something you wrote in a hurry and see what shape it comes back in.
              </p>
            </div>
            <Link href="/login?mode=signup" style={btn('brass', 'lg')}>
              Create an account
            </Link>
          </div>
        </section>
      </main>

      <footer style={{ borderTop: '1px solid var(--chrome-line)', marginTop: 'auto' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '22px 28px', display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.06em', color: 'var(--muted)' }}>Struc.txt</span>
          <span style={{ flex: 1 }} />
          <a href="#privacy" style={{ fontSize: 13, color: 'var(--chalk-dim)' }}>
            Privacy
          </a>
          <a href="#terms" style={{ fontSize: 13, color: 'var(--chalk-dim)' }}>
            Terms
          </a>
        </div>
      </footer>
    </div>
  )
}

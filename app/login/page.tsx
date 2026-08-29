'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export const dynamic = 'force-dynamic'

type Screen = 'login' | 'signup'

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--well)',
  border: '1px solid var(--chrome-line)',
  borderRadius: 9,
  padding: '11px 13px',
  color: 'var(--chalk)',
}

const fieldLabelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  letterSpacing: '.14em',
  textTransform: 'uppercase',
  color: 'var(--muted)',
  marginBottom: 7,
}

function brassBtnFull(disabled: boolean): React.CSSProperties {
  return {
    width: '100%',
    padding: '12px 16px',
    fontSize: 15,
    fontWeight: 600,
    borderRadius: 9,
    border: '1px solid var(--brass)',
    background: 'var(--brass)',
    color: 'var(--brass-ink)',
    transition: 'var(--t-btn)',
    opacity: disabled ? 0.6 : 1,
  }
}

function ghostBtnFull(disabled: boolean): React.CSSProperties {
  return {
    width: '100%',
    padding: '11px 16px',
    fontSize: 14,
    fontWeight: 600,
    borderRadius: 9,
    border: '1px solid var(--chrome-line)',
    background: 'var(--chrome-2)',
    color: 'var(--chalk)',
    transition: 'var(--t-btn)',
    opacity: disabled ? 0.6 : 1,
  }
}

export default function LoginPage() {
  const [screen, setScreen] = useState<Screen>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [keepSignedIn, setKeepSignedIn] = useState(true)
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [isError, setIsError] = useState(false)
  const [isConfigured, setIsConfigured] = useState(false)

  useEffect(() => {
    setIsConfigured(
      !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your_supabase')
    )
  }, [])

  const switchScreen = (next: Screen) => {
    setScreen(next)
    setNotice(null)
    setIsError(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setNotice(null)
    setIsError(false)

    try {
      const supabase = createClient()

      if (screen === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        window.location.href = '/'
        return
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } },
      })
      if (error) throw error
      setNotice('Account created. Check your inbox to confirm, then log in.')
    } catch (err) {
      setIsError(true)
      setNotice(err instanceof Error ? err.message : `${screen === 'login' ? 'Login' : 'Sign up'} failed`)
    } finally {
      setLoading(false)
    }
  }

  const handleMagicLink = async () => {
    if (!email) {
      setIsError(true)
      setNotice('Enter your email above first.')
      return
    }
    setLoading(true)
    setNotice(null)
    setIsError(false)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOtp({ email })
      if (error) throw error
      setNotice('Sign-in link sent — check your inbox.')
    } catch (err) {
      setIsError(true)
      setNotice(err instanceof Error ? err.message : 'Could not send sign-in link')
    } finally {
      setLoading(false)
    }
  }

  const isLogin = screen === 'login'

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--chrome)',
        color: 'var(--chalk)',
        fontFamily: 'var(--font-body)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'auto',
      }}
    >
      <header style={{ borderBottom: '1px solid var(--chrome-line)' }}>
        <div
          style={{
            maxWidth: 1120,
            margin: '0 auto',
            padding: '0 28px',
            height: 68,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
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
            NoteFlow
          </span>
        </div>
      </header>

      <main style={{ flex: 1, display: 'grid', placeItems: 'center', padding: '56px 24px 80px' }}>
        <div style={{ width: 'min(408px, 100%)' }}>
          {!isConfigured ? (
            <div style={{ border: '1px solid var(--chrome-line)', borderRadius: 14, background: 'var(--chrome-2)', padding: 24 }}>
              <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, margin: '0 0 10px', color: 'var(--chalk)' }}>
                Setup required
              </h1>
              <p style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--chalk-dim)', margin: 0 }}>
                Follow the setup instructions in <code>docs/SETUP.md</code> to configure your Supabase project before signing in.
              </p>
            </div>
          ) : (
            <>
              <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28, letterSpacing: '-.03em', margin: '0 0 6px', color: 'var(--chalk)' }}>
                {isLogin ? 'Log in' : 'Create your account'}
              </h1>
              <p style={{ fontSize: 14.5, color: 'var(--chalk-dim)', margin: '0 0 24px' }}>
                {isLogin ? 'Pick up where your board left off.' : 'One messy note is enough to start.'}
              </p>

              <form
                onSubmit={handleSubmit}
                style={{ border: '1px solid var(--chrome-line)', borderRadius: 14, background: 'var(--chrome-2)', padding: 24 }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {!isLogin && (
                    <label style={{ display: 'block' }}>
                      <span style={fieldLabelStyle}>Name</span>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Sam Whitfield"
                        autoComplete="name"
                        style={inputStyle}
                      />
                    </label>
                  )}

                  <label style={{ display: 'block' }}>
                    <span style={fieldLabelStyle}>Email</span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@work.com"
                      autoComplete="email"
                      required
                      style={inputStyle}
                    />
                  </label>

                  <label style={{ display: 'block' }}>
                    <span style={fieldLabelStyle}>Password</span>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={isLogin ? '••••••••' : 'At least 8 characters'}
                      autoComplete={isLogin ? 'current-password' : 'new-password'}
                      required
                      minLength={isLogin ? undefined : 8}
                      style={inputStyle}
                    />
                  </label>

                  {isLogin && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, color: 'var(--chalk-dim)' }}>
                        <input
                          type="checkbox"
                          checked={keepSignedIn}
                          onChange={(e) => setKeepSignedIn(e.target.checked)}
                          style={{ accentColor: 'var(--brass)' }}
                        />
                        Keep me signed in
                      </label>
                      <a href="#reset" style={{ fontSize: 13.5, color: 'var(--brass-text)' }}>
                        Forgot password?
                      </a>
                    </div>
                  )}

                  <button type="submit" disabled={loading} style={{ ...brassBtnFull(loading), marginTop: 4 }}>
                    {loading ? 'Please wait…' : isLogin ? 'Log in' : 'Create account'}
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
                  <span style={{ height: 1, background: 'var(--chrome-line)', flex: 1 }} />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                    or
                  </span>
                  <span style={{ height: 1, background: 'var(--chrome-line)', flex: 1 }} />
                </div>

                <button type="button" onClick={handleMagicLink} disabled={loading} style={ghostBtnFull(loading)}>
                  Email me a sign-in link
                </button>
              </form>

              <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--chalk-dim)', margin: '20px 0 0' }}>
                {isLogin ? 'New here?' : 'Already have an account?'}{' '}
                <button
                  type="button"
                  onClick={() => switchScreen(isLogin ? 'signup' : 'login')}
                  style={{ color: 'var(--brass-text)', fontWeight: 600, fontSize: 14 }}
                >
                  {isLogin ? 'Create an account' : 'Log in'}
                </button>
              </p>

              {!isLogin && (
                <p
                  style={{
                    textAlign: 'center',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    lineHeight: 1.6,
                    letterSpacing: '.04em',
                    color: 'var(--muted)',
                    margin: '14px 0 0',
                  }}
                >
                  By creating an account you agree to the <a href="#terms">terms</a> and <a href="#privacy">privacy notice</a>.
                </p>
              )}

              {notice && (
                <p
                  style={{
                    textAlign: 'center',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11.5,
                    letterSpacing: '.04em',
                    color: isError ? 'var(--danger-fg)' : 'var(--brass-text)',
                    margin: '16px 0 0',
                  }}
                >
                  {notice}
                </p>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}

// The user guide (/guide): installing the desktop timer past the "unsigned app" warnings, the
// basics, and quick fixes. Linked from the navbar (Guide), the "Desktop app required" notice and
// the release notes. Keep it in step with MVP-SPECS.md when a basic behavior changes.
//
// Screenshots: drop them in /public/guide/ with the names used by <Shot> below; until a file
// exists, a placeholder shows what to capture.
import { useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { DOWNLOADS, isWindows } from '../lib/download'
import { Mail, SiteShell } from './Shell'

type Os = 'mac' | 'windows'

export function GuidePage() {
  return (
    <SiteShell page="guide">
      <article>
        <h1>Getting started with Stint</h1>
        <p className="doc-updated">Stint is early: this guide covers what you need today.</p>
        <p>
          Stint is a calendar for planning your month and a timer for working on it in focus sessions. It has two
          parts: the <strong>web app</strong>, where you plan, and the <strong>desktop timer</strong>, a small window
          that floats above your other apps while you work. Both use the same account and stay in sync.
        </p>
        <Contents />
        <Install />
        <Basics />
        <Help />
      </article>
    </SiteShell>
  )
}

function Contents() {
  return (
    <ol className="guide-toc">
      <li>
        <a href="#install">Install the desktop timer</a>
      </li>
      <li>
        <a href="#basics">The basics</a>
      </li>
      <li>
        <a href="#help">If something’s not working</a>
      </li>
    </ol>
  )
}

// ─── 1. Install ────────────────────────────────────────────────────────

function Install() {
  const [os, setOs] = useState<Os>(isWindows ? 'windows' : 'mac')
  return (
    <section id="install">
      <h2>1. Install the desktop timer</h2>
      <p>
        Stint isn’t signed by Apple or Microsoft yet, so the first time you open it, your computer shows a warning.
        That’s expected: the steps below get you past it. It only happens once, and Stint updates itself after that.
      </p>

      <div role="tablist" aria-label="Your computer" className="mt-16 inline-flex rounded-8 bg-muted p-2">
        {(['mac', 'windows'] as const).map((o) => (
          <button
            key={o}
            type="button"
            role="tab"
            aria-selected={os === o}
            onClick={() => setOs(o)}
            className={cn(
              'h-28 rounded-6 px-12 text-[0.857rem] font-medium',
              os === o ? 'bg-background text-foreground shadow-sm' : 'text-foreground-tertiary hover:text-foreground',
            )}
          >
            {o === 'mac' ? 'Mac' : 'Windows'}
          </button>
        ))}
      </div>

      {os === 'mac' ? <MacSteps /> : <WindowsSteps />}

      <h3>Then: sign in</h3>
      <Steps>
        <Step n={1} title="Click Sign in in the timer">
          Your browser opens Stint. Sign in there if you aren’t already (Google, or a code by email).
        </Step>
        <Step n={2} title="Click Open Stint desktop">
          If your browser asks to open Stint, allow it (“Always allow” saves you the question next time). The timer is
          now connected to your account.
        </Step>
      </Steps>
      <Shot name="sign-in-connect" alt="The web app showing “Connect the desktop timer” with the Open Stint desktop button" />
    </section>
  )
}

function MacSteps() {
  return (
    <Steps>
      <Step n={1} title="Download and install">
        <Download os="mac" /> Open the downloaded file and drag <strong>Stint</strong> into <strong>Applications</strong>.
      </Step>
      <Step n={2} title="Open it once: macOS blocks it">
        Open Stint from Applications. macOS says it can’t check it for malware. Click <strong>Done</strong> (not Move to
        Trash).
        <Shot name="mac-1-blocked" alt="The macOS message saying Stint can’t be opened, with Done and Move to Trash" />
      </Step>
      <Step n={3} title="Allow it in System Settings">
        Open <strong>System Settings → Privacy &amp; Security</strong>, scroll down to the Security section, and click{' '}
        <strong>Open Anyway</strong> next to “Stint was blocked”. Confirm with your password or Touch ID.
        <Shot name="mac-2-open-anyway" alt="System Settings, Privacy & Security, with the Open Anyway button next to Stint" />
      </Step>
      <Step n={4} title="Open it again">
        Click <strong>Open</strong> when macOS asks one last time. The timer appears, and Stint’s icon shows in the menu
        bar at the top of your screen.
      </Step>
    </Steps>
  )
}

function WindowsSteps() {
  return (
    <Steps>
      <Step n={1} title="Download and run the installer">
        <Download os="windows" /> Open the downloaded <code>Stint-windows.exe</code>.
      </Step>
      <Step n={2} title="Get past “Windows protected your PC”">
        Click <strong>More info</strong>, then <strong>Run anyway</strong>. (If your browser itself warns about the
        download first, choose <strong>Keep</strong>.)
        <Shot name="windows-1-more-info" alt="The blue “Windows protected your PC” window with the More info link" />
        <Shot name="windows-2-run-anyway" alt="The same window after More info, with the Run anyway button" />
      </Step>
      <Step n={3} title="Let it install">
        Stint installs in a few seconds and opens. Its icon shows in the system tray, at the bottom right of your
        screen (it may be under the ^ arrow).
      </Step>
    </Steps>
  )
}

function Download({ os }: { os: Os }) {
  return (
    <a href={DOWNLOADS[os].url} className="guide-download">
      {DOWNLOADS[os].label}
    </a>
  )
}

// ─── 2. Basics ─────────────────────────────────────────────────────────

function Basics() {
  return (
    <section id="basics">
      <h2>2. The basics</h2>
      <div className="guide-cards">
        <Card title="Plan in your calendar">
          Click any row of a day and type: that’s a task. <Kbd>Enter</Kbd> starts the next row. Each week and month
          also has room for goals, notes and a backlog.
        </Card>
        <Card title="Type / for more">
          <Kbd>/</Kbd> at the start of a row picks what it is: a note, an event, a routine (repeats daily, weekly or
          monthly) or a process (ongoing work, with a % done).
        </Card>
        <Card title="Events: start with a time">
          <code>5pm 1h Call Jon</code> becomes an event from 5 to 6pm. Paste a meeting link at the end to join it in one
          click.
        </Card>
        <Card title="Projects: color what belongs together">
          Type <Kbd>#</Kbd> in a row, or click its dot, to give it a project. Create one right there: a name and a
          color.
        </Card>
        <Card title="Start a focus session">
          Press <Kbd>⌘K</Kbd> on Mac or <Kbd>Ctrl K</Kbd> on Windows, type how long (<code>25</code>,{' '}
          <code>1.5h</code>) and press <Kbd>Enter</Kbd>. The timer counts down on your desktop; pause or stop it any
          time.
        </Card>
        <Card title="Time’s up">
          You get a sound and a notification. Type more time to keep going, or click <strong>Done</strong>. The session
          is saved in today’s calendar: looking back at your calendar is your history.
        </Card>
        <Card title="Move things around">
          Drag any row to another day. Right-click a row to copy, cut or paste it, even into another month.
        </Card>
        <Card title="Everywhere you sign in">
          Your calendar syncs between the web app, the desktop timer and your phone. Focus sessions start on your
          computer.
        </Card>
      </div>
    </section>
  )
}

// ─── 3. Help ───────────────────────────────────────────────────────────

function Help() {
  return (
    <section id="help">
      <h2>3. If something’s not working</h2>
      <Faq q="Stint says “Desktop app required”, but I installed it">
        Open Stint (from Applications on Mac, or the Start menu on Windows) and make sure the timer is signed in with
        the same email as the web app. Once it’s running, the message goes away by itself.
      </Faq>
      <Faq q="Mac says “Stint is damaged and can’t be opened”">
        It isn’t damaged: that’s macOS being strict about unsigned apps. Open the Terminal app, paste{' '}
        <code>xattr -cr /Applications/Stint.app</code>, press Enter, then open Stint again.
      </Faq>
      <Faq q="I don’t get a notification when time’s up">
        In Stint, open the menu → <strong>Settings</strong> and check “Notify me when time’s up”. Then check that your
        computer allows notifications from Stint and your browser, and that Do Not Disturb or Focus is off.
      </Faq>
      <Faq q="How do I uninstall it?">
        Mac: quit Stint from its menu bar icon, then drag it from Applications to the Trash. Windows: Settings → Apps →
        Installed apps → Stint → Uninstall. Your calendar stays in your account.
      </Faq>
      <Faq q="Something else, or a bug?">
        Email <Mail />. A screenshot helps a lot.
      </Faq>
    </section>
  )
}

// ─── Pieces ────────────────────────────────────────────────────────────

function Steps({ children }: { children: ReactNode }) {
  return <ol className="guide-steps">{children}</ol>
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <li>
      <span className="guide-step-n" aria-hidden>
        {n}
      </span>
      <div className="min-w-0 flex-1">
        <p className="guide-step-title">{title}</p>
        <div className="guide-step-body">{children}</div>
      </div>
    </li>
  )
}

/** A screenshot from /public/guide/<name>.png, or a placeholder saying what to capture until it exists. */
function Shot({ name, alt }: { name: string; alt: string }) {
  const [missing, setMissing] = useState(false)
  if (missing)
    return (
      <div className="guide-shot-missing" role="img" aria-label={alt}>
        <span>Screenshot to add</span>
        {alt}
        <code>public/guide/{name}.png</code>
      </div>
    )
  return <img src={`/guide/${name}.png`} alt={alt} onError={() => setMissing(true)} className="guide-shot" />
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="guide-card">
      <p className="guide-card-title">{title}</p>
      <p>{children}</p>
    </div>
  )
}

function Kbd({ children }: { children: ReactNode }) {
  return <kbd>{children}</kbd>
}

function Faq({ q, children }: { q: string; children: ReactNode }) {
  return (
    <details className="guide-faq">
      <summary>{q}</summary>
      <p>{children}</p>
    </details>
  )
}

// Privacy Policy and Terms of Use: static pages at /privacy and /terms (no sign-in needed).
// Linked from the sign-in screen and Settings, and given to the Microsoft Store listing.
// When what Stint collects or who it uses changes (analytics, payments, a new provider…), update
// these pages and UPDATED in the same change.
import type { ReactNode } from 'react'
import Logomark from '@/assets/brand/logomark-stint.svg?react'

const UPDATED = 'November 19, 2026'
const OPERATOR = 'Ahmed Amir Azouzi'
const CONTACT = 'hello@azouzi.design'

export function LegalPage({ page }: { page: 'privacy' | 'terms' }) {
  return (
    <div className="min-h-screen bg-background font-geist text-foreground">
      <header className="mx-auto flex max-w-[42rem] items-center justify-between gap-12 px-16 pt-24">
        <a href="/" className="flex items-center gap-8 text-[0.929rem] font-medium text-foreground">
          <Logomark className="size-20" aria-hidden />
          Stint
        </a>
        <nav className="flex gap-16 text-[0.857rem]">
          <NavLink href="/privacy" current={page === 'privacy'}>
            Privacy
          </NavLink>
          <NavLink href="/terms" current={page === 'terms'}>
            Terms
          </NavLink>
        </nav>
      </header>
      <main className="legal mx-auto max-w-[42rem] px-16 pt-40 pb-64">
        {page === 'privacy' ? <Privacy /> : <Terms />}
      </main>
    </div>
  )
}

function NavLink({ href, current, children }: { href: string; current: boolean; children: ReactNode }) {
  return (
    <a
      href={href}
      aria-current={current ? 'page' : undefined}
      className={current ? 'text-foreground' : 'text-foreground-tertiary hover:text-foreground'}
    >
      {children}
    </a>
  )
}

const Mail = () => <a href={`mailto:${CONTACT}`}>{CONTACT}</a>

function Title({ children }: { children: ReactNode }) {
  return (
    <>
      <h1>{children}</h1>
      <p className="legal-updated">Last updated: {UPDATED}</p>
    </>
  )
}

// ─── Privacy Policy ────────────────────────────────────────────────────

function Privacy() {
  return (
    <article>
      <Title>Privacy Policy</Title>
      <p>
        Stint is a calendar and focus timer, made of a web app and a desktop app. It is run by {OPERATOR}, an
        individual developer (“I”, “me”). This policy explains what Stint collects, why, and what you can do about it.
        Questions: <Mail />.
      </p>
      <p>
        <strong>The short version:</strong> Stint keeps your account and your calendar so it can sync them between
        your devices. It shows no ads, uses no analytics or tracking cookies, and never sells your data.
      </p>

      <h2>What Stint collects</h2>
      <ul>
        <li>
          <strong>Your account.</strong> Your email address. If you continue with Google, Google also shares your name
          and profile picture; Stint only uses your email.
        </li>
        <li>
          <strong>What you put in Stint.</strong> Your tasks, notes, goals, events (title, times, link), routines,
          projects, focus sessions (start and end times, time focused, linked tasks) and settings.
        </li>
        <li>
          <strong>Technical data.</strong> When you use Stint, the services that run it record standard logs, such as
          your IP address, browser or device type, and the time of the request. These are used to keep Stint working
          and secure.
        </li>
        <li>
          <strong>On your device.</strong> Your browser and the desktop app store your sign-in session, a copy of your
          calendar and your preferences, so Stint opens quickly and works offline. These are not used for tracking.
        </li>
      </ul>
      <p>Stint does not access your contacts, files, other calendars or anything else on your computer.</p>

      <h2>How it’s used</h2>
      <ul>
        <li>To sign you in and keep your calendar in sync between the web app and the desktop app.</li>
        <li>To send you sign-in codes by email. Stint doesn’t send marketing emails.</li>
        <li>To show desktop notifications you turned on (they are created on your own computer).</li>
        <li>To check for desktop app updates, fix problems and prevent abuse.</li>
      </ul>
      <p>
        If you’re in the European Union or the UK, the legal bases are: providing the service you asked for (your
        account and calendar), and legitimate interest (security and fixing problems).
      </p>

      <h2>Who else handles your data</h2>
      <p>Stint relies on a few providers, only to run the service:</p>
      <ul>
        <li>
          <strong>Supabase:</strong> the database, sign-in and sign-in emails.
        </li>
        <li>
          <strong>Vercel:</strong> hosts the web app.
        </li>
        <li>
          <strong>Google:</strong> only if you choose Continue with Google.
        </li>
        <li>
          <strong>GitHub:</strong> serves desktop app downloads and updates.
        </li>
        <li>
          <strong>Microsoft Store or other app stores:</strong> if you install the desktop app from one, under their
          own policies.
        </li>
      </ul>
      <p>
        These providers may store data in other countries, including the United States and the European Union. Your
        data is not shared with anyone else, unless the law requires it.
      </p>

      <h2>How long it’s kept</h2>
      <p>
        Your account and calendar are kept until you delete your account. When you do, they are deleted from Stint’s
        database right away; copies in providers’ backups and logs disappear as those expire, usually within 30 days.
      </p>

      <h2>Your choices and rights</h2>
      <ul>
        <li>
          <strong>Delete your account</strong> at any time in Settings → Danger zone. Everything synced to it is deleted
          with it.
        </li>
        <li>
          <strong>Get a copy, correct or ask about your data</strong> by emailing <Mail />. I’ll reply within 30 days.
        </li>
        <li>
          Depending on where you live, you may also have the right to object to or restrict some uses, and to complain
          to your data protection authority (in Tunisia, the INPDP; in the EU, your national authority).
        </li>
      </ul>

      <h2>Security</h2>
      <p>
        Connections to Stint are encrypted, and the database only lets each account read its own data. No system is
        perfectly secure; if something goes wrong that affects your data, I’ll let you know.
      </p>

      <h2>Children</h2>
      <p>
        Stint isn’t meant for children under 13 (or under 16 in the European Union). If you think a child has made an
        account, email <Mail /> and it will be deleted.
      </p>

      <h2>Changes</h2>
      <p>
        If this policy changes, the new version will be posted here with a new date. For important changes, you’ll be
        told by email or in the app first.
      </p>

      <h2>Contact</h2>
      <p>
        {OPERATOR}, Tunisia · <Mail />
      </p>
    </article>
  )
}

// ─── Terms of Use ──────────────────────────────────────────────────────

function Terms() {
  return (
    <article>
      <Title>Terms of Use</Title>
      <p>
        These terms cover your use of Stint: the web app and the desktop app. Stint is run by {OPERATOR}, an individual
        developer (“I”, “me”). By creating an account or using Stint, you agree to these terms and to the{' '}
        <a href="/privacy">Privacy Policy</a>.
      </p>

      <h2>Stint is early</h2>
      <p>
        Stint is new and still changing. Features may be added, changed or removed, and there may be bugs. I’ll try to
        give notice before big changes, and before shutting Stint down, so you can keep a copy of what matters to you.
      </p>

      <h2>Price</h2>
      <p>
        Stint is free for now. If paid plans are introduced, you’ll be told in advance, and nothing will be charged
        without your explicit agreement.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>One account is for one person. Use an email address you control.</li>
        <li>Keep access to your email and Google account safe: they are how you sign in to Stint.</li>
        <li>You’re responsible for what happens in your account.</li>
      </ul>

      <h2>Your content</h2>
      <p>
        Everything you put in Stint stays yours. You allow me to store, copy and display it only as needed to run Stint
        for you, for example to sync it between your devices. That permission ends when you delete it or your account.
      </p>

      <h2>Fair use</h2>
      <p>Please don’t:</p>
      <ul>
        <li>break the law using Stint, or use it to harm others;</li>
        <li>try to access other people’s accounts or data, or Stint’s systems beyond the app itself;</li>
        <li>overload, disrupt, or automate abuse against the service;</li>
        <li>copy, resell or reverse engineer Stint, except where the law allows it.</li>
      </ul>

      <h2>The desktop app</h2>
      <p>
        You may install and use the desktop app on your own computers for personal or work use. It updates itself
        automatically to fix problems and add features. If you install it from an app store, that store’s terms apply
        too.
      </p>

      <h2>Links to other sites</h2>
      <p>
        Events can contain links to other websites (for example, a video call). Those sites aren’t run by Stint, and
        their own terms apply.
      </p>

      <h2>No guarantees</h2>
      <p>
        Stint is provided “as is”, without warranties of any kind. I can’t promise it will always be available,
        error-free, or that data will never be lost. Keep your own copy of anything you can’t afford to lose.
      </p>

      <h2>Liability</h2>
      <p>
        To the extent the law allows, I am not liable for indirect or consequential losses, such as lost data, lost
        profits or missed deadlines, arising from your use of Stint. Nothing in these terms limits rights you have
        under the consumer protection laws of the country where you live.
      </p>

      <h2>Ending your use</h2>
      <p>
        You can stop using Stint and delete your account at any time, in Settings → Danger zone. I may suspend or close
        an account that breaks these terms, after a warning when reasonable.
      </p>

      <h2>Changes to these terms</h2>
      <p>
        If these terms change, the new version will be posted here with a new date. For important changes, you’ll be
        told by email or in the app first. Continuing to use Stint after that means you accept the new terms.
      </p>

      <h2>Law</h2>
      <p>
        These terms are governed by the laws of Tunisia. If a dispute comes up, please email first: most things can be
        sorted out that way. Otherwise, the courts of Tunisia have jurisdiction, unless the law of the country where
        you live gives you the right to go to your local courts.
      </p>

      <h2>Contact</h2>
      <p>
        {OPERATOR}, Tunisia · <Mail />
      </p>
    </article>
  )
}

import { Link } from 'react-router-dom';
import {
  UploadCloud, ShieldAlert, HeartPulse, Download, Radar, BarChart3,
  Users, Bell, Sparkles, BookOpen, Fingerprint,
} from 'lucide-react';
import { Card, PageHeader } from '../components/ui';

const ROUTINE = [
  {
    icon: UploadCloud,
    title: '1 · Drop this month\'s file(s)',
    to: '/app/sync',
    body: 'Drag each vendor spreadsheet into Monthly Sync and tag which sport it covers. The engine works out who was hired, who moved, and who left — you never compare spreadsheets by hand. A file tagged with one sport can never touch coaches in another.',
  },
  {
    icon: ShieldAlert,
    title: '2 · Approve or reject what got flagged',
    to: '/app/review',
    body: 'Anything suspicious — a "new" coach whose email you already know, rows with no ID, or a huge chunk of coaches vanishing at once (usually a bad file) — pauses in the Review Queue. Nothing touches the master list until you make the call.',
  },
  {
    icon: HeartPulse,
    title: '3 · Glance at Data Health',
    to: '/app/health',
    body: 'Four numbers tell you if the list is clean: missing emails, missing schools/sports, coaches unseen for 60+ days, and duplicate emails. Click any number to see exactly who — then fix them right on their profile.',
  },
  {
    icon: Download,
    title: '4 · The app gets the clean list',
    to: '/app/export',
    body: 'Download a CSV/JSON filtered by sport or division — or skip files entirely: the RFX app can read this database live, so everything you approve is instantly what athletes see.',
  },
];

const PAGES = [
  { icon: Users, name: 'Coaches', to: '/app/coaches', body: 'The master directory. Search, filter by sport/division/data-gaps, add a coach by hand, edit anyone, mark departed or reinstate. Every change is logged to their career timeline.' },
  { icon: Radar, name: 'Coach Tracker', to: '/app/tracker', body: 'The movement feed: every hire, move, and departure ever recorded — plus the News Radar tab with coaching-change headlines from across the country.' },
  { icon: BarChart3, name: 'Insights', to: '/app/insights', body: 'The big picture: movement trends by month, coverage by sport/division/state, and the programs with the most churn. This is the page you show investors.' },
  { icon: Fingerprint, name: 'Programs', to: '/app/programs', body: 'Every school+sport combination, built automatically from your files, with academic stats you can fill in and the current staff roster.' },
];

export default function Guide() {
  return (
    <div>
      <PageHeader
        title="How RFX works"
        subtitle="The 2-minute guide. The whole system exists so that keeping every college coach in the country current takes you about 30 minutes a month."
      />

      <h2 className="font-semibold mb-4">Your monthly routine</h2>
      <div className="grid md:grid-cols-2 gap-4 mb-10">
        {ROUTINE.map(({ icon: Icon, title, to, body }) => (
          <Link key={title} to={to}>
            <Card className="p-5 h-full hover:border-[#FF0000]/40 transition-colors">
              <div className="flex items-center gap-2 font-medium mb-2">
                <Icon className="w-4 h-4 text-[#FF0000]" /> {title}
              </div>
              <p className="text-sm text-gray-400 leading-relaxed">{body}</p>
            </Card>
          </Link>
        ))}
      </div>
      <p className="text-sm text-gray-500 -mt-6 mb-10">
        The <Link to="/app" className="text-[#FF6666] hover:text-white">Command Center</Link> tracks these four steps
        live every month — green checks appear as you finish each one.
      </p>

      <h2 className="font-semibold mb-4">Working between files</h2>
      <div className="grid md:grid-cols-2 gap-4 mb-10">
        {PAGES.map(({ icon: Icon, name, to, body }) => (
          <Link key={name} to={to}>
            <Card className="p-5 h-full hover:border-[#FF0000]/40 transition-colors">
              <div className="flex items-center gap-2 font-medium mb-2">
                <Icon className="w-4 h-4 text-[#FF0000]" /> {name}
              </div>
              <p className="text-sm text-gray-400 leading-relaxed">{body}</p>
            </Card>
          </Link>
        ))}
      </div>

      <h2 className="font-semibold mb-4">The agents working while you sleep</h2>
      <div className="grid md:grid-cols-2 gap-4 mb-10">
        <Card className="p-5">
          <div className="flex items-center gap-2 font-medium mb-2">
            <Bell className="w-4 h-4 text-[#FF0000]" /> The Watchtower
          </div>
          <p className="text-sm text-gray-400 leading-relaxed">
            Lives inside the database and scans once a day: movement in the last 24 hours, review items sitting
            unresolved for 2+ days, and active coaches quietly missing from files for 2+ months. Its findings appear
            under the bell icon in the header.
          </p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 font-medium mb-2">
            <Radar className="w-4 h-4 text-[#FF0000]" /> The National Radar
          </div>
          <p className="text-sm text-gray-400 leading-relaxed">
            Sweeps coaching-news feeds across the country every 6 hours and flags headlines that match coaches in
            your database — so you often hear about a move months before it shows up in a vendor file. Review
            findings in Coach Tracker → News Radar.
          </p>
        </Card>
      </div>

      <h2 className="font-semibold mb-4">Two ideas that make everything trustworthy</h2>
      <Card className="p-6 max-w-3xl mb-10">
        <ul className="space-y-4 text-sm text-gray-400 leading-relaxed">
          <li>
            <span className="text-gray-200 font-medium">Coaches are tracked by permanent ID, never by email.</span>{' '}
            When a coach changes schools or email addresses, their entire history, your notes, and your email log
            move with them. Manually added coaches get a generated RFX ID; if a vendor file later brings the same
            person under its own ID, you'll get an identity-conflict flag to merge them.
          </li>
          <li>
            <span className="text-gray-200 font-medium">Nothing suspicious is ever applied automatically.</span>{' '}
            The engine applies routine updates on its own but pauses anything that looks wrong for your explicit
            approval. Your master list can't be silently corrupted by one bad spreadsheet.
          </li>
        </ul>
      </Card>

      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Sparkles className="w-4 h-4 text-[#FF0000]" />
        Shortcut for everything: the <span className="text-gray-300">Assistant</span> (top right) answers questions
        about the live data — "who is missing an email?", "who moved recently?", "how many soccer coaches?"
      </div>
      <div className="flex items-center gap-2 text-sm text-gray-500 mt-2">
        <BookOpen className="w-4 h-4 text-[#FF0000]" />
        One-time installation and live system status live in{' '}
        <Link to="/app/setup" className="text-[#FF6666] hover:text-white">Settings</Link>.
      </div>
    </div>
  );
}

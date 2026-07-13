import { LifeBuoy, BookOpen, Mail, Ticket, Phone, ExternalLink } from 'lucide-react'

const DOCS_BASE = 'https://dusuq.com/docs.html'

const DOC_GROUPS = [
  {
    title: 'Getting Started',
    description: 'Set up your farm and log your first records.',
    links: [
      { label: 'Introduction', href: `${DOCS_BASE}#introduction` },
      { label: 'Quick Start', href: `${DOCS_BASE}#quick-start` },
      { label: 'Account & Farm Setup', href: `${DOCS_BASE}#farm-setup` },
    ],
  },
  {
    title: 'Core Modules',
    description: 'How each module works, field by field.',
    links: [
      { label: 'Animal Records', href: `${DOCS_BASE}#animals` },
      { label: 'Milk Production', href: `${DOCS_BASE}#milk` },
      { label: 'Health & Vaccination', href: `${DOCS_BASE}#health` },
      { label: 'Breeding & Reproduction', href: `${DOCS_BASE}#breeding` },
      { label: 'Inventory & Feed', href: `${DOCS_BASE}#inventory` },
      { label: 'Accounts & Finance', href: `${DOCS_BASE}#accounts` },
    ],
  },
  {
    title: 'Administration',
    description: 'Roles, permissions and multi-farm isolation.',
    links: [
      { label: 'Roles & Permissions', href: `${DOCS_BASE}#roles-permissions` },
      { label: 'Multi-Tenant Architecture', href: `${DOCS_BASE}#multi-tenant` },
    ],
  },
  {
    title: 'VetAssist',
    description: 'Asking questions, generating reports, forecasting.',
    links: [
      { label: 'Overview', href: `${DOCS_BASE}#vetassist-overview` },
      { label: 'Asking Questions', href: `${DOCS_BASE}#vetassist-qa` },
      { label: 'Report Generation', href: `${DOCS_BASE}#vetassist-reports` },
      { label: 'Forecasting & Analysis', href: `${DOCS_BASE}#vetassist-forecasting` },
    ],
  },
  {
    title: 'ERP v2.0 Roadmap',
    description: "What's coming next — CCTV, RFID, and more.",
    links: [
      { label: 'Overview', href: `${DOCS_BASE}#v2-overview` },
      { label: 'CCTV & IR Monitoring', href: `${DOCS_BASE}#v2-cctv` },
      { label: 'RFID Tagging', href: `${DOCS_BASE}#v2-rfid` },
    ],
  },
  {
    title: 'API Reference',
    description: 'Authentication and every public endpoint.',
    links: [
      { label: 'Authentication', href: `${DOCS_BASE}#api-authentication` },
      { label: 'VetAssist Endpoints', href: `${DOCS_BASE}#api-vetassist` },
    ],
  },
]

function DocGroupCard({ group }) {
  return (
    <div className="card">
      <div className="stat-icon bg-primary-50 mb-3">
        <BookOpen size={18} className="text-primary-600" />
      </div>
      <h3 className="font-semibold text-gray-900 text-sm mb-1">{group.title}</h3>
      <p className="text-xs text-gray-400 mb-3">{group.description}</p>
      <ul className="space-y-1.5">
        {group.links.map((l) => (
          <li key={l.href}>
            <a
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary-600 hover:underline inline-flex items-center gap-1"
            >
              {l.label}
              <ExternalLink size={12} className="opacity-60" />
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function SupportPage() {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <LifeBuoy size={22} className="text-primary-600" />
            ERP Support
          </h1>
          <p className="text-sm text-gray-500">
            Documentation, guides, and how to reach us when you're stuck.
          </p>
        </div>
        <a href={DOCS_BASE} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
          <BookOpen size={14} />
          Open full documentation
        </a>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        {DOC_GROUPS.map((g) => (
          <DocGroupCard key={g.title} group={g} />
        ))}
      </div>

      <h2 className="text-base font-semibold text-gray-700 mb-3">Still stuck? Contact us.</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="card flex items-start gap-4">
          <div className="stat-icon bg-primary-50 flex-shrink-0">
            <Mail size={18} className="text-primary-600" />
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 text-sm mb-1">Email support</h4>
            <a href="mailto:hello@dusuq.com" className="text-primary-600 font-medium text-sm hover:underline">
              hello@dusuq.com
            </a>
            <p className="text-xs text-gray-400 mt-1">Response within one business day.</p>
          </div>
        </div>

        <a
          href="https://dusuq.com/support.html"
          target="_blank"
          rel="noopener noreferrer"
          className="card flex items-start gap-4 hover:border-primary-300 hover:shadow-md transition"
        >
          <div className="stat-icon bg-primary-50 flex-shrink-0">
            <Ticket size={18} className="text-primary-600" />
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 text-sm mb-1">Submit or check a support ticket</h4>
            <span className="text-primary-600 font-medium text-sm inline-flex items-center gap-1">
              Open the support ticket page
              <ExternalLink size={12} className="opacity-60" />
            </span>
            <p className="text-xs text-gray-400 mt-1">
              No login needed — you'll get a reference number to track it.
            </p>
          </div>
        </a>

        <div className="card flex items-start gap-4">
          <div className="stat-icon bg-primary-50 flex-shrink-0">
            <Phone size={18} className="text-primary-600" />
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 text-sm mb-1">Call support</h4>
            <a href="tel:+923316560344" className="text-primary-600 font-medium text-sm hover:underline">
              +92 331 6560344
            </a>
            <p className="text-xs text-gray-400 mt-1">Available 9am – 5pm.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

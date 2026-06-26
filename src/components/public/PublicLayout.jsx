import { Link } from 'react-router-dom'
import { TrendingUp } from 'lucide-react'

export default function PublicLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="border-b border-line-subtle backdrop-blur-md bg-bg-base/80 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-5 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-900/30">
              <TrendingUp size={15} className="text-white" />
            </div>
            <span className="text-white font-bold text-sm">Income Tracker</span>
          </Link>
          <Link to="/" className="text-xs text-gray-400 hover:text-violet-300 transition-colors">
            Back to app
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-5 py-8 sm:py-12">
        {children}
      </main>

      <footer className="border-t border-line-subtle">
        <div className="max-w-3xl mx-auto px-5 py-5 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500">
          <div>Income Tracker</div>
          <div className="flex gap-4">
            <Link to="/privacy" className="hover:text-violet-300 transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-violet-300 transition-colors">Terms</Link>
            <Link to="/delete-account" className="hover:text-violet-300 transition-colors">Delete account</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

import { ConnectYouTube } from "@/components/dashboard/ConnectYouTube";
import { Sidebar } from "@/components/dashboard/Sidebar";

export default function Settings() {
  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <Sidebar />
      <main className="ml-64 min-h-screen px-12 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
          <p className="text-neutral-400">Manage your account and connected platforms</p>
        </div>

        {/* Connected Accounts Section */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Connected Accounts</h2>
          <p className="text-neutral-400 text-sm mb-4">
            Connect your social media accounts to enable posting directly from GrowthCopilot.
          </p>
          
          <div className="space-y-4">
            <ConnectYouTube />
            
            {/* Placeholder for other platforms */}
            <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-xl opacity-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-white">Instagram</h3>
                  <p className="text-sm text-neutral-500">Coming soon</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-xl opacity-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center border border-neutral-700">
                  <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
                    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-white">TikTok</h3>
                  <p className="text-sm text-neutral-500">Coming soon</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

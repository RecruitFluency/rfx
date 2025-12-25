import React, { useState } from 'react';

type TabKey = 'financials' | 'academics' | 'contact';

const marqueeItems = [
  { label: 'U. of Portland', status: 'Active: 14m', color: 'text-green-500' },
  { label: 'Stanford', status: 'Last seen: 2m ago', color: 'text-red-600' },
  { label: 'UNC Chapel Hill', status: 'Active: 4m', color: 'text-green-500' },
  { label: 'Wake Forest', status: 'Last seen: 45s ago', color: 'text-red-600' },
  { label: 'Michigan State', status: 'Active: 22m', color: 'text-green-500' },
  { label: 'UCLA', status: 'Last seen: 5m ago', color: 'text-red-600' },
  { label: 'Notre Dame', status: 'Active: 1m', color: 'text-green-500' }
];

const roster = [
  {
    number: '10',
    name: 'Jalen Thompson',
    position: 'MF',
    detail: '3 Active Offers',
    active: true,
    accent: 'border-red-600 bg-neutral-900/50'
  },
  {
    number: '07',
    name: 'Marcus Davis',
    position: 'FW',
    detail: 'Uncommitted',
    active: false,
    accent: 'border-transparent'
  },
  {
    number: '22',
    name: 'Caleb Martin',
    position: 'Committed (UCLA)',
    detail: '',
    active: false,
    accent: 'border-transparent opacity-50',
    locked: true
  },
  {
    number: '04',
    name: `Liam O'Connor`,
    position: 'CB',
    detail: '1 Active Offer',
    active: false,
    accent: 'border-transparent'
  }
];

const activityFeed = [
  { label: 'UNC Chapel Hill', status: 'Viewing #10', color: 'text-green-500', dim: false },
  { label: 'U. of Portland', status: 'Viewing #10', color: 'text-green-500', dim: false },
  { label: 'Wake Forest', status: 'Disconnected', color: 'text-red-600', dim: true }
];

const CoachViewPreview = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('financials');

  const tabButtonClasses = (tab: TabKey) =>
    `flex-1 py-3 text-xs font-bold uppercase tracking-widest border-b-2 transition-colors ${
      activeTab === tab
        ? 'bg-red-600/10 text-red-500 border-red-600'
        : 'text-neutral-500 hover:bg-neutral-800 hover:text-white border-transparent'
    }`;

  const tabContentClasses = (tab: TabKey) => (activeTab === tab ? 'space-y-6' : 'hidden');

  return (
    <section className="bg-[#121212] py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-sm text-neutral-400 mb-1">Coach-side experience</p>
            <h2 className="text-3xl font-bold text-white">RecruitStream Coach View</h2>
            <p className="text-neutral-400 mt-2 max-w-3xl">
              Give coaches a live, organized command center to monitor recruits, collaborate with staff, and act on
              scholarship opportunities without leaving your film session.
            </p>
          </div>
          <span className="hidden md:inline-flex items-center gap-2 bg-red-600/10 text-red-400 px-3 py-1 rounded-full text-xs font-semibold border border-red-900/60">
            <span className="text-sm">●</span> Live Preview
          </span>
        </div>

        <div className="bg-black border border-neutral-900 rounded-3xl shadow-2xl overflow-hidden">
          <nav className="h-16 border-b border-neutral-900 flex items-center justify-between px-6 bg-[#050505]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center font-bold italic">R</div>
              <span className="text-xl font-bold tracking-tighter text-neutral-100">
                RECRUIT<span className="text-red-600">STREAM</span>
              </span>
            </div>

            <div className="hidden md:flex flex-1 mx-12 overflow-hidden relative h-full items-center group">
              <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-black to-transparent z-10" />
              <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-black to-transparent z-10" />
              <div className="whitespace-nowrap animate-marquee flex gap-8 text-xs font-mono text-neutral-500 group-hover:[animation-play-state:paused]">
                {marqueeItems.map((item) => (
                  <span key={item.label}>
                    <span className={item.color}>●</span> {item.label} ({item.status})
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <div className="text-xs text-neutral-500 uppercase tracking-widest">Logged in as</div>
                <div className="text-sm font-bold text-red-500">Coach Williams (Duke)</div>
              </div>
              <div className="w-10 h-10 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center">
                <span className="text-neutral-400 font-bold">CW</span>
              </div>
            </div>
          </nav>

          <div className="flex">
            <main className="flex-1 flex flex-col relative bg-black">
              <div className="absolute top-6 left-6 z-20 flex gap-2">
                <span className="bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-sm uppercase tracking-widest animate-pulse">
                  LIVE
                </span>
                <span className="bg-black/80 backdrop-blur text-neutral-300 text-xs font-bold px-3 py-1 rounded-sm border border-neutral-800">
                  <span className="text-red-500 mr-1">●</span> 142 Viewing
                </span>
              </div>

              <div className="flex-1 relative bg-[#0a0a0a] flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-neutral-800 via-black to-black" />
                <div className="absolute inset-0 grid grid-cols-12 grid-rows-6 opacity-10 pointer-events-none">
                  <div className="col-span-12 border-b border-neutral-700 h-full" />
                  <div className="col-span-12 border-b border-neutral-700 h-full" />
                  <div className="col-span-12 border-b border-neutral-700 h-full" />
                  <div className="col-span-12 border-b border-neutral-700 h-full" />
                  <div className="col-span-12 border-b border-neutral-700 h-full" />
                </div>

                <div className="absolute top-1/3 left-1/4 w-4 h-4 bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,0.5)] transition-all duration-1000">
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] text-white bg-black/50 px-1 rounded">10</div>
                </div>
                <div className="absolute bottom-1/3 right-1/3 w-4 h-4 bg-red-600 rounded-full shadow-[0_0_15px_rgba(220,38,38,0.5)]" />
                <div className="absolute top-1/2 left-1/2 w-3 h-3 bg-yellow-400 rounded-full" />

                <div className="absolute right-8 top-8 bottom-8 w-full max-w-md bg-[#121212]/95 backdrop-blur-xl border border-neutral-800 rounded-lg shadow-2xl flex flex-col overflow-hidden z-30">
                  <div className="p-6 border-b border-neutral-800 relative">
                    <div className="absolute top-4 right-4 text-neutral-600 hover:text-white cursor-pointer">✕</div>
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-16 h-16 bg-neutral-800 rounded-lg border border-neutral-700 flex items-center justify-center text-2xl font-bold text-neutral-500 overflow-hidden relative">
                        <div className="absolute inset-0 bg-neutral-700 flex items-center justify-center">
                          <svg className="w-8 h-8 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                            />
                          </svg>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-4xl font-black text-red-600 italic">#10</div>
                        <div className="text-xs text-neutral-500 uppercase tracking-wider">Midfielder</div>
                      </div>
                    </div>
                    <h2 className="text-2xl font-bold text-white leading-none mb-1">Jalen Thompson</h2>
                    <div className="text-sm text-neutral-400 flex items-center gap-2">
                      <span>Class of &apos;25</span> <span className="text-neutral-700">•</span> <span>San Diego Surf</span>
                    </div>
                  </div>

                  <div className="flex border-b border-neutral-800 text-xs font-bold uppercase tracking-widest" role="tablist">
                    <button type="button" className={tabButtonClasses('financials')} onClick={() => setActiveTab('financials')}>
                      Financials
                    </button>
                    <button type="button" className={tabButtonClasses('academics')} onClick={() => setActiveTab('academics')}>
                      Academics
                    </button>
                    <button type="button" className={tabButtonClasses('contact')} onClick={() => setActiveTab('contact')}>
                      Contact
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide relative">
                    <div className={tabContentClasses('financials')}>
                      <div className="space-y-2">
                        <div className="flex justify-between items-end">
                          <span className="text-xs text-neutral-500 uppercase">Est. Family Contribution</span>
                          <span className="text-xl font-mono font-bold text-green-400">
                            $12,500<span className="text-xs text-neutral-600 ml-1">/yr</span>
                          </span>
                        </div>
                        <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-green-500 h-full w-[25%]" />
                        </div>
                        <div className="text-[10px] text-neutral-600 text-right">Family covers approx 25% of total cost</div>
                      </div>

                      <div>
                        <h3 className="text-xs text-neutral-500 uppercase mb-3 border-b border-neutral-800 pb-2">Active Offers Breakdown</h3>
                        <div className="mb-4 group cursor-pointer">
                          <div className="flex justify-between items-center mb-1">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                              <span className="font-bold text-sm">Univ. of Portland</span>
                            </div>
                            <span className="text-xs font-mono text-neutral-400">75% Cov.</span>
                          </div>
                          <div className="flex h-2 w-full rounded-sm overflow-hidden bg-neutral-800">
                            <div className="bg-red-600 w-[40%]" title="Athletic" />
                            <div className="bg-blue-600 w-[20%]" title="Academic" />
                            <div className="bg-yellow-600 w-[15%]" title="Need Based" />
                          </div>
                          <div className="flex gap-3 mt-1 text-[10px] text-neutral-500">
                            <span className="flex items-center gap-1">
                              <span className="w-1.5 h-1.5 bg-red-600 rounded-full" /> Athletic
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="w-1.5 h-1.5 bg-blue-600 rounded-full" /> Academic
                            </span>
                          </div>
                        </div>
                        <div className="mb-4 group cursor-pointer opacity-60 hover:opacity-100 transition-opacity">
                          <div className="flex justify-between items-center mb-1">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-neutral-600" />
                              <span className="font-bold text-sm">UC San Diego</span>
                            </div>
                            <span className="text-xs font-mono text-neutral-400">PENDING</span>
                          </div>
                          <div className="flex h-2 w-full rounded-sm overflow-hidden bg-neutral-800">
                            <div className="bg-neutral-600 w-full" />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-neutral-800/50 p-3 rounded border border-neutral-800">
                          <div className="text-[10px] text-neutral-500 uppercase">GPA</div>
                          <div className="text-lg font-bold text-white">3.85</div>
                        </div>
                        <div className="bg-neutral-800/50 p-3 rounded border border-neutral-800">
                          <div className="text-[10px] text-neutral-500 uppercase">SAT</div>
                          <div className="text-lg font-bold text-white">1320</div>
                        </div>
                      </div>
                    </div>

                    <div className={tabContentClasses('academics')}>
                      <div className="p-4 bg-neutral-900/50 rounded border border-neutral-800">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="text-sm font-bold text-white">Torrey Pines High School</h4>
                          <span className="text-[10px] bg-green-900 text-green-300 px-1.5 py-0.5 rounded border border-green-800">Top 5%</span>
                        </div>
                        <div className="space-y-1 text-xs text-neutral-400">
                          <div className="flex justify-between">
                            <span>Weighted GPA:</span>
                            <span className="text-white">4.12</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Core GPA:</span>
                            <span className="text-white">3.85</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Class Rank:</span>
                            <span className="text-white">24 / 450</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-xs text-neutral-500 uppercase mb-3 border-b border-neutral-800 pb-2">Transcript Highlights</h3>
                        <ul className="space-y-2 text-xs">
                          <li className="flex justify-between items-center p-2 bg-neutral-800/30 rounded">
                            <span className="text-neutral-300">AP Calculus BC</span>
                            <span className="font-bold text-green-400">A-</span>
                          </li>
                          <li className="flex justify-between items-center p-2 bg-neutral-800/30 rounded">
                            <span className="text-neutral-300">AP Physics 1</span>
                            <span className="font-bold text-white">B+</span>
                          </li>
                          <li className="flex justify-between items-center p-2 bg-neutral-800/30 rounded">
                            <span className="text-neutral-300">H English Lit</span>
                            <span className="font-bold text-green-400">A</span>
                          </li>
                        </ul>
                      </div>

                      <div className="flex items-center gap-3 p-3 border border-yellow-900/30 bg-yellow-900/10 rounded">
                        <span className="text-xl">⚠️</span>
                        <div className="text-[10px] text-yellow-500">
                          <span className="font-bold">NCAA Clearinghouse:</span> Pending final transcript submission (June &apos;25).
                        </div>
                      </div>
                    </div>

                    <div className={tabContentClasses('contact')}>
                      <div>
                        <h3 className="text-xs text-neutral-500 uppercase mb-3 border-b border-neutral-800 pb-2">Direct Contact</h3>
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-neutral-800 flex items-center justify-center text-neutral-500">📱</div>
                            <div>
                              <div className="text-xs text-neutral-500">Cell Phone</div>
                              <div className="text-sm font-mono text-white">(619) 555-0192</div>
                            </div>
                            <button
                              type="button"
                              className="ml-auto text-xs bg-neutral-800 hover:bg-neutral-700 px-2 py-1 rounded text-neutral-300"
                              onClick={() => navigator.clipboard?.writeText('(619) 555-0192')}
                            >
                              Copy
                            </button>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-neutral-800 flex items-center justify-center text-neutral-500">📧</div>
                            <div>
                              <div className="text-xs text-neutral-500">Email</div>
                              <div className="text-sm font-mono text-white">jalen.t10@gmail.com</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-xs text-neutral-500 uppercase mb-3 border-b border-neutral-800 pb-2">Family / Guardians</h3>
                        <div className="p-3 bg-neutral-900 rounded border border-neutral-800">
                          <div className="text-sm font-bold text-white">Marcus Thompson</div>
                          <div className="text-xs text-neutral-500 mb-2">Father</div>
                          <div className="flex gap-2 text-[10px]">
                            <span className="bg-neutral-800 px-2 py-1 rounded text-neutral-300">Works at Qualcomm</span>
                            <span className="bg-neutral-800 px-2 py-1 rounded text-neutral-300">Duke Alum &apos;98</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-neutral-800/50 p-3 rounded">
                        <textarea
                          className="w-full bg-transparent text-sm text-white resize-none focus:outline-none placeholder-neutral-600"
                          rows={3}
                          placeholder="Type a direct message to Jalen..."
                        />
                        <div className="flex justify-between items-center mt-2 border-t border-neutral-700 pt-2">
                          <span className="text-[10px] text-neutral-500">Visible to player &amp; parents</span>
                          <button className="bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold px-3 py-1 rounded uppercase">
                            Send
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-neutral-900 border-t border-neutral-800 gap-2 flex">
                    <button className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase py-3 rounded transition-colors shadow-lg shadow-red-900/20">
                      Offer Scholarship
                    </button>
                    <button className="px-3 bg-neutral-800 hover:bg-neutral-700 text-white rounded border border-neutral-700 transition-colors">
                      ⭐
                    </button>
                  </div>
                </div>
              </div>

              <div className="h-12 bg-[#050505] flex items-center px-4 gap-4 border-t border-neutral-900">
                <button className="text-white hover:text-red-500">▶</button>
                <div className="flex-1 h-1 bg-neutral-800 rounded-full relative group cursor-pointer">
                  <div className="absolute left-0 top-0 bottom-0 w-3/4 bg-red-600 rounded-full" />
                  <div className="absolute left-3/4 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full group-hover:scale-125 transition-transform" />
                </div>
                <span className="text-xs font-mono text-neutral-500">LIVE</span>
              </div>
            </main>

            <aside className="w-80 bg-[#080808] border-l border-neutral-900 flex flex-col hidden lg:flex">
              <div className="flex text-xs font-bold uppercase tracking-wider text-center border-b border-neutral-900">
                <div className="flex-1 py-4 bg-neutral-900 text-white border-b-2 border-red-600">Roster</div>
                <div className="flex-1 py-4 text-neutral-500 hover:text-white cursor-pointer relative transition-colors">
                  War Room
                  <span className="absolute top-3 right-4 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto scrollbar-thin">
                <div className="p-4 border-b border-neutral-900">
                  <input
                    type="text"
                    placeholder="Search Number or Name..."
                    className="w-full bg-[#121212] border border-neutral-800 text-white text-xs p-2 rounded focus:outline-none focus:border-red-600 placeholder-neutral-600 transition-colors"
                  />
                </div>

                {roster.map((player) => (
                  <div
                    key={player.number}
                    className={`flex items-center gap-3 p-3 hover:bg-neutral-900 cursor-pointer border-l-2 ${
                      player.accent
                    } border-b border-neutral-900/50 transition-colors ${player.active ? 'bg-neutral-900/50' : ''}`}
                  >
                    <div className={`text-lg font-black ${player.active ? 'text-red-600' : 'text-neutral-700'} w-8 text-center italic`}>
                      {player.number}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm ${player.active ? 'font-bold text-white' : 'font-medium text-neutral-300'} truncate`}>
                        {player.name}
                      </div>
                      <div className="text-[10px] text-neutral-500 flex items-center gap-2">
                        <span className={player.position === 'Committed (UCLA)' ? 'uppercase font-bold tracking-wider' : ''}>
                          {player.position}
                        </span>
                        {player.detail && <span>{player.detail}</span>}
                      </div>
                    </div>
                    {player.active && <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />}
                    {player.locked && <div className="text-neutral-700 text-xs">🔒</div>}
                  </div>
                ))}
              </div>

              <div className="h-48 bg-[#0a0a0a] border-t border-neutral-900 p-4">
                <h4 className="text-[10px] uppercase font-bold text-neutral-500 mb-3 tracking-widest">Live Activity Feed</h4>
                <div className="space-y-3">
                  {activityFeed.map((activity) => (
                    <div
                      key={activity.label}
                      className={`flex items-center justify-between text-xs ${activity.dim ? 'opacity-50' : ''}`}
                    >
                      <span className={activity.dim ? 'text-neutral-400' : 'text-neutral-300'}>
                        <span className={`${activity.color} mr-2`}>●</span>
                        {activity.label}
                      </span>
                      <span className="text-neutral-600 font-mono">{activity.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CoachViewPreview;

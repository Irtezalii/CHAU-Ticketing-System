import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import TicketForm from './components/TicketForm';
import TicketList from './components/TicketList';
import TicketChat from './components/TicketChat';
import AdminTable from './components/AdminTable';
import { useTickets } from './hooks/useTickets';

export default function App() {
  const [activeTab, setActiveTab] = useState<'submit' | 'list'>('submit');

  // View routing states
  const [isAdminView, setIsAdminView] = useState<boolean>(() => window.location.pathname === '/admin');
  const [activeChatRef, setActiveChatRef] = useState<string | null>(() => {
    const path = window.location.pathname;
    const match = path.match(/^\/ticket\/([^/]+)$/);
    return match ? match[1] : null;
  });

  // Custom hook handles all fetching state & API logic
  const { tickets, fetchingTickets, fetchError, fetchTickets } = useTickets(activeTab, isAdminView);

  // Navigation listener for browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const currentPath = window.location.pathname;
      if (currentPath === '/admin') {
        setIsAdminView(true);
        setActiveChatRef(null);
      } else {
        setIsAdminView(false);
        const pathMatch = currentPath.match(/^\/ticket\/([^/]+)$/);
        setActiveChatRef(pathMatch ? pathMatch[1] : null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const openTicketChat = (ref: string) => {
    setActiveChatRef(ref);
    setIsAdminView(false);
    window.history.pushState({}, '', `/ticket/${ref}`);
  };

  const closeTicketChat = () => {
    setActiveChatRef(null);
    window.history.pushState({}, '', '/');
  };

  return (
    <div className="min-h-screen bg-[#070b13] text-[#e9edf3] flex flex-col font-sans selection:bg-[#1a2c47] selection:text-[#7cb5ff]">
      <Header />

      <main className={`flex-1 flex flex-col justify-start items-center ${activeChatRef || isAdminView ? 'p-2 sm:p-4 overflow-hidden' : 'p-4 sm:p-8 pt-6 sm:pt-10'}`}>
        {isAdminView ? (
          <AdminTable
            onOpenChat={(ref) => openTicketChat(ref)}
            onGoHome={() => {
              setIsAdminView(false);
              window.history.pushState({}, '', '/');
            }}
          />
        ) : activeChatRef ? (
          <TicketChat ticketRef={activeChatRef} onBack={closeTicketChat} />
        ) : (
          <div className="w-full max-w-[820px] bg-[#0f1521] border border-[#242e3f] rounded-2xl overflow-hidden shadow-2xl flex flex-col">

            {/* Ticket Module Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-[#242e3f]">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#fbbf24] to-[#f59e0b] flex items-center justify-center flex-shrink-0 shadow">
                <svg width="17" height="17" viewBox="0 0 20 20" fill="none">
                  <path d="M3 7a2 2 0 012-2h10a2 2 0 012 2v1.2a1.8 1.8 0 000 3.6V13a2 2 0 01-2 2H5a2 2 0 01-2-2v-1.2a1.8 1.8 0 000-3.6V7z" stroke="#3d2a06" strokeWidth="1.6" strokeLinejoin="round"/>
                  <path d="M12 5.5v9" stroke="#3d2a06" strokeWidth="1.6" strokeDasharray="1.8 2"/>
                </svg>
              </div>
              <div className="font-bold text-[15.5px] flex-1 text-white">Support Tickets</div>
              <span className="bg-[#f5a524]/15 text-[#f5a524] border border-[#f5a524]/30 text-[10.5px] font-bold tracking-wider px-2.5 py-0.5 rounded-full">
                LIVE SUPPORT
              </span>
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-1.5 p-2 border-b border-[#242e3f] bg-[#0b1019]">
              <button
                type="button"
                onClick={() => setActiveTab('submit')}
                className={`flex-1 rounded-lg py-2 text-[12.5px] font-semibold transition-all duration-150 ${
                  activeTab === 'submit'
                    ? 'bg-[#1a2c47] border border-[#3b82f6]/40 text-[#7cb5ff]'
                    : 'bg-transparent text-[#aab4c2] hover:text-white hover:bg-[#141b28]'
                }`}
              >
                Submit New
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('list')}
                className={`flex-1 rounded-lg py-2 text-[12.5px] font-semibold flex justify-center items-center gap-1.5 transition-all duration-150 ${
                  activeTab === 'list'
                    ? 'bg-[#1a2c47] border border-[#3b82f6]/40 text-[#7cb5ff]'
                    : 'bg-transparent text-[#aab4c2] hover:text-white hover:bg-[#141b28]'
                }`}
              >
                My Tickets{' '}
                <span className="text-[10px] bg-[#3b82f6]/20 text-[#7cb5ff] font-bold px-1.5 py-0.5 rounded-full">
                  {tickets.length || '0'}
                </span>
              </button>
            </div>

            {/* TAB CONTENT */}
            {activeTab === 'submit' ? (
              <TicketForm
                onTicketSubmitted={() => fetchTickets(true)}
                onOpenChat={(ref) => openTicketChat(ref)}
              />
            ) : (
              <TicketList
                tickets={tickets}
                fetchingTickets={fetchingTickets}
                fetchError={fetchError}
                onRefresh={() => fetchTickets(false)}
                onOpenChat={(ref) => openTicketChat(ref)}
                onSwitchToSubmit={() => setActiveTab('submit')}
              />
            )}
          </div>
        )}

        {/* Footer Credit Link */}
        <div className="mt-6 text-center text-xs text-[#7b8697]">
          Powered by{' '}
          <a
            href="https://channelautomation.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#7cb5ff] hover:underline font-semibold"
          >
            Channel Automation
          </a>
        </div>
      </main>
    </div>
  );
}

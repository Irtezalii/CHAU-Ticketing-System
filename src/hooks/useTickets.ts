import { useState, useEffect, useCallback } from 'react';
import type { TicketRecord } from '../types/ticket';

export function useTickets(isAdminView: boolean) {
  const [tickets, setTickets] = useState<TicketRecord[]>([]);
  const [fetchingTickets, setFetchingTickets] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchTickets = useCallback(async (silent = false) => {
    if (!silent) setFetchingTickets(true);
    setFetchError(null);
    try {
      const res = await fetch('/api/tickets');
      const data = await res.json();

      if (res.ok && data.success) {
        setTickets(data.tickets || []);
      } else {
        setFetchError(data.message || 'Failed to load tickets.');
      }
    } catch {
      setFetchError('Network error while loading tickets.');
    } finally {
      setFetchingTickets(false);
      setInitialLoaded(true);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    if (!isAdminView) {
      const load = async () => {
        if (!initialLoaded) setFetchingTickets(true);
        setFetchError(null);
        try {
          const res = await fetch('/api/tickets');
          const data = await res.json();
          if (isMounted) {
            if (res.ok && data.success) {
              setTickets(data.tickets || []);
            } else {
              setFetchError(data.message || 'Failed to load tickets.');
            }
          }
        } catch {
          if (isMounted) {
            setFetchError('Network error while loading tickets.');
          }
        } finally {
          if (isMounted) {
            setFetchingTickets(false);
            setInitialLoaded(true);
          }
        }
      };

      void load();
    }

    return () => {
      isMounted = false;
    };
  }, [isAdminView]);

  return {
    tickets,
    fetchingTickets,
    fetchError,
    fetchTickets,
  };
}

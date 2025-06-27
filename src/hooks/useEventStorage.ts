
import { useState, useEffect } from 'react';

interface Event {
  id: string;
  name: string;
  date: string;
  description: string;
  totalTickets: number;
  scannedTickets: number;
  qrCodes: string[];
}

const STORAGE_KEY = 'ticketgen_events';

export const useEventStorage = () => {
  const [events, setEvents] = useState<Event[]>([]);

  // Load events from localStorage on mount
  useEffect(() => {
    const savedEvents = localStorage.getItem(STORAGE_KEY);
    if (savedEvents) {
      try {
        const parsedEvents = JSON.parse(savedEvents);
        setEvents(parsedEvents);
      } catch (error) {
        console.error('Failed to parse stored events:', error);
        // Initialize with default event if parsing fails
        const defaultEvent = {
          id: "1",
          name: "Tech Conference 2024",
          date: "2024-07-15",
          description: "Annual technology conference",
          totalTickets: 500,
          scannedTickets: 127,
          qrCodes: []
        };
        setEvents([defaultEvent]);
      }
    } else {
      // Initialize with default event if no stored events
      const defaultEvent = {
        id: "1",
        name: "Tech Conference 2024",
        date: "2024-07-15",
        description: "Annual technology conference",
        totalTickets: 500,
        scannedTickets: 127,
        qrCodes: []
      };
      setEvents([defaultEvent]);
    }
  }, []);

  // Save events to localStorage whenever events change
  useEffect(() => {
    if (events.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    }
  }, [events]);

  const addEvent = (event: Event) => {
    setEvents(prev => [...prev, event]);
  };

  const updateEvent = (eventId: string, updates: Partial<Event>) => {
    setEvents(prev => prev.map(event => 
      event.id === eventId ? { ...event, ...updates } : event
    ));
  };

  return {
    events,
    addEvent,
    updateEvent,
    setEvents
  };
};

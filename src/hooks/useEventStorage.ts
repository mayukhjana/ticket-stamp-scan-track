
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Event {
  id: string;
  name: string;
  date: string;
  description: string;
  totalTickets: number;
  scannedTickets: number;
  qrCodes: string[];
  templateImage?: string;
  qrPositionX?: number;
  qrPositionY?: number;
  qrSize?: number;
}

// Helper function to safely convert Json to string array
const safeJsonToStringArray = (jsonData: any): string[] => {
  if (!jsonData) return [];
  if (Array.isArray(jsonData)) {
    return jsonData.filter(item => typeof item === 'string');
  }
  return [];
};

export const useEventStorage = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load events from Supabase with enhanced retry logic
  const loadEvents = async (retryCount = 0) => {
    if (!user) {
      setEvents([]);
      setIsLoading(false);
      return;
    }

    try {
      // Create AbortController with longer timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50) // Limit results for better performance
        .abortSignal(controller.signal);

      clearTimeout(timeoutId);

      if (error) {
        console.error('Database error:', error);
        // Handle various error types that might indicate connectivity issues
        if (
          error.code === '57014' || 
          error.message?.includes('timeout') || 
          error.message?.includes('Failed to fetch') ||
          error.message?.includes('AbortError') ||
          error.code === '20' // AbortError code
        ) {
          if (retryCount < 3) { // Increased retry count
            console.log(`Database error, retrying... (attempt ${retryCount + 1})`);
            const backoffDelay = Math.min(1000 * Math.pow(2, retryCount), 5000); // Exponential backoff
            await new Promise(resolve => setTimeout(resolve, backoffDelay));
            return loadEvents(retryCount + 1);
          }
        }
        throw error;
      }

      const formattedEvents = data?.map(event => ({
        id: event.id,
        name: event.name,
        date: event.date,
        description: event.description || '',
        totalTickets: event.total_tickets,
        scannedTickets: event.scanned_tickets,
        qrCodes: safeJsonToStringArray(event.qr_codes),
        templateImage: event.template_image || undefined,
        qrPositionX: event.qr_position_x || 50,
        qrPositionY: event.qr_position_y || 50,
        qrSize: event.qr_size || 80
      })) || [];

      setEvents(formattedEvents);
    } catch (error: any) {
      console.error('Error loading events:', error);
      
      // Handle abort signal
      if (error.name === 'AbortError') {
        console.log('Request was aborted due to timeout');
      }
      
      // Fallback to empty array if error
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Load events when user changes
  useEffect(() => {
    loadEvents();
  }, [user]);

  const addEvent = async (event: Event) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('events')
        .insert({
          user_id: user.id,
          name: event.name,
          date: event.date,
          description: event.description,
          total_tickets: event.totalTickets,
          scanned_tickets: 0,
          qr_codes: [],
          template_image: event.templateImage || null,
          qr_position_x: event.qrPositionX || 50,
          qr_position_y: event.qrPositionY || 50,
          qr_size: event.qrSize || 80
        })
        .select()
        .single();

      if (error) throw error;

      const newEvent = {
        id: data.id,
        name: data.name,
        date: data.date,
        description: data.description || '',
        totalTickets: data.total_tickets,
        scannedTickets: data.scanned_tickets,
        qrCodes: safeJsonToStringArray(data.qr_codes),
        templateImage: data.template_image || undefined,
        qrPositionX: data.qr_position_x || 50,
        qrPositionY: data.qr_position_y || 50,
        qrSize: data.qr_size || 80
      };

      setEvents(prev => [newEvent, ...prev]);
    } catch (error) {
      console.error('Error adding event:', error);
      throw error;
    }
  };

  const updateEvent = async (eventId: string, updates: Partial<Event>) => {
    if (!user) return;

    try {
      const updateData: any = {};
      
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.date !== undefined) updateData.date = updates.date;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.totalTickets !== undefined) updateData.total_tickets = updates.totalTickets;
      if (updates.scannedTickets !== undefined) updateData.scanned_tickets = updates.scannedTickets;
      if (updates.qrCodes !== undefined) updateData.qr_codes = updates.qrCodes;
      if (updates.templateImage !== undefined) updateData.template_image = updates.templateImage;
      if (updates.qrPositionX !== undefined) updateData.qr_position_x = updates.qrPositionX;
      if (updates.qrPositionY !== undefined) updateData.qr_position_y = updates.qrPositionY;
      if (updates.qrSize !== undefined) updateData.qr_size = updates.qrSize;

      const { error } = await supabase
        .from('events')
        .update(updateData)
        .eq('id', eventId)
        .eq('user_id', user.id);

      if (error) throw error;

      setEvents(prev => prev.map(event => 
        event.id === eventId ? { ...event, ...updates } : event
      ));
    } catch (error) {
      console.error('Error updating event:', error);
      throw error;
    }
  };

  const deleteEvent = async (eventId: string) => {
    if (!user) return;

    try {
      // First delete related scan results
      const { error: scanError } = await supabase
        .from('scan_results')
        .delete()
        .eq('event_id', eventId)
        .eq('user_id', user.id);

      if (scanError) {
        console.warn('Error deleting scan results:', scanError);
        // Continue with event deletion even if scan results deletion fails
      }

      // Then delete the event
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId)
        .eq('user_id', user.id);

      if (error) throw error;

      setEvents(prev => prev.filter(event => event.id !== eventId));
    } catch (error) {
      console.error('Error deleting event:', error);
      throw error;
    }
  };

  return {
    events,
    addEvent,
    updateEvent,
    deleteEvent,
    setEvents,
    isLoading,
    loadEvents
  };
};

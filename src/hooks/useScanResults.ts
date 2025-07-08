
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ScanResult {
  id: string;
  eventName: string;
  ticketNumber: number;
  scanTime: string;
  status: 'valid' | 'invalid' | 'duplicate';
  message: string;
}

export const useScanResults = () => {
  const { user } = useAuth();
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load scan results from Supabase with retry logic
  const loadScanResults = useCallback(async (retryCount = 0) => {
    if (!user) {
      setScanResults([]);
      setIsLoading(false);
      return;
    }

    try {
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

      const { data, error } = await supabase
        .from('scan_results')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50) // Limit to recent 50 scans
        .abortSignal(controller.signal);

      clearTimeout(timeoutId);

      if (error) {
        // Handle specific timeout or network errors
        if (error.code === '57014' || error.message?.includes('timeout') || error.message?.includes('Failed to fetch')) {
          if (retryCount < 2) {
            console.log(`Database/network error, retrying scan results... (attempt ${retryCount + 1})`);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
            return loadScanResults(retryCount + 1);
          }
        }
        throw error;
      }

      const formattedResults = data?.map(result => ({
        id: result.id,
        eventName: result.event_name,
        ticketNumber: result.ticket_number,
        scanTime: new Date(result.scan_time).toLocaleString(),
        status: result.status as 'valid' | 'invalid' | 'duplicate',
        message: result.message
      })) || [];

      setScanResults(formattedResults);
    } catch (error: any) {
      console.error('Error loading scan results:', error);
      
      // Handle abort signal
      if (error.name === 'AbortError') {
        console.log('Scan results request was aborted due to timeout');
      }
      
      setScanResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Load scan results when user changes
  useEffect(() => {
    loadScanResults();
  }, [loadScanResults]);

  // Set up real-time subscription for scan results
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('scan-results-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'scan_results',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('New scan result:', payload);
          const newResult = {
            id: payload.new.id,
            eventName: payload.new.event_name,
            ticketNumber: payload.new.ticket_number,
            scanTime: new Date(payload.new.scan_time).toLocaleString(),
            status: payload.new.status as 'valid' | 'invalid' | 'duplicate',
            message: payload.new.message
          };
          setScanResults(prev => [newResult, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const addScanResult = async (result: Omit<ScanResult, 'id' | 'scanTime'>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('scan_results')
        .insert({
          user_id: user.id,
          event_name: result.eventName,
          ticket_number: result.ticketNumber,
          status: result.status,
          message: result.message
        })
        .select()
        .single();

      if (error) throw error;

      const newResult = {
        id: data.id,
        eventName: data.event_name,
        ticketNumber: data.ticket_number,
        scanTime: new Date(data.scan_time).toLocaleString(),
        status: data.status as 'valid' | 'invalid' | 'duplicate',
        message: data.message
      };

      // Don't add to state here since real-time subscription will handle it
      return newResult;
    } catch (error) {
      console.error('Error adding scan result:', error);
      throw error;
    }
  };

  return {
    scanResults,
    addScanResult,
    isLoading,
    loadScanResults
  };
};


import { useState, useEffect } from 'react';
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

  // Load scan results from Supabase
  const loadScanResults = async () => {
    if (!user) {
      setScanResults([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('scan_results')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50); // Limit to recent 50 scans

      if (error) throw error;

      const formattedResults = data.map(result => ({
        id: result.id,
        eventName: result.event_name,
        ticketNumber: result.ticket_number,
        scanTime: new Date(result.scan_time).toLocaleString(),
        status: result.status as 'valid' | 'invalid' | 'duplicate',
        message: result.message
      }));

      setScanResults(formattedResults);
    } catch (error) {
      console.error('Error loading scan results:', error);
      setScanResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Load scan results when user changes
  useEffect(() => {
    loadScanResults();
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

      setScanResults(prev => [newResult, ...prev]);
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

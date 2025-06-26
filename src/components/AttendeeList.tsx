
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Download, Search, Users, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Event {
  id: string;
  name: string;
  date: string;
  description: string;
  totalTickets: number;
  scannedTickets: number;
  qrCodes: string[];
}

interface Attendee {
  id: string;
  ticketNumber: number;
  scanTime: string;
  status: 'scanned' | 'unused';
}

interface AttendeeListProps {
  event: Event;
  onAttendeeUpdate: (scannedCount: number) => void;
}

const AttendeeList = ({ event, onAttendeeUpdate }: AttendeeListProps) => {
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<'all' | 'scanned' | 'unused'>('all');
  const { toast } = useToast();

  useEffect(() => {
    // Initialize attendee list based on total tickets
    const initialAttendees: Attendee[] = [];
    for (let i = 1; i <= event.totalTickets; i++) {
      initialAttendees.push({
        id: `ticket-${i}`,
        ticketNumber: i,
        scanTime: '',
        status: 'unused'
      });
    }
    
    // Simulate some scanned tickets for demo
    for (let i = 0; i < event.scannedTickets; i++) {
      if (initialAttendees[i]) {
        initialAttendees[i].status = 'scanned';
        initialAttendees[i].scanTime = new Date(Date.now() - Math.random() * 86400000).toISOString();
      }
    }
    
    setAttendees(initialAttendees);
  }, [event.totalTickets, event.scannedTickets]);

  const filteredAttendees = attendees.filter(attendee => {
    const matchesSearch = attendee.ticketNumber.toString().includes(searchTerm) || 
                         attendee.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' || attendee.status === filter;
    return matchesSearch && matchesFilter;
  });

  const exportToCSV = () => {
    const headers = ['Ticket Number', 'Status', 'Scan Time'];
    const csvContent = [
      headers.join(','),
      ...attendees.map(attendee => [
        attendee.ticketNumber,
        attendee.status,
        attendee.scanTime || 'Not scanned'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${event.name}-attendees.csv`;
    link.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: "Attendee list has been exported to CSV."
    });
  };

  const refreshData = () => {
    // Simulate real-time update
    toast({
      title: "Data Refreshed",
      description: "Attendee list has been updated with latest scan data."
    });
  };

  const scannedCount = attendees.filter(a => a.status === 'scanned').length;
  const unusedCount = attendees.filter(a => a.status === 'unused').length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Attendee Management
          </CardTitle>
          <CardDescription>
            Track and manage event attendance in real-time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{scannedCount}</div>
              <div className="text-sm text-gray-600">Scanned Tickets</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{unusedCount}</div>
              <div className="text-sm text-gray-600">Unused Tickets</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {Math.round((scannedCount / event.totalTickets) * 100)}%
              </div>
              <div className="text-sm text-gray-600">Attendance Rate</div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search tickets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                onClick={() => setFilter('all')}
                size="sm"
              >
                All ({attendees.length})
              </Button>
              <Button
                variant={filter === 'scanned' ? 'default' : 'outline'}
                onClick={() => setFilter('scanned')}
                size="sm"
              >
                Scanned ({scannedCount})
              </Button>
              <Button
                variant={filter === 'unused' ? 'default' : 'outline'}
                onClick={() => setFilter('unused')}
                size="sm"
              >
                Unused ({unusedCount})
              </Button>
            </div>
            <div className="flex gap-2">
              <Button onClick={refreshData} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button onClick={exportToCSV} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ticket Status List</CardTitle>
          <CardDescription>
            Complete list of all tickets and their current status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket #</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Scan Time</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAttendees.map((attendee) => (
                  <TableRow key={attendee.id}>
                    <TableCell className="font-medium">
                      #{String(attendee.ticketNumber).padStart(4, '0')}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={attendee.status === 'scanned' ? 'default' : 'secondary'}
                      >
                        {attendee.status === 'scanned' ? 'Scanned' : 'Unused'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {attendee.scanTime 
                        ? new Date(attendee.scanTime).toLocaleString()
                        : '-'
                      }
                    </TableCell>
                    <TableCell>
                      {attendee.status === 'unused' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const updated = attendees.map(a => 
                              a.id === attendee.id 
                                ? { ...a, status: 'scanned' as const, scanTime: new Date().toISOString() }
                                : a
                            );
                            setAttendees(updated);
                            onAttendeeUpdate(updated.filter(a => a.status === 'scanned').length);
                            toast({
                              title: "Ticket Scanned",
                              description: `Ticket #${attendee.ticketNumber} marked as scanned.`
                            });
                          }}
                        >
                          Mark Scanned
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredAttendees.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No tickets found matching your search criteria.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AttendeeList;

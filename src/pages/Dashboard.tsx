
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, Calendar, Users, QrCode, Download, Upload, Ticket, LogOut, Loader2, ChevronDown, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useEventStorage } from "@/hooks/useEventStorage";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useScanResults } from "@/hooks/useScanResults";
import QRCodeGenerator from "@/components/QRCodeGenerator";
import TicketMockup from "@/components/TicketMockup";
import AttendeeList from "@/components/AttendeeList";

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

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const { events, addEvent, updateEvent, deleteEvent, isLoading } = useEventStorage();
  const { scanResults, loadScanResults } = useScanResults();
  
  const [newEvent, setNewEvent] = useState({
    name: "",
    date: "",
    description: "",
    ticketCount: ""
  });
  
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isNewEventOpen, setIsNewEventOpen] = useState(false);
  const { toast } = useToast();

  // Update selectedEvent when events load and sync scan data
  useEffect(() => {
    if (!selectedEvent && events.length > 0) {
      setSelectedEvent(events[0]);
    }
    // Refresh scan results to sync with scanner
    loadScanResults();
  }, [events, selectedEvent, loadScanResults]);

  // Refresh data periodically to stay synced (reduced frequency)
  useEffect(() => {
    const interval = setInterval(() => {
      loadScanResults();
    }, 15000); // Reduced from 5s to 15s to reduce database load

    return () => clearInterval(interval);
  }, [loadScanResults]);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Signed Out",
        description: "You have been signed out successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCreateEvent = async () => {
    if (!newEvent.name || !newEvent.date || !newEvent.ticketCount) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    setIsCreating(true);
    try {
      const event: Event = {
        id: '', // Will be set by database
        name: newEvent.name,
        date: newEvent.date,
        description: newEvent.description,
        totalTickets: parseInt(newEvent.ticketCount),
        scannedTickets: 0,
        qrCodes: []
      };

      await addEvent(event);
      setNewEvent({ name: "", date: "", description: "", ticketCount: "" });
      
      toast({
        title: "Event Created",
        description: `${event.name} has been created successfully.`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create event. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleTemplateUpdate = async (updates: { templateImage?: string; qrPositionX?: number; qrPositionY?: number; qrSize?: number }) => {
    if (!selectedEvent) return;
    
    try {
      await updateEvent(selectedEvent.id, updates);
      // Update the selected event immediately for UI consistency
      setSelectedEvent(prev => prev ? { ...prev, ...updates } : null);
      
      toast({
        title: "Template Saved",
        description: "Template settings have been saved successfully.",
      });
    } catch (error) {
      console.error('Template update error:', error);
      toast({
        title: "Error",
        description: "Failed to save template settings. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      await deleteEvent(eventId);
      
      // Clear selected event if it was deleted
      if (selectedEvent?.id === eventId) {
        setSelectedEvent(events.length > 1 ? events.find(e => e.id !== eventId) || null : null);
      }
      
      toast({
        title: "Event Deleted",
        description: "The event has been permanently deleted."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete event. Please try again.",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-purple-600" />
          <p className="text-gray-600">Loading your events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link to="/" className="flex items-center space-x-2">
            <Ticket className="h-8 w-8 text-purple-600" />
            <span className="text-2xl font-bold text-gray-900">TicketGen</span>
          </Link>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              Welcome, {user?.email}
            </span>
            <Link to="/">
              <Button variant="outline">Home</Button>
            </Link>
            <Button variant="default">Dashboard</Button>
            <Link to="/scanner">
              <Button variant="outline">Scanner</Button>
            </Link>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-3xl font-bold text-gray-900">Event Dashboard</h1>
          <p className="text-gray-600 mt-1">Manage your events and track attendance (synced with scanner)</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Events Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Your Events
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className={`relative p-4 rounded-lg border transition-colors ${
                      selectedEvent?.id === event.id 
                        ? 'border-purple-500 bg-purple-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div 
                      className="cursor-pointer"
                      onClick={() => setSelectedEvent(event)}
                    >
                      <h3 className="font-semibold text-gray-900">{event.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{event.date}</p>
                      <div className="flex justify-between items-center mt-3">
                        <Badge variant="outline">
                          {event.scannedTickets}/{event.totalTickets} scanned
                        </Badge>
                        <div className="flex gap-1">
                          <Badge variant={event.qrCodes.length > 0 ? "default" : "secondary"}>
                            {event.qrCodes.length > 0 ? "QR Ready" : "Setup Needed"}
                          </Badge>
                          {event.templateImage && (
                            <Badge variant="outline" className="text-xs">
                              Template ✓
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Delete Button */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute top-2 right-2 h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Event</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{event.name}"? This action cannot be undone and will permanently remove all event data including QR codes and scan results.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteEvent(event.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete Event
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ))}

                {events.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No events yet</p>
                    <p className="text-sm">Create your first event below</p>
                  </div>
                )}

                {/* Collapsible Create New Event Form */}
                <Collapsible open={isNewEventOpen} onOpenChange={setIsNewEventOpen}>
                  <Card className="mt-6">
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                        <CardTitle className="flex items-center justify-between text-lg">
                          <div className="flex items-center gap-2">
                            <Plus className="h-4 w-4" />
                            New Event
                          </div>
                          <ChevronDown className={`h-4 w-4 transition-transform ${isNewEventOpen ? 'rotate-180' : ''}`} />
                        </CardTitle>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="space-y-4 pt-0">
                        <div>
                          <Label htmlFor="eventName">Event Name *</Label>
                          <Input
                            id="eventName"
                            value={newEvent.name}
                            onChange={(e) => setNewEvent({...newEvent, name: e.target.value})}
                            placeholder="Enter event name"
                          />
                        </div>
                        <div>
                          <Label htmlFor="eventDate">Date *</Label>
                          <Input
                            id="eventDate"
                            type="date"
                            value={newEvent.date}
                            onChange={(e) => setNewEvent({...newEvent, date: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label htmlFor="ticketCount">Number of Tickets *</Label>
                          <Input
                            id="ticketCount"
                            type="number"
                            value={newEvent.ticketCount}
                            onChange={(e) => setNewEvent({...newEvent, ticketCount: e.target.value})}
                            placeholder="e.g., 100"
                          />
                        </div>
                        <div>
                          <Label htmlFor="eventDesc">Description</Label>
                          <Textarea
                            id="eventDesc"
                            value={newEvent.description}
                            onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                            placeholder="Event description..."
                            rows={3}
                          />
                        </div>
                        <Button 
                          onClick={handleCreateEvent} 
                          className="w-full"
                          disabled={isCreating}
                        >
                          {isCreating ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Creating...
                            </>
                          ) : (
                            'Create Event'
                          )}
                        </Button>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              </CardContent>
            </Card>

            {/* Real-time Scan Statistics */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="h-5 w-5" />
                  Recent Scans
                </CardTitle>
                <CardDescription>Live data from scanner</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {scanResults.slice(0, 5).map((result) => (
                    <div key={result.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div>
                        <p className="text-sm font-medium">{result.eventName}</p>
                        <p className="text-xs text-gray-600">Ticket #{result.ticketNumber}</p>
                      </div>
                      <Badge variant={result.status === 'valid' ? 'default' : result.status === 'duplicate' ? 'secondary' : 'destructive'} className="text-xs">
                        {result.status}
                      </Badge>
                    </div>
                  ))}
                  {scanResults.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">No scans yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            {selectedEvent ? (
              <Tabs defaultValue="overview" className="space-y-6">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="qrcodes">QR Codes</TabsTrigger>
                  <TabsTrigger value="mockups">Mockups</TabsTrigger>
                  <TabsTrigger value="attendees">Attendees</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>{selectedEvent.name}</CardTitle>
                      <CardDescription>{selectedEvent.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                          <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                          <div className="text-2xl font-bold text-blue-600">{selectedEvent.totalTickets}</div>
                          <div className="text-sm text-gray-600">Total Tickets</div>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                          <QrCode className="h-8 w-8 text-green-600 mx-auto mb-2" />
                          <div className="text-2xl font-bold text-green-600">{selectedEvent.scannedTickets}</div>
                          <div className="text-sm text-gray-600">Scanned</div>
                        </div>
                        <div className="text-center p-4 bg-orange-50 rounded-lg">
                          <Calendar className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                          <div className="text-2xl font-bold text-orange-600">{selectedEvent.totalTickets - selectedEvent.scannedTickets}</div>
                          <div className="text-sm text-gray-600">Remaining</div>
                        </div>
                        <div className="text-center p-4 bg-purple-50 rounded-lg">
                          <div className="text-2xl font-bold text-purple-600">
                            {Math.round((selectedEvent.scannedTickets / selectedEvent.totalTickets) * 100)}%
                          </div>
                          <div className="text-sm text-gray-600">Attendance</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="qrcodes">
                  <QRCodeGenerator 
                    event={selectedEvent} 
                    onQRCodesGenerated={async (qrCodes) => {
                      try {
                        await updateEvent(selectedEvent.id, { qrCodes });
                        // Update both local state and selected event
                        setSelectedEvent(prev => prev ? { ...prev, qrCodes } : null);
                        
                        toast({
                          title: "QR Codes Generated",
                          description: `Successfully generated ${qrCodes.length} QR codes.`,
                        });
                      } catch (error) {
                        console.error('Error saving QR codes:', error);
                        toast({
                          title: "Error",
                          description: "Failed to save QR codes. Please try again.",
                          variant: "destructive"
                        });
                      }
                    }} 
                  />
                </TabsContent>

                <TabsContent value="mockups">
                  <TicketMockup 
                    event={selectedEvent} 
                    onTemplateUpdate={handleTemplateUpdate}
                  />
                </TabsContent>

                <TabsContent value="attendees">
                  <AttendeeList 
                    event={selectedEvent}
                    onAttendeeUpdate={async (scannedCount) => {
                      await updateEvent(selectedEvent.id, { scannedTickets: scannedCount });
                      setSelectedEvent({ ...selectedEvent, scannedTickets: scannedCount });
                    }}
                  />
                </TabsContent>
              </Tabs>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Event Selected</h3>
                  <p className="text-gray-600">Select an event from the sidebar or create a new one to get started.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

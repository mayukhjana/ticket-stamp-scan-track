
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Calendar, Users, QrCode, Download, Upload, Ticket, LogOut } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useEventStorage } from "@/hooks/useEventStorage";
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
}

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const { events, addEvent, updateEvent } = useEventStorage();
  
  const [newEvent, setNewEvent] = useState({
    name: "",
    date: "",
    description: "",
    ticketCount: ""
  });
  
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(events[0] || null);
  const { toast } = useToast();

  // Update selectedEvent when events change (e.g., after loading from storage)
  useState(() => {
    if (!selectedEvent && events.length > 0) {
      setSelectedEvent(events[0]);
    }
  });

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

  const handleCreateEvent = () => {
    if (!newEvent.name || !newEvent.date || !newEvent.ticketCount) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    const event: Event = {
      id: Date.now().toString(),
      name: newEvent.name,
      date: newEvent.date,
      description: newEvent.description,
      totalTickets: parseInt(newEvent.ticketCount),
      scannedTickets: 0,
      qrCodes: []
    };

    addEvent(event);
    setSelectedEvent(event);
    setNewEvent({ name: "", date: "", description: "", ticketCount: "" });
    
    toast({
      title: "Event Created",
      description: `${event.name} has been created successfully.`
    });
  };

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
          <p className="text-gray-600 mt-1">Manage your events and track attendance</p>
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
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                      selectedEvent?.id === event.id 
                        ? 'border-purple-500 bg-purple-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedEvent(event)}
                  >
                    <h3 className="font-semibold text-gray-900">{event.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{event.date}</p>
                    <div className="flex justify-between items-center mt-3">
                      <Badge variant="outline">
                        {event.scannedTickets}/{event.totalTickets} scanned
                      </Badge>
                      <Badge variant={event.qrCodes.length > 0 ? "default" : "secondary"}>
                        {event.qrCodes.length > 0 ? "QR Ready" : "Setup Needed"}
                      </Badge>
                    </div>
                  </div>
                ))}

                {/* Create New Event Form */}
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Plus className="h-4 w-4" />
                      New Event
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
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
                    <Button onClick={handleCreateEvent} className="w-full">
                      Create Event
                    </Button>
                  </CardContent>
                </Card>
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
                    onQRCodesGenerated={(qrCodes) => {
                      updateEvent(selectedEvent.id, { qrCodes });
                      setSelectedEvent({ ...selectedEvent, qrCodes });
                    }} 
                  />
                </TabsContent>

                <TabsContent value="mockups">
                  <TicketMockup event={selectedEvent} />
                </TabsContent>

                <TabsContent value="attendees">
                  <AttendeeList 
                    event={selectedEvent}
                    onAttendeeUpdate={(scannedCount) => {
                      updateEvent(selectedEvent.id, { scannedTickets: scannedCount });
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


import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { QrCode, Ticket, Upload, Scan } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Ticket className="h-8 w-8 text-purple-600" />
            <span className="text-2xl font-bold text-gray-900">TicketGen</span>
          </div>
          <nav className="flex space-x-4">
            <Link to="/dashboard">
              <Button variant="outline">Dashboard</Button>
            </Link>
            <Link to="/scanner">
              <Button variant="outline">Scanner</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          Professional Event Ticketing
          <span className="block text-purple-600 mt-2">with Smart QR Codes</span>
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
          Generate bulk QR codes, create stunning ticket mockups, and manage attendance with real-time validation. 
          Perfect for events of any size.
        </p>
        <div className="flex justify-center space-x-4">
          <Link to="/dashboard">
            <Button size="lg" className="bg-purple-600 hover:bg-purple-700">
              Get Started
            </Button>
          </Link>
          <Link to="/scanner">
            <Button size="lg" variant="outline">
              Scan Tickets
            </Button>
          </Link>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
          Everything you need for seamless events
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <QrCode className="h-12 w-12 text-purple-600 mb-4" />
              <CardTitle>Bulk QR Generation</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Generate hundreds of unique QR codes instantly for your events with one-time use validation.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <Upload className="h-12 w-12 text-blue-600 mb-4" />
              <CardTitle>Ticket Mockups</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Upload your ticket designs and automatically generate mockups with QR codes perfectly placed.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <Scan className="h-12 w-12 text-green-600 mb-4" />
              <CardTitle>Smart Scanning</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Scan QR codes with instant validation and prevent duplicate entries with real-time updates.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <Ticket className="h-12 w-12 text-orange-600 mb-4" />
              <CardTitle>Live Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Monitor attendance in real-time with exportable Excel reports and comprehensive analytics.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-purple-600 to-blue-600 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to streamline your events?</h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of event organizers who trust TicketGen for their events.
          </p>
          <Link to="/dashboard">
            <Button size="lg" variant="secondary">
              Start Creating Events
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Index;

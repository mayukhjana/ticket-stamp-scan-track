
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Scan, CheckCircle, XCircle, Camera } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ScanResult {
  id: string;
  eventName: string;
  ticketNumber: number;
  scanTime: string;
  status: 'valid' | 'invalid' | 'duplicate';
  message: string;
}

const Scanner = () => {
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [manualInput, setManualInput] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();

  const processQRCode = (qrData: string) => {
    try {
      const ticketData = JSON.parse(qrData);
      
      // Check if this ticket was already scanned
      const existingScan = scanResults.find(
        result => result.eventName === ticketData.eventName && 
                 result.ticketNumber === ticketData.ticketNumber
      );

      const scanResult: ScanResult = {
        id: Date.now().toString(),
        eventName: ticketData.eventName || 'Unknown Event',
        ticketNumber: ticketData.ticketNumber || 0,
        scanTime: new Date().toLocaleString(),
        status: existingScan ? 'duplicate' : 'valid',
        message: existingScan 
          ? 'Ticket already scanned!' 
          : 'Valid ticket - Access granted'
      };

      setScanResults([scanResult, ...scanResults]);

      toast({
        title: scanResult.status === 'valid' ? "Valid Ticket" : "Duplicate Ticket",
        description: scanResult.message,
        variant: scanResult.status === 'valid' ? "default" : "destructive"
      });

    } catch (error) {
      const scanResult: ScanResult = {
        id: Date.now().toString(),
        eventName: 'Invalid',
        ticketNumber: 0,
        scanTime: new Date().toLocaleString(),
        status: 'invalid',
        message: 'Invalid QR code format'
      };

      setScanResults([scanResult, ...scanResults]);

      toast({
        title: "Invalid QR Code",
        description: "This QR code is not a valid ticket.",
        variant: "destructive"
      });
    }
  };

  const handleManualScan = () => {
    if (!manualInput.trim()) {
      toast({
        title: "No Input",
        description: "Please enter QR code data or scan a code.",
        variant: "destructive"
      });
      return;
    }

    processQRCode(manualInput);
    setManualInput("");
  };

  const startCamera = async () => {
    setIsScanning(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      toast({
        title: "Camera Started",
        description: "Point your camera at a QR code to scan it."
      });
    } catch (error) {
      toast({
        title: "Camera Error",
        description: "Unable to access camera. Please check permissions or use manual input.",
        variant: "destructive"
      });
      setIsScanning(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'valid':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'duplicate':
        return <XCircle className="h-5 w-5 text-orange-600" />;
      case 'invalid':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Scan className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'valid':
        return <Badge className="bg-green-100 text-green-800">Valid</Badge>;
      case 'duplicate':
        return <Badge className="bg-orange-100 text-orange-800">Duplicate</Badge>;
      case 'invalid':
        return <Badge className="bg-red-100 text-red-800">Invalid</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const validScans = scanResults.filter(r => r.status === 'valid').length;
  const duplicateScans = scanResults.filter(r => r.status === 'duplicate').length;
  const invalidScans = scanResults.filter(r => r.status === 'invalid').length;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-3xl font-bold text-gray-900">QR Code Scanner</h1>
          <p className="text-gray-600 mt-1">Scan tickets and validate attendance</p>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Scanner Section */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scan className="h-5 w-5" />
                  QR Code Scanner
                </CardTitle>
                <CardDescription>
                  Use camera to scan QR codes or enter manually
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Camera Scanner */}
                <div className="space-y-4">
                  <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden relative">
                    {isScanning ? (
                      <video
                        ref={videoRef}
                        className="w-full h-full object-cover"
                        autoPlay
                        playsInline
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <Camera className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-600">Camera not active</p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    {!isScanning ? (
                      <Button onClick={startCamera} className="flex-1">
                        <Camera className="mr-2 h-4 w-4" />
                        Start Camera
                      </Button>
                    ) : (
                      <Button onClick={stopCamera} variant="outline" className="flex-1">
                        Stop Camera
                      </Button>
                    )}
                  </div>
                </div>

                {/* Manual Input */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">Or enter manually:</p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Paste QR code data here..."
                      value={manualInput}
                      onChange={(e) => setManualInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleManualScan()}
                    />
                    <Button onClick={handleManualScan}>
                      <Scan className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Scan Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{validScans}</div>
                    <div className="text-sm text-gray-600">Valid Scans</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">{duplicateScans}</div>
                    <div className="text-sm text-gray-600">Duplicates</div>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{invalidScans}</div>
                    <div className="text-sm text-gray-600">Invalid</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Scan Results */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Recent Scans</CardTitle>
                <CardDescription>
                  Real-time scan results and validation status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {scanResults.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Scan className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No scans yet</p>
                      <p className="text-sm">Start scanning QR codes to see results here</p>
                    </div>
                  ) : (
                    scanResults.map((result) => (
                      <div
                        key={result.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          {getStatusIcon(result.status)}
                          <div>
                            <p className="font-medium">{result.eventName}</p>
                            <p className="text-sm text-gray-600">
                              Ticket #{result.ticketNumber}
                            </p>
                            <p className="text-xs text-gray-500">{result.scanTime}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          {getStatusBadge(result.status)}
                          <p className="text-xs text-gray-600 mt-1">{result.message}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Scanner;

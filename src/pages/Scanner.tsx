import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Scan, CheckCircle, XCircle, Camera, Ticket, LogOut, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useQRScanner } from "@/hooks/useQRScanner";
import { useScanResults } from "@/hooks/useScanResults";

interface ScanResult {
  id: string;
  eventName: string;
  ticketNumber: number;
  scanTime: string;
  status: 'valid' | 'invalid' | 'duplicate';
  message: string;
}

const Scanner = () => {
  const { user, signOut } = useAuth();
  const { scanResults, addScanResult, isLoading, loadScanResults } = useScanResults();
  const [manualInput, setManualInput] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isInitializingCamera, setIsInitializingCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  const handleQRCodeDetected = useCallback(async (qrData: string) => {
    console.log('Processing QR code:', qrData);
    await processQRCode(qrData);
    
    // Auto-close camera after successful scan
    setTimeout(() => {
      stopCamera();
    }, 1500); // Give user time to see the success message
  }, []);

  const { startScanning, stopScanning } = useQRScanner({
    videoRef,
    canvasRef,
    onQRCodeDetected: handleQRCodeDetected,
    isActive: isScanning
  });

  // Refresh scan results periodically to sync with dashboard
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isLoading) {
        loadScanResults();
      }
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, [isLoading, loadScanResults]);

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

  const processQRCode = async (qrData: string) => {
    try {
      const ticketData = JSON.parse(qrData);
      
      // Check if this ticket was already scanned
      const existingScan = scanResults.find(
        result => result.eventName === ticketData.eventName && 
                 result.ticketNumber === ticketData.ticketNumber
      );

      const scanResultData = {
        eventName: ticketData.eventName || 'Unknown Event',
        ticketNumber: ticketData.ticketNumber || 0,
        status: existingScan ? 'duplicate' as const : 'valid' as const,
        message: existingScan 
          ? 'Ticket already scanned!' 
          : 'Valid ticket - Access granted'
      };

      await addScanResult(scanResultData);

      toast({
        title: scanResultData.status === 'valid' ? "✅ Valid Ticket" : "⚠️ Duplicate Ticket",
        description: scanResultData.message,
        variant: scanResultData.status === 'valid' ? "default" : "destructive"
      });

    } catch (error) {
      const scanResultData = {
        eventName: 'Invalid',
        ticketNumber: 0,
        status: 'invalid' as const,
        message: 'Invalid QR code format'
      };

      await addScanResult(scanResultData);

      toast({
        title: "❌ Invalid QR Code",
        description: "This QR code is not a valid ticket.",
        variant: "destructive"
      });
    }
  };

  const handleManualScan = async () => {
    if (!manualInput.trim()) {
      toast({
        title: "No Input",
        description: "Please enter QR code data or scan a code.",
        variant: "destructive"
      });
      return;
    }

    await processQRCode(manualInput);
    setManualInput("");
  };

  const startCamera = async () => {
    console.log('Starting camera initialization...');
    setIsInitializingCamera(true);
    
    try {
      // Wait a bit for React to render the video element
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (!videoRef.current) {
        console.log('Video element still not ready, waiting longer...');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (!videoRef.current) {
          throw new Error('Video element is not available after waiting. Please refresh the page and try again.');
        }
      }

      console.log('Video element found, requesting camera access...');
      
      let mediaStream: MediaStream | null = null;
      
      // Try different camera constraints for better device compatibility
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 }
          } 
        });
        console.log('Back camera access granted');
      } catch (backCameraError) {
        console.log('Back camera not available, trying any camera...');
        mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: {
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 }
          }
        });
        console.log('Camera access granted');
      }
      
      if (!mediaStream) {
        throw new Error('Could not obtain camera stream');
      }
      
      console.log('Camera stream obtained, setting up video element...');
      
      const video = videoRef.current;
      if (!video) {
        mediaStream.getTracks().forEach(track => track.stop());
        throw new Error('Video element became unavailable');
      }
      
      // Stop any existing stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      
      // Set up video element
      video.srcObject = mediaStream;
      video.autoPlay = true;
      video.playsInline = true;
      video.muted = true;
      
      // Wait for video to be ready
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Video load timeout'));
        }, 10000);
        
        const handleReady = () => {
          console.log('Video ready, dimensions:', video.videoWidth, 'x', video.videoHeight);
          clearTimeout(timeout);
          video.removeEventListener('loadedmetadata', handleReady);
          video.removeEventListener('canplay', handleReady);
          resolve();
        };
        
        video.addEventListener('loadedmetadata', handleReady);
        video.addEventListener('canplay', handleReady);
        
        if (video.readyState >= 2) {
          handleReady();
        }
      });

      await video.play();
      
      setStream(mediaStream);
      setIsScanning(true);
      startScanning();
      
      toast({
        title: "Camera Started",
        description: "Point your camera at a QR code to scan it."
      });

    } catch (error) {
      console.error('Camera access error:', error);
      
      let errorMessage = "Unable to access camera. Please check permissions.";
      
      if (error instanceof DOMException) {
        switch (error.name) {
          case 'NotAllowedError':
            errorMessage = "Camera access denied. Please allow camera permissions and refresh the page.";
            break;
          case 'NotFoundError':
            errorMessage = "No camera found on this device.";
            break;
          case 'NotReadableError':
            errorMessage = "Camera is already in use by another application.";
            break;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      toast({
        title: "Camera Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsInitializingCamera(false);
    }
  };

  const stopCamera = () => {
    console.log('Stopping camera...');
    
    stopScanning();
    
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
        console.log('Camera track stopped');
      });
      setStream(null);
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsScanning(false);

    toast({
      title: "Camera Stopped",
      description: "QR code scanning has been stopped."
    });
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
            <Link to="/dashboard">
              <Button variant="outline">Dashboard</Button>
            </Link>
            <Button variant="default">Scanner</Button>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-3xl font-bold text-gray-900">QR Code Scanner</h1>
          <p className="text-gray-600 mt-1">Scan tickets and validate attendance - Camera closes automatically after each scan</p>
        </div>
      </div>

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
                  Use camera to scan QR codes or enter manually. Camera closes automatically after each successful scan.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Camera Scanner */}
                <div className="space-y-4">
                  <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden relative border-2 border-gray-200">
                    {isScanning ? (
                      <>
                        <video
                          ref={videoRef}
                          className="w-full h-full object-cover"
                          autoPlay
                          playsInline
                          muted
                        />
                        <canvas
                          ref={canvasRef}
                          className="hidden"
                        />
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="w-64 h-64 border-2 border-white rounded-lg shadow-lg">
                            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-purple-500 rounded-tl-lg"></div>
                            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-purple-500 rounded-tr-lg"></div>
                            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-purple-500 rounded-bl-lg"></div>
                            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-purple-500 rounded-br-lg"></div>
                          </div>
                        </div>
                        <div className="absolute bottom-4 left-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
                          🎯 Scanning... Point at QR code
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          {isInitializingCamera ? (
                            <>
                              <Loader2 className="h-16 w-16 text-purple-600 mx-auto mb-4 animate-spin" />
                              <p className="text-gray-600">Initializing camera...</p>
                              <p className="text-sm text-gray-500 mt-2">This may take a few seconds</p>
                            </>
                          ) : (
                            <>
                              <Camera className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                              <p className="text-gray-600">Camera not active</p>
                              <p className="text-sm text-gray-500 mt-2">Auto-closes after each scan</p>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    {!isScanning ? (
                      <Button 
                        onClick={startCamera} 
                        className="flex-1"
                        disabled={isInitializingCamera}
                      >
                        {isInitializingCamera ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Starting...
                          </>
                        ) : (
                          <>
                            <Camera className="mr-2 h-4 w-4" />
                            Start Camera
                          </>
                        )}
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
                  Real-time scan results and validation status (synced with dashboard)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-purple-600" />
                    <p className="text-gray-600">Loading scan results...</p>
                  </div>
                ) : (
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
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Scanner;

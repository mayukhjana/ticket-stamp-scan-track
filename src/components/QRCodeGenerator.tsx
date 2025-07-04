
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, QrCode, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import QRCode from "qrcode";
import JSZip from "jszip";

interface Event {
  id: string;
  name: string;
  date: string;
  description: string;
  totalTickets: number;
  scannedTickets: number;
  qrCodes: string[];
}

interface QRCodeGeneratorProps {
  event: Event;
  onQRCodesGenerated: (qrCodes: string[]) => void;
}

const QRCodeGenerator = ({ event, onQRCodesGenerated }: QRCodeGeneratorProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [batchSize, setBatchSize] = useState(event.totalTickets.toString());
  const { toast } = useToast();

  // Generate a consistent seed based on event data
  const generateSeed = (eventId: string, ticketNumber: number): string => {
    // Create a consistent hash-like seed using event ID and ticket number
    const seedString = `${eventId}-ticket-${ticketNumber}`;
    let hash = 0;
    for (let i = 0; i < seedString.length; i++) {
      const char = seedString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  };

  const generateQRCodes = async () => {
    setIsGenerating(true);
    const count = parseInt(batchSize);
    
    try {
      const qrCodes: string[] = [];
      
      for (let i = 0; i < count; i++) {
        // Use consistent seed for each ticket to ensure same QR codes are generated
        const seed = generateSeed(event.id, i + 1);
        
        const ticketData = {
          eventId: event.id,
          eventName: event.name,
          ticketNumber: i + 1,
          eventDate: event.date, // Add event date for consistency
          seed: seed // Include seed for verification
        };
        
        const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(ticketData), {
          width: 200,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
        
        qrCodes.push(qrCodeDataURL);
      }

      onQRCodesGenerated(qrCodes);
      
      toast({
        title: "QR Codes Generated",
        description: `Successfully generated ${count} QR codes for ${event.name}.`
      });
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: "Failed to generate QR codes. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadQRCodes = async () => {
    if (event.qrCodes.length === 0) {
      toast({
        title: "No QR Codes",
        description: "Generate QR codes first before downloading.",
        variant: "destructive"
      });
      return;
    }

    try {
      const zip = new JSZip();
      
      // Add each QR code to the zip
      for (let i = 0; i < event.qrCodes.length; i++) {
        const qrCode = event.qrCodes[i];
        // Convert data URL to blob
        const response = await fetch(qrCode);
        const blob = await response.blob();
        zip.file(`${event.name}-ticket-${i + 1}.png`, blob);
      }

      // Generate zip file
      const zipBlob = await zip.generateAsync({ type: "blob" });
      
      // Download zip file
      const link = document.createElement('a');
      link.download = `${event.name}-qr-codes.zip`;
      link.href = URL.createObjectURL(zipBlob);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up object URL
      URL.revokeObjectURL(link.href);

      toast({
        title: "Download Started",
        description: `Downloading ${event.qrCodes.length} QR codes as a zip file.`
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to create zip file. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Bulk QR Code Generation
          </CardTitle>
          <CardDescription>
            Generate unique QR codes for your event tickets with embedded validation data. QR codes remain consistent for each event.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="batchSize">Number of QR Codes</Label>
              <Input
                id="batchSize"
                type="number"
                value={batchSize}
                onChange={(e) => setBatchSize(e.target.value)}
                min="1"
                max="10000"
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={generateQRCodes}
                disabled={isGenerating}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <QrCode className="mr-2 h-4 w-4" />
                    {event.qrCodes.length > 0 ? 'Regenerate QR Codes' : 'Generate QR Codes'}
                  </>
                )}
              </Button>
            </div>
          </div>

          {event.qrCodes.length > 0 && (
            <>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-800">
                  ✅ QR codes for this event are consistent and will remain the same when regenerated.
                </p>
              </div>
              
              <Button
                onClick={downloadQRCodes}
                variant="outline"
                className="w-full"
              >
                <Download className="mr-2 h-4 w-4" />
                Download All QR Codes ({event.qrCodes.length})
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {event.qrCodes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Generated QR Codes Preview</CardTitle>
            <CardDescription>
              Preview of the first few generated QR codes (consistent per event)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {event.qrCodes.slice(0, 12).map((qrCode, index) => (
                <div key={index} className="text-center">
                  <img
                    src={qrCode}
                    alt={`QR Code ${index + 1}`}
                    className="w-full border rounded-lg bg-white p-2"
                  />
                  <p className="text-xs text-gray-600 mt-2">Ticket {index + 1}</p>
                </div>
              ))}
              {event.qrCodes.length > 12 && (
                <div className="flex items-center justify-center text-center border rounded-lg bg-gray-50 p-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      +{event.qrCodes.length - 12} more
                    </p>
                    <p className="text-xs text-gray-500">QR codes</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default QRCodeGenerator;

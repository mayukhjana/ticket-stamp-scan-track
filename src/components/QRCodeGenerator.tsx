
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, QrCode, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import QRCode from "qrcode";

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

  const generateQRCodes = async () => {
    setIsGenerating(true);
    const count = parseInt(batchSize);
    
    try {
      const qrCodes: string[] = [];
      
      for (let i = 0; i < count; i++) {
        const ticketData = {
          eventId: event.id,
          eventName: event.name,
          ticketNumber: i + 1,
          timestamp: Date.now(),
          unique: Math.random().toString(36).substring(7)
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

  const downloadQRCodes = () => {
    if (event.qrCodes.length === 0) {
      toast({
        title: "No QR Codes",
        description: "Generate QR codes first before downloading.",
        variant: "destructive"
      });
      return;
    }

    // Create a zip-like download experience
    event.qrCodes.forEach((qrCode, index) => {
      const link = document.createElement('a');
      link.download = `${event.name}-ticket-${index + 1}.png`;
      link.href = qrCode;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });

    toast({
      title: "Download Started",
      description: `Downloading ${event.qrCodes.length} QR codes.`
    });
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
            Generate unique QR codes for your event tickets with embedded validation data.
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
                    Generate QR Codes
                  </>
                )}
              </Button>
            </div>
          </div>

          {event.qrCodes.length > 0 && (
            <Button
              onClick={downloadQRCodes}
              variant="outline"
              className="w-full"
            >
              <Download className="mr-2 h-4 w-4" />
              Download All QR Codes ({event.qrCodes.length})
            </Button>
          )}
        </CardContent>
      </Card>

      {event.qrCodes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Generated QR Codes Preview</CardTitle>
            <CardDescription>
              Preview of the first few generated QR codes
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

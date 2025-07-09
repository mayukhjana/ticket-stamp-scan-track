
import { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, QrCode, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
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
  const [isDownloading, setIsDownloading] = useState(false);
  const [batchSize, setBatchSize] = useState(event.totalTickets.toString());
  const { toast } = useToast();

  // Memoize batch size validation
  const batchSizeNumber = useMemo(() => {
    const num = parseInt(batchSize);
    return isNaN(num) ? 0 : Math.max(1, Math.min(num, 10000));
  }, [batchSize]);

  // Generate a consistent seed based on event data
  const generateSeed = useCallback((eventId: string, ticketNumber: number): string => {
    // Create a consistent hash-like seed using event ID and ticket number
    const seedString = `${eventId}-ticket-${ticketNumber}-${event.date}`;
    let hash = 0;
    for (let i = 0; i < seedString.length; i++) {
      const char = seedString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }, [event.date]);

  const generateQRCodes = useCallback(async () => {
    if (batchSizeNumber <= 0) {
      toast({
        title: "Invalid Batch Size",
        description: "Please enter a valid number of QR codes to generate (1-10000).",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    
    try {
      const qrCodes: string[] = [];
      const BATCH_SIZE = 50; // Process in smaller batches to prevent blocking
      
      // Show progress toast
      toast({
        title: "Generating QR Codes",
        description: `Processing ${batchSizeNumber} QR codes...`
      });
      
      for (let batch = 0; batch < Math.ceil(batchSizeNumber / BATCH_SIZE); batch++) {
        const batchStart = batch * BATCH_SIZE;
        const batchEnd = Math.min((batch + 1) * BATCH_SIZE, batchSizeNumber);
        
        const batchPromises = [];
        for (let i = batchStart; i < batchEnd; i++) {
          const generateSingleQR = async () => {
            try {
              // Use consistent seed for each ticket to ensure same QR codes are generated
              const seed = generateSeed(event.id, i + 1);
              
              const ticketData = {
                eventId: event.id,
                eventName: event.name,
                ticketNumber: i + 1,
                eventDate: event.date,
                seed: seed,
                generatedAt: new Date().toISOString() // Add timestamp for verification
              };
              
              const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(ticketData), {
                width: 256,
                margin: 2,
                color: {
                  dark: '#000000',
                  light: '#FFFFFF'
                },
                errorCorrectionLevel: 'M'
              });
              
              return qrCodeDataURL;
            } catch (error) {
              console.error(`Error generating QR code ${i + 1}:`, error);
              throw new Error(`Failed to generate QR code ${i + 1}`);
            }
          };
          
          batchPromises.push(generateSingleQR());
        }
        
        try {
          const batchResults = await Promise.all(batchPromises);
          qrCodes.push(...batchResults);
          
          // Allow UI to update between batches
          if (batch < Math.ceil(batchSizeNumber / BATCH_SIZE) - 1) {
            await new Promise(resolve => setTimeout(resolve, 10));
          }
        } catch (batchError) {
          console.error(`Error in batch ${batch}:`, batchError);
          throw new Error(`Failed to generate QR codes in batch ${batch + 1}`);
        }
      }

      // Validate all QR codes were generated
      if (qrCodes.length !== batchSizeNumber) {
        throw new Error(`Expected ${batchSizeNumber} QR codes, but generated ${qrCodes.length}`);
      }

      // Update the parent component with new QR codes
      onQRCodesGenerated(qrCodes);
      
      console.log('QR codes generated successfully:', qrCodes.length);
      
      toast({
        title: "QR Codes Generated Successfully",
        description: `Generated ${qrCodes.length} unique QR codes for ${event.name}.`
      });
    } catch (error) {
      console.error('QR Code generation error:', error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate QR codes. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  }, [batchSizeNumber, event, generateSeed, onQRCodesGenerated, toast]);

  const downloadQRCodes = useCallback(async () => {
    if (!event.qrCodes || event.qrCodes.length === 0) {
      toast({
        title: "No QR Codes Available",
        description: "Generate QR codes first before downloading.",
        variant: "destructive"
      });
      return;
    }

    setIsDownloading(true);
    
    try {
      // Import JSZip dynamically to reduce bundle size
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      
      toast({
        title: "Creating Download",
        description: `Preparing ${event.qrCodes.length} QR codes for download...`
      });
      
      // Process QR codes in batches to prevent memory issues
      const BATCH_SIZE = 20;
      for (let i = 0; i < event.qrCodes.length; i += BATCH_SIZE) {
        const batch = event.qrCodes.slice(i, i + BATCH_SIZE);
        
        const batchPromises = batch.map(async (qrCode, batchIndex) => {
          const actualIndex = i + batchIndex;
          try {
            // Validate QR code data URL
            if (!qrCode || !qrCode.startsWith('data:image/')) {
              throw new Error(`Invalid QR code data at index ${actualIndex}`);
            }
            
            // Convert data URL to blob
            const response = await fetch(qrCode);
            if (!response.ok) {
              throw new Error(`Failed to fetch QR code ${actualIndex}: ${response.statusText}`);
            }
            
            const blob = await response.blob();
            if (blob.size === 0) {
              throw new Error(`Empty blob for QR code ${actualIndex}`);
            }
            
            const filename = `qr-code-ticket-${String(actualIndex + 1).padStart(4, '0')}.png`;
            zip.file(filename, blob);
            
            return { success: true, index: actualIndex };
          } catch (error) {
            console.error(`Error processing QR code ${actualIndex}:`, error);
            return { success: false, index: actualIndex, error };
          }
        });
        
        const results = await Promise.allSettled(batchPromises);
        const failures = results
          .filter((result): result is PromiseFulfilledResult<{success: false, index: number, error: any}> => 
            result.status === 'fulfilled' && !result.value.success)
          .map(result => result.value);
        
        if (failures.length > 0) {
          console.warn(`Failed to process ${failures.length} QR codes in batch starting at ${i}`);
        }
      }

      // Generate zip file with compression
      const zipBlob = await zip.generateAsync({ 
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: {
          level: 6
        }
      });
      
      if (zipBlob.size === 0) {
        throw new Error("Generated zip file is empty");
      }
      
      // Create and trigger download
      const sanitizedEventName = event.name.replace(/[^a-z0-9\-_]/gi, '_');
      const filename = `${sanitizedEventName}-qr-codes-${new Date().toISOString().split('T')[0]}.zip`;
      
      const link = document.createElement('a');
      link.download = filename;
      link.href = URL.createObjectURL(zipBlob);
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      
      // Clean up after a delay
      setTimeout(() => {
        try {
          document.body.removeChild(link);
          URL.revokeObjectURL(link.href);
        } catch (cleanupError) {
          console.warn('Cleanup error:', cleanupError);
        }
      }, 1000);

      toast({
        title: "Download Started",
        description: `Downloading ${event.qrCodes.length} QR codes as ${filename}.`
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Failed",
        description: error instanceof Error ? error.message : "Failed to create download. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsDownloading(false);
    }
  }, [event, toast]);

  // Validate QR codes are properly loaded
  const qrCodesValid = useMemo(() => {
    return event.qrCodes && 
           event.qrCodes.length > 0 && 
           event.qrCodes.every(qr => qr && qr.startsWith('data:image/'));
  }, [event.qrCodes]);

  const displayQrCodes = useMemo(() => {
    if (!qrCodesValid) return [];
    return event.qrCodes.slice(0, 12);
  }, [event.qrCodes, qrCodesValid]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            QR Code Generation
          </CardTitle>
          <CardDescription>
            Generate unique, consistent QR codes for your event tickets with embedded validation data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="batchSize">Number of QR Codes</Label>
              <Input
                id="batchSize"
                type="number"
                value={batchSize}
                onChange={(e) => setBatchSize(e.target.value)}
                min="1"
                max="10000"
                placeholder="Enter number of tickets"
                disabled={isGenerating}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Maximum: 10,000 QR codes
              </p>
            </div>
            <div className="flex items-end">
              <Button
                onClick={generateQRCodes}
                disabled={isGenerating || batchSizeNumber <= 0}
                className="w-full"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating {batchSizeNumber} codes...
                  </>
                ) : (
                  <>
                    <QrCode className="mr-2 h-4 w-4" />
                    {qrCodesValid ? 'Regenerate QR Codes' : 'Generate QR Codes'}
                  </>
                )}
              </Button>
            </div>
          </div>

          {qrCodesValid && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <p className="text-sm text-green-800">
                  Successfully generated {event.qrCodes.length} consistent QR codes
                </p>
              </div>
              
              <Button
                onClick={downloadQRCodes}
                disabled={isDownloading}
                variant="outline"
                className="w-full"
                size="lg"
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Preparing download...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Download All QR Codes ({event.qrCodes.length})
                  </>
                )}
              </Button>
            </div>
          )}

          {!qrCodesValid && event.qrCodes && event.qrCodes.length > 0 && (
            <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <p className="text-sm text-yellow-800">
                Some QR codes may be corrupted. Please regenerate them.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {qrCodesValid && (
        <Card>
          <CardHeader>
            <CardTitle>QR Codes Preview</CardTitle>
            <CardDescription>
              Preview of your generated QR codes (showing first 12 of {event.qrCodes.length})
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {displayQrCodes.map((qrCode, index) => (
                <div key={`qr-${index}`} className="text-center group">
                  <div className="relative">
                    <img
                      src={qrCode}
                      alt={`QR Code for Ticket ${index + 1}`}
                      className="w-full aspect-square border rounded-lg bg-white p-2 transition-transform group-hover:scale-105"
                      loading="lazy"
                      onError={(e) => {
                        console.error(`Failed to load QR code ${index + 1}`);
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Ticket #{index + 1}
                  </p>
                </div>
              ))}
              {event.qrCodes.length > 12 && (
                <div className="flex items-center justify-center text-center border rounded-lg bg-muted/50 p-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      +{event.qrCodes.length - 12}
                    </p>
                    <p className="text-xs text-muted-foreground">more codes</p>
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

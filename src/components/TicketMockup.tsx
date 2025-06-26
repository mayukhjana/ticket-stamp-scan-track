
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Download, Image as ImageIcon } from "lucide-react";
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

interface TicketMockupProps {
  event: Event;
}

const TicketMockup = ({ event }: TicketMockupProps) => {
  const [uploadedTemplate, setUploadedTemplate] = useState<string | null>(null);
  const [qrPosition, setQrPosition] = useState({ x: 50, y: 50 });
  const [qrSize, setQrSize] = useState(80);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  const handleTemplateUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedTemplate(e.target?.result as string);
        toast({
          title: "Template Uploaded",
          description: "Your ticket template has been uploaded successfully."
        });
      };
      reader.readAsDataURL(file);
    } else {
      toast({
        title: "Invalid File",
        description: "Please upload a valid image file (PNG, JPG, etc.).",
        variant: "destructive"
      });
    }
  };

  const generateMockup = (qrCodeIndex: number = 0) => {
    if (!uploadedTemplate || event.qrCodes.length === 0) {
      toast({
        title: "Missing Requirements",
        description: "Please upload a template and generate QR codes first.",
        variant: "destructive"
      });
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const templateImg = new Image();
    const qrImg = new Image();

    templateImg.onload = () => {
      canvas.width = templateImg.width;
      canvas.height = templateImg.height;
      
      // Draw template
      ctx.drawImage(templateImg, 0, 0);
      
      qrImg.onload = () => {
        // Calculate QR code position and size
        const qrWidth = (qrSize / 100) * canvas.width;
        const qrHeight = qrWidth; // Keep it square
        const qrX = (qrPosition.x / 100) * (canvas.width - qrWidth);
        const qrY = (qrPosition.y / 100) * (canvas.height - qrHeight);
        
        // Draw QR code
        ctx.drawImage(qrImg, qrX, qrY, qrWidth, qrHeight);
        
        toast({
          title: "Mockup Generated",
          description: "Your ticket mockup has been generated successfully."
        });
      };
      
      qrImg.src = event.qrCodes[qrCodeIndex];
    };
    
    templateImg.src = uploadedTemplate;
  };

  const downloadMockup = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `${event.name}-ticket-mockup.png`;
    link.href = canvas.toDataURL();
    link.click();

    toast({
      title: "Download Started",
      description: "Your mockup is being downloaded."
    });
  };

  const generateAllMockups = () => {
    if (!uploadedTemplate || event.qrCodes.length === 0) {
      toast({
        title: "Missing Requirements",
        description: "Please upload a template and generate QR codes first.",
        variant: "destructive"
      });
      return;
    }

    // Generate mockups for all QR codes
    event.qrCodes.forEach((qrCode, index) => {
      setTimeout(() => {
        generateMockup(index);
        setTimeout(() => {
          const canvas = canvasRef.current;
          if (canvas) {
            const link = document.createElement('a');
            link.download = `${event.name}-ticket-${index + 1}.png`;
            link.href = canvas.toDataURL();
            link.click();
          }
        }, 100);
      }, index * 200);
    });

    toast({
      title: "Bulk Generation Started",
      description: `Generating ${event.qrCodes.length} ticket mockups...`
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Ticket Template Upload
          </CardTitle>
          <CardDescription>
            Upload your ticket design template and position QR codes automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="template">Upload Ticket Template</Label>
            <Input
              id="template"
              type="file"
              accept="image/*"
              onChange={handleTemplateUpload}
              ref={fileInputRef}
            />
          </div>

          {uploadedTemplate && (
            <div className="space-y-4">
              <h4 className="font-medium">QR Code Positioning</h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="qrX">Horizontal Position (%)</Label>
                  <Input
                    id="qrX"
                    type="range"
                    min="0"
                    max="100"
                    value={qrPosition.x}
                    onChange={(e) => setQrPosition({...qrPosition, x: parseInt(e.target.value)})}
                  />
                  <span className="text-sm text-gray-600">{qrPosition.x}%</span>
                </div>
                <div>
                  <Label htmlFor="qrY">Vertical Position (%)</Label>
                  <Input
                    id="qrY"
                    type="range"
                    min="0"
                    max="100"
                    value={qrPosition.y}
                    onChange={(e) => setQrPosition({...qrPosition, y: parseInt(e.target.value)})}
                  />
                  <span className="text-sm text-gray-600">{qrPosition.y}%</span>
                </div>
                <div>
                  <Label htmlFor="qrSize">QR Code Size (%)</Label>
                  <Input
                    id="qrSize"
                    type="range"
                    min="5"
                    max="50"
                    value={qrSize}
                    onChange={(e) => setQrSize(parseInt(e.target.value))}
                  />
                  <span className="text-sm text-gray-600">{qrSize}%</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={() => generateMockup(0)} disabled={event.qrCodes.length === 0}>
                  Generate Preview
                </Button>
                <Button onClick={downloadMockup} variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Download Preview
                </Button>
                <Button onClick={generateAllMockups} variant="outline" disabled={event.qrCodes.length === 0}>
                  <Download className="mr-2 h-4 w-4" />
                  Generate All ({event.qrCodes.length})
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {uploadedTemplate && (
        <Card>
          <CardHeader>
            <CardTitle>Mockup Preview</CardTitle>
            <CardDescription>
              Preview how your QR codes will look on the ticket template
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative inline-block bg-white p-4 border rounded-lg shadow-sm">
              <canvas ref={canvasRef} className="max-w-full h-auto border rounded" />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TicketMockup;


import { useState, useRef, useEffect } from "react";
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
  templateImage?: string;
  qrPositionX?: number;
  qrPositionY?: number;
  qrSize?: number;
}

interface TicketMockupProps {
  event: Event;
  onTemplateUpdate?: (updates: { templateImage?: string; qrPositionX?: number; qrPositionY?: number; qrSize?: number }) => void;
}

const TicketMockup = ({ event, onTemplateUpdate }: TicketMockupProps) => {
  const [uploadedTemplate, setUploadedTemplate] = useState<string | null>(event.templateImage || null);
  const [qrPosition, setQrPosition] = useState({ 
    x: event.qrPositionX || 50, 
    y: event.qrPositionY || 50 
  });
  const [qrSize, setQrSize] = useState(event.qrSize || 80);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  // Update local state when event props change
  useEffect(() => {
    setUploadedTemplate(event.templateImage || null);
    setQrPosition({ 
      x: event.qrPositionX || 50, 
      y: event.qrPositionY || 50 
    });
    setQrSize(event.qrSize || 80);
  }, [event]);

  const handleTemplateUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const templateData = e.target?.result as string;
        setUploadedTemplate(templateData);
        
        // Save template to database
        onTemplateUpdate?.({ 
          templateImage: templateData,
          qrPositionX: qrPosition.x,
          qrPositionY: qrPosition.y,
          qrSize: qrSize
        });
        
        toast({
          title: "Template Uploaded",
          description: "Your ticket template has been uploaded and saved successfully."
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

  const handlePositionChange = (axis: 'x' | 'y', value: number) => {
    const newPosition = { ...qrPosition, [axis]: value };
    setQrPosition(newPosition);
    
    // Save position changes to database
    onTemplateUpdate?.({ 
      qrPositionX: newPosition.x,
      qrPositionY: newPosition.y,
      qrSize: qrSize
    });
  };

  const handleSizeChange = (value: number) => {
    setQrSize(value);
    
    // Save size changes to database
    onTemplateUpdate?.({ 
      qrPositionX: qrPosition.x,
      qrPositionY: qrPosition.y,
      qrSize: value
    });
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

    // Clear any existing content
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const templateImg = new Image();
    const qrImg = new Image();

    templateImg.onload = () => {
      try {
        // Limit canvas size to prevent memory issues
        const maxSize = 2000;
        let { width, height } = templateImg;
        
        if (width > maxSize || height > maxSize) {
          const ratio = Math.min(maxSize / width, maxSize / height);
          width *= ratio;
          height *= ratio;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw template with error handling
        ctx.drawImage(templateImg, 0, 0, width, height);
        
        qrImg.onload = () => {
          try {
            // Calculate QR code position and size
            const qrWidth = (qrSize / 100) * canvas.width;
            const qrHeight = qrWidth; // Keep it square
            const qrX = (qrPosition.x / 100) * canvas.width - (qrWidth / 2);
            const qrY = (qrPosition.y / 100) * canvas.height - (qrHeight / 2);
            
            // Ensure QR code stays within canvas bounds
            const finalX = Math.max(0, Math.min(qrX, canvas.width - qrWidth));
            const finalY = Math.max(0, Math.min(qrY, canvas.height - qrHeight));
            
            // Draw QR code
            ctx.drawImage(qrImg, finalX, finalY, qrWidth, qrHeight);
            
            toast({
              title: "Mockup Generated",
              description: "Your ticket mockup has been generated successfully."
            });
          } catch (error) {
            console.error('Error drawing QR code:', error);
            toast({
              title: "Error",
              description: "Failed to draw QR code on template.",
              variant: "destructive"
            });
          }
        };
        
        qrImg.onerror = () => {
          toast({
            title: "QR Code Error",
            description: "Failed to load QR code image.",
            variant: "destructive"
          });
        };
        
        qrImg.src = event.qrCodes[qrCodeIndex];
      } catch (error) {
        console.error('Error drawing template:', error);
        toast({
          title: "Template Error",
          description: "Failed to draw template on canvas.",
          variant: "destructive"
        });
      }
    };
    
    templateImg.onerror = () => {
      toast({
        title: "Template Error",
        description: "Failed to load template image.",
        variant: "destructive"
      });
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

  const generateAllMockups = async () => {
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

    // Store original canvas state
    const originalWidth = canvas.width;
    const originalHeight = canvas.height;
    const originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    try {
      toast({
        title: "Generating Tickets",
        description: "Please wait while we generate all your tickets..."
      });

      // Import JSZip dynamically
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      
      const templateImg = new Image();
      
      // Wait for template to load with timeout
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Template load timeout')), 10000);
        templateImg.onload = () => {
          clearTimeout(timeout);
          resolve(null);
        };
        templateImg.onerror = () => {
          clearTimeout(timeout);
          reject(new Error('Failed to load template'));
        };
        templateImg.src = uploadedTemplate;
      });

      // Limit canvas size to prevent memory issues
      const maxSize = 2000;
      let { width, height } = templateImg;
      
      if (width > maxSize || height > maxSize) {
        const ratio = Math.min(maxSize / width, maxSize / height);
        width *= ratio;
        height *= ratio;
      }

      canvas.width = width;
      canvas.height = height;

      // Generate each mockup and add to zip
      for (let index = 0; index < event.qrCodes.length; index++) {
        const qrCode = event.qrCodes[index];
        
        try {
          // Clear canvas and draw template
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(templateImg, 0, 0, canvas.width, canvas.height);
          
          // Load and draw QR code with timeout
          const qrImg = new Image();
          await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error(`QR code ${index + 1} load timeout`)), 10000);
            qrImg.onload = () => {
              clearTimeout(timeout);
              resolve(null);
            };
            qrImg.onerror = () => {
              clearTimeout(timeout);
              reject(new Error(`Failed to load QR code ${index + 1}`));
            };
            qrImg.src = qrCode;
          });
          
          // Calculate QR code position and size
          const qrWidth = (qrSize / 100) * canvas.width;
          const qrHeight = qrWidth; // Keep it square
          const qrX = (qrPosition.x / 100) * canvas.width - (qrWidth / 2);
          const qrY = (qrPosition.y / 100) * canvas.height - (qrHeight / 2);
          
          // Ensure QR code stays within canvas bounds
          const finalX = Math.max(0, Math.min(qrX, canvas.width - qrWidth));
          const finalY = Math.max(0, Math.min(qrY, canvas.height - qrHeight));
          
          // Draw QR code
          ctx.drawImage(qrImg, finalX, finalY, qrWidth, qrHeight);
          
          // Convert canvas to blob and add to zip
          const dataURL = canvas.toDataURL('image/png', 0.9); // Added quality parameter
          const response = await fetch(dataURL);
          const blob = await response.blob();
          
          zip.file(`ticket-${String(index + 1).padStart(3, '0')}.png`, blob);
        } catch (error) {
          console.error(`Error generating ticket ${index + 1}:`, error);
          // Continue with other tickets even if one fails
        }
      }

      // Generate and download zip file
      const zipBlob = await zip.generateAsync({ 
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: {
          level: 6
        }
      });
      
      // Download zip file
      const link = document.createElement('a');
      link.download = `${event.name.replace(/[^a-z0-9]/gi, '_')}-tickets.zip`;
      link.href = URL.createObjectURL(zipBlob);
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      setTimeout(() => {
        try {
          document.body.removeChild(link);
          URL.revokeObjectURL(link.href);
        } catch (cleanupError) {
          console.warn('Cleanup error:', cleanupError);
        }
      }, 100);

      toast({
        title: "All Tickets Generated",
        description: `Successfully generated ${event.qrCodes.length} tickets with QR codes in a zip file.`
      });
    } catch (error) {
      console.error('Error generating tickets:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate tickets. Please try again.",
        variant: "destructive"
      });
    } finally {
      // Always restore original canvas state
      try {
        canvas.width = originalWidth;
        canvas.height = originalHeight;
        ctx.putImageData(originalImageData, 0, 0);
      } catch (restoreError) {
        console.warn('Canvas restore error:', restoreError);
        // If restore fails, just clear the canvas
        canvas.width = originalWidth;
        canvas.height = originalHeight;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
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
            Upload your ticket design template and position QR codes automatically. Template settings are saved automatically.
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
            {uploadedTemplate && (
              <p className="text-sm text-green-600 mt-2">✓ Template saved and ready to use</p>
            )}
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
                    onChange={(e) => handlePositionChange('x', parseInt(e.target.value))}
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
                    onChange={(e) => handlePositionChange('y', parseInt(e.target.value))}
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
                    onChange={(e) => handleSizeChange(parseInt(e.target.value))}
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

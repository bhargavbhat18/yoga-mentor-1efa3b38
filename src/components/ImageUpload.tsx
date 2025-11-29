import React, { useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, X, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { detectPoseFromImage, classifyPose, drawPoseLandmarks, type PoseClassification } from '@/utils/poseDetection';

const ImageUpload = () => {
  const [image, setImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<PoseClassification | null>(null);
  const [visibilityWarning, setVisibilityWarning] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file",
          description: "Please select an image file",
          variant: "destructive",
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setImage(e.target?.result as string);
        setResult(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeImage = async () => {
    if (!image || !imageRef.current) return;

    setIsAnalyzing(true);
    try {
      // Wait for image to load
      await new Promise((resolve) => {
        if (imageRef.current?.complete) {
          resolve(true);
        } else {
          imageRef.current!.onload = () => resolve(true);
        }
      });

      const poseResult = await detectPoseFromImage(imageRef.current);

      if (poseResult && canvasRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          // Set canvas size to match image
          canvas.width = imageRef.current.naturalWidth;
          canvas.height = imageRef.current.naturalHeight;

          // Clear canvas
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          // Draw landmarks
          drawPoseLandmarks(canvas, poseResult.landmarks, ctx);

          // Classify pose
          const classification = classifyPose(poseResult);
          
          // Check if it's a visibility warning or actual pose
          if (classification.pose === 'Show Full Body' || classification.pose === 'Move Back') {
            setVisibilityWarning(classification.feedback);
            setResult(null);
            toast({
              title: "Full body not visible",
              description: classification.feedback,
              variant: "destructive",
            });
          } else {
            setVisibilityWarning(null);
            setResult(classification);
            toast({
              title: "Analysis complete",
              description: `Detected: ${classification.pose}`,
            });
          }
        }
      } else {
        toast({
          title: "No pose detected",
          description: "Could not detect a person in the image. Try a clearer photo.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error analyzing image:', error);
      toast({
        title: "Analysis failed",
        description: "An error occurred while analyzing the image",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const clearImage = () => {
    setImage(null);
    setResult(null);
    setVisibilityWarning(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-success text-success-foreground';
    if (confidence >= 0.6) return 'bg-warning text-warning-foreground';
    return 'bg-destructive text-destructive-foreground';
  };

  return (
    <Card className="overflow-hidden bg-gradient-to-br from-card to-muted/50 shadow-[var(--shadow-card)]">
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Upload Image for Analysis</h3>
          {image && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearImage}
            >
              <X className="w-4 h-4 mr-2" />
              Clear
            </Button>
          )}
        </div>

        {!image ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="relative aspect-video rounded-lg border-2 border-dashed border-border hover:border-primary cursor-pointer transition-[var(--transition-smooth)] bg-muted/20 flex items-center justify-center group"
          >
            <div className="text-center space-y-2">
              <Upload className="w-12 h-12 mx-auto text-muted-foreground group-hover:text-primary transition-[var(--transition-smooth)]" />
              <p className="text-sm text-muted-foreground">Click to upload an image</p>
              <p className="text-xs text-muted-foreground">PNG, JPG up to 10MB</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        ) : (
          <div className="relative aspect-video rounded-lg overflow-hidden bg-muted/20">
            <img
              ref={imageRef}
              src={image}
              alt="Uploaded"
              className="absolute inset-0 w-full h-full object-contain"
            />
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full"
            />
            
            {visibilityWarning && (
              <div className="absolute bottom-4 left-4 right-4">
                <div className="bg-warning/95 backdrop-blur-md rounded-lg p-4 border border-warning shadow-lg">
                  <p className="text-sm font-medium text-warning-foreground text-center">
                    ⚠️ {visibilityWarning}
                  </p>
                </div>
              </div>
            )}
            
            {result && !visibilityWarning && (
              <div className="absolute bottom-4 left-4 right-4">
                <div className="bg-card/95 backdrop-blur-md rounded-lg p-4 border border-border shadow-lg">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-2 w-2 rounded-full bg-primary" />
                        <span className="text-xs font-medium text-primary uppercase tracking-wide">
                          Analysis Result
                        </span>
                      </div>
                      <h4 className="text-xl font-bold text-foreground mb-2">
                        {result.pose}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {result.feedback}
                      </p>
                    </div>
                    {result.confidence > 0 && (
                      <Badge className={getConfidenceColor(result.confidence)}>
                        {Math.round(result.confidence * 100)}%
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {image && !result && (
          <Button
            onClick={analyzeImage}
            disabled={isAnalyzing}
            className="w-full bg-gradient-to-r from-primary to-primary-glow hover:shadow-[var(--shadow-glow)] transition-[var(--transition-smooth)]"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Analyze Pose
              </>
            )}
          </Button>
        )}
      </div>
    </Card>
  );
};

export default ImageUpload;

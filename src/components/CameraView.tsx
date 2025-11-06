import React, { useRef, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Camera, CameraOff, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { detectPose, classifyPose, drawPoseLandmarks, initializePoseDetection, type PoseClassification } from '@/utils/poseDetection';

const CameraView = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [currentPose, setCurrentPose] = useState<PoseClassification | null>(null);
  const { toast } = useToast();
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [stream]);

  const startCamera = async () => {
    setIsLoading(true);
    try {
      // Initialize pose detection first
      await initializePoseDetection();
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          startPoseDetection();
        };
      }

      setStream(mediaStream);
      setIsActive(true);
      
      toast({
        title: "Camera started",
        description: "Position yourself in frame to detect your yoga pose",
      });
    } catch (error) {
      console.error('Error starting camera:', error);
      toast({
        title: "Camera error",
        description: "Could not access camera. Please check permissions.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setStream(null);
    setIsActive(false);
    setCurrentPose(null);
    
    toast({
      title: "Camera stopped",
      description: "Your session has ended",
    });
  };

  const startPoseDetection = () => {
    const detectFrame = async () => {
      if (!videoRef.current || !canvasRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      if (!ctx) return;

      // Set canvas size to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Detect pose
      const timestamp = performance.now();
      const poseResult = await detectPose(video, timestamp);

      if (poseResult) {
        // Draw landmarks
        drawPoseLandmarks(canvas, poseResult.landmarks, ctx);

        // Classify pose
        const classification = classifyPose(poseResult);
        setCurrentPose(classification);
      }

      // Continue detection
      animationFrameRef.current = requestAnimationFrame(detectFrame);
    };

    detectFrame();
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-success text-success-foreground';
    if (confidence >= 0.6) return 'bg-warning text-warning-foreground';
    return 'bg-destructive text-destructive-foreground';
  };

  return (
    <Card className="relative overflow-hidden bg-gradient-to-br from-card to-muted/50 shadow-[var(--shadow-card)]">
      <div className="relative aspect-video bg-muted/20">
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          playsInline
          muted
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
        />
        
        {!isActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/80 backdrop-blur-sm">
            <div className="text-center space-y-4">
              <Camera className="w-16 h-16 mx-auto text-muted-foreground" />
              <p className="text-muted-foreground">Camera is off</p>
            </div>
          </div>
        )}

        {currentPose && isActive && (
          <div className="absolute top-4 left-4 right-4 space-y-2">
            <div className="bg-card/90 backdrop-blur-md rounded-lg p-4 border border-border shadow-lg">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">{currentPose.pose}</h3>
                  <p className="text-sm text-muted-foreground">{currentPose.feedback}</p>
                </div>
                <Badge className={getConfidenceColor(currentPose.confidence)}>
                  {Math.round(currentPose.confidence * 100)}%
                </Badge>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-card border-t border-border">
        <div className="flex items-center justify-center gap-4">
          {!isActive ? (
            <Button
              onClick={startCamera}
              disabled={isLoading}
              className="bg-gradient-to-r from-primary to-primary-glow hover:shadow-[var(--shadow-glow)] transition-[var(--transition-smooth)]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Initializing...
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4 mr-2" />
                  Start Camera
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={stopCamera}
              variant="destructive"
            >
              <CameraOff className="w-4 h-4 mr-2" />
              Stop Camera
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};

export default CameraView;

import { PoseLandmarker, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision';

export interface PoseResult {
  landmarks: any[];
  worldLandmarks: any[];
  confidence: number;
}

export interface PoseClassification {
  pose: string;
  confidence: number;
  feedback: string;
}

export const YOGA_POSES = {
  MOUNTAIN: 'Mountain Pose (Tadasana)',
  WARRIOR_I: 'Warrior I (Virabhadrasana I)',
  WARRIOR_II: 'Warrior II (Virabhadrasana II)',
  TREE: 'Tree Pose (Vrksasana)',
  DOWNWARD_DOG: 'Downward Dog (Adho Mukha Svanasana)',
  PLANK: 'Plank Pose (Phalakasana)',
  CHILD: 'Child\'s Pose (Balasana)',
  COBRA: 'Cobra Pose (Bhujangasana)',
};

let poseLandmarker: PoseLandmarker | null = null;
let isInitialized = false;

export async function initializePoseDetection(): Promise<void> {
  if (isInitialized && poseLandmarker) return;

  try {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );
    
    poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/latest/pose_landmarker_heavy.task",
        delegate: "GPU"
      },
      runningMode: "VIDEO",
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5
    });
    
    isInitialized = true;
    console.log('Pose detection initialized successfully');
  } catch (error) {
    console.error('Error initializing pose detection:', error);
    throw error;
  }
}

export async function detectPose(
  videoElement: HTMLVideoElement,
  timestamp: number
): Promise<PoseResult | null> {
  if (!poseLandmarker) {
    await initializePoseDetection();
  }

  if (!poseLandmarker) return null;

  try {
    const result = poseLandmarker.detectForVideo(videoElement, timestamp);
    
    if (result.landmarks && result.landmarks.length > 0) {
      return {
        landmarks: result.landmarks[0],
        worldLandmarks: result.worldLandmarks?.[0] || [],
        confidence: 0.9 // MediaPipe doesn't provide overall confidence
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error detecting pose:', error);
    return null;
  }
}

export async function detectPoseFromImage(
  imageElement: HTMLImageElement
): Promise<PoseResult | null> {
  if (!poseLandmarker) {
    // Initialize for image mode
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );
    
    poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/latest/pose_landmarker_heavy.task",
        delegate: "GPU"
      },
      runningMode: "IMAGE",
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5
    });
  }

  try {
    const result = poseLandmarker.detect(imageElement);
    
    if (result.landmarks && result.landmarks.length > 0) {
      return {
        landmarks: result.landmarks[0],
        worldLandmarks: result.worldLandmarks?.[0] || [],
        confidence: 0.9
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error detecting pose from image:', error);
    return null;
  }
}

// Calculate angle between three points
function calculateAngle(a: any, b: any, c: any): number {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs(radians * 180.0 / Math.PI);
  if (angle > 180.0) {
    angle = 360 - angle;
  }
  return angle;
}

// Classify the detected pose
export function classifyPose(poseResult: PoseResult): PoseClassification {
  const landmarks = poseResult.landmarks;
  
  if (!landmarks || landmarks.length < 33) {
    return {
      pose: 'Unknown',
      confidence: 0,
      feedback: 'Unable to detect pose landmarks'
    };
  }

  // Key landmark indices (MediaPipe Pose)
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];
  const leftElbow = landmarks[13];
  const rightElbow = landmarks[14];
  const leftWrist = landmarks[15];
  const rightWrist = landmarks[16];
  const leftHip = landmarks[23];
  const rightHip = landmarks[24];
  const leftKnee = landmarks[25];
  const rightKnee = landmarks[26];
  const leftAnkle = landmarks[27];
  const rightAnkle = landmarks[28];

  // Calculate key angles
  const leftArmAngle = calculateAngle(leftShoulder, leftElbow, leftWrist);
  const rightArmAngle = calculateAngle(rightShoulder, rightElbow, rightWrist);
  const leftLegAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
  const rightLegAngle = calculateAngle(rightHip, rightKnee, rightAnkle);
  const hipAngle = Math.abs(leftHip.y - rightHip.y);

  // Simple pose classification logic
  // Plank: Arms extended, body straight
  if (leftArmAngle > 160 && rightArmAngle > 160 && leftLegAngle > 160 && rightLegAngle > 160) {
    return {
      pose: YOGA_POSES.PLANK,
      confidence: 0.85,
      feedback: 'Keep your core engaged and body in a straight line'
    };
  }

  // Downward Dog: Arms and legs extended, hips up
  if (leftArmAngle > 150 && rightArmAngle > 150 && leftLegAngle > 140 && rightLegAngle > 140 && leftHip.y < leftShoulder.y) {
    return {
      pose: YOGA_POSES.DOWNWARD_DOG,
      confidence: 0.82,
      feedback: 'Press your heels toward the ground and relax your neck'
    };
  }

  // Warrior II: One arm extended, legs wide, torso upright
  if ((leftArmAngle > 160 || rightArmAngle > 160) && Math.abs(leftLegAngle - rightLegAngle) > 30) {
    return {
      pose: YOGA_POSES.WARRIOR_II,
      confidence: 0.80,
      feedback: 'Keep your front knee over your ankle and arms parallel to the ground'
    };
  }

  // Tree Pose: Standing on one leg, other leg bent
  if (Math.abs(leftLegAngle - rightLegAngle) > 60) {
    return {
      pose: YOGA_POSES.TREE,
      confidence: 0.78,
      feedback: 'Find your balance and press your foot into your thigh'
    };
  }

  // Mountain Pose: Standing straight, arms at sides or overhead
  if (leftLegAngle > 160 && rightLegAngle > 160 && hipAngle < 0.05) {
    return {
      pose: YOGA_POSES.MOUNTAIN,
      confidence: 0.85,
      feedback: 'Stand tall with your weight evenly distributed'
    };
  }

  // Child's Pose: Curled forward, knees bent
  if (leftLegAngle < 90 && rightLegAngle < 90 && leftHip.y > leftShoulder.y) {
    return {
      pose: YOGA_POSES.CHILD,
      confidence: 0.80,
      feedback: 'Rest your forehead on the ground and breathe deeply'
    };
  }

  return {
    pose: 'Unknown Pose',
    confidence: 0.60,
    feedback: 'Adjust your position or try a different pose from the library'
  };
}

export function drawPoseLandmarks(
  canvas: HTMLCanvasElement,
  landmarks: any[],
  canvasCtx: CanvasRenderingContext2D
): void {
  if (!landmarks || landmarks.length === 0) return;

  const drawingUtils = new DrawingUtils(canvasCtx);
  
  // Draw connections
  const connections = PoseLandmarker.POSE_CONNECTIONS;
  drawingUtils.drawConnectors(landmarks, connections, {
    color: 'rgba(0, 255, 255, 0.5)',
    lineWidth: 4
  });
  
  // Draw landmarks
  drawingUtils.drawLandmarks(landmarks, {
    color: 'rgba(255, 0, 255, 0.8)',
    fillColor: 'rgba(255, 255, 255, 0.8)',
    radius: 4
  });
}

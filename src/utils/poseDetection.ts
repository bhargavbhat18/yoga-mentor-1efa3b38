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

// Calculate distance between two points
function calculateDistance(a: any, b: any): number {
  return Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2));
}

// Calculate body alignment (returns 0-1, where 1 is perfectly aligned)
function calculateAlignment(point1: any, point2: any, point3: any): number {
  const angle1 = Math.atan2(point2.y - point1.y, point2.x - point1.x);
  const angle2 = Math.atan2(point3.y - point2.y, point3.x - point2.x);
  const angleDiff = Math.abs(angle1 - angle2);
  return 1 - Math.min(angleDiff / Math.PI, 1);
}

// Check if body is vertical (for standing poses)
function isBodyVertical(shoulder: any, hip: any, ankle: any): boolean {
  const bodyAngle = Math.abs(Math.atan2(hip.y - shoulder.y, hip.x - shoulder.x) * 180 / Math.PI);
  return bodyAngle > 80 && bodyAngle < 100;
}

// Calculate pose confidence based on multiple criteria
function calculatePoseConfidence(criteriaMet: boolean[], weights?: number[]): number {
  if (!weights) weights = Array(criteriaMet.length).fill(1);
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  const metWeight = criteriaMet.reduce((sum, met, i) => sum + (met ? weights![i] : 0), 0);
  return metWeight / totalWeight;
}

// Classify the detected pose
export function classifyPose(poseResult: PoseResult): PoseClassification {
  const landmarks = poseResult.landmarks;
  
  if (!landmarks || landmarks.length < 33) {
    return {
      pose: 'Position Your Body',
      confidence: 0,
      feedback: 'Unable to detect pose landmarks'
    };
  }

  // Key landmark indices (MediaPipe Pose)
  const nose = landmarks[0];
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

  // Check landmark visibility - require key body parts to be visible
  const requiredLandmarks = [
    leftShoulder, rightShoulder, 
    leftHip, rightHip, 
    leftKnee, rightKnee, 
    leftAnkle, rightAnkle
  ];

  // Check if all required landmarks have sufficient visibility
  const visibilityThreshold = 0.5;
  const allVisible = requiredLandmarks.every(landmark => 
    landmark && landmark.visibility !== undefined && landmark.visibility > visibilityThreshold
  );

  if (!allVisible) {
    return {
      pose: 'Show Full Body',
      confidence: 0,
      feedback: 'Please step back to show your full body from head to feet in the frame'
    };
  }

  // Additional check: ensure body is within reasonable bounds
  const bodyHeight = Math.abs(
    Math.max(leftShoulder.y, rightShoulder.y) - 
    Math.max(leftAnkle.y, rightAnkle.y)
  );
  
  if (bodyHeight < 0.4) {
    return {
      pose: 'Move Back',
      confidence: 0,
      feedback: 'Step back from the camera to fit your entire body in the frame'
    };
  }

  // Calculate comprehensive angles
  const leftArmAngle = calculateAngle(leftShoulder, leftElbow, leftWrist);
  const rightArmAngle = calculateAngle(rightShoulder, rightElbow, rightWrist);
  const leftLegAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
  const rightLegAngle = calculateAngle(rightHip, rightKnee, rightAnkle);
  const leftShoulderAngle = calculateAngle(leftElbow, leftShoulder, leftHip);
  const rightShoulderAngle = calculateAngle(rightElbow, rightShoulder, rightHip);
  const leftHipAngle = calculateAngle(leftShoulder, leftHip, leftKnee);
  const rightHipAngle = calculateAngle(rightShoulder, rightHip, rightKnee);
  
  // Body alignment calculations
  const shoulderAlignment = calculateAlignment(leftShoulder, { x: (leftShoulder.x + rightShoulder.x) / 2, y: (leftShoulder.y + rightShoulder.y) / 2 }, rightShoulder);
  const hipWidth = calculateDistance(leftHip, rightHip);
  const shoulderWidth = calculateDistance(leftShoulder, rightShoulder);
  const bodyAlignment = calculateAlignment(leftShoulder, leftHip, leftAnkle);
  
  // Torso and spine calculations
  const torsoAngle = Math.atan2(
    (leftHip.y + rightHip.y) / 2 - (leftShoulder.y + rightShoulder.y) / 2,
    (leftHip.x + rightHip.x) / 2 - (leftShoulder.x + rightShoulder.x) / 2
  ) * 180 / Math.PI;

  // Enhanced pose classification with validation rules
  
  // PLANK POSE: Arms extended, body straight, core engaged
  const plankCriteria = [
    leftArmAngle > 160 && rightArmAngle > 160, // Arms straight
    leftLegAngle > 160 && rightLegAngle > 160, // Legs straight
    bodyAlignment > 0.7, // Body alignment
    Math.abs(leftShoulder.y - leftHip.y) < 0.15, // Shoulders and hips level
    leftShoulderAngle > 70 && leftShoulderAngle < 110 // Proper shoulder angle
  ];
  if (plankCriteria.filter(c => c).length >= 4) {
    const confidence = calculatePoseConfidence(plankCriteria, [1, 1, 1.5, 1, 0.8]);
    const feedback = !plankCriteria[2] ? 'Keep your body in a straight line from head to heels' :
                     !plankCriteria[3] ? 'Lower your hips to align with shoulders' :
                     'Great! Keep your core engaged and breathe steadily';
    return { pose: YOGA_POSES.PLANK, confidence, feedback };
  }

  // DOWNWARD DOG: Inverted V-shape, arms and legs extended
  const downwardDogCriteria = [
    leftArmAngle > 150 && rightArmAngle > 150, // Arms extended
    leftLegAngle > 140 && rightLegAngle > 140, // Legs extended
    leftHip.y < leftShoulder.y - 0.1, // Hips elevated above shoulders
    leftHipAngle > 100 && leftHipAngle < 140, // Hip angle for V-shape
    Math.abs(torsoAngle) > 30 && Math.abs(torsoAngle) < 70 // Proper torso angle
  ];
  if (downwardDogCriteria.filter(c => c).length >= 4) {
    const confidence = calculatePoseConfidence(downwardDogCriteria, [1, 1, 1.5, 1.2, 1]);
    const feedback = !downwardDogCriteria[2] ? 'Lift your hips higher to form an inverted V' :
                     !downwardDogCriteria[1] ? 'Straighten your legs more' :
                     'Excellent! Press heels toward ground and relax your neck';
    return { pose: YOGA_POSES.DOWNWARD_DOG, confidence, feedback };
  }

  // WARRIOR II: Arms extended horizontally, front knee bent, back leg straight
  const warrior2Criteria = [
    (leftArmAngle > 160 || rightArmAngle > 160), // One or both arms extended
    Math.abs(leftLegAngle - rightLegAngle) > 40, // Significant leg angle difference
    isBodyVertical(leftShoulder, leftHip, leftAnkle) || isBodyVertical(rightShoulder, rightHip, rightAnkle), // Torso upright
    Math.abs(leftShoulder.y - rightShoulder.y) < 0.08, // Shoulders level
    hipWidth > shoulderWidth * 1.3 // Wide stance
  ];
  if (warrior2Criteria.filter(c => c).length >= 4) {
    const confidence = calculatePoseConfidence(warrior2Criteria, [1, 1.5, 1.2, 0.8, 1]);
    const feedback = !warrior2Criteria[2] ? 'Keep your torso upright and centered' :
                     !warrior2Criteria[1] ? 'Bend your front knee more, keep back leg straight' :
                     'Perfect! Arms parallel to ground, front knee over ankle';
    return { pose: YOGA_POSES.WARRIOR_II, confidence, feedback };
  }

  // WARRIOR I: Arms overhead, front knee bent, back leg straight, chest facing forward
  const warrior1Criteria = [
    leftWrist.y < leftShoulder.y - 0.15 || rightWrist.y < rightShoulder.y - 0.15, // Arms raised overhead
    Math.abs(leftLegAngle - rightLegAngle) > 40, // Leg angle difference
    isBodyVertical(leftShoulder, leftHip, leftAnkle) || isBodyVertical(rightShoulder, rightHip, rightAnkle), // Torso upright
    hipWidth > shoulderWidth * 1.2 // Moderate stance width
  ];
  if (warrior1Criteria.filter(c => c).length >= 3) {
    const confidence = calculatePoseConfidence(warrior1Criteria, [1.2, 1.5, 1.2, 1]);
    const feedback = !warrior1Criteria[0] ? 'Raise your arms higher overhead' :
                     !warrior1Criteria[2] ? 'Keep your chest lifted and facing forward' :
                     'Great! Reach up through your fingertips, ground through back foot';
    return { pose: YOGA_POSES.WARRIOR_I, confidence, feedback };
  }

  // TREE POSE: Standing on one leg, other foot against thigh
  const treeCriteria = [
    Math.abs(leftLegAngle - rightLegAngle) > 70, // Large leg angle difference
    (leftLegAngle > 160 || rightLegAngle > 160), // One leg straight
    (leftLegAngle < 100 || rightLegAngle < 100), // Other leg bent
    Math.abs(leftShoulder.x - rightShoulder.x) < 0.1, // Shoulders balanced
    isBodyVertical(leftShoulder, leftHip, leftAnkle) || isBodyVertical(rightShoulder, rightHip, rightAnkle) // Upright
  ];
  if (treeCriteria.filter(c => c).length >= 4) {
    const confidence = calculatePoseConfidence(treeCriteria, [1.5, 1, 1, 1, 1.2]);
    const feedback = !treeCriteria[4] ? 'Find your center and stand tall' :
                     !treeCriteria[2] ? 'Bring your foot higher on your thigh' :
                     'Wonderful balance! Focus on a fixed point to maintain stability';
    return { pose: YOGA_POSES.TREE, confidence, feedback };
  }

  // MOUNTAIN POSE: Standing straight, arms at sides or overhead, body aligned
  const mountainCriteria = [
    leftLegAngle > 160 && rightLegAngle > 160, // Both legs straight
    Math.abs(leftHip.y - rightHip.y) < 0.05, // Hips level
    isBodyVertical(leftShoulder, leftHip, leftAnkle), // Body vertical
    Math.abs(leftShoulder.x - rightShoulder.x) < 0.1, // Shoulders centered
    shoulderAlignment > 0.8 // Shoulders aligned
  ];
  if (mountainCriteria.filter(c => c).length >= 4) {
    const confidence = calculatePoseConfidence(mountainCriteria, [1, 1, 1.5, 1, 1]);
    const feedback = !mountainCriteria[2] ? 'Stand taller with weight evenly distributed' :
                     !mountainCriteria[1] ? 'Level your hips and engage your core' :
                     'Perfect alignment! Breathe deeply and maintain this foundation';
    return { pose: YOGA_POSES.MOUNTAIN, confidence, feedback };
  }

  // CHILD'S POSE: Curled forward, knees bent, forehead near ground
  const childCriteria = [
    leftLegAngle < 90 && rightLegAngle < 90, // Knees bent
    leftHip.y > leftShoulder.y + 0.1, // Hips higher than shoulders
    nose.y > leftHip.y - 0.05, // Head lowered
    leftShoulderAngle < 100 && rightShoulderAngle < 100, // Arms forward/relaxed
    Math.abs(leftKnee.y - rightKnee.y) < 0.1 // Knees level
  ];
  if (childCriteria.filter(c => c).length >= 4) {
    const confidence = calculatePoseConfidence(childCriteria, [1, 1, 1.2, 0.8, 0.8]);
    const feedback = !childCriteria[2] ? 'Lower your forehead closer to the ground' :
                     !childCriteria[0] ? 'Sit back deeper on your heels' :
                     'Relax completely. Let your forehead rest and breathe deeply';
    return { pose: YOGA_POSES.CHILD, confidence, feedback };
  }

  // COBRA POSE: Lying face down, arms pushing chest up, legs extended
  const cobraCriteria = [
    leftArmAngle > 100 && leftArmAngle < 170 && rightArmAngle > 100 && rightArmAngle < 170, // Arms partially extended
    leftShoulder.y < leftHip.y - 0.1, // Chest lifted above hips
    leftLegAngle > 150 && rightLegAngle > 150, // Legs straight
    leftShoulderAngle > 120 && rightShoulderAngle > 120, // Shoulders back
    Math.abs(torsoAngle + 90) < 40 // Back arched upward
  ];
  if (cobraCriteria.filter(c => c).length >= 3) {
    const confidence = calculatePoseConfidence(cobraCriteria, [1.2, 1.5, 1, 1, 1.2]);
    const feedback = !cobraCriteria[1] ? 'Lift your chest higher, press through your palms' :
                     !cobraCriteria[3] ? 'Draw shoulders back and down, away from ears' :
                     'Beautiful! Keep legs engaged and gaze forward and up';
    return { pose: YOGA_POSES.COBRA, confidence, feedback };
  }

  return {
    pose: 'Unknown Pose',
    confidence: 0.50,
    feedback: 'Position yourself clearly or try a pose from the library'
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

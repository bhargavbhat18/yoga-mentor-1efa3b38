import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { YOGA_POSES } from '@/utils/poseDetection';

interface PoseInfo {
  name: string;
  sanskrit: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  benefits: string[];
  instructions: string[];
}

const POSE_DETAILS: PoseInfo[] = [
  {
    name: 'Mountain Pose',
    sanskrit: 'Tadasana',
    difficulty: 'Beginner',
    benefits: ['Improves posture', 'Strengthens thighs', 'Increases awareness'],
    instructions: [
      'Stand with feet together',
      'Distribute weight evenly',
      'Engage your thighs',
      'Relax your shoulders',
      'Breathe deeply'
    ]
  },
  {
    name: 'Warrior I',
    sanskrit: 'Virabhadrasana I',
    difficulty: 'Beginner',
    benefits: ['Strengthens legs', 'Opens hips and chest', 'Improves focus'],
    instructions: [
      'Step one foot back',
      'Bend front knee to 90°',
      'Raise arms overhead',
      'Square your hips forward',
      'Gaze upward'
    ]
  },
  {
    name: 'Warrior II',
    sanskrit: 'Virabhadrasana II',
    difficulty: 'Beginner',
    benefits: ['Strengthens legs and arms', 'Opens hips', 'Improves stamina'],
    instructions: [
      'Step feet wide apart',
      'Turn front foot out',
      'Bend front knee',
      'Extend arms parallel',
      'Gaze over front hand'
    ]
  },
  {
    name: 'Tree Pose',
    sanskrit: 'Vrksasana',
    difficulty: 'Intermediate',
    benefits: ['Improves balance', 'Strengthens legs', 'Increases focus'],
    instructions: [
      'Stand on one leg',
      'Place foot on inner thigh',
      'Bring hands to prayer',
      'Find your balance',
      'Hold and breathe'
    ]
  },
  {
    name: 'Downward Dog',
    sanskrit: 'Adho Mukha Svanasana',
    difficulty: 'Beginner',
    benefits: ['Stretches hamstrings', 'Strengthens arms', 'Energizes body'],
    instructions: [
      'Start on hands and knees',
      'Lift hips up and back',
      'Straighten legs',
      'Press heels down',
      'Relax your neck'
    ]
  },
  {
    name: 'Plank Pose',
    sanskrit: 'Phalakasana',
    difficulty: 'Beginner',
    benefits: ['Strengthens core', 'Tones arms', 'Improves posture'],
    instructions: [
      'Start in push-up position',
      'Align shoulders over wrists',
      'Engage your core',
      'Keep body straight',
      'Hold and breathe'
    ]
  },
  {
    name: "Child's Pose",
    sanskrit: 'Balasana',
    difficulty: 'Beginner',
    benefits: ['Relaxes body', 'Stretches back', 'Calms the mind'],
    instructions: [
      'Kneel on the floor',
      'Sit back on heels',
      'Fold forward',
      'Rest forehead down',
      'Breathe deeply'
    ]
  },
  {
    name: 'Cobra Pose',
    sanskrit: 'Bhujangasana',
    difficulty: 'Beginner',
    benefits: ['Strengthens spine', 'Opens chest', 'Reduces stress'],
    instructions: [
      'Lie face down',
      'Place hands under shoulders',
      'Press up gently',
      'Lift chest',
      'Look slightly up'
    ]
  },
];

const PoseLibrary = () => {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner':
        return 'bg-success text-success-foreground';
      case 'Intermediate':
        return 'bg-warning text-warning-foreground';
      case 'Advanced':
        return 'bg-destructive text-destructive-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          Pose Library
        </h2>
        <Badge variant="secondary">{POSE_DETAILS.length} Poses</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {POSE_DETAILS.map((pose, index) => (
          <Card
            key={index}
            className="overflow-hidden bg-gradient-to-br from-card to-muted/50 hover:shadow-[var(--shadow-card)] transition-[var(--transition-smooth)] border-border"
          >
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">{pose.name}</h3>
                    <p className="text-sm text-muted-foreground italic">{pose.sanskrit}</p>
                  </div>
                  <Badge className={getDifficultyColor(pose.difficulty)}>
                    {pose.difficulty}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium">Benefits:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {pose.benefits.map((benefit, i) => (
                    <li key={i} className="flex items-start">
                      <span className="text-primary mr-2">•</span>
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium">Instructions:</h4>
                <ol className="text-sm text-muted-foreground space-y-1">
                  {pose.instructions.map((instruction, i) => (
                    <li key={i} className="flex items-start">
                      <span className="text-secondary mr-2 font-medium">{i + 1}.</span>
                      {instruction}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default PoseLibrary;

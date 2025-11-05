import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Video, Image as ImageIcon, BookOpen, Sparkles } from 'lucide-react';
import CameraView from '@/components/CameraView';
import ImageUpload from '@/components/ImageUpload';
import PoseLibrary from '@/components/PoseLibrary';
import heroImage from '@/assets/yoga-hero.jpg';

const Index = () => {
  const [activeTab, setActiveTab] = useState('camera');

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      {/* Hero Section */}
      <header className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-secondary/10" />
        <div className="absolute inset-0 opacity-20">
          <img 
            src={heroImage} 
            alt="Yoga Hero" 
            className="w-full h-full object-cover"
          />
        </div>
        <div className="relative container mx-auto px-4 py-16 md:py-24">
          <div className="max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">AI-Powered Yoga Assistant</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent leading-tight">
              Perfect Your Practice with AI
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl">
              Real-time pose detection and classification using advanced computer vision. 
              Get instant feedback on your form and track your progress.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button
                size="lg"
                onClick={() => setActiveTab('camera')}
                className="bg-gradient-to-r from-primary to-primary-glow hover:shadow-[var(--shadow-glow)] transition-[var(--transition-smooth)]"
              >
                <Video className="w-5 h-5 mr-2" />
                Start Live Detection
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => setActiveTab('library')}
                className="border-2"
              >
                <BookOpen className="w-5 h-5 mr-2" />
                Browse Poses
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="grid w-full max-w-2xl mx-auto grid-cols-3 bg-muted/50 p-1">
            <TabsTrigger 
              value="camera" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary-glow data-[state=active]:text-primary-foreground"
            >
              <Video className="w-4 h-4 mr-2" />
              Live Detection
            </TabsTrigger>
            <TabsTrigger 
              value="upload"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary-glow data-[state=active]:text-primary-foreground"
            >
              <ImageIcon className="w-4 h-4 mr-2" />
              Image Upload
            </TabsTrigger>
            <TabsTrigger 
              value="library"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary-glow data-[state=active]:text-primary-foreground"
            >
              <BookOpen className="w-4 h-4 mr-2" />
              Pose Library
            </TabsTrigger>
          </TabsList>

          <TabsContent value="camera" className="space-y-6">
            <div className="max-w-4xl mx-auto">
              <div className="mb-6 text-center">
                <h2 className="text-2xl font-bold mb-2">Real-Time Pose Detection</h2>
                <p className="text-muted-foreground">
                  Turn on your camera and position yourself in frame. Our AI will detect your pose in real-time.
                </p>
              </div>
              <CameraView />
            </div>
          </TabsContent>

          <TabsContent value="upload" className="space-y-6">
            <div className="max-w-4xl mx-auto">
              <div className="mb-6 text-center">
                <h2 className="text-2xl font-bold mb-2">Offline Image Analysis</h2>
                <p className="text-muted-foreground">
                  Upload a photo of your yoga pose to get instant AI-powered analysis and feedback.
                </p>
              </div>
              <ImageUpload />
            </div>
          </TabsContent>

          <TabsContent value="library">
            <PoseLibrary />
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-muted-foreground">
            <p className="text-sm">
              Powered by MediaPipe Pose Detection • AI-Enhanced Yoga Practice
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;

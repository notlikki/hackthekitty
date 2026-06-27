import { useEffect, useState, useRef } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

export interface UseLiveCatDetectorResult {
  isModelLoading: boolean;
  catDetected: boolean;
  confidence: number | null;
}

export function useLiveCatDetector(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  active: boolean
): UseLiveCatDetectorResult {
  const [isModelLoading, setIsModelLoading] = useState<boolean>(true);
  const [catDetected, setCatDetected] = useState<boolean>(false);
  const [confidence, setConfidence] = useState<number | null>(null);

  const modelRef = useRef<cocoSsd.ObjectDetection | null>(null);
  const intervalRef = useRef<number | null>(null);

  // Load model once on mount
  useEffect(() => {
    let activeLoad = true;

    async function loadModel() {
      try {
        await tf.ready();
        const loadedModel = await cocoSsd.load();
        if (activeLoad) {
          modelRef.current = loadedModel;
          setIsModelLoading(false);
        }
      } catch (err) {
        console.error('Failed to load COCO-SSD cat detector model:', err);
      }
    }

    loadModel();

    return () => {
      activeLoad = false;
      if (modelRef.current) {
        modelRef.current = null;
      }
      try {
        tf.disposeVariables();
      } catch (e) {
        // Ignore tfjs disposal errors if it's already cleared or failed
      }
    };
  }, []);

  // Run detection loop
  useEffect(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!active || isModelLoading || !modelRef.current) {
      setCatDetected(false);
      setConfidence(null);
      return;
    }

    const detect = async () => {
      const video = videoRef.current;
      const model = modelRef.current;

      if (!video || !model) return;

      // Check if video is playing and has frames ready
      if (video.readyState === 4 && !video.paused) {
        try {
          const predictions = await model.detect(video);

          // Filter for cat class with score threshold 0.5
          const catPredictions = predictions.filter(
            (p) => p.class === 'cat' && p.score >= 0.5
          );

          if (catPredictions.length > 0) {
            const highestScore = Math.max(...catPredictions.map((c) => c.score));
            setCatDetected(true);
            setConfidence(highestScore);
          } else {
            setCatDetected(false);
            setConfidence(null);
          }
        } catch (err) {
          console.error('Error running live object detection:', err);
        }
      }
    };

    // Poll every 500ms for lightweight local CPU/GPU consumption
    intervalRef.current = window.setInterval(detect, 500);

    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [active, isModelLoading]);

  return { isModelLoading, catDetected, confidence };
}

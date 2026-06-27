import { useEffect, useState, useRef } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

export type LiveDetectionStatus =
  | 'no_detection'      // nothing recognized in frame
  | 'cat_detected'      // a real cat-shaped object is in frame
  | 'human_detected'    // a person is in frame, no cat
  | 'screen_detected'    // a cell phone/TV is in frame (likely someone holding up a screen)
  | 'laptop_detected'    // a laptop is in frame (same concern as above, different device)
  | 'multiple_detected'; // both a cat AND a person/device are in frame together

export interface UseLiveCatDetectorResult {
  isModelLoading: boolean;
  status: LiveDetectionStatus;
  confidence: number | null; // confidence of the PRIMARY detected class driving the status
  detectedClasses: string[]; // raw list of all classes detected this tick
}

export function useLiveCatDetector(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  active: boolean
): UseLiveCatDetectorResult {
  const [isModelLoading, setIsModelLoading] = useState<boolean>(true);
  const [status, setStatus] = useState<LiveDetectionStatus>('no_detection');
  const [confidence, setConfidence] = useState<number | null>(null);
  const [detectedClasses, setDetectedClasses] = useState<string[]>([]);

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
        // Ignore tfjs disposal errors
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
      setStatus('no_detection');
      setConfidence(null);
      setDetectedClasses([]);
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

          // 2. Filter predictions to score >= 0.5
          const validPredictions = predictions.filter((p) => p.score >= 0.5);
          
          // Populate raw list of all detected classes for future debugging/extension
          const rawClasses = validPredictions.map((p) => p.class);
          setDetectedClasses(rawClasses);

          // 3. Find predictions matching target categories
          const catPred = validPredictions.find((p) => p.class === 'cat');
          const personPred = validPredictions.find((p) => p.class === 'person');
          const cellPhonePred = validPredictions.find((p) => p.class === 'cell phone');
          const laptopPred = validPredictions.find((p) => p.class === 'laptop');
          const tvPred = validPredictions.find((p) => p.class === 'tv');

          /*
           * NOTE FOR FUTURE MAINTAINERS:
           * This local model can recognize if a cat-shaped object, a person, a cell phone,
           * a laptop, or a TV is in frame, but it CANNOT determine whether a detected "cat"
           * is a real live cat versus a photo of a cat displayed on a screen or a printed image.
           * That distinction is made by the separate, more capable Gemini Vision check that runs
           * server-side after the shutter is pressed (the isLiveCapture field in server.js).
           * It is expected and correct for this live HUD to say "CAT DETECTED" when someone
           * points the camera at a cat photo on a phone screen shown alone with no phone edges
           * visible in frame — the later Gemini check is what catches that case, not this one.
           */
          
          // 4. Decide status based on exact priority rules
          if (catPred && (personPred || cellPhonePred || laptopPred || tvPred)) {
            setStatus('multiple_detected');
            setConfidence(catPred.score);
          } else if (catPred) {
            setStatus('cat_detected');
            setConfidence(catPred.score);
          } else if (cellPhonePred) {
            setStatus('screen_detected');
            setConfidence(cellPhonePred.score);
          } else if (laptopPred) {
            setStatus('laptop_detected');
            setConfidence(laptopPred.score);
          } else if (tvPred) {
            setStatus('screen_detected');
            setConfidence(tvPred.score);
          } else if (personPred) {
            setStatus('human_detected');
            setConfidence(personPred.score);
          } else {
            setStatus('no_detection');
            setConfidence(null);
          }
        } catch (err) {
          console.error('Error running live object detection:', err);
        }
      }
    };

    // Poll every 500ms
    intervalRef.current = window.setInterval(detect, 500);

    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [active, isModelLoading]);

  return { isModelLoading, status, confidence, detectedClasses };
}

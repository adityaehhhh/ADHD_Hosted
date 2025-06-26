"use client";

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { SpaceBackground } from "../components/space-background"; // Updated import

function InfoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6 relative">
        <h2 className="text-lg font-semibold mb-2">Notice</h2>
        <p className="mb-4 text-gray-700">
          Please note that our machine learning model is hosted on a free tier server (Render). Due to this, the server may go into sleep mode after a period of inactivity. When a new request is made, the server takes some time to restart, which may result in a noticeable delay in receiving your result.
          <br /><br />
          We appreciate your patience and understanding!
        </p>
        <Button onClick={onClose} className="bg-purple-600 hover:bg-purple-700 text-white">
          Close
        </Button>
      </div>
    </div>
  );
}

function ResultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [prediction, setPrediction] = useState<string>("Loading...");
  const [probability, setProbability] = useState<number>(0);
  const [modalOpen, setModalOpen] = useState(true);

  useEffect(() => {
    const pred = searchParams.get("prediction");
    const prob = searchParams.get("probability");
    if (pred && prob) {
      setPrediction(pred === "1" ? "ADHD" : "No ADHD");
      setProbability(parseFloat(prob));
    }
  }, [searchParams]);

  return (
    <>
      <InfoModal open={modalOpen} onClose={() => setModalOpen(false)} />
      <SpaceBackground />
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-black/50 backdrop-blur-md border-purple-500/30">
          <CardHeader>
            <CardTitle className="text-2xl text-white">Prediction Result</CardTitle>
          </CardHeader>
          <CardContent className="text-white">
            <p className="text-xl mb-4">Predicted: {prediction}</p>
            <p className="text-xl mb-4">Probability: {(probability * 100).toFixed(2)}%</p>
            <p className="text-sm text-gray-400 italic">
              Note: This is for simulation purposes. Consult a healthcare professional for diagnosis.
            </p>
          </CardContent>
          <CardFooter>
            <Button
              onClick={() => router.push("/")}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              Back to Home
            </Button>
          </CardFooter>
        </Card>
      </div>
    </>
  );
}

export default function ResultPage() {
  return (
    <Suspense>
      <ResultContent />
    </Suspense>
  );
}
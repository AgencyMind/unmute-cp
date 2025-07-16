"use client";
import { useState } from "react";
import { Download, Upload } from "lucide-react";
import SlantedButton from "../SlantedButton";
import { useBackendServerUrl } from "../useBackendServerUrl";
import ErrorMessages, { ErrorItem, makeErrorItem } from "../ErrorMessages";
import VoiceRecorder from "../VoiceRecorder";
import Link from "next/link";

// Also checked on the backend, see constant of the same name
const MAX_VOICE_FILE_SIZE_MB = 4;

export default function VoiceClone() {
  const [errors, setErrors] = useState<ErrorItem[]>([]);
  const backendServerUrl = useBackendServerUrl();
  
  // Voice upload state
  const [voiceFile, setVoiceFile] = useState<File | null>(null);
  const [voiceName, setVoiceName] = useState<string | null>(null);
  const [isUploadingVoice, setIsUploadingVoice] = useState(false);
  
  // Text input state
  const [textInput, setTextInput] = useState("");
  
  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAudio, setGeneratedAudio] = useState<Blob | null>(null);

  const addError = (error: string) => {
    setErrors((prev) => [...prev, makeErrorItem(error)]);
  };

  const handleVoiceFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > MAX_VOICE_FILE_SIZE_MB * 1024 * 1024) {
        addError(`File size must be less than ${MAX_VOICE_FILE_SIZE_MB} MB.`);
        setVoiceFile(null);
      } else {
        setVoiceFile(selectedFile);
        setVoiceName(null); // Reset voice name when new file selected
      }
    }
  };

  const handleUploadVoice = async () => {
    if (!voiceFile) {
      addError("Please select a voice file to upload.");
      return;
    }

    if (!backendServerUrl) {
      addError("Backend server URL not available.");
      return;
    }

    setIsUploadingVoice(true);

    const formData = new FormData();
    formData.append("file", voiceFile);

    try {
      const response = await fetch(`${backendServerUrl}/v1/voices`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(
          `Failed to upload voice file (${response.status} ${response.statusText}).`
        );
      }

      const data = await response.json();
      if (data.name) {
        setVoiceName(data.name);
      } else {
        throw new Error("Invalid response from server.");
      }
    } catch (err) {
      addError(
        err instanceof Error ? err.message : "An unknown error occurred."
      );
    }
    setIsUploadingVoice(false);
  };

  const handleGenerateAudio = async () => {
    if (!voiceName) {
      addError("Please upload a voice file first.");
      return;
    }

    if (!textInput.trim()) {
      addError("Please enter some text to generate.");
      return;
    }

    if (!backendServerUrl) {
      addError("Backend server URL not available.");
      return;
    }

    setIsGenerating(true);

    try {
      // This is a simplified approach - in reality we'd need to interface with the TTS service
      // For now, we'll create a basic endpoint that handles the text-to-speech generation
      const response = await fetch(`${backendServerUrl}/v1/voice-clone/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          voice_name: voiceName,
          text: textInput,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Failed to generate audio (${response.status} ${response.statusText}).`
        );
      }

      const audioBlob = await response.blob();
      setGeneratedAudio(audioBlob);
    } catch (err) {
      addError(
        err instanceof Error ? err.message : "An unknown error occurred."
      );
    }
    setIsGenerating(false);
  };

  const handleDownloadAudio = () => {
    if (!generatedAudio) return;

    const url = URL.createObjectURL(generatedAudio);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cloned_voice_${Date.now()}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!backendServerUrl) {
    return (
      <div className="w-full h-screen flex justify-center items-center bg-background">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen flex justify-center bg-background">
      <ErrorMessages errors={errors} setErrors={setErrors} />
      <div className="flex flex-col justify-center max-w-2xl gap-6 m-4 mb-20">
        <div className="text-center">
          <h1 className="text-4xl font-bold mt-4 mb-2">Voice Clone Phreak</h1>
          <p className="text-lightgray mb-4">
            Upload a voice sample and generate speech with that voice
          </p>
          <p className="italic">
            <Link href="/" className="underline">
              Back to Unmute
            </Link>
          </p>
        </div>

        {/* Voice Upload Section */}
        <div className="border border-gray p-6 rounded">
          <h2 className="text-xl font-semibold mb-4">Step 1: Upload Voice Sample</h2>
          <p className="text-sm text-lightgray mb-4">
            Upload a high-quality voice sample (first 10 seconds will be used). 
            Max file size: {MAX_VOICE_FILE_SIZE_MB}MB.
          </p>
          
          <div className="flex flex-col gap-4">
            <div className="flex flex-row gap-4 items-center">
              <div className="relative">
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleVoiceFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-50"
                />
                <SlantedButton kind="secondary">
                  <Upload size={16} className="inline mr-2" />
                  Choose Audio File
                </SlantedButton>
              </div>
              
              <VoiceRecorder
                setRecordedAudio={(recordedAudio) => {
                  setVoiceFile(recordedAudio.file);
                  setVoiceName(null);
                }}
                setError={(error: string | null) => {
                  if (error) addError(error);
                }}
                recordingDurationSec={10}
              />
            </div>

            {voiceFile && (
              <div className="text-sm text-lightgray">
                Selected file: <strong>{voiceFile.name}</strong>
              </div>
            )}

            <SlantedButton
              kind={voiceFile && !isUploadingVoice ? "primary" : "disabled"}
              onClick={handleUploadVoice}
            >
              {isUploadingVoice ? "Uploading..." : "Upload Voice"}
            </SlantedButton>

            {voiceName && (
              <div className="text-sm text-green">
                ✓ Voice uploaded successfully! (ID: {voiceName})
              </div>
            )}
          </div>
        </div>

        {/* Text Input Section */}
        <div className="border border-gray p-6 rounded">
          <h2 className="text-xl font-semibold mb-4">Step 2: Enter Text</h2>
          <p className="text-sm text-lightgray mb-4">
            Enter the text you want to be spoken with the cloned voice.
          </p>
          
          <textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Enter text to be spoken..."
            className="w-full h-32 p-3 border border-gray bg-background text-white rounded resize-none"
          />
        </div>

        {/* Generate Section */}
        <div className="border border-gray p-6 rounded">
          <h2 className="text-xl font-semibold mb-4">Step 3: Generate Speech</h2>
          
          <SlantedButton
            kind={voiceName && textInput.trim() && !isGenerating ? "primary" : "disabled"}
            onClick={handleGenerateAudio}
            extraClasses="w-full mb-4"
          >
            {isGenerating ? "Generating..." : "Generate Cloned Speech"}
          </SlantedButton>

          {generatedAudio && (
            <div className="flex flex-col gap-4">
              <div className="text-sm text-green">
                ✓ Audio generated successfully!
              </div>
              
              <audio controls className="w-full">
                <source src={URL.createObjectURL(generatedAudio)} type="audio/wav" />
                Your browser does not support the audio element.
              </audio>
              
              <SlantedButton
                kind="secondary"
                onClick={handleDownloadAudio}
                extraClasses="w-full"
              >
                <Download size={16} className="inline mr-2" />
                Download Audio
              </SlantedButton>
            </div>
          )}
        </div>

        {/* Disclaimer */}
        <div className="text-xs text-lightgray text-center border-t border-gray pt-4">
          <p>
            This voice cloning tool is provided for experimental and educational purposes only. 
            Use responsibly and respect others' rights.
          </p>
        </div>
      </div>
    </div>
  );
}
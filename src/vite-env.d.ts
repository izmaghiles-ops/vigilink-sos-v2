/// <reference types="vite/client" />

interface Window {
  SpeechRecognition?: { new (): SpeechRecognition; prototype: SpeechRecognition };
  webkitSpeechRecognition?: { new (): SpeechRecognition; prototype: SpeechRecognition };
}

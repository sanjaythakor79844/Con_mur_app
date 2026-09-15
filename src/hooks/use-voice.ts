import { useCallback, useEffect, useRef, useState } from "react";
import { SPEECH_LOCALE, type Lang } from "@/lib/i18n";

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
};

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as
    | (new () => SpeechRecognitionLike)
    | null;
}

/**
 * Natural voice conversation loop: the browser turns speech into text
 * instantly, and reads Aaha's reply back aloud when it arrives.
 */
export function useVoiceChat(lang: Lang) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [interim, setInterim] = useState("");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const finalRef = useRef<((text: string) => void) | null>(null);

  useEffect(() => {
    setSupported(
      Boolean(getRecognitionCtor()) && typeof window !== "undefined" && "speechSynthesis" in window,
    );
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const startListening = useCallback(
    (onFinal: (text: string) => void) => {
      const Ctor = getRecognitionCtor();
      if (!Ctor) return false;
      // Speaking over the reply is confusing — silence Aaha first.
      if (typeof window !== "undefined") window.speechSynthesis.cancel();
      setSpeaking(false);

      recognitionRef.current?.abort();
      const recognition = new Ctor();
      recognition.lang = SPEECH_LOCALE[lang];
      recognition.continuous = false;
      recognition.interimResults = true;
      finalRef.current = onFinal;
      setInterim("");

      recognition.onresult = (event: any) => {
        let live = "";
        let done = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) done += result[0].transcript;
          else live += result[0].transcript;
        }
        setInterim(live);
        if (done.trim()) {
          setInterim("");
          setListening(false);
          finalRef.current?.(done.trim());
        }
      };
      recognition.onerror = () => {
        setListening(false);
        setInterim("");
      };
      recognition.onend = () => {
        setListening(false);
        setInterim("");
      };

      recognitionRef.current = recognition;
      recognition.start();
      setListening(true);
      return true;
    },
    [lang],
  );

  const speak = useCallback(
    (text: string) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
      const clean = text.replace(/[*_#`>]/g, "").trim();
      if (!clean) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(clean);
      const locale = SPEECH_LOCALE[lang];
      const voice = window.speechSynthesis
        .getVoices()
        .find((v) => v.lang === locale || v.lang.startsWith(locale.split("-")[0]));
      if (voice) utterance.voice = voice;
      utterance.lang = locale;
      utterance.rate = 1;
      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(utterance);
    },
    [lang],
  );

  const stopSpeaking = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window)
      window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  useEffect(
    () => () => {
      recognitionRef.current?.abort();
      if (typeof window !== "undefined" && "speechSynthesis" in window)
        window.speechSynthesis.cancel();
    },
    [],
  );

  return {
    supported,
    listening,
    speaking,
    interim,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
  };
}

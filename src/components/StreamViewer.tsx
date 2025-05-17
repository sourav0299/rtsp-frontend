import { useEffect, useRef, useState } from "react";

interface StreamViewerProps {
  streamUrl: string;
}

export default function StreamViewer({ streamUrl }: StreamViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [playing, setPlaying] = useState(false);
  const [bitrate, setBitrate] = useState({ down: 0 });

  // Buffer to accumulate incoming bytes
  const bufferRef = useRef<Uint8Array>(new Uint8Array());

  useEffect(() => {
    return () => {
      if (socket) socket.close();
    };
  }, [socket]);

  const startStream = () => {
    const ws = new WebSocket(`wss://rtsp-backend.onrender.com/ws/stream/`);
    setSocket(ws);

    let lastTime = Date.now();
    let bytes = 0;

    ws.binaryType = "arraybuffer";

    ws.onopen = () => {
      console.log("connected to websocket");
      ws.send(JSON.stringify({ url: streamUrl }));
      setPlaying(true);
    };

    ws.onmessage = (event: MessageEvent) => {
      if (typeof event.data === "string") {
        console.log("Message from server:", event.data);
        return;
      }

      // Append new bytes to buffer
      const incoming = new Uint8Array(event.data);
      const oldBuffer = bufferRef.current;
      const combined = new Uint8Array(oldBuffer.length + incoming.length);
      combined.set(oldBuffer);
      combined.set(incoming, oldBuffer.length);
      bufferRef.current = combined;

      extractFrames();

      bytes += incoming.length;
      const now = Date.now();
      const elapsed = now - lastTime;

      if (elapsed >= 1000) {
        const kbps = ((bytes * 8) / 1000).toFixed(2);
        setBitrate({ down: parseFloat(kbps) });
        bytes = 0;
        lastTime = now;
      }
    };

    ws.onerror = (error) => {
      console.log("WebSocket error:", error);
      setPlaying(false);
    };

    ws.onclose = () => {
      setPlaying(false);
    };
  };

  // Extract JPEG frames from buffer and draw on canvas
  const extractFrames = () => {
    let buffer = bufferRef.current;
    const SOI = [0xff, 0xd8];
    const EOI = [0xff, 0xd9];

    while (true) {
      let start = -1;
      for (let i = 0; i < buffer.length - 1; i++) {
        if (buffer[i] === SOI[0] && buffer[i + 1] === SOI[1]) {
          start = i;
          break;
        }
      }
      if (start === -1) break;

      let end = -1;
      for (let i = start + 2; i < buffer.length - 1; i++) {
        if (buffer[i] === EOI[0] && buffer[i + 1] === EOI[1]) {
          end = i + 1;
          break;
        }
      }
      if (end === -1) break;

      const frame = buffer.slice(start, end + 1);
      buffer = buffer.slice(end + 1);
      bufferRef.current = buffer;

      const blob = new Blob([frame], { type: "image/jpeg" });
      const url = URL.createObjectURL(blob);
      const img = new Image();

      img.onload = () => {
        if (!canvasRef.current) return;
        const ctx = canvasRef.current.getContext("2d");
        if (!ctx) return;

        // Resize canvas to image size if needed
        if (
          canvasRef.current.width !== img.width ||
          canvasRef.current.height !== img.height
        ) {
          canvasRef.current.width = img.width;
          canvasRef.current.height = img.height;
        }

        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
      };
      img.src = url;
    }
  };

  const stopStreaming = () => {
    if (socket) {
      socket.close();
      setSocket(null);
    }
    setPlaying(false);
    bufferRef.current = new Uint8Array();
  };

  const toggleStream = () => {
    return playing ? stopStreaming() : startStream();
  };

  const openFullscreen = () => {
    if (canvasRef.current?.requestFullscreen) {
      canvasRef.current.requestFullscreen();
    }
  };

  return (
    <div className="p-2 border rounded w-full">
      <div className="relative">
        <canvas ref={canvasRef} className="w-full rounded border"></canvas>
        <button
          onClick={openFullscreen}
          className="absolute top-2 right-2 bg-black text-white text-xs px-2 py-1 rounded"
        >
          Fullscreen
        </button>
      </div>
      <div className="flex justify-between mt-2">
        <button
          onClick={toggleStream}
          className="bg-blue-500 text-white px-4 py-1 rounded"
        >
          {playing ? "Pause" : "Play"}
        </button>
        <div className="text-sm text-gray-700">↓ {bitrate.down} kbps</div>
      </div>
    </div>
  );
}

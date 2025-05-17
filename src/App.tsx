import { useState } from 'react'
import './App.css'
import StreamViewer from './components/StreamViewer';

function App() {
const [streamUrls, setStreamUrls] = useState<string[]>([]);
  const [inputUrl, setInputUrl] = useState<string>("");

  const handleAddStream = () => {
    if (inputUrl.trim() !== "") {
      setStreamUrls((prev) => [...prev, inputUrl.trim()]);
      setInputUrl("");
    }
  };

  return (
    <div className="p-4">
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={inputUrl}
          onChange={(e) => setInputUrl(e.target.value)}
          placeholder="Enter RTSP URL"
          className="flex-grow px-3 py-2 border rounded"
        />
        <button
          onClick={handleAddStream}
          className="bg-green-500 text-white px-4 py-2 rounded"
        >
          Add Stream
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {streamUrls.map((url, index) => (
          <StreamViewer key={index} streamUrl={url} />
        ))}
      </div>
    </div>
  );
}

export default App

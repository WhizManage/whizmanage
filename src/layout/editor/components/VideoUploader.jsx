import { useState } from "react";
import { uploadWpMedia } from "@/utils/wpMedia";

export default function VideoUploader() {
  const [videoData, setVideoData] = useState(null); // האובייקט המלא מהשרת
  const [loading, setLoading] = useState(false);

  // בחירת קובץ והעלאה
  async function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);

    try {
      const uploaded = await uploadWpMedia(file);
      console.log("Uploaded video object:", uploaded);
      setVideoData(uploaded);
    } catch (err) {
      console.error("Video upload error:", err);
      alert("אירעה שגיאה בהעלאת הסרטון");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: "20px", maxWidth: "500px" }}>
      <h2>העלאת סרטון ל-WordPress</h2>

      <input
        type="file"
        accept="video/*"
        onChange={handleFileChange}
        disabled={loading}
      />

      {loading && <p>מעלה סרטון... אנא המתן ⏳</p>}

      {videoData && (
        <div style={{ marginTop: "20px" }}>
          <h3>Preview 🎥</h3>
          <video
            src={videoData.source_url}
            controls
            width="100%"
            style={{ border: "1px solid #ddd", borderRadius: "8px" }}
          />

          <div style={{ marginTop: "10px" }}>
            <p>
              <strong>ID:</strong> {videoData.id}
            </p>
            <p>
              <strong>URL:</strong>{" "}
              <a href={videoData.source_url} target="_blank" rel="noreferrer">
                {videoData.source_url}
              </a>
            </p>
            <p>
              <strong>MIME:</strong> {videoData.mime_type}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

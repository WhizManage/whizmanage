import { CompactPicker } from "react-color";

export const ColorText = ({
  expanded,
  onExpandEvent,
  onChange,
  currentState,
}) => {
  const stopPropagation = (event) => {
    event.stopPropagation();
  };

  const handleChange = (color) => {
    onChange("color", color.hex);
  };

  const renderModal = () => {
    const { color } = currentState;
    return (
      <div className="rdw-link-modal" onClick={stopPropagation}>
        <CompactPicker color={color} onChangeComplete={handleChange} />
      </div>
    );
  };

  return (
    <button
      className="rdw-colorpicker-wrapper"
      aria-haspopup="true"
      aria-label="rdw-color-picker"
    >
      <div onClick={onExpandEvent}>
        <img
          src={"https://cdn-icons-png.flaticon.com/128/846/846786.png"}
          width={20}
          height={20}
          alt=""
        />
      </div>
      {expanded ? renderModal() : undefined}
    </button>
  );
};

export const TextColor = [
  "#000000",
  "#333333",
  "#4D4D4D",
  "#666666",
  "#808080",
  "#999999",
  "#B3B3B3",
  "#CCCCCC",
  "#FFFFFF",
  "#9F0500",
  "#D33115",
  "#F44E3B",
  "#C45100",
  "#E27300",
  "#FE9200",
  "#FB9E00",
  "#FCC400",
  "#FCDC00",
  "#808900",
  "#B0BC00",
  "#DBDF00",
  "#194D33",
  "#68BC00",
  "#A4DD00",
  "#0C797D",
  "#16A5A5",
  "#68CCCA",
  "#0062B1",
  "#009CE0",
  "#73D8FF",
  "#653294",
  "#7B64FF",
  "#AEA1FF",
  "#AB149E",
  "#FA28FF",
  "#FDA1FF",
];

export const newOptions = [
  "inline",
  "blockType",
  "fontSize",
  "fontFamily",
  "list",
  "textAlign",
  "colorPicker",
  "link",
  "embedded",
  "image",
  "history",
];

export const inlineOptions = ["bold", "italic", "underline", "strikethrough"];
export const listOptions = ["unordered", "ordered"];

export const handleUploadPhotoEditor = (file) => {
  const formData = new FormData();
  formData.append("file", file);

  return fetch(window.siteUrl + "/wp-json/wp/v2/media", {
    method: "POST",
    headers: {
      "X-WP-Nonce": window.rest,
    },
    body: formData,
  })
    .then((response) => response.json())
    .then((data) => {
      if (data && data.link) {
        // Resolve the promise with the correct image source URL
        return { data: { link: data.link } };
      } else {
        throw new Error("Invalid response format");
      }
    })
    .catch((error) => {
      console.error("Error uploading media:", error);
      throw error; // Propagate the error further
    });
};

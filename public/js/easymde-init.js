document.addEventListener("DOMContentLoaded", () => {
  const textarea = document.getElementById("article-text");
  if (!textarea) return;

  const easyMDE = new EasyMDE({
    element: textarea,
    spellChecker: false,
    placeholder: "Write your full article here...",
    autosave: {
      enabled: true,
      uniqueId: "fastodigama-article-editor",
      delay: 1000,
    },
    toolbar: [
      "bold", "italic", "heading", "|",
      "quote", "unordered-list", "ordered-list", "|",
      "link", "image", "|",
      "preview", "side-by-side", "fullscreen"
    ]
  });
});

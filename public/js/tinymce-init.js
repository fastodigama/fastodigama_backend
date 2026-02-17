document.addEventListener("DOMContentLoaded", function () {
  if (document.querySelector("#article-text")) {
    tinymce.init({
      selector: "#article-text",
      height: 450,
      plugins: [
        'anchor','autolink','charmap','codesample','emoticons','link','lists','media',
        'searchreplace','table','visualblocks','wordcount'
      ],
      toolbar: 'undo redo | bold italic underline | bullist numlist | link | table | code'
    });
  }
});
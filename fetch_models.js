const apiKey = 'AIzaSyAhYECnbn34-Bl7k8006Hi-NYWrlKvGGvg';
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

fetch(url)
  .then(res => res.json())
  .then(data => {
    if (data.models) {
      console.log("--- MODEL LIST START ---");
      data.models.forEach(m => console.log(m.name));
      console.log("--- MODEL LIST END ---");
    } else {
      console.log('No models found or error:', data);
    }
  })
  .catch(err => console.error(err));

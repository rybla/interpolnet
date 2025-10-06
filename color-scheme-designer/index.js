const colorPicker = document.getElementById("color-picker");
const colorSchemeMode = document.getElementById("color-scheme-mode");
const getSchemeBtn = document.getElementById("get-scheme-btn");
const colorSchemeDisplay = document.getElementById("color-scheme-display");

function renderColorScheme(colors) {
  let html = "";
  for (const color of colors) {
    const hexValue = color.hex.value;
    html += `
      <div class="color-column">
        <div class="color-block" style="background-color: ${hexValue}"></div>
        <div class="color-hex" data-hex="${hexValue}">${hexValue}</div>
      </div>
    `;
  }
  colorSchemeDisplay.innerHTML = html;
}

colorSchemeDisplay.addEventListener('click', function(e) {
    if (e.target.dataset.hex) {
        const hexValue = e.target.dataset.hex;
        navigator.clipboard.writeText(hexValue).then(() => {
            e.target.textContent = "Copied!";
            setTimeout(() => {
                e.target.textContent = hexValue;
            }, 1000);
        });
    }
});

function getColorScheme() {
  const seedColor = colorPicker.value.substring(1);
  const mode = colorSchemeMode.value;

  fetch(`https://www.thecolorapi.com/scheme?hex=${seedColor}&mode=${mode}&count=5`)
    .then((response) => response.json())
    .then((data) => {
      renderColorScheme(data.colors);
    });
}

getSchemeBtn.addEventListener("click", getColorScheme);

// Initial load
getColorScheme();
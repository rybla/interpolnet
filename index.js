document.addEventListener("DOMContentLoaded", () => {
  document.body.addEventListener("mousemove", (e) => {
    // A throttled function could be used here for performance, but for this
    // simple case, we'll keep it as is.
    createBubble(e.clientX, e.clientY);
  });

  function createBubble(x, y) {
    const bubble = document.createElement("div");
    bubble.className = "bubble";
    document.body.appendChild(bubble);

    const size = Math.random() * 60 + 20;
    bubble.style.width = `${size}px`;
    bubble.style.height = `${size}px`;

    // Position bubble at cursor, but offset slightly for better visual effect
    bubble.style.left = `${x - size / 2}px`;
    bubble.style.top = `${y - size / 2}px`;

    // Animate the bubble
    bubble.style.setProperty("--end-y", `${Math.random() * 200 + 100}px`);
    bubble.style.setProperty("--end-x", `${(Math.random() - 0.5) * 200}px`);
    bubble.style.setProperty("--duration", `${Math.random() * 3 + 2}s`);

    // Remove the bubble after animation
    bubble.addEventListener("animationend", () => {
      bubble.remove();
    });
  }

  // Add some initial bubbles for visual appeal on load
  for (let i = 0; i < 15; i++) {
    setTimeout(() => {
      const x = Math.random() * window.innerWidth;
      const y = Math.random() * window.innerHeight;
      createBubble(x, y);
    }, i * 100);
  }
});
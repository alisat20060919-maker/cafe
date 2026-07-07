(() => {
  const image = "https://drive.google.com/thumbnail?id=1xLva8jEHumD53I5IOSFH8CXH9ba6kCkN&sz=w1000";
  const applyBackground = () => {
    document.documentElement.style.setProperty("--inside-cafe-bg", `url('${image}')`);
    const room = document.querySelector(".cafe-room-scene");
    if (!room) return;
    room.style.backgroundImage = `linear-gradient(180deg,rgba(24,59,46,.05),rgba(24,59,46,.22)),url('${image}')`;
    room.style.backgroundPosition = "center 50%";
  };
  applyBackground();
  window.addEventListener("load", applyBackground);
})();

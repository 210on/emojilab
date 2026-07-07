export const getScreenInfo = () => ({
  width: window.screen.width,
  height: window.screen.height,
  devicePixelRatio: window.devicePixelRatio || 1,
});

export const getUserAgent = () => navigator.userAgent;

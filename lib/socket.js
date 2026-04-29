// Export a helper that lets us easily emit from API routes
export function getIO() {
  if (!global.io) {
    console.warn('Socket.io has not been initialized. Ensure server.js is running.');
    return {
      to: () => ({ emit: () => {} }),
      emit: () => {}
    }; // dummy to prevent crashes
  }
  return global.io;
}

interface CameraSessionOptions {
  getVideo: () => HTMLVideoElement | null;
  onEnded: () => void;
}

export type CameraSession = ReturnType<typeof createCameraSession>;

/** One permission/playback request and its tracks. Create a new session per start. */
export function createCameraSession({ getVideo, onEnded }: CameraSessionOptions) {
  let active = true;
  let release: (() => void) | null = null;

  function stop() {
    active = false;
    release?.();
    release = null;
  }

  function handleEnded() {
    if (!active) return;
    stop();
    onEnded();
  }

  async function start(): Promise<MediaStreamTrack | null> {
    try {
      const video: MediaTrackConstraints & { zoom: boolean } = {
        width: { ideal: 1920 }, height: { ideal: 1080 }, zoom: true,
      };
      const stream = await navigator.mediaDevices.getUserMedia({ video, audio: false });
      const element = getVideo();
      const tracks = stream.getTracks();
      if (!active || !element) {
        tracks.forEach((track) => track.stop());
        return null;
      }

      release = () => {
        tracks.forEach((track) => {
          track.removeEventListener("ended", handleEnded);
          track.stop();
        });
        element.srcObject = null;
      };
      tracks.forEach((track) => track.addEventListener("ended", handleEnded));
      element.srcObject = stream;
      await element.play();
      return active ? stream.getVideoTracks()[0] : null;
    } catch (error) {
      stop();
      throw error;
    }
  }

  return { start, stop };
}

export function cameraErrorMessage(error: unknown): string {
  const name =
    typeof error === "object" && error !== null && "name" in error
      ? error.name
      : "";

  switch (name) {
    case "NotAllowedError":
    case "SecurityError":
      return "Camera access was blocked. Allow camera access in your browser’s site settings, then try again.";
    case "NotFoundError":
      return "No camera was found. Connect a camera, then try again.";
    case "NotReadableError":
    case "AbortError":
      return "Your camera could not start. Close other apps using it, then try again.";
    default:
      return "The camera preview could not start. Check your camera and try again.";
  }
}

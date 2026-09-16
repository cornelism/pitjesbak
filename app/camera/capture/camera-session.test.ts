import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCameraSession } from "./camera-session";

const getUserMedia = vi.fn<MediaDevices["getUserMedia"]>();

beforeEach(() => {
  getUserMedia.mockReset();
  vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } });
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
});

function setup() {
  const video = document.createElement("video");
  const tracks = Array.from({ length: 2 }, () => Object.assign(new EventTarget(), { stop: vi.fn() }));
  const stream = { getTracks: () => tracks, getVideoTracks: () => [tracks[0]] } as unknown as MediaStream;
  const onEnded = vi.fn();
  getUserMedia.mockResolvedValue(stream);
  return { video, tracks, stream, onEnded };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((ready) => { resolve = ready; });
  return { promise, resolve };
}

describe("camera session", () => {
  it("stops every track and detaches ended listeners exactly once", async () => {
    const { video, tracks, stream, onEnded } = setup();
    const session = createCameraSession({ getVideo: () => video, onEnded });
    expect(await session.start()).toBe(tracks[0]);
    expect(video.srcObject).toBe(stream);
    session.stop();
    session.stop();
    for (const track of tracks) {
      expect(track.stop).toHaveBeenCalledOnce();
      track.dispatchEvent(new Event("ended"));
    }
    expect(video.srcObject).toBeNull();
    expect(onEnded).not.toHaveBeenCalled();
  });

  it("releases a stream that arrives after cancellation without starting playback", async () => {
    const { video, tracks, stream, onEnded } = setup();
    const request = deferred<MediaStream>();
    getUserMedia.mockReturnValue(request.promise);
    const session = createCameraSession({ getVideo: () => video, onEnded });
    const ready = session.start();
    session.stop();
    request.resolve(stream);
    expect(await ready).toBeNull();
    for (const track of tracks) expect(track.stop).toHaveBeenCalledOnce();
    expect(video.play).not.toHaveBeenCalled();
  });

  it("releases a stream if its preview element has disappeared", async () => {
    const { video, tracks, onEnded } = setup();
    const session = createCameraSession({ getVideo: () => null, onEnded });
    expect(await session.start()).toBeNull();
    for (const track of tracks) expect(track.stop).toHaveBeenCalledOnce();
    expect(video.play).not.toHaveBeenCalled();
  });

  it("cleans up failed playback before rejecting", async () => {
    const { video, tracks, onEnded } = setup();
    const failure = new Error("Playback failed");
    vi.mocked(video.play).mockRejectedValue(failure);
    const session = createCameraSession({ getVideo: () => video, onEnded });
    await expect(session.start()).rejects.toBe(failure);
    session.stop();
    for (const track of tracks) expect(track.stop).toHaveBeenCalledOnce();
    expect(video.srcObject).toBeNull();
    expect(onEnded).not.toHaveBeenCalled();
  });

  it("does not return a live track if the stream disconnects during playback", async () => {
    const { video, tracks, onEnded } = setup();
    const playback = deferred<void>();
    vi.mocked(video.play).mockReturnValue(playback.promise);
    const session = createCameraSession({ getVideo: () => video, onEnded });
    const ready = session.start();
    await Promise.resolve();
    tracks[0].dispatchEvent(new Event("ended"));
    playback.resolve();
    expect(await ready).toBeNull();
    expect(onEnded).toHaveBeenCalledOnce();
    for (const track of tracks) {
      expect(track.stop).toHaveBeenCalledOnce();
      track.dispatchEvent(new Event("ended"));
    }
    expect(onEnded).toHaveBeenCalledOnce();
    expect(video.srcObject).toBeNull();
  });
});

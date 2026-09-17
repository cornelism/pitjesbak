const pendingUpdates = new WeakMap<MediaStreamTrack, Promise<void>>();

function selectConstraints(constraints: MediaTrackConstraints, zoom: boolean): MediaTrackConstraints {
  const { advanced, ...basic } = constraints;
  const select = (set: MediaTrackConstraintSet) => Object.fromEntries(
    Object.entries(set).filter(([key, value]) => (key === "zoom") === zoom
      // getUserMedia's zoom permission request is not a numeric zoom setting.
      && !(key === "zoom" && typeof value === "boolean")),
  );
  const selected = select(basic);
  const steps = advanced?.map(select).filter((step) => Object.keys(step).length > 0);
  return steps?.length ? { ...selected, advanced: steps } : selected;
}

/** Merge each update after previous camera changes finish, so controls cannot overwrite one another. */
export function updateCameraConstraints(
  track: MediaStreamTrack,
  update: (current: MediaTrackConstraints) => MediaTrackConstraints,
): Promise<void> {
  const previous = pendingUpdates.get(track) ?? Promise.resolve();
  const pending = previous.catch(() => {}).then(async () => {
    if (track.readyState === "ended") throw new Error("Camera stopped");
    const constraints = update(track.getConstraints?.() ?? {});
    // Chromium handles hardware zoom separately and rejects a call that mixes
    // it with video constraints. Keep both settings, but apply each family alone.
    const video = selectConstraints(constraints, false);
    const zoom = selectConstraints(constraints, true);
    const hasZoom = Object.keys(zoom).length > 0;
    if (Object.keys(video).length > 0 || !hasZoom) await track.applyConstraints(video);
    if (hasZoom) await track.applyConstraints(zoom);
  });
  pendingUpdates.set(track, pending);
  const clear = () => {
    if (pendingUpdates.get(track) === pending) pendingUpdates.delete(track);
  };
  void pending.then(clear, clear);
  return pending;
}

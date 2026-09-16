interface CvResource { delete(): void }

export type OwnCvResource = <T extends CvResource>(resource: T) => T;

/** Release resources after synchronous OpenCV work, including when it throws.
 * OpenCV owns WASM memory outside JavaScript's garbage collector.
 */
export function withCvResources<T>(work: (own: OwnCvResource) => T): T {
  const resources: CvResource[] = [];
  const own: OwnCvResource = (resource) => {
    resources.push(resource);
    return resource;
  };
  try {
    return work(own);
  } finally {
    for (const resource of resources.reverse()) resource.delete();
  }
}

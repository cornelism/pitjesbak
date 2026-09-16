// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
import { POST } from "./route";
import { parseCropUpload, storeCrops } from "../../../camera/die-crops/store-crops";

vi.mock("../../../camera/die-crops/store-crops", () => ({ parseCropUpload: vi.fn(), storeCrops: vi.fn() }));
afterEach(() => { vi.unstubAllEnvs(); vi.resetAllMocks(); });
const request = (origin = "http://localhost:3000", body = "{}") => new Request("http://localhost:3000/api/dev/die-crops", {
  method: "POST", headers: { origin, "content-type": "application/json" }, body,
});

it.each(["production", "test"])("does not write files in %s", async (environment) => {
  vi.stubEnv("NODE_ENV", environment);
  expect((await POST(request())).status).toBe(404);
  expect(storeCrops).not.toHaveBeenCalled();
});
it("rejects another origin before reading the request", async () => {
  vi.stubEnv("NODE_ENV", "development");
  expect((await POST(request("https://example.com"))).status).toBe(403);
  expect(storeCrops).not.toHaveBeenCalled();
});
it("bounds upload size even without a Content-Length header", async () => {
  vi.stubEnv("NODE_ENV", "development");
  expect((await POST(request(undefined, " ".repeat(8_000_001)))).status).toBe(413);
  expect(storeCrops).not.toHaveBeenCalled();
});
it("reports invalid captures without writing files", async () => {
  vi.stubEnv("NODE_ENV", "development");
  vi.mocked(parseCropUpload).mockImplementation(() => { throw new Error("Invalid capture"); });
  expect((await POST(request())).status).toBe(400);
  expect(storeCrops).not.toHaveBeenCalled();
});
it("returns the repository-relative saved location", async () => {
  vi.stubEnv("NODE_ENV", "development");
  vi.mocked(storeCrops).mockResolvedValue("capture-test");
  expect(await (await POST(request())).json()).toEqual({ path: "docs/dice-crops/captures/capture-test" });
  expect(storeCrops).toHaveBeenCalledOnce();
});

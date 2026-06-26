import { api } from "../lib/api";

describe("frontend api helpers", () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
    window.localStorage.clear();
  });

  it("includes the auth token when listing notes", async () => {
    window.localStorage.setItem("access_token", "header.payload.signature");
    fetchMock.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue([{ id: "note-1" }]),
    });

    await expect(api.notes.list("subject-1")).resolves.toEqual([{ id: "note-1" }]);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/notes/?subject_id=subject-1"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "******",
        }),
      }),
    );
  });

  it("surfaces JSON error details from the backend", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      text: jest.fn().mockResolvedValue('{"detail":"Boom"}'),
    });

    await expect(api.subjects.list()).rejects.toThrow("Boom");
  });

  it("blocks uploads when no access token is available", async () => {
    await expect(
      api.uploads.upload(
        "subject-1",
        new File(["pdf"], "notes.pdf", { type: "application/pdf" }),
      ),
    ).rejects.toThrow("No access token available");
  });
});

import { describe, expect, it } from "vitest";
import { parseDownloadFilename } from "./api";

describe("parseDownloadFilename", () => {
  it("reads quoted filenames from content-disposition", () => {
    expect(
      parseDownloadFilename('attachment; filename="attendance-2026-05-status-missing-punch.xlsx"')
    ).toBe("attendance-2026-05-status-missing-punch.xlsx");
  });

  it("reads UTF-8 encoded filenames from content-disposition", () => {
    expect(
      parseDownloadFilename("attachment; filename*=UTF-8''attendance-2026-05-search-sales%20team.xlsx")
    ).toBe("attendance-2026-05-search-sales team.xlsx");
  });

  it("returns null when no filename is present", () => {
    expect(parseDownloadFilename(null)).toBeNull();
    expect(parseDownloadFilename("attachment")).toBeNull();
  });
});

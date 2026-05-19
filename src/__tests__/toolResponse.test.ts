import { describe, expect, it } from "vitest";
import { errorResponse } from "../toolResponse.js";

describe("tool response", () => {
  it("includes structured setup guidance from tool errors", () => {
    const error = Object.assign(new Error("missing permission"), {
      setup: {
        requiredAccess: "Full Disk Access",
        cannotAutoPrompt: true
      }
    });

    const response = errorResponse(error);
    const payload = JSON.parse(response.content[0]?.text ?? "{}");

    expect(payload).toEqual({
      error: "missing permission",
      setup: {
        requiredAccess: "Full Disk Access",
        cannotAutoPrompt: true
      }
    });
  });
});
